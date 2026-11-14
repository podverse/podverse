import { describe, expect, it } from 'vitest';

import type { AccountPhaseStatusValue } from './accountPhaseStatusLib.js';
import {
  ACCOUNT_PHASE_STATUS_CHUNK,
  ACCOUNT_PHASE_STATUSES,
  ACCOUNT_PHASES,
  AccountPhaseStatusInputError,
  assertAccountId,
  assertErrorClass,
  assertIncludeFailed,
  assertPhase,
  assertStatus,
  assertV4UserId,
  chunkIds,
  emptyStatusCounts,
  isRunnableStatus,
  STATUS_UPSERT_GUARD,
  uniqueInOrder,
} from './accountPhaseStatusLib.js';

const ERROR_CODES = [
  'invalid_v4_user_id',
  'invalid_phase',
  'invalid_status',
  'invalid_error_class',
  'invalid_account_id',
  'invalid_include_failed',
  'account_mismatch',
] as const;

const ACCEPTED_ERROR_CLASSES = [
  'unaccounted',
  'needs_operator',
  'db_constraint:playlist_cap',
  'unexpected:TypeError',
  'a'.repeat(80),
];

const REJECTED_ERROR_CLASSES: unknown[] = [null, undefined, '', 'has space', 'a@b', 'a'.repeat(81)];

function thrownCode(run: () => void): string {
  try {
    run();
  } catch (error: unknown) {
    expect(error).toBeInstanceOf(AccountPhaseStatusInputError);
    if (!(error instanceof AccountPhaseStatusInputError)) {
      throw error;
    }
    expect(error.message).toBe(error.code);
    expect(error.name).toBe('AccountPhaseStatusInputError');
    return error.code;
  }
  throw new Error('expected AccountPhaseStatusInputError');
}

function numberedIds(count: number): string[] {
  return Array.from({ length: count }, (_value, index) => String(index + 1));
}

describe('assertV4UserId', () => {
  it('accepts a v4 user id and rejects an empty, long, spaced, or addressed value', () => {
    expect(assertV4UserId('eFv5NFx')).toBe('eFv5NFx');
    expect(thrownCode(() => assertV4UserId(''))).toBe('invalid_v4_user_id');
    expect(thrownCode(() => assertV4UserId('a'.repeat(33)))).toBe('invalid_v4_user_id');
    expect(thrownCode(() => assertV4UserId('has space'))).toBe('invalid_v4_user_id');
    expect(thrownCode(() => assertV4UserId('a@b.example'))).toBe('invalid_v4_user_id');
  });
});

describe('assertPhase', () => {
  it('accepts each phase and rejects preflight and an empty string', () => {
    for (const phase of ACCOUNT_PHASES) {
      expect(assertPhase(phase)).toBe(phase);
    }
    expect(thrownCode(() => assertPhase('preflight'))).toBe('invalid_phase');
    expect(thrownCode(() => assertPhase(''))).toBe('invalid_phase');
  });
});

describe('assertStatus', () => {
  it('accepts each status and rejects skipped', () => {
    for (const status of ACCOUNT_PHASE_STATUSES) {
      expect(assertStatus(status)).toBe(status);
    }
    expect(thrownCode(() => assertStatus('skipped'))).toBe('invalid_status');
  });
});

describe('assertErrorClass', () => {
  it('lets pending and done carry only a null token', () => {
    for (const status of ['pending', 'done'] as const) {
      expect(assertErrorClass(status, null)).toBeNull();
      expect(assertErrorClass(status, undefined)).toBeNull();
      expect(thrownCode(() => assertErrorClass(status, 'unaccounted'))).toBe('invalid_error_class');
    }
  });

  it('requires a short token on failed, deferred, and needs_operator', () => {
    for (const status of ['failed', 'deferred', 'needs_operator'] as const) {
      for (const errorClass of ACCEPTED_ERROR_CLASSES) {
        expect(assertErrorClass(status, errorClass)).toBe(errorClass);
      }
      for (const errorClass of REJECTED_ERROR_CLASSES) {
        expect(thrownCode(() => assertErrorClass(status, errorClass))).toBe('invalid_error_class');
      }
    }
  });
});

describe('assertAccountId', () => {
  it('accepts a positive integer and rejects zero, a negative, a fraction, and NaN', () => {
    expect(assertAccountId(1)).toBe(1);
    for (const value of [0, -1, 1.5, Number.NaN]) {
      expect(thrownCode(() => assertAccountId(value))).toBe('invalid_account_id');
    }
  });
});

describe('assertIncludeFailed', () => {
  it('returns a boolean unchanged and rejects undefined', () => {
    expect(assertIncludeFailed(true)).toBe(true);
    expect(assertIncludeFailed(false)).toBe(false);
    expect(thrownCode(() => assertIncludeFailed(undefined))).toBe('invalid_include_failed');
  });
});

describe('isRunnableStatus', () => {
  it('runs pending always, failed only when asked, and leaves the other statuses', () => {
    const cases: Array<[AccountPhaseStatusValue, boolean, boolean]> = [
      ['pending', false, true],
      ['pending', true, true],
      ['failed', false, false],
      ['failed', true, true],
      ['done', false, false],
      ['done', true, false],
      ['deferred', false, false],
      ['deferred', true, false],
      ['needs_operator', false, false],
      ['needs_operator', true, false],
    ];
    for (const [status, includeFailed, runnable] of cases) {
      expect(isRunnableStatus(status, includeFailed)).toBe(runnable);
    }
  });
});

describe('uniqueInOrder', () => {
  it('keeps the first of a repeated id and the original order', () => {
    expect(uniqueInOrder(['eFv5NFx', 'abc1234', 'eFv5NFx', 'zzz9999', 'abc1234'])).toEqual([
      'eFv5NFx',
      'abc1234',
      'zzz9999',
    ]);
  });
});

describe('chunkIds', () => {
  it('splits after 500 ids', () => {
    expect(ACCOUNT_PHASE_STATUS_CHUNK).toBe(500);
    expect(chunkIds([])).toEqual([]);
    const fiveHundred = numberedIds(500);
    expect(chunkIds(fiveHundred)).toEqual([fiveHundred]);
    const fiveHundredOne = numberedIds(501);
    expect(chunkIds(fiveHundredOne)).toEqual([
      fiveHundredOne.slice(0, 500),
      fiveHundredOne.slice(500),
    ]);
  });
});

describe('emptyStatusCounts', () => {
  it('starts every status at zero', () => {
    expect(emptyStatusCounts()).toEqual({
      pending: 0,
      done: 0,
      failed: 0,
      deferred: 0,
      needs_operator: 0,
    });
  });
});

describe('STATUS_UPSERT_GUARD', () => {
  it('keeps a done row from being replaced', () => {
    expect(STATUS_UPSERT_GUARD).toBe(
      "account_phase_status.status <> 'done' OR EXCLUDED.status = 'done'"
    );
  });
});

describe('AccountPhaseStatusInputError', () => {
  it('uses the code as the message', () => {
    for (const code of ERROR_CODES) {
      const error = new AccountPhaseStatusInputError(code);
      expect(error.message).toBe(error.code);
      expect(error.message).toBe(code);
      expect(error.name).toBe('AccountPhaseStatusInputError');
    }
  });
});
