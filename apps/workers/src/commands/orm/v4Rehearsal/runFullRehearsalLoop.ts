import { access, readFile } from 'node:fs/promises';
import path from 'node:path';

import { getLogger } from '@workers/factories/logger.js';
import type { DataSource } from 'typeorm';

import { getDataSourceRead, getDataSourceReadWrite } from '@podverse/orm';

import type { AccountPhase, AccountPhaseStatusValue } from './accountPhaseStatus.js';
import { countAccountPhaseStatus, listAccountPhaseV4UserIds } from './accountPhaseStatus.js';
import {
  cleanDumpExists,
  cleanDumpPath,
  disconnectOtherLocalClients,
  dumpPhaseFile,
  restoreCleanDump,
  writeCleanDumpIfMissing,
} from './localDatabaseImage.js';
import { pickStageAccounts } from './pickStageAccounts.js';
import type { RehearsalLog, RehearsalPhase, RehearsalStage } from './rehearsalLog.js';
import {
  createRunId,
  defaultRehearsalRoot,
  dumpFilePath,
  openRehearsalLog,
  REHEARSAL_PHASES,
} from './rehearsalLog.js';
import {
  runCatalogPhase,
  runIdentityPhase,
  runLibraryPhase,
  runMembershipPhase,
  runPreflightPhase,
  runReplayPhase,
  runVerifyPhase,
} from './rehearsalPhaseHandlers.js';
import type { ParsedRehearsalArgs } from './runFullRehearsalLib.js';
import {
  assertProgressLine,
  failureWindowTripped,
  parseStoredPick,
  parseStoredRun,
  progressCounts,
  shouldRestore,
} from './runFullRehearsalLoopLib.js';

type PickedAccount = { v4Id: string; rule: string };

type PhaseCountInput = Parameters<RehearsalLog['noteProgress']>[0];

export type RehearsalRunContext = {
  stage: RehearsalStage;
  runId: string;
  runNow: Date;
  wallClock: () => Date;
  flags: { resume: boolean; retryFailed: boolean; limit: number | null };
  accounts: PickedAccount[];
  log: RehearsalLog;
  emitProgress: () => Promise<void>;
  noteAccount: (input: { failed: boolean }) => Promise<void>;
  runnableIds: (phase: AccountPhase) => Promise<string[]>;
  writeLine: (line: string) => void;
};

export type RehearsalDeps = {
  silence: { pause(): void; resume(): void };
  clock: () => Date;
  writeLine: (line: string) => void;
  runDirExists: (runDir: string) => Promise<boolean>;
  readRunFile: (runDir: string) => Promise<unknown>;
  readPickFile: (runDir: string) => Promise<unknown>;
  openLog: (input: { runId: string; now: Date }) => Promise<RehearsalLog>;
  ensureCleanDump: (filePath: string) => Promise<'written' | 'present'>;
  cleanDumpExists: (filePath: string) => Promise<boolean>;
  disconnectOtherClients: () => Promise<void>;
  restoreClean: (filePath: string) => Promise<void>;
  closePools: () => Promise<void>;
  openPools: () => Promise<void>;
  dumpPhase: (filePath: string) => Promise<number>;
  pick: (input: {
    connectionString: string;
    stage: RehearsalStage;
    seed: string;
    now: Date;
  }) => Promise<PickedAccount[]>;
  countPhase: (phase: AccountPhase) => Promise<Record<AccountPhaseStatusValue, number>>;
  listRunnable: (phase: AccountPhase, includeFailed: boolean) => Promise<string[]>;
  handlers: {
    preflight: (context: RehearsalRunContext) => Promise<string | null>;
    identity: (context: RehearsalRunContext) => Promise<void>;
    catalog: (context: RehearsalRunContext) => Promise<void>;
    library: (context: RehearsalRunContext) => Promise<void>;
    replay: (context: RehearsalRunContext) => Promise<void>;
    membership: (context: RehearsalRunContext) => Promise<void>;
    verify: (context: RehearsalRunContext) => Promise<void>;
  };
};

type ResolvedRun = {
  runId: string;
  runDir: string;
  runNow: Date;
  snapshotAt: string | null;
};

type RunState = {
  phase: RehearsalPhase;
  snapshotAt: string | null;
  databaseBytes: number | null;
  outcomes: boolean[];
};

type RunFlags = { resume: boolean; retryFailed: boolean; limit: number | null };

export async function runParsedRehearsal(
  parsed: ParsedRehearsalArgs,
  connectionString: string,
  deps: RehearsalDeps = defaultRehearsalDeps()
): Promise<void> {
  const resolved = await resolveRun(parsed, deps);
  deps.silence.pause();
  try {
    const log = await deps.openLog({ runId: resolved.runId, now: resolved.runNow });
    await applyCleanImage(parsed, deps);
    const accounts = await loadAccounts(parsed, connectionString, resolved, log, deps);
    await runPhases(parsed, resolved, accounts, log, deps);
  } finally {
    deps.silence.resume();
  }
}

async function resolveRun(parsed: ParsedRehearsalArgs, deps: RehearsalDeps): Promise<ResolvedRun> {
  if (parsed.resume) {
    return resolveResume(parsed, deps);
  }
  return resolveNewRun(parsed, deps);
}

async function resolveResume(
  parsed: ParsedRehearsalArgs,
  deps: RehearsalDeps
): Promise<ResolvedRun> {
  if (parsed.runId === null) {
    throw new Error('Missing rehearsal run.');
  }
  const runDir = path.join(defaultRehearsalRoot(), parsed.runId);
  if (!(await deps.runDirExists(runDir))) {
    throw new Error('Missing rehearsal run.');
  }
  const stored = parseStoredRun(await deps.readRunFile(runDir), parsed.stage);
  return {
    runId: parsed.runId,
    runDir,
    runNow: stored.startedAt,
    snapshotAt: stored.snapshotAt,
  };
}

async function resolveNewRun(
  parsed: ParsedRehearsalArgs,
  deps: RehearsalDeps
): Promise<ResolvedRun> {
  const runNow = deps.clock();
  const runId = parsed.runId === null ? createRunId(runNow) : parsed.runId;
  const runDir = path.join(defaultRehearsalRoot(), runId);
  if (await deps.runDirExists(runDir)) {
    throw new Error('Rehearsal run already exists.');
  }
  return { runId, runDir, runNow, snapshotAt: null };
}

async function applyCleanImage(parsed: ParsedRehearsalArgs, deps: RehearsalDeps): Promise<void> {
  const action = shouldRestore({
    stage: parsed.stage,
    resume: parsed.resume,
    phase: parsed.phase,
  });
  if (action === 'none') {
    return;
  }
  const filePath = cleanDumpPath(defaultRehearsalRoot());
  if (action === 'create_clean') {
    const result = await deps.ensureCleanDump(filePath);
    if (result === 'written') {
      deps.writeLine('rehearsal clean_dump=written');
    }
    return;
  }
  if (!(await deps.cleanDumpExists(filePath))) {
    throw new Error('Missing clean database dump.');
  }
  deps.writeLine(`rehearsal restore=starting stage=${parsed.stage}`);
  // Pools close before other clients are disconnected, so the terminate query does not
  // drop this process's own connections.
  await deps.closePools();
  await deps.disconnectOtherClients();
  await deps.restoreClean(filePath);
  await deps.openPools();
  deps.writeLine(`rehearsal restore=finished stage=${parsed.stage}`);
}

async function loadAccounts(
  parsed: ParsedRehearsalArgs,
  connectionString: string,
  resolved: ResolvedRun,
  log: RehearsalLog,
  deps: RehearsalDeps
): Promise<PickedAccount[]> {
  if (parsed.resume) {
    return parseStoredPick(await deps.readPickFile(resolved.runDir));
  }
  const accounts = await deps.pick({
    connectionString,
    stage: parsed.stage,
    seed: resolved.runId,
    now: resolved.runNow,
  });
  await log.writePick({ stage: parsed.stage, now: resolved.runNow, accounts });
  return accounts;
}

async function runPhases(
  parsed: ParsedRehearsalArgs,
  resolved: ResolvedRun,
  accounts: PickedAccount[],
  log: RehearsalLog,
  deps: RehearsalDeps
): Promise<void> {
  const state: RunState = {
    phase: 'preflight',
    snapshotAt: resolved.snapshotAt,
    databaseBytes: null,
    outcomes: [],
  };
  const startedAt = new Map<RehearsalPhase, Date>();
  const flags: RunFlags = {
    resume: parsed.resume,
    retryFailed: parsed.retryFailed,
    limit: parsed.limit,
  };

  function stamp(phase: RehearsalPhase): { now: Date; phaseStartedAt: Date } {
    const now = deps.clock();
    const existing = startedAt.get(phase);
    if (existing !== undefined) {
      return { now, phaseStartedAt: existing };
    }
    startedAt.set(phase, now);
    return { now, phaseStartedAt: now };
  }

  function phaseCounts(
    phase: RehearsalPhase,
    counts: Record<AccountPhaseStatusValue, number> | null,
    closing: boolean
  ): PhaseCountInput {
    const numbers = progressCounts({
      phase,
      pickCount: accounts.length,
      counts,
      closing,
    });
    const times = stamp(phase);
    return {
      phase,
      done: numbers.done,
      failed: numbers.failed,
      skipped: numbers.skipped,
      total: numbers.total,
      now: times.now,
      phaseStartedAt: times.phaseStartedAt,
      databaseBytes: state.databaseBytes,
    };
  }

  async function writeRun(phase: RehearsalPhase): Promise<void> {
    await log.writeRun({
      stage: parsed.stage,
      phase,
      snapshotAt: state.snapshotAt,
      now: resolved.runNow,
      flags,
    });
  }

  async function emitProgress(): Promise<void> {
    const phase = state.phase;
    const counts = isAccountPhase(phase) ? await deps.countPhase(phase) : null;
    const line = await log.noteProgress(phaseCounts(phase, counts, false));
    if (line !== null) {
      deps.writeLine(line);
    }
  }

  async function noteAccount(input: { failed: boolean }): Promise<void> {
    state.outcomes.push(input.failed);
    if (!failureWindowTripped(state.outcomes)) {
      return;
    }
    deps.writeLine(`rehearsal stop=error_rate phase=${state.phase}`);
    await log.recordStop({ phase: state.phase, now: deps.clock() });
    throw new Error('rehearsal_stopped');
  }

  async function runnableIds(phase: AccountPhase): Promise<string[]> {
    const ids = await deps.listRunnable(phase, parsed.retryFailed);
    if (parsed.limit === null) {
      return ids;
    }
    return ids.slice(0, parsed.limit);
  }

  const context: RehearsalRunContext = {
    stage: parsed.stage,
    runId: resolved.runId,
    runNow: resolved.runNow,
    wallClock: () => deps.clock(),
    flags,
    accounts,
    log,
    emitProgress,
    noteAccount,
    runnableIds,
    writeLine: (line) => {
      deps.writeLine(line);
    },
  };

  for (const phase of REHEARSAL_PHASES) {
    if (parsed.phase !== null && parsed.phase !== phase) {
      continue;
    }
    state.phase = phase;
    await writeRun(phase);
    const bytes = await deps.dumpPhase(
      dumpFilePath(defaultRehearsalRoot(), resolved.runId, phase)
    );
    state.databaseBytes = bytes;
    await log.recordDump({ phase, bytes, now: deps.clock() });
    if (isAccountPhase(phase)) {
      const counts = await deps.countPhase(phase);
      await log.replacePhaseCounts(phaseCounts(phase, counts, false));
    }
    state.outcomes = [];
    const snapshotBefore = state.snapshotAt;
    await runHandler(phase, context, deps, state);
    if (state.snapshotAt !== snapshotBefore) {
      await writeRun(phase);
    }
    const closingCounts = isAccountPhase(phase) ? await deps.countPhase(phase) : null;
    const line = await log.finishPhase(phaseCounts(phase, closingCounts, true));
    deps.writeLine(line);
  }
}

function isAccountPhase(phase: RehearsalPhase): phase is AccountPhase {
  return phase !== 'preflight';
}

async function runHandler(
  phase: RehearsalPhase,
  context: RehearsalRunContext,
  deps: RehearsalDeps,
  state: RunState
): Promise<void> {
  if (phase === 'preflight') {
    const returned = await deps.handlers.preflight(context);
    if (typeof returned === 'string') {
      state.snapshotAt = returned;
    }
    return;
  }
  if (!isAccountPhase(phase)) {
    return;
  }
  await runAccountHandler(phase, context, deps);
}

async function runAccountHandler(
  phase: AccountPhase,
  context: RehearsalRunContext,
  deps: RehearsalDeps
): Promise<void> {
  switch (phase) {
    case 'identity':
      await deps.handlers.identity(context);
      return;
    case 'catalog':
      await deps.handlers.catalog(context);
      return;
    case 'library':
      await deps.handlers.library(context);
      return;
    case 'replay':
      await deps.handlers.replay(context);
      return;
    case 'membership':
      await deps.handlers.membership(context);
      return;
    case 'verify':
      await deps.handlers.verify(context);
      return;
  }
}

function defaultRehearsalDeps(): RehearsalDeps {
  return {
    silence: appLoggerSilence(),
    clock: () => new Date(),
    writeLine: (line) => {
      assertProgressLine(line);
      process.stdout.write(`${line}\n`);
    },
    runDirExists: directoryExists,
    readRunFile: readStoredJson('run.json'),
    readPickFile: readStoredJson('pick.json'),
    openLog: (input) => openRehearsalLog({ runId: input.runId, now: input.now }),
    ensureCleanDump: (filePath) => writeCleanDumpIfMissing(filePath),
    cleanDumpExists,
    disconnectOtherClients: () => disconnectOtherLocalClients(),
    restoreClean: (filePath) => restoreCleanDump(filePath),
    closePools: () => closeLocalPools(),
    openPools: () => openLocalPools(),
    dumpPhase: (filePath) => dumpPhaseFile(filePath),
    pick: (input) => pickStageAccounts(input),
    countPhase: (phase) => countAccountPhaseStatus(phase),
    listRunnable: (phase, includeFailed) => listAccountPhaseV4UserIds(phase, { includeFailed }),
    handlers: {
      preflight: runPreflightPhase,
      identity: runIdentityPhase,
      catalog: runCatalogPhase,
      library: runLibraryPhase,
      replay: runReplayPhase,
      membership: runMembershipPhase,
      verify: runVerifyPhase,
    },
  };
}

function appLoggerSilence(): RehearsalDeps['silence'] {
  let storedLevel: string | undefined;
  return {
    pause(): void {
      // The app logger stays quiet so process stdout is the rehearsal progress lines.
      const logger = getLogger();
      storedLevel = logger.level;
      logger.level = 'silent';
    },
    resume(): void {
      if (storedLevel === undefined) {
        return;
      }
      getLogger().level = storedLevel;
    },
  };
}

async function directoryExists(runDir: string): Promise<boolean> {
  try {
    await access(runDir);
    return true;
  } catch {
    return false;
  }
}

function readStoredJson(fileName: 'run.json' | 'pick.json'): (runDir: string) => Promise<unknown> {
  return async (runDir: string) => {
    try {
      const text = await readFile(path.join(runDir, fileName), 'utf8');
      const parsed: unknown = JSON.parse(text);
      return parsed;
    } catch {
      throw new Error('invalid_run_file');
    }
  };
}

async function closeLocalPools(): Promise<void> {
  const read = getDataSourceRead();
  const readWrite = getDataSourceReadWrite();
  await destroyIfInitialized(read);
  if (readWrite !== read) {
    await destroyIfInitialized(readWrite);
  }
}

async function destroyIfInitialized(source: DataSource): Promise<void> {
  if (source.isInitialized) {
    await source.destroy();
  }
}

async function openLocalPools(): Promise<void> {
  const read = getDataSourceRead();
  const readWrite = getDataSourceReadWrite();
  await read.initialize();
  if (readWrite !== read) {
    await readWrite.initialize();
  }
}
