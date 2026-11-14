import { describe, expect, it } from 'vitest';

import type { AccountPhaseStatusValue } from './accountPhaseStatus.js';
import {
  assertProgressLine,
  failureWindowTripped,
  parseStoredPick,
  parseStoredRun,
  progressCounts,
  shouldRestore,
} from './runFullRehearsalLoopLib.js';

const STARTED_AT = '2026-11-13T04:37:00.000Z';
const SNAPSHOT_AT = '2026-11-13T03:00:00.000Z';

function errorMessage(run: () => void): string {
  try {
    run();
  } catch (error) {
    if (error instanceof Error) {
      return error.message;
    }
    throw error;
  }
  throw new Error('expected a throw');
}

function libraryCounts(
  overrides: Partial<Record<AccountPhaseStatusValue, number>> = {}
): Record<AccountPhaseStatusValue, number> {
  return {
    pending: 9,
    done: 10,
    failed: 1,
    deferred: 3,
    needs_operator: 2,
    ...overrides,
  };
}

describe('failureWindowTripped', () => {
  it('is false for 199 true values, false for 200 values of which 10 are true, and true for 200 values of which 11 are true.', () => {
    expect(failureWindowTripped(Array<boolean>(199).fill(true))).toBe(false);
    expect(
      failureWindowTripped([...Array<boolean>(190).fill(false), ...Array<boolean>(10).fill(true)])
    ).toBe(false);
    expect(
      failureWindowTripped([...Array<boolean>(189).fill(false), ...Array<boolean>(11).fill(true)])
    ).toBe(true);
  });
});

describe('shouldRestore', () => {
  it('is create_clean for pilot, restore for sample and full, and none when resume is true or phase is set.', () => {
    expect(shouldRestore({ stage: 'pilot', resume: false, phase: null })).toBe('create_clean');
    expect(shouldRestore({ stage: 'sample', resume: false, phase: null })).toBe('restore');
    expect(shouldRestore({ stage: 'full', resume: false, phase: null })).toBe('restore');
    expect(shouldRestore({ stage: 'sample', resume: true, phase: null })).toBe('none');
    expect(shouldRestore({ stage: 'full', resume: true, phase: null })).toBe('none');
    expect(shouldRestore({ stage: 'pilot', resume: false, phase: 'library' })).toBe('none');
    expect(shouldRestore({ stage: 'sample', resume: false, phase: 'preflight' })).toBe('none');
  });
});

describe('progressCounts', () => {
  it('reports preflight as one step, skips deferred and needs_operator, and throws phase_count_mismatch when the sum exceeds the pick.', () => {
    expect(
      progressCounts({
        phase: 'preflight',
        pickCount: 20,
        counts: libraryCounts(),
        closing: false,
      })
    ).toEqual({ done: 0, failed: 0, skipped: 0, total: 1 });
    expect(
      progressCounts({
        phase: 'preflight',
        pickCount: 20,
        counts: null,
        closing: true,
      })
    ).toEqual({ done: 1, failed: 0, skipped: 0, total: 1 });
    expect(
      progressCounts({
        phase: 'library',
        pickCount: 20,
        counts: libraryCounts(),
        closing: false,
      })
    ).toEqual({ done: 10, failed: 1, skipped: 5, total: 20 });
    expect(
      errorMessage(() =>
        progressCounts({
          phase: 'library',
          pickCount: 20,
          counts: libraryCounts({ done: 16 }),
          closing: true,
        })
      )
    ).toBe('phase_count_mismatch');
    expect(
      errorMessage(() =>
        progressCounts({
          phase: 'library',
          pickCount: 20,
          counts: null,
          closing: false,
        })
      )
    ).toBe('phase_count_mismatch');
  });
});

describe('parseStoredRun', () => {
  it('keeps a parseable startedAt and a snapshot string that Date.parse accepts and that contains neither @ nor ://.', () => {
    const parsed = parseStoredRun(
      {
        stage: 'sample',
        startedAt: STARTED_AT,
        snapshotAt: SNAPSHOT_AT,
        note: 'person@example.com',
      },
      'sample'
    );
    expect(parsed.startedAt).toEqual(new Date(STARTED_AT));
    expect(parsed.snapshotAt).toBe(SNAPSHOT_AT);
    expect(parsed.snapshotAt?.includes('@')).toBe(false);
    expect(parsed.snapshotAt?.includes('://')).toBe(false);
    expect(
      parseStoredRun(
        { stage: 'sample', startedAt: STARTED_AT, snapshotAt: 'person@example.com' },
        'sample'
      ).snapshotAt
    ).toBeNull();
    expect(
      parseStoredRun(
        { stage: 'sample', startedAt: STARTED_AT, snapshotAt: 'postgres://localhost/app' },
        'sample'
      ).snapshotAt
    ).toBeNull();
  });

  it('throws pick_stage_mismatch when the stored stage differs.', () => {
    expect(
      errorMessage(() => parseStoredRun({ stage: 'sample', startedAt: STARTED_AT }, 'full'))
    ).toBe('pick_stage_mismatch');
  });

  it('throws invalid_run_file when startedAt is missing.', () => {
    expect(
      errorMessage(() => parseStoredRun({ stage: 'pilot', snapshotAt: SNAPSHOT_AT }, 'pilot'))
    ).toBe('invalid_run_file');
    expect(errorMessage(() => parseStoredRun(null, 'pilot'))).toBe('invalid_run_file');
  });
});

describe('parseStoredPick', () => {
  it('keeps v4Id and rule strings and drops every other field.', () => {
    expect(
      parseStoredPick({
        accounts: [{ v4Id: 'abc1234', rule: 'paid', email: 'person@example.com' }],
      })
    ).toEqual([{ v4Id: 'abc1234', rule: 'paid' }]);
  });

  it('throws invalid_run_file when accounts is not an array.', () => {
    expect(errorMessage(() => parseStoredPick([{ v4Id: 'abc1234', rule: 'paid' }]))).toBe(
      'invalid_run_file'
    );
    expect(errorMessage(() => parseStoredPick({ accounts: 'abc1234' }))).toBe('invalid_run_file');
    expect(errorMessage(() => parseStoredPick({ accounts: ['abc1234'] }))).toBe('invalid_run_file');
  });
});

describe('assertProgressLine', () => {
  it('accepts rehearsal stop=error_rate phase=library and throws invalid_progress_line for @, ://, a newline, or a line that does not start with rehearsal.', () => {
    expect(() => assertProgressLine('rehearsal stop=error_rate phase=library')).not.toThrow();
    expect(errorMessage(() => assertProgressLine('rehearsal person@example.com'))).toBe(
      'invalid_progress_line'
    );
    expect(errorMessage(() => assertProgressLine('rehearsal postgres://localhost/app'))).toBe(
      'invalid_progress_line'
    );
    expect(errorMessage(() => assertProgressLine('rehearsal phase=library\nnext'))).toBe(
      'invalid_progress_line'
    );
    expect(errorMessage(() => assertProgressLine('phase=library'))).toBe('invalid_progress_line');
  });
});
