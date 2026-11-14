import { createReadStream } from 'node:fs';
import { access, appendFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';

import { redactForLog } from '@podverse/helpers-backend';

export const REHEARSAL_PHASES = [
  'preflight',
  'identity',
  'catalog',
  'library',
  'replay',
  'membership',
  'verify',
] as const;

export const REHEARSAL_STAGES = ['pilot', 'sample', 'full'] as const;

export const PROGRESS_EVERY_ACCOUNTS = 100;
export const PROGRESS_EVERY_MS = 60_000;
export const MESSAGE_MAX_CHARS = 400;

export type RehearsalPhase = (typeof REHEARSAL_PHASES)[number];
export type RehearsalStage = (typeof REHEARSAL_STAGES)[number];

export type RehearsalErrorLine = {
  v4Id: string;
  phase: RehearsalPhase;
  group: string | null;
  class: string;
  message: string;
  time: string;
};

const RUN_ID_PATTERN = /^[0-9]{8}T[0-9]{6}Z$/;
const V4_ID_PATTERN = /^[A-Za-z0-9_-]{1,32}$/;
const CLASS_PATTERN = /^[a-z][a-z0-9_]*(?::[A-Za-z][A-Za-z0-9_]*)?$/;
const GROUP_PATTERN = /^[a-z][a-z0-9_]{0,39}$/;
const RULE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9 _-]{0,79}$/;
const FIX_FILE_PATTERN = /^[A-Za-z0-9._/-]+$/;
const CLASS_MAX_LENGTH = 80;
const EXAMPLE_LIMIT = 3;
const INVALID_CLASS = 'unexpected:invalid_class';
const INVALID_V4_ID = 'invalid-id';
const ROW_KEYS = [
  '"email"',
  '"passwordHash"',
  '"password_hash"',
  '"displayName"',
  '"display_name"',
  '"name"',
] as const;

type PhaseTotals = {
  done: number;
  failed: number;
  skipped: number;
  total: number;
  phaseStartedAt: string;
  databaseBytes: number | null;
};

type ClassTotals = {
  count: number;
  exampleV4Ids: string[];
};

type StopRecord = {
  phase: RehearsalPhase;
  reason: 'error_rate';
  at: string;
};

type ProgressCursor = {
  emitted: boolean;
  processedAtLastLine: number;
  lastLineAtMs: number;
};

type PhaseSummary = {
  done: number;
  failed: number;
  skipped: number;
  total: number;
  rate: number;
  estimateLeftSeconds: number | null;
  phaseStartedAt: string;
  databaseBytes: number | null;
};

type ClassSummary = {
  count: number;
  exampleV4Ids: string[];
};

type SummaryFile = {
  runId: string;
  updatedAt: string;
  phases: Record<string, PhaseSummary>;
  classes: Record<string, ClassSummary>;
  stop: StopRecord | null;
};

type DumpEntry = {
  phase: RehearsalPhase;
  file: string;
  bytes: number | null;
  time: string;
};

type LoadedSummary = {
  phases: Map<RehearsalPhase, PhaseTotals>;
  classes: Map<string, ClassTotals>;
  stop: StopRecord | null;
};

export type RehearsalLog = {
  readonly dir: string;
  writeRun(input: {
    stage: RehearsalStage;
    phase: RehearsalPhase;
    snapshotAt: string | null;
    now: Date;
    flags: { resume: boolean; retryFailed: boolean; limit: number | null };
  }): Promise<void>;
  writePick(input: {
    stage: RehearsalStage;
    now: Date;
    accounts: Array<{ v4Id: string; rule: string }>;
  }): Promise<void>;
  appendError(input: {
    v4Id: string;
    phase: RehearsalPhase;
    group: string | null;
    className: string;
    message: string;
    now: Date;
  }): Promise<void>;
  noteProgress(input: {
    phase: RehearsalPhase;
    done: number;
    failed: number;
    skipped: number;
    total: number;
    now: Date;
    phaseStartedAt: Date;
    databaseBytes?: number | null;
  }): Promise<string | null>;
  finishPhase(input: {
    phase: RehearsalPhase;
    done: number;
    failed: number;
    skipped: number;
    total: number;
    now: Date;
    phaseStartedAt: Date;
    databaseBytes?: number | null;
  }): Promise<string>;
  replacePhaseCounts(input: {
    phase: RehearsalPhase;
    done: number;
    failed: number;
    skipped: number;
    total: number;
    now: Date;
    phaseStartedAt: Date;
    databaseBytes?: number | null;
  }): Promise<void>;
  appendDeferred(input: {
    className: string;
    count: number;
    saw: string;
    why: string;
    exampleV4Ids: string[];
  }): Promise<{ appended: boolean }>;
  appendFix(input: {
    className: string;
    files: string[];
    retried: number;
  }): Promise<{ appended: boolean }>;
  listDeferredClasses(): Promise<string[]>;
  readErrorExamples(className: string): Promise<RehearsalErrorLine[]>;
  recordDump(input: { phase: RehearsalPhase; bytes: number; now: Date }): Promise<void>;
  recordStop(input: { phase: RehearsalPhase; now: Date }): Promise<void>;
};

type RunInput = Parameters<RehearsalLog['writeRun']>[0];
type PickInput = Parameters<RehearsalLog['writePick']>[0];
type ErrorInput = Parameters<RehearsalLog['appendError']>[0];
type PhaseCountInput = Parameters<RehearsalLog['noteProgress']>[0];
type DeferredInput = Parameters<RehearsalLog['appendDeferred']>[0];
type FixInput = Parameters<RehearsalLog['appendFix']>[0];

export function createRunId(now: Date): string {
  return now
    .toISOString()
    .replace(/\.\d{3}Z$/, 'Z')
    .replace(/[-:]/g, '');
}

export function defaultRehearsalRoot(): string {
  const repoRoot = fileURLToPath(new URL('../../../../../../', import.meta.url));
  return path.join(repoRoot, '.artifacts', 'v4-full-rehearsal');
}

/**
 * The `.dump` file is a local database image used to restore a phase. The manifest stores
 * phase, file name, byte size, and time.
 */
export function dumpFilePath(rootDir: string, runId: string, phase: RehearsalPhase): string {
  assertPhase(phase);
  return path.join(rootDir, runId, 'dumps', `${phase}.dump`);
}

export function redactRehearsalText(input: string): string {
  const trimmed = input.trim();
  if (
    (trimmed.startsWith('{') || trimmed.startsWith('[')) &&
    ROW_KEYS.some((key) => trimmed.includes(key))
  ) {
    return '[dropped]';
  }

  let text = input;
  text = text.replace(
    /(?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?|redis|rediss):\/\/\S+/gi,
    '[REDACTED_URL]'
  );
  text = text.replace(/[a-z][a-z0-9+.-]*:\/\/[^\s/@]+:[^\s/@]*@[^\s]+/gi, '[REDACTED_URL]');
  text = text.replace(/\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}/g, '[REDACTED_HASH]');
  text = text.replace(/\bpassword\s*[:=]\s*\S+/gi, 'password=[REDACTED]');
  text = text.replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, '[REDACTED_EMAIL]');
  text = text.replace(/\r\n|\n|\r/g, ' ');
  if (text.length > MESSAGE_MAX_CHARS) {
    return `${text.slice(0, MESSAGE_MAX_CHARS)}...`;
  }
  return text;
}

export async function openRehearsalLog(options: {
  runId: string;
  now: Date;
  rootDir?: string;
}): Promise<RehearsalLog> {
  if (!RUN_ID_PATTERN.test(options.runId)) {
    throw new Error('invalid_run_id');
  }
  const rootDir = options.rootDir === undefined ? defaultRehearsalRoot() : options.rootDir;
  const dir = path.join(rootDir, options.runId);
  await mkdir(path.join(dir, 'dumps'), { recursive: true });
  const loaded = await loadSummaryFile(path.join(dir, 'summary.json'), options.runId);
  return new RehearsalLogWriter(dir, options.runId, loaded);
}

function isRehearsalPhase(value: string): value is RehearsalPhase {
  return REHEARSAL_PHASES.some((phase) => phase === value);
}

function isRehearsalStage(value: string): value is RehearsalStage {
  return REHEARSAL_STAGES.some((stage) => stage === value);
}

function assertPhase(phase: string): asserts phase is RehearsalPhase {
  if (!isRehearsalPhase(phase)) {
    throw new Error('invalid_phase');
  }
}

function assertStage(stage: string): asserts stage is RehearsalStage {
  if (!isRehearsalStage(stage)) {
    throw new Error('invalid_stage');
  }
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

function assertCounts(done: number, failed: number, skipped: number, total: number): void {
  if (
    !isNonNegativeInteger(done) ||
    !isNonNegativeInteger(failed) ||
    !isNonNegativeInteger(skipped) ||
    !isNonNegativeInteger(total) ||
    done + failed + skipped > total
  ) {
    throw new Error('invalid_counts');
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readString(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key];
  if (typeof value === 'string') {
    return value;
  }
  return undefined;
}

function isClassName(value: string): boolean {
  return value.length <= CLASS_MAX_LENGTH && CLASS_PATTERN.test(value);
}

function sanitizeClass(value: string): string {
  if (isClassName(value)) {
    return value;
  }
  return INVALID_CLASS;
}

function sanitizeV4Id(value: string): string {
  if (V4_ID_PATTERN.test(value)) {
    return value;
  }
  return INVALID_V4_ID;
}

function sanitizeGroup(value: string | null): string | null {
  if (value === null) {
    return null;
  }
  if (GROUP_PATTERN.test(value)) {
    return value;
  }
  return null;
}

function sanitizeRule(value: string): string {
  if (RULE_PATTERN.test(value)) {
    return value;
  }
  return 'unknown';
}

function sanitizeSnapshotAt(value: string | null): string | null {
  if (value === null) {
    return null;
  }
  if (value.includes('@') || value.includes('://')) {
    return null;
  }
  if (Number.isNaN(Date.parse(value))) {
    return null;
  }
  return value;
}

function sanitizeLimit(value: number | null): number | null {
  if (isNonNegativeInteger(value)) {
    return value;
  }
  return null;
}

function sanitizeDatabaseBytes(
  value: number | null | undefined,
  previous: number | null
): number | null {
  if (value === undefined) {
    return previous;
  }
  if (isNonNegativeInteger(value)) {
    return value;
  }
  return null;
}

function failureRate(done: number, failed: number): number {
  const decided = done + failed;
  if (decided === 0) {
    return 0;
  }
  return Math.round((failed / decided) * 10000) / 10000;
}

function estimateLeftSeconds(totals: PhaseTotals, now: Date): number | null {
  const processed = totals.done + totals.failed + totals.skipped;
  const remaining = Math.max(0, totals.total - processed);
  if (remaining === 0) {
    return 0;
  }
  if (processed === 0) {
    return null;
  }
  const startedMs = Date.parse(totals.phaseStartedAt);
  if (Number.isNaN(startedMs)) {
    return null;
  }
  const elapsedMs = now.getTime() - startedMs;
  if (elapsedMs <= 0) {
    return null;
  }
  return Math.round((elapsedMs / 1000) * (remaining / processed));
}

function isFixFile(file: string): boolean {
  if (file.includes('..')) {
    return false;
  }
  return FIX_FILE_PATTERN.test(file);
}

async function readOptional(filePath: string): Promise<string | undefined> {
  try {
    return await readFile(filePath, 'utf8');
  } catch {
    return undefined;
  }
}

async function writePretty(filePath: string, value: unknown): Promise<void> {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function hasClassHeading(text: string, className: string): boolean {
  const target = `## ${className}`;
  for (const line of text.split('\n')) {
    if (line === target) {
      return true;
    }
  }
  return false;
}

function parseJson(text: string): unknown {
  const parsed: unknown = JSON.parse(text);
  return parsed;
}

async function loadSummaryFile(filePath: string, runId: string): Promise<LoadedSummary | null> {
  const text = await readOptional(filePath);
  if (text === undefined) {
    return null;
  }
  try {
    return parseSummary(parseJson(text), runId);
  } catch {
    return null;
  }
}

function parseSummary(value: unknown, runId: string): LoadedSummary | null {
  if (!isRecord(value) || value.runId !== runId) {
    return null;
  }
  return {
    phases: parsePhases(value.phases),
    classes: parseClasses(value.classes),
    stop: parseStop(value.stop),
  };
}

function parsePhases(value: unknown): Map<RehearsalPhase, PhaseTotals> {
  const phases = new Map<RehearsalPhase, PhaseTotals>();
  if (!isRecord(value)) {
    return phases;
  }
  for (const phase of REHEARSAL_PHASES) {
    const raw = value[phase];
    if (!isRecord(raw)) {
      continue;
    }
    const totals = parsePhaseTotals(raw);
    if (totals !== null) {
      phases.set(phase, totals);
    }
  }
  return phases;
}

function parsePhaseTotals(raw: Record<string, unknown>): PhaseTotals | null {
  const done = raw.done;
  const failed = raw.failed;
  const skipped = raw.skipped;
  const total = raw.total;
  const phaseStartedAt = readString(raw, 'phaseStartedAt');
  if (
    !isNonNegativeInteger(done) ||
    !isNonNegativeInteger(failed) ||
    !isNonNegativeInteger(skipped) ||
    !isNonNegativeInteger(total) ||
    phaseStartedAt === undefined ||
    Number.isNaN(Date.parse(phaseStartedAt))
  ) {
    return null;
  }
  let databaseBytes: number | null = null;
  if (isNonNegativeInteger(raw.databaseBytes)) {
    databaseBytes = raw.databaseBytes;
  }
  return { done, failed, skipped, total, phaseStartedAt, databaseBytes };
}

function parseClasses(value: unknown): Map<string, ClassTotals> {
  const classes = new Map<string, ClassTotals>();
  if (!isRecord(value)) {
    return classes;
  }
  for (const name of Object.keys(value)) {
    if (!isClassName(name)) {
      continue;
    }
    const raw = value[name];
    if (!isRecord(raw) || !isNonNegativeInteger(raw.count)) {
      continue;
    }
    classes.set(name, { count: raw.count, exampleV4Ids: parseExampleIds(raw.exampleV4Ids) });
  }
  return classes;
}

function parseExampleIds(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const ids: string[] = [];
  for (const item of value) {
    if (ids.length >= EXAMPLE_LIMIT) {
      break;
    }
    if (typeof item === 'string' && V4_ID_PATTERN.test(item) && !ids.includes(item)) {
      ids.push(item);
    }
  }
  return ids;
}

function parseStop(value: unknown): StopRecord | null {
  if (!isRecord(value)) {
    return null;
  }
  const phase = readString(value, 'phase');
  const at = readString(value, 'at');
  if (
    phase === undefined ||
    !isRehearsalPhase(phase) ||
    value.reason !== 'error_rate' ||
    at === undefined ||
    Number.isNaN(Date.parse(at))
  ) {
    return null;
  }
  return { phase, reason: 'error_rate', at };
}

function parseErrorLine(line: string): RehearsalErrorLine | null {
  let value: unknown;
  try {
    value = parseJson(line);
  } catch {
    return null;
  }
  if (!isRecord(value)) {
    return null;
  }
  const v4Id = readString(value, 'v4Id');
  const phase = readString(value, 'phase');
  const className = readString(value, 'class');
  const message = readString(value, 'message');
  const time = readString(value, 'time');
  if (
    v4Id === undefined ||
    phase === undefined ||
    !isRehearsalPhase(phase) ||
    className === undefined ||
    message === undefined ||
    time === undefined
  ) {
    return null;
  }
  if (value.group === null) {
    return { v4Id, phase, group: null, class: className, message, time };
  }
  if (typeof value.group === 'string') {
    return { v4Id, phase, group: value.group, class: className, message, time };
  }
  return null;
}

function renderSummaryMarkdown(summary: SummaryFile): string {
  const lines = ['# Rehearsal summary', '', `- Run: ${summary.runId}`];
  if (summary.stop !== null) {
    lines.push(`- Stop: ${summary.stop.phase} ${summary.stop.reason}`);
  }
  lines.push(`- Updated: ${summary.updatedAt}`, '');
  lines.push('## Phases', '');
  lines.push(
    '| Phase | Done | Failed | Skipped | Total | Rate | Estimate left (s) | Database bytes |'
  );
  lines.push('| --- | --- | --- | --- | --- | --- | --- | --- |');
  for (const phase of REHEARSAL_PHASES) {
    const row = summary.phases[phase];
    if (row === undefined) {
      continue;
    }
    const estimate = row.estimateLeftSeconds === null ? 'unknown' : String(row.estimateLeftSeconds);
    const bytes = row.databaseBytes === null ? '' : String(row.databaseBytes);
    const rate = row.rate.toFixed(4);
    lines.push(
      `| ${phase} | ${row.done} | ${row.failed} | ${row.skipped} | ${row.total} | ` +
        `${rate} | ${estimate} | ${bytes} |`
    );
  }
  lines.push('', '## Classes', '');
  lines.push('| Class | Count |');
  lines.push('| --- | --- |');
  for (const name of Object.keys(summary.classes)) {
    const entry = summary.classes[name];
    if (entry === undefined) {
      continue;
    }
    lines.push(`| ${name} | ${entry.count} |`);
  }
  lines.push('');
  return lines.join('\n');
}

class RehearsalLogWriter implements RehearsalLog {
  readonly dir: string;
  private readonly runId: string;
  private readonly phases = new Map<RehearsalPhase, PhaseTotals>();
  private readonly classes = new Map<string, ClassTotals>();
  private readonly cursors = new Map<RehearsalPhase, ProgressCursor>();
  private stop: StopRecord | null = null;
  private chain: Promise<void> = Promise.resolve();

  constructor(dir: string, runId: string, loaded: LoadedSummary | null) {
    this.dir = dir;
    this.runId = runId;
    if (loaded === null) {
      return;
    }
    for (const phase of REHEARSAL_PHASES) {
      const totals = loaded.phases.get(phase);
      if (totals !== undefined) {
        this.phases.set(phase, totals);
      }
    }
    for (const [name, totals] of loaded.classes) {
      this.classes.set(name, {
        count: totals.count,
        exampleV4Ids: [...totals.exampleV4Ids],
      });
    }
    this.stop = loaded.stop;
  }

  writeRun(input: RunInput): Promise<void> {
    assertStage(input.stage);
    assertPhase(input.phase);
    const snapshotAt = sanitizeSnapshotAt(input.snapshotAt);
    const limit = sanitizeLimit(input.flags.limit);
    return this.enqueue(async () => {
      const filePath = path.join(this.dir, 'run.json');
      const startedAt = await this.readStartedAt(filePath, input.now);
      await writePretty(filePath, {
        runId: this.runId,
        stage: input.stage,
        phase: input.phase,
        snapshotAt,
        startedAt,
        flags: {
          resume: input.flags.resume,
          retryFailed: input.flags.retryFailed,
          limit,
        },
      });
    });
  }

  writePick(input: PickInput): Promise<void> {
    assertStage(input.stage);
    const accounts = input.accounts.map((account) => ({
      v4Id: sanitizeV4Id(account.v4Id),
      rule: sanitizeRule(account.rule),
    }));
    return this.enqueue(async () => {
      await writePretty(path.join(this.dir, 'pick.json'), {
        stage: input.stage,
        pickedAt: input.now.toISOString(),
        accounts,
      });
    });
  }

  appendError(input: ErrorInput): Promise<void> {
    assertPhase(input.phase);
    return this.enqueue(async () => {
      const scrubbed = redactForLog({ message: input.message });
      let message = redactRehearsalText(scrubbed.message);
      if (message === '') {
        message = 'empty';
      }
      const className = sanitizeClass(input.className);
      const v4Id = sanitizeV4Id(input.v4Id);
      const line: RehearsalErrorLine = {
        v4Id,
        phase: input.phase,
        group: sanitizeGroup(input.group),
        class: className,
        message,
        time: input.now.toISOString(),
      };
      await appendFile(path.join(this.dir, 'errors.jsonl'), `${JSON.stringify(line)}\n`, 'utf8');
      this.noteClass(className, v4Id);
      await this.flushSummary(input.now);
    });
  }

  noteProgress(input: PhaseCountInput): Promise<string | null> {
    this.assertPhaseCounts(input);
    return this.enqueue(async () => {
      this.applyPhaseCounts(input);
      if (!this.shouldEmit(input)) {
        return null;
      }
      this.markLine(input);
      await this.flushSummary(input.now);
      return this.progressLine(input.phase, input.now);
    });
  }

  finishPhase(input: PhaseCountInput): Promise<string> {
    this.assertPhaseCounts(input);
    return this.enqueue(async () => {
      this.applyPhaseCounts(input);
      this.markLine(input);
      await this.flushSummary(input.now);
      return this.progressLine(input.phase, input.now);
    });
  }

  replacePhaseCounts(input: PhaseCountInput): Promise<void> {
    this.assertPhaseCounts(input);
    return this.enqueue(async () => {
      this.applyPhaseCounts(input);
      this.markLine(input);
      await this.flushSummary(input.now);
    });
  }

  appendDeferred(input: DeferredInput): Promise<{ appended: boolean }> {
    if (!isNonNegativeInteger(input.count)) {
      return Promise.resolve({ appended: false });
    }
    const className = sanitizeClass(input.className);
    const examples = input.exampleV4Ids.slice(0, EXAMPLE_LIMIT).map((id) => sanitizeV4Id(id));
    const body = [
      `- Count: ${input.count}`,
      `- Saw: ${redactRehearsalText(input.saw)}`,
      `- Why: ${redactRehearsalText(input.why)}`,
      `- Examples: ${examples.join(', ')}`,
      '',
      '',
    ].join('\n');
    return this.enqueue(() => this.appendSection('deferred.md', 'Deferred', className, body));
  }

  appendFix(input: FixInput): Promise<{ appended: boolean }> {
    const className = sanitizeClass(input.className);
    const files = input.files.filter((file) => isFixFile(file));
    const quoted = files.map((file) => `\`${file}\``).join(', ');
    const filesLine = files.length === 0 ? '- Files: none' : `- Files: ${quoted}`;
    const retried = isNonNegativeInteger(input.retried) ? input.retried : 0;
    const body = [filesLine, `- Retried: ${retried}`, '', ''].join('\n');
    return this.enqueue(() => this.appendSection('fixes.md', 'Fixes', className, body));
  }

  listDeferredClasses(): Promise<string[]> {
    return this.enqueue(async () => {
      const text = await readOptional(path.join(this.dir, 'deferred.md'));
      if (text === undefined) {
        return [];
      }
      const names: string[] = [];
      for (const line of text.split('\n')) {
        if (!line.startsWith('## ')) {
          continue;
        }
        const name = line.slice(3);
        if (isClassName(name)) {
          names.push(name);
        }
      }
      return names;
    });
  }

  readErrorExamples(className: string): Promise<RehearsalErrorLine[]> {
    const wanted = sanitizeClass(className);
    return this.enqueue(() => this.streamErrorExamples(wanted));
  }

  recordDump(input: { phase: RehearsalPhase; bytes: number; now: Date }): Promise<void> {
    assertPhase(input.phase);
    return this.enqueue(async () => {
      const filePath = path.join(this.dir, 'dumps', 'manifest.json');
      const dumps = await this.readDumps(filePath);
      const bytes = isNonNegativeInteger(input.bytes) ? input.bytes : null;
      const entry: DumpEntry = {
        phase: input.phase,
        file: `${input.phase}.dump`,
        bytes,
        time: input.now.toISOString(),
      };
      const index = dumps.findIndex((dump) => dump.phase === input.phase);
      if (index === -1) {
        dumps.push(entry);
      } else {
        dumps[index] = entry;
      }
      await writePretty(filePath, { dumps });
    });
  }

  recordStop(input: { phase: RehearsalPhase; now: Date }): Promise<void> {
    assertPhase(input.phase);
    return this.enqueue(async () => {
      this.stop = {
        phase: input.phase,
        reason: 'error_rate',
        at: input.now.toISOString(),
      };
      await this.flushSummary(input.now);
    });
  }

  private enqueue<T>(work: () => Promise<T>): Promise<T> {
    const result = this.chain.then(work);
    this.chain = result.then(
      () => undefined,
      () => undefined
    );
    return result;
  }

  private assertPhaseCounts(input: PhaseCountInput): void {
    assertPhase(input.phase);
    assertCounts(input.done, input.failed, input.skipped, input.total);
  }

  private async readStartedAt(filePath: string, now: Date): Promise<string> {
    const text = await readOptional(filePath);
    if (text === undefined) {
      return now.toISOString();
    }
    try {
      const parsed = parseJson(text);
      if (isRecord(parsed)) {
        const startedAt = readString(parsed, 'startedAt');
        if (startedAt !== undefined && !Number.isNaN(Date.parse(startedAt))) {
          return startedAt;
        }
      }
    } catch {
      return now.toISOString();
    }
    return now.toISOString();
  }

  private noteClass(className: string, v4Id: string): void {
    const existing = this.classes.get(className);
    if (existing === undefined) {
      this.classes.set(className, { count: 1, exampleV4Ids: [v4Id] });
      return;
    }
    existing.count += 1;
    if (existing.exampleV4Ids.length < EXAMPLE_LIMIT && !existing.exampleV4Ids.includes(v4Id)) {
      existing.exampleV4Ids.push(v4Id);
    }
  }

  private applyPhaseCounts(input: PhaseCountInput): void {
    const existing = this.phases.get(input.phase);
    const phaseStartedAt =
      existing === undefined ? input.phaseStartedAt.toISOString() : existing.phaseStartedAt;
    const previousBytes = existing === undefined ? null : existing.databaseBytes;
    this.phases.set(input.phase, {
      done: input.done,
      failed: input.failed,
      skipped: input.skipped,
      total: input.total,
      phaseStartedAt,
      databaseBytes: sanitizeDatabaseBytes(input.databaseBytes, previousBytes),
    });
  }

  private shouldEmit(input: PhaseCountInput): boolean {
    const cursor = this.cursors.get(input.phase);
    if (cursor === undefined || cursor.emitted === false) {
      return true;
    }
    const processed = input.done + input.failed + input.skipped;
    if (processed - cursor.processedAtLastLine >= PROGRESS_EVERY_ACCOUNTS) {
      return true;
    }
    return input.now.getTime() - cursor.lastLineAtMs >= PROGRESS_EVERY_MS;
  }

  private markLine(input: PhaseCountInput): void {
    this.cursors.set(input.phase, {
      emitted: true,
      processedAtLastLine: input.done + input.failed + input.skipped,
      lastLineAtMs: input.now.getTime(),
    });
  }

  private progressLine(phase: RehearsalPhase, now: Date): string {
    const totals = this.phases.get(phase);
    if (totals === undefined) {
      throw new Error('invalid_counts');
    }
    const estimate = estimateLeftSeconds(totals, now);
    const estimateText = estimate === null ? 'unknown' : String(estimate);
    return [
      'rehearsal',
      `phase=${phase}`,
      `done=${totals.done}`,
      `failed=${totals.failed}`,
      `skipped=${totals.skipped}`,
      `total=${totals.total}`,
      `rate=${failureRate(totals.done, totals.failed).toFixed(4)}`,
      `estimate_left_s=${estimateText}`,
    ].join(' ');
  }

  private buildSummary(now: Date): SummaryFile {
    const phases: Record<string, PhaseSummary> = {};
    for (const phase of REHEARSAL_PHASES) {
      const totals = this.phases.get(phase);
      if (totals === undefined) {
        continue;
      }
      phases[phase] = {
        done: totals.done,
        failed: totals.failed,
        skipped: totals.skipped,
        total: totals.total,
        rate: failureRate(totals.done, totals.failed),
        estimateLeftSeconds: estimateLeftSeconds(totals, now),
        phaseStartedAt: totals.phaseStartedAt,
        databaseBytes: totals.databaseBytes,
      };
    }
    const names = [...this.classes.keys()].sort((left, right) => {
      const leftCount = this.classes.get(left)?.count ?? 0;
      const rightCount = this.classes.get(right)?.count ?? 0;
      if (leftCount !== rightCount) {
        return rightCount - leftCount;
      }
      if (left < right) {
        return -1;
      }
      if (left > right) {
        return 1;
      }
      return 0;
    });
    const classes: Record<string, ClassSummary> = {};
    for (const name of names) {
      const entry = this.classes.get(name);
      if (entry === undefined) {
        continue;
      }
      classes[name] = { count: entry.count, exampleV4Ids: [...entry.exampleV4Ids] };
    }
    return {
      runId: this.runId,
      updatedAt: now.toISOString(),
      phases,
      classes,
      stop: this.stop,
    };
  }

  private async flushSummary(now: Date): Promise<void> {
    const summary = this.buildSummary(now);
    await writePretty(path.join(this.dir, 'summary.json'), summary);
    await writeFile(path.join(this.dir, 'summary.md'), renderSummaryMarkdown(summary), 'utf8');
  }

  private async appendSection(
    fileName: string,
    title: string,
    className: string,
    body: string
  ): Promise<{ appended: boolean }> {
    const filePath = path.join(this.dir, fileName);
    const existing = await readOptional(filePath);
    if (existing !== undefined && hasClassHeading(existing, className)) {
      return { appended: false };
    }
    const entry = `## ${className}\n\n${body}`;
    if (existing === undefined) {
      await writeFile(filePath, `# ${title}\n\n${entry}`, 'utf8');
    } else {
      const prefix = existing.endsWith('\n') ? existing : `${existing}\n`;
      await writeFile(filePath, `${prefix}${entry}`, 'utf8');
    }
    return { appended: true };
  }

  private async streamErrorExamples(className: string): Promise<RehearsalErrorLine[]> {
    const filePath = path.join(this.dir, 'errors.jsonl');
    try {
      await access(filePath);
    } catch {
      return [];
    }
    const stream = createReadStream(filePath, { encoding: 'utf8' });
    stream.on('error', () => undefined);
    const lines = createInterface({ input: stream, crlfDelay: Infinity });
    const found: RehearsalErrorLine[] = [];
    try {
      for await (const line of lines) {
        if (line === '') {
          continue;
        }
        const parsed = parseErrorLine(line);
        if (parsed !== null && parsed.class === className) {
          found.push(parsed);
          if (found.length === EXAMPLE_LIMIT) {
            break;
          }
        }
      }
    } catch {
      return found;
    } finally {
      lines.close();
      stream.destroy();
    }
    return found;
  }

  private async readDumps(filePath: string): Promise<DumpEntry[]> {
    const text = await readOptional(filePath);
    if (text === undefined) {
      return [];
    }
    try {
      const parsed = parseJson(text);
      if (!isRecord(parsed) || !Array.isArray(parsed.dumps)) {
        return [];
      }
      const dumps: DumpEntry[] = [];
      for (const item of parsed.dumps) {
        const entry = parseDumpEntry(item);
        if (entry !== null) {
          dumps.push(entry);
        }
      }
      return dumps;
    } catch {
      return [];
    }
  }
}

function parseDumpEntry(value: unknown): DumpEntry | null {
  if (!isRecord(value)) {
    return null;
  }
  const phase = readString(value, 'phase');
  const file = readString(value, 'file');
  const time = readString(value, 'time');
  if (phase === undefined || !isRehearsalPhase(phase) || file === undefined || time === undefined) {
    return null;
  }
  const bytes = isNonNegativeInteger(value.bytes) ? value.bytes : null;
  return { phase, file, bytes, time };
}
