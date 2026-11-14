export const ACCOUNT_PHASES = [
  'identity',
  'catalog',
  'library',
  'replay',
  'membership',
  'verify',
] as const;

export const ACCOUNT_PHASE_STATUSES = [
  'pending',
  'done',
  'failed',
  'deferred',
  'needs_operator',
] as const;

export const ACCOUNT_PHASE_STATUS_CHUNK = 500;

export const STATUS_UPSERT_GUARD =
  "account_phase_status.status <> 'done' OR EXCLUDED.status = 'done'";

export type AccountPhase = (typeof ACCOUNT_PHASES)[number];

export type AccountPhaseStatusValue = (typeof ACCOUNT_PHASE_STATUSES)[number];

export type SetAccountPhaseStatusResult =
  { applied: true } | { applied: false; reason: 'done_is_terminal' };

export type AccountPhaseStatusInputErrorCode =
  | 'invalid_v4_user_id'
  | 'invalid_phase'
  | 'invalid_status'
  | 'invalid_error_class'
  | 'invalid_account_id'
  | 'invalid_include_failed'
  | 'account_mismatch';

const ERROR_CLASS_PATTERN = /^[A-Za-z0-9_:]+$/;

/**
 * Phase and status rules for one v4 user. A row stores the v4 user id and a
 * short error token, never an email, a name, or a raw row.
 */
export class AccountPhaseStatusInputError extends Error {
  readonly code: AccountPhaseStatusInputErrorCode;

  constructor(code: AccountPhaseStatusInputErrorCode) {
    super(code);
    this.name = 'AccountPhaseStatusInputError';
    this.code = code;
  }
}

export function assertV4UserId(value: unknown): string {
  if (typeof value !== 'string' || value.length < 1 || value.length > 32) {
    throw new AccountPhaseStatusInputError('invalid_v4_user_id');
  }
  if (/\s/.test(value) || value.includes('@')) {
    throw new AccountPhaseStatusInputError('invalid_v4_user_id');
  }
  return value;
}

export function assertPhase(value: unknown): AccountPhase {
  for (const phase of ACCOUNT_PHASES) {
    if (value === phase) {
      return phase;
    }
  }
  throw new AccountPhaseStatusInputError('invalid_phase');
}

export function assertStatus(value: unknown): AccountPhaseStatusValue {
  for (const status of ACCOUNT_PHASE_STATUSES) {
    if (value === status) {
      return status;
    }
  }
  throw new AccountPhaseStatusInputError('invalid_status');
}

export function assertErrorClass(status: AccountPhaseStatusValue, value: unknown): string | null {
  if (status === 'pending' || status === 'done') {
    if (value === null || value === undefined) {
      return null;
    }
    throw new AccountPhaseStatusInputError('invalid_error_class');
  }
  if (
    typeof value !== 'string' ||
    value.length < 1 ||
    value.length > 80 ||
    !ERROR_CLASS_PATTERN.test(value)
  ) {
    throw new AccountPhaseStatusInputError('invalid_error_class');
  }
  return value;
}

export function assertAccountId(value: unknown): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 1) {
    throw new AccountPhaseStatusInputError('invalid_account_id');
  }
  return value;
}

export function assertIncludeFailed(value: unknown): boolean {
  if (typeof value !== 'boolean') {
    throw new AccountPhaseStatusInputError('invalid_include_failed');
  }
  return value;
}

export function isRunnableStatus(status: AccountPhaseStatusValue, includeFailed: boolean): boolean {
  switch (status) {
    case 'pending':
      return true;
    case 'failed':
      return includeFailed;
    case 'done':
    case 'deferred':
    case 'needs_operator':
      return false;
    default: {
      const unreachable: never = status;
      return unreachable;
    }
  }
}

export function uniqueInOrder(ids: readonly string[]): string[] {
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const id of ids) {
    if (!seen.has(id)) {
      seen.add(id);
      unique.push(id);
    }
  }
  return unique;
}

export function chunkIds(ids: readonly string[]): string[][] {
  const chunks: string[][] = [];
  for (let index = 0; index < ids.length; index += ACCOUNT_PHASE_STATUS_CHUNK) {
    chunks.push(ids.slice(index, index + ACCOUNT_PHASE_STATUS_CHUNK));
  }
  return chunks;
}

export function emptyStatusCounts(): Record<AccountPhaseStatusValue, number> {
  return {
    pending: 0,
    done: 0,
    failed: 0,
    deferred: 0,
    needs_operator: 0,
  };
}
