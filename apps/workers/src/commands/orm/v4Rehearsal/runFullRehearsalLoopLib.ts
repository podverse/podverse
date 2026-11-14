import type { AccountPhaseStatusValue } from './accountPhaseStatus.js';
import type { RehearsalPhase, RehearsalStage } from './rehearsalLog.js';

export const FAILURE_WINDOW = 200;

export function failureWindowTripped(outcomes: readonly boolean[]): boolean {
  const window = outcomes.slice(-FAILURE_WINDOW);
  if (window.length < FAILURE_WINDOW) {
    return false;
  }
  let failed = 0;
  for (const outcome of window) {
    if (outcome) {
      failed += 1;
    }
  }
  return failed / FAILURE_WINDOW > 0.05;
}

export function shouldRestore(input: {
  stage: RehearsalStage;
  resume: boolean;
  phase: RehearsalPhase | null;
}): 'none' | 'create_clean' | 'restore' {
  if (input.resume || input.phase !== null) {
    return 'none';
  }
  if (input.stage === 'pilot') {
    return 'create_clean';
  }
  return 'restore';
}

export function progressCounts(input: {
  phase: RehearsalPhase;
  pickCount: number;
  counts: Record<AccountPhaseStatusValue, number> | null;
  closing: boolean;
}): { done: number; failed: number; skipped: number; total: number } {
  if (input.phase === 'preflight') {
    return {
      done: input.closing ? 1 : 0,
      failed: 0,
      skipped: 0,
      total: 1,
    };
  }
  if (input.counts === null) {
    throw new Error('phase_count_mismatch');
  }
  const done = input.counts.done;
  const failed = input.counts.failed;
  const skipped = input.counts.deferred + input.counts.needs_operator;
  const total = input.pickCount;
  if (done + failed + skipped > total) {
    throw new Error('phase_count_mismatch');
  }
  return { done, failed, skipped, total };
}

export function parseStoredRun(
  value: unknown,
  stage: RehearsalStage
): { startedAt: Date; snapshotAt: string | null } {
  if (!isRecord(value)) {
    throw new Error('invalid_run_file');
  }
  if (value.stage !== stage) {
    throw new Error('pick_stage_mismatch');
  }
  const startedAt = value.startedAt;
  if (typeof startedAt !== 'string' || Number.isNaN(Date.parse(startedAt))) {
    throw new Error('invalid_run_file');
  }
  return {
    startedAt: new Date(startedAt),
    snapshotAt: snapshotOrNull(value.snapshotAt),
  };
}

export function parseStoredPick(value: unknown): Array<{ v4Id: string; rule: string }> {
  if (!isRecord(value) || !Array.isArray(value.accounts)) {
    throw new Error('invalid_run_file');
  }
  const accounts: Array<{ v4Id: string; rule: string }> = [];
  for (const element of value.accounts) {
    if (
      !isRecord(element) ||
      typeof element.v4Id !== 'string' ||
      typeof element.rule !== 'string'
    ) {
      throw new Error('invalid_run_file');
    }
    accounts.push({ v4Id: element.v4Id, rule: element.rule });
  }
  return accounts;
}

export function assertProgressLine(line: string): void {
  if (
    !line.startsWith('rehearsal ') ||
    line.includes('@') ||
    line.includes('://') ||
    line.includes('\n') ||
    line.includes('\r')
  ) {
    throw new Error('invalid_progress_line');
  }
}

function snapshotOrNull(value: unknown): string | null {
  if (typeof value !== 'string') {
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
