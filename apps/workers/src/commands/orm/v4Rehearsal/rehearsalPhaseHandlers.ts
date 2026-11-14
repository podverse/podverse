import { rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import bcrypt from 'bcrypt';
import { Client } from 'pg';

import { ACCOUNT_PHASE_STATUS_CHUNK, getDataSourceReadWrite } from '@podverse/orm';

import { billingImportLegacyMembershipExpiry } from '../../billing/importLegacyMembershipExpiry.js';
import { rebuildLegacyMembershipExpiryFile } from '../../billing/rebuildLegacyMembershipExpiryFile.js';
import type { V4SeedStageCatalogProgress } from '../v4Catalog/seedStageCatalog.js';
import { v4SeedStageCatalog } from '../v4Catalog/seedStageCatalog.js';
import { v4SeedAccountIdentity } from '../v4Identity/seedAccountIdentity.js';
import { v4CopyAccountLibrary } from '../v4Library/copyAccountLibrary.js';
import { v4ReplayLegacyRows } from '../v4Library/replayLegacyRows.js';
import type { AccountPhase } from './accountPhaseStatus.js';
import {
  ensureAccountPhaseRows,
  listAccountPhaseV4UserIdsByStatus,
  setAccountPhaseStatus,
  setAccountPhaseStatusMany,
} from './accountPhaseStatus.js';
import { classifyIdentityAction } from './identityOutcome.js';
import {
  classifyLibraryResult,
  membershipOutcomes,
  rehearsalPasswordFromEnv,
  replayPassFinished,
  sweepIdentity,
  thrownErrorClass,
  webOriginForStage,
} from './rehearsalPhaseOutcome.js';
import type { RehearsalRunContext } from './runFullRehearsalLoop.js';
import { verifyAccount } from './verifyAccount.js';

export const SNAPSHOT_UPDATED_AT_SQL = `SELECT to_char(max(users."updatedAt"), 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS snapshot_at
FROM users`;

export const REPLAY_ELIGIBLE_COUNT_SQL = `SELECT count(*)::int AS n
FROM legacy_pending_row
WHERE row_kind <> 'subscription'
  AND (status = 'unresolved' OR (status = 'resolved' AND reason = 'snapshot'))`;

const ACCOUNT_ID_SQL = `SELECT id_text, id
FROM account
WHERE id_text = ANY($1::varchar[])`;

const PHASES_AFTER_IDENTITY: readonly AccountPhase[] = [
  'catalog',
  'library',
  'replay',
  'membership',
  'verify',
];

const ALL_ACCOUNT_PHASES: readonly AccountPhase[] = ['identity', ...PHASES_AFTER_IDENTITY];

const EXAMPLE_ID = /^[A-Za-z0-9_-]{1,32}$/;

const EMPTY_MEMBERSHIP_COUNTS = { unmatched: 0, ambiguous: 0, invalid: 0 };

type MembershipRow = ReturnType<typeof membershipOutcomes>[number];

export async function runPreflightPhase(_context: RehearsalRunContext): Promise<string | null> {
  const connectionString = process.env.V4_DATABASE_URL?.trim() ?? '';
  if (connectionString === '') {
    throw new Error('Missing V4_DATABASE_URL.');
  }
  const client = new Client({ connectionString });
  try {
    await client.connect();
    const result = await client.query<Record<string, unknown>>(SNAPSHOT_UPDATED_AT_SQL);
    if (result.rows.length !== 1) {
      throw new Error('Could not read the v4 snapshot time.');
    }
    const row: unknown = result.rows[0];
    const snapshot = snapshotValue(row);
    if (snapshot === undefined) {
      throw new Error('Could not read the v4 snapshot time.');
    }
    return acceptedSnapshot(snapshot);
  } catch (error) {
    if (error instanceof Error && error.message === 'Could not read the v4 snapshot time.') {
      throw error;
    }
    throw new Error('Could not read the v4 snapshot time.', { cause: error });
  } finally {
    await client.end().catch(() => undefined);
  }
}

export async function runIdentityPhase(context: RehearsalRunContext): Promise<void> {
  await ensureAccountPhaseRows(pickedV4Ids(context), 'identity');
  const ids = await context.runnableIds('identity');
  const holdIds: string[] = [];
  for (const v4Id of ids) {
    let settled = false;
    try {
      const result = await v4SeedAccountIdentity({ 'v4-id': v4Id });
      const outcome = classifyIdentityAction(result);
      if (outcome.kind === 'failed') {
        await markIdentityFailed(context, v4Id, outcome.className);
        settled = true;
      } else {
        holdIds.push(v4Id);
      }
    } catch (error) {
      await recordThrownAccount(context, 'identity', v4Id, 'identity', error);
      settled = true;
    }
    if (settled) {
      await context.emitProgress();
    }
  }
  if (holdIds.length === 0) {
    return;
  }

  // Commands in this pass can replace one another's rows, so the account id is read
  // from the table after the pass.
  const accountIds = await readAccountIds(holdIds);
  let finished = 0;
  for (const v4Id of holdIds) {
    try {
      await applyIdentityHold(context, v4Id, accountIds.get(v4Id));
    } catch (error) {
      await recordThrownAccount(context, 'identity', v4Id, 'identity', error);
    }
    finished += 1;
    if (finished % 100 === 0 || finished === holdIds.length) {
      await context.emitProgress();
    }
  }
}

export async function runCatalogPhase(context: RehearsalRunContext): Promise<void> {
  await ensureAccountPhaseRows(pickedV4Ids(context), 'catalog');
  const ids = await context.runnableIds('catalog');
  if (ids.length === 0) {
    return;
  }
  const seeded = await seedRehearsalCatalog(context, ids);
  for (const podcastId of seeded.failedPodcastIds) {
    await appendPhaseError(context, {
      v4Id: podcastId,
      phase: 'catalog',
      group: null,
      className: 'parse_failed',
      message: 'parse failed',
    });
  }
  await markPhaseDone(context, 'catalog', ids);
}

export async function runLibraryPhase(context: RehearsalRunContext): Promise<void> {
  await ensureAccountPhaseRows(pickedV4Ids(context), 'library');
  const ids = await context.runnableIds('library');
  for (const v4Id of ids) {
    try {
      await writeLibraryAccount(context, v4Id);
    } catch (error) {
      await recordThrownAccount(context, 'library', v4Id, null, error);
    }
    await context.emitProgress();
  }
}

export async function runReplayPhase(context: RehearsalRunContext): Promise<void> {
  await ensureAccountPhaseRows(pickedV4Ids(context), 'replay');
  const ids = await context.runnableIds('replay');
  if (ids.length === 0) {
    return;
  }
  let before = await readReplayEligibleCount();
  if (before !== 0) {
    for (;;) {
      await v4ReplayLegacyRows({});
      const after = await readReplayEligibleCount();
      await context.emitProgress();
      if (replayPassFinished(before, after)) {
        break;
      }
      before = after;
    }
  }
  await markPhaseDone(context, 'replay', ids);
}

export async function runMembershipPhase(context: RehearsalRunContext): Promise<void> {
  await ensureAccountPhaseRows(pickedV4Ids(context), 'membership');
  const runnable = await context.runnableIds('membership');
  const identityDone = new Set(await listAccountPhaseV4UserIdsByStatus('identity', 'done'));
  const requestedIds = runnable.filter((v4Id) => identityDone.has(v4Id));
  if (requestedIds.length === 0) {
    return;
  }
  const outputPath = path.join(tmpdir(), `v4-paid-expiry-${context.runId}.csv`);
  const rebuilt = await rebuildLegacyMembershipExpiryFile({
    v4Ids: requestedIds,
    outputPath,
    now: context.runNow,
  });
  try {
    const alreadyFailed = await writeMembershipListFailures(
      context,
      membershipOutcomes({
        requestedIds,
        missingIds: rebuilt.missingIds,
        ambiguousIds: rebuilt.ambiguousIds,
        invalidEmailIds: rebuilt.invalidEmailIds,
        invalidExpiryIds: rebuilt.invalidExpiryIds,
        futureIds: [],
        counts: EMPTY_MEMBERSHIP_COUNTS,
      })
    );
    const counts = await billingImportLegacyMembershipExpiry(
      { file: outputPath },
      { now: context.runNow }
    );
    if (counts === undefined) {
      throw new Error('Membership import returned no counts.');
    }
    await writeMembershipImportResults(
      context,
      membershipOutcomes({
        requestedIds,
        missingIds: rebuilt.missingIds,
        ambiguousIds: rebuilt.ambiguousIds,
        invalidEmailIds: rebuilt.invalidEmailIds,
        invalidExpiryIds: rebuilt.invalidExpiryIds,
        futureIds: rebuilt.futureIds,
        counts,
      }),
      rebuilt.futureIds,
      alreadyFailed
    );
    await context.emitProgress();
  } finally {
    await rm(outputPath, { force: true });
  }
}

export async function runVerifyPhase(context: RehearsalRunContext): Promise<void> {
  const origin = webOriginForStage(context.stage, process.env.WEB_DOMAIN?.trim() ?? '');
  const password = rehearsalPasswordFromEnv(process.env.V4_REHEARSAL_PASSWORD);
  const comparePassword =
    password === null ? null : (plain: string, hash: string) => bcrypt.compare(plain, hash);
  await ensureAccountPhaseRows(pickedV4Ids(context), 'verify');
  const ids = await context.runnableIds('verify');
  for (const v4Id of ids) {
    try {
      await writeVerifyAccount(context, v4Id, {
        samplePublicPaths: origin.samplePublicPaths,
        webOrigin: origin.webOrigin,
        rehearsalPassword: password,
        comparePassword,
      });
    } catch (error) {
      await recordThrownAccount(context, 'verify', v4Id, null, error);
    }
    await context.emitProgress();
  }
}

function pickedV4Ids(context: RehearsalRunContext): string[] {
  return context.accounts.map((account) => account.v4Id);
}

function snapshotValue(row: unknown): string | null | undefined {
  if (!isRecord(row) || !Object.prototype.hasOwnProperty.call(row, 'snapshot_at')) {
    return undefined;
  }
  const value = row.snapshot_at;
  if (value === null || typeof value === 'string') {
    return value;
  }
  return undefined;
}

function acceptedSnapshot(value: string | null): string | null {
  if (value === null || value === '') {
    return null;
  }
  if (value.includes('@') || value.includes('://') || Number.isNaN(Date.parse(value))) {
    return null;
  }
  return value;
}

async function markIdentityFailed(
  context: RehearsalRunContext,
  v4Id: string,
  className: string
): Promise<void> {
  await setAccountPhaseStatus({
    v4UserId: v4Id,
    phase: 'identity',
    status: 'failed',
    errorClass: className,
  });
  await appendPhaseError(context, {
    v4Id,
    phase: 'identity',
    group: 'identity',
    className,
    message: className,
  });
  await deferAccountPhases(v4Id, PHASES_AFTER_IDENTITY, 'identity_not_done');
  await context.noteAccount({ failed: true });
}

async function applyIdentityHold(
  context: RehearsalRunContext,
  v4Id: string,
  accountId: number | undefined
): Promise<void> {
  if (sweepIdentity(accountId !== undefined) === 'done' && accountId !== undefined) {
    await setAccountPhaseStatus({
      v4UserId: v4Id,
      phase: 'identity',
      status: 'done',
      accountId,
    });
  } else {
    await deferAccountPhases(v4Id, ALL_ACCOUNT_PHASES, 'email_case_left_out');
  }
  await context.noteAccount({ failed: false });
}

async function readAccountIds(v4Ids: readonly string[]): Promise<Map<string, number>> {
  const found = new Map<string, number>();
  for (const chunk of chunkValues(v4Ids, ACCOUNT_PHASE_STATUS_CHUNK)) {
    const raw: unknown = await getDataSourceReadWrite().query(ACCOUNT_ID_SQL, [chunk]);
    if (!isUnknownArray(raw)) {
      throw new Error('identity_account_result');
    }
    for (const row of raw) {
      const parsed = readAccountId(row);
      if (parsed === null) {
        throw new Error('identity_account_result');
      }
      const existing = found.get(parsed.idText);
      if (existing !== undefined && existing !== parsed.id) {
        throw new Error('identity_account_result');
      }
      if (existing === undefined) {
        found.set(parsed.idText, parsed.id);
      }
    }
  }
  return found;
}

function readAccountId(row: unknown): { idText: string; id: number } | null {
  if (!isRecord(row)) {
    return null;
  }
  const idText = row.id_text;
  const id = row.id;
  if (typeof idText !== 'string' || !isAccountId(id)) {
    return null;
  }
  return { idText, id };
}

function isAccountId(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 1;
}

async function seedRehearsalCatalog(
  context: RehearsalRunContext,
  ids: readonly string[]
): Promise<Awaited<ReturnType<typeof v4SeedStageCatalog>>> {
  const progressWrites: Promise<void>[] = [];
  try {
    const seeded = await v4SeedStageCatalog({
      stage: context.stage,
      v4Ids: context.stage === 'full' ? [] : ids,
      dryRun: false,
      onProgress: (progress) => {
        context.writeLine(catalogProgressLine(progress));
        progressWrites.push(context.emitProgress());
      },
    });
    await Promise.all(progressWrites);
    return seeded;
  } catch (error) {
    await Promise.allSettled(progressWrites);
    throw error;
  }
}

function catalogProgressLine(progress: V4SeedStageCatalogProgress): string {
  return [
    'rehearsal phase=catalog',
    `created=${progress.created}`,
    `queued=${progress.queued}`,
    `settled=${progress.settled}`,
    `failed_parse=${progress.failedParse}`,
    `waiting=${progress.waiting}`,
  ].join(' ');
}

async function writeLibraryAccount(context: RehearsalRunContext, v4Id: string): Promise<void> {
  const result = await v4CopyAccountLibrary({ 'v4-id': v4Id });
  const decision = classifyLibraryResult(result);
  if (decision.status === 'done') {
    await setAccountPhaseStatus({
      v4UserId: v4Id,
      phase: 'library',
      status: 'done',
    });
  } else {
    await setAccountPhaseStatus({
      v4UserId: v4Id,
      phase: 'library',
      status: decision.status,
      errorClass: decision.className,
    });
    for (const line of decision.errors) {
      await appendPhaseError(context, {
        v4Id,
        phase: 'library',
        group: line.group,
        className: line.className,
        message: line.message,
      });
    }
  }
  await context.noteAccount({ failed: decision.status === 'failed' });
}

async function readReplayEligibleCount(): Promise<number> {
  const raw: unknown = await getDataSourceReadWrite().query(REPLAY_ELIGIBLE_COUNT_SQL);
  if (!isUnknownArray(raw) || raw.length !== 1) {
    throw new Error('replay_count');
  }
  const count = replayCount(raw[0]);
  if (count === null) {
    throw new Error('replay_count');
  }
  return count;
}

function replayCount(row: unknown): number | null {
  if (!isRecord(row)) {
    return null;
  }
  const count = row.n;
  if (typeof count !== 'number' || !Number.isSafeInteger(count) || count < 0) {
    return null;
  }
  return count;
}

async function writeMembershipListFailures(
  context: RehearsalRunContext,
  rows: readonly MembershipRow[]
): Promise<Set<string>> {
  const failed = new Set<string>();
  for (const row of rows) {
    if (row.status !== 'failed' || row.className === null || failed.has(row.v4Id)) {
      continue;
    }
    await setAccountPhaseStatus({
      v4UserId: row.v4Id,
      phase: 'membership',
      status: 'failed',
      errorClass: row.className,
    });
    await appendPhaseError(context, {
      v4Id: row.v4Id,
      phase: 'membership',
      group: 'membership',
      className: row.className,
      message: row.className,
    });
    await context.noteAccount({ failed: true });
    failed.add(row.v4Id);
  }
  return failed;
}

async function writeMembershipImportResults(
  context: RehearsalRunContext,
  rows: readonly MembershipRow[],
  futureIds: readonly string[],
  alreadyFailed: ReadonlySet<string>
): Promise<void> {
  const doneIds: string[] = [];
  const failedByClass = new Map<string, string[]>();
  const notes: Array<{ v4Id: string; failed: boolean; className: string | null; future: boolean }> =
    [];
  const future = new Set(futureIds);
  const seen = new Set<string>();
  for (const row of rows) {
    if (alreadyFailed.has(row.v4Id) || seen.has(row.v4Id)) {
      continue;
    }
    seen.add(row.v4Id);
    if (row.status === 'done') {
      doneIds.push(row.v4Id);
      notes.push({ v4Id: row.v4Id, failed: false, className: null, future: false });
      continue;
    }
    if (row.className === null) {
      continue;
    }
    const ids = failedByClass.get(row.className) ?? [];
    ids.push(row.v4Id);
    failedByClass.set(row.className, ids);
    notes.push({
      v4Id: row.v4Id,
      failed: true,
      className: row.className,
      future: future.has(row.v4Id),
    });
  }
  if (doneIds.length > 0) {
    await setAccountPhaseStatusMany({
      v4UserIds: doneIds,
      phase: 'membership',
      status: 'done',
    });
  }
  for (const [errorClass, v4UserIds] of failedByClass) {
    await setAccountPhaseStatusMany({
      v4UserIds,
      phase: 'membership',
      status: 'failed',
      errorClass,
    });
  }
  for (const note of notes) {
    if (note.failed && note.future && note.className !== null) {
      await appendPhaseError(context, {
        v4Id: note.v4Id,
        phase: 'membership',
        group: 'membership',
        className: note.className,
        message: note.className,
      });
    }
    await context.noteAccount({ failed: note.failed });
  }
}

async function writeVerifyAccount(
  context: RehearsalRunContext,
  v4Id: string,
  options: {
    samplePublicPaths: boolean;
    webOrigin: string | null;
    rehearsalPassword: string | null;
    comparePassword: ((plain: string, hash: string) => Promise<boolean>) | null;
  }
): Promise<void> {
  const result = await verifyAccount(v4Id, {
    now: context.runNow,
    samplePublicPaths: options.samplePublicPaths,
    webOrigin: options.webOrigin,
    rehearsalPassword: options.rehearsalPassword,
    comparePassword: options.comparePassword,
  });
  if (result.ok) {
    await setAccountPhaseStatus({ v4UserId: v4Id, phase: 'verify', status: 'done' });
    await context.noteAccount({ failed: false });
    return;
  }
  const failed = result.class !== 'needs_operator';
  await setAccountPhaseStatus({
    v4UserId: v4Id,
    phase: 'verify',
    status: failed ? 'failed' : 'needs_operator',
    errorClass: failed ? result.class : 'needs_operator',
  });
  await appendPhaseError(context, {
    v4Id,
    phase: 'verify',
    group: verifyLogGroup(result.group),
    className: failed ? result.class : 'needs_operator',
    message: verifyErrorMessage(result.message, result.exampleId),
  });
  await context.noteAccount({ failed });
}

function verifyLogGroup(group: string | null): string | null {
  if (group === null || group !== group.toLowerCase()) {
    return null;
  }
  return group;
}

function verifyErrorMessage(message: string, exampleId: string | null): string {
  if (exampleId !== null && EXAMPLE_ID.test(exampleId)) {
    return `${message} example ${exampleId}`;
  }
  return message;
}

async function markPhaseDone(
  context: RehearsalRunContext,
  phase: AccountPhase,
  v4Ids: readonly string[]
): Promise<void> {
  await setAccountPhaseStatusMany({
    v4UserIds: v4Ids,
    phase,
    status: 'done',
  });
  for (let index = 0; index < v4Ids.length; index += 1) {
    await context.noteAccount({ failed: false });
  }
  await context.emitProgress();
}

async function deferAccountPhases(
  v4Id: string,
  phases: readonly AccountPhase[],
  errorClass: string
): Promise<void> {
  for (const phase of phases) {
    await setAccountPhaseStatus({
      v4UserId: v4Id,
      phase,
      status: 'deferred',
      errorClass,
    });
  }
}

async function recordThrownAccount(
  context: RehearsalRunContext,
  phase: AccountPhase,
  v4Id: string,
  group: string | null,
  error: unknown
): Promise<void> {
  if (isRehearsalStopped(error)) {
    throw error;
  }
  const className = thrownErrorClass(error);
  await setAccountPhaseStatus({
    v4UserId: v4Id,
    phase,
    status: 'failed',
    errorClass: className,
  });
  await appendPhaseError(context, {
    v4Id,
    phase,
    group,
    className,
    message: className,
  });
  await context.noteAccount({ failed: true });
}

async function appendPhaseError(
  context: RehearsalRunContext,
  input: {
    v4Id: string;
    phase: AccountPhase;
    group: string | null;
    className: string;
    message: string;
  }
): Promise<void> {
  await context.log.appendError({
    v4Id: input.v4Id,
    phase: input.phase,
    group: input.group,
    className: input.className,
    message: input.message,
    now: context.wallClock(),
  });
}

function chunkValues<T>(values: readonly T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }
  return chunks;
}

function isUnknownArray(value: unknown): value is readonly unknown[] {
  return Array.isArray(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isRehearsalStopped(error: unknown): error is Error {
  return error instanceof Error && error.message === 'rehearsal_stopped';
}
