export * from './accountPhaseStatusLib.js';

import { AppDataSourceReadWrite } from '@orm/db/index.js';

import type {
  AccountPhase,
  AccountPhaseStatusValue,
  SetAccountPhaseStatusResult,
} from './accountPhaseStatusLib.js';
import {
  ACCOUNT_PHASE_STATUSES,
  AccountPhaseStatusInputError,
  assertAccountId,
  assertErrorClass,
  assertIncludeFailed,
  assertPhase,
  assertStatus,
  assertV4UserId,
  chunkIds,
  emptyStatusCounts,
  STATUS_UPSERT_GUARD,
  uniqueInOrder,
} from './accountPhaseStatusLib.js';

const RESULT_SHAPE = 'account_phase_status_result';

const MISMATCH_BATCH_SQL = `
SELECT 1 AS mismatch
FROM account_phase_status
WHERE v4_user_id = ANY($1::text[])
  AND account_id IS NOT NULL
GROUP BY v4_user_id
HAVING count(DISTINCT account_id) > 1
LIMIT 1
`;

const MISMATCH_ONE_SQL = `
SELECT 1 AS mismatch
FROM account_phase_status
WHERE v4_user_id = $1
  AND account_id IS NOT NULL
  AND account_id <> $2
LIMIT 1
`;

const ENSURE_INSERT_SQL = `
WITH incoming AS (
  SELECT DISTINCT id
  FROM unnest($1::text[]) AS t(id)
),
inserted AS (
  INSERT INTO account_phase_status (v4_user_id, phase, status, account_id)
  SELECT i.id, $2, 'pending', src.account_id
  FROM incoming i
  LEFT JOIN LATERAL (
    SELECT s.account_id
    FROM account_phase_status s
    WHERE s.v4_user_id = i.id
      AND s.account_id IS NOT NULL
    ORDER BY s.account_id
    LIMIT 1
  ) src ON true
  ON CONFLICT (v4_user_id, phase) DO NOTHING
  RETURNING v4_user_id
)
SELECT count(*)::int AS inserted FROM inserted
`;

const BACKFILL_SQL = `
UPDATE account_phase_status AS target
SET account_id = src.account_id
FROM (
  SELECT v4_user_id, min(account_id) AS account_id
  FROM account_phase_status
  WHERE v4_user_id = ANY($1::text[])
    AND account_id IS NOT NULL
  GROUP BY v4_user_id
) AS src
WHERE target.v4_user_id = src.v4_user_id
  AND target.account_id IS NULL
`;

const SET_UPSERT_SQL = `
WITH upserted AS (
  INSERT INTO account_phase_status (
    v4_user_id, phase, status, account_id, error_class
  )
  VALUES ($1, $2, $3, $4, $5)
  ON CONFLICT (v4_user_id, phase) DO UPDATE
  SET status = EXCLUDED.status,
      error_class = EXCLUDED.error_class,
      account_id = COALESCE(EXCLUDED.account_id, account_phase_status.account_id)
  WHERE ${STATUS_UPSERT_GUARD}
  RETURNING v4_user_id
)
SELECT count(*)::int AS applied FROM upserted
`;

const MANY_UPSERT_SQL = `
WITH incoming AS (
  SELECT DISTINCT id
  FROM unnest($1::text[]) AS t(id)
),
upserted AS (
  INSERT INTO account_phase_status (v4_user_id, phase, status, error_class, account_id)
  SELECT i.id, $2, $3, $4, src.account_id
  FROM incoming i
  LEFT JOIN LATERAL (
    SELECT s.account_id
    FROM account_phase_status s
    WHERE s.v4_user_id = i.id
      AND s.account_id IS NOT NULL
    ORDER BY s.account_id
    LIMIT 1
  ) src ON true
  ON CONFLICT (v4_user_id, phase) DO UPDATE
  SET status = EXCLUDED.status,
      error_class = EXCLUDED.error_class
  WHERE ${STATUS_UPSERT_GUARD}
  RETURNING v4_user_id
)
SELECT count(*)::int AS applied FROM upserted
`;

const LINK_SQL = `
UPDATE account_phase_status
SET account_id = $2
WHERE v4_user_id = $1
  AND account_id IS NULL
`;

const LIST_RUNNABLE_SQL = `
SELECT v4_user_id
FROM account_phase_status
WHERE phase = $1
  AND (
    status = 'pending'
    OR ($2::boolean IS TRUE AND status = 'failed')
  )
ORDER BY v4_user_id ASC
`;

const LIST_BY_STATUS_SQL = `
SELECT v4_user_id
FROM account_phase_status
WHERE phase = $1
  AND status = $2
ORDER BY v4_user_id ASC
`;

const COUNT_SQL = `
SELECT status, count(*)::int AS n
FROM account_phase_status
WHERE phase = $1
GROUP BY status
`;

/**
 * Writes account_phase_status. A done row stays done unless the same call
 * writes done again. Linking an account id does not change status.
 */
export class AccountPhaseStatusService {
  async ensureAccountPhaseRows(
    v4UserIds: readonly string[],
    phase: AccountPhase
  ): Promise<{ inserted: number }> {
    const checkedPhase = assertPhase(phase);
    const ids = uniqueInOrder(v4UserIds).map((id) => assertV4UserId(id));
    if (ids.length === 0) {
      return { inserted: 0 };
    }
    return AppDataSourceReadWrite.transaction(async (manager) => {
      let inserted = 0;
      for (const chunk of chunkIds(ids)) {
        assertNoMismatch(await manager.query(MISMATCH_BATCH_SQL, [chunk]));
        const count = readCount(
          await manager.query(ENSURE_INSERT_SQL, [chunk, checkedPhase]),
          'inserted'
        );
        if (count > chunk.length) {
          throw new Error(RESULT_SHAPE);
        }
        inserted += count;
        assertWritableResult(await manager.query(BACKFILL_SQL, [chunk]));
      }
      return { inserted };
    });
  }

  async setAccountPhaseStatus(input: {
    v4UserId: string;
    phase: AccountPhase;
    status: AccountPhaseStatusValue;
    accountId?: number;
    errorClass?: string | null;
  }): Promise<SetAccountPhaseStatusResult> {
    const phase = assertPhase(input.phase);
    const status = assertStatus(input.status);
    const v4UserId = assertV4UserId(input.v4UserId);
    const errorClass = assertErrorClass(status, input.errorClass);
    const accountId = input.accountId === undefined ? null : assertAccountId(input.accountId);
    return AppDataSourceReadWrite.transaction(
      async (manager): Promise<SetAccountPhaseStatusResult> => {
        if (accountId !== null) {
          assertNoMismatch(await manager.query(MISMATCH_ONE_SQL, [v4UserId, accountId]));
        }
        const applied = readCount(
          await manager.query(SET_UPSERT_SQL, [v4UserId, phase, status, accountId, errorClass]),
          'applied'
        );
        if (applied === 0) {
          return { applied: false, reason: 'done_is_terminal' };
        }
        if (applied !== 1) {
          throw new Error(RESULT_SHAPE);
        }
        if (accountId !== null) {
          assertWritableResult(await manager.query(LINK_SQL, [v4UserId, accountId]));
        }
        return { applied: true };
      }
    );
  }

  async setAccountPhaseStatusMany(input: {
    v4UserIds: readonly string[];
    phase: AccountPhase;
    status: AccountPhaseStatusValue;
    errorClass?: string | null;
  }): Promise<{ applied: number; refusedDone: number }> {
    const phase = assertPhase(input.phase);
    const status = assertStatus(input.status);
    const errorClass = assertErrorClass(status, input.errorClass);
    const ids = uniqueInOrder(input.v4UserIds).map((id) => assertV4UserId(id));
    if (ids.length === 0) {
      return { applied: 0, refusedDone: 0 };
    }
    return AppDataSourceReadWrite.transaction(async (manager) => {
      let applied = 0;
      for (const chunk of chunkIds(ids)) {
        assertNoMismatch(await manager.query(MISMATCH_BATCH_SQL, [chunk]));
        const count = readCount(
          await manager.query(MANY_UPSERT_SQL, [chunk, phase, status, errorClass]),
          'applied'
        );
        if (count > chunk.length) {
          throw new Error(RESULT_SHAPE);
        }
        applied += count;
        assertWritableResult(await manager.query(BACKFILL_SQL, [chunk]));
      }
      if (applied > ids.length) {
        throw new Error(RESULT_SHAPE);
      }
      return { applied, refusedDone: ids.length - applied };
    });
  }

  async linkAccountPhaseStatus(v4UserId: string, accountId: number): Promise<void> {
    const checkedV4UserId = assertV4UserId(v4UserId);
    const checkedAccountId = assertAccountId(accountId);
    await AppDataSourceReadWrite.transaction(async (manager) => {
      assertNoMismatch(await manager.query(MISMATCH_ONE_SQL, [checkedV4UserId, checkedAccountId]));
      assertWritableResult(await manager.query(LINK_SQL, [checkedV4UserId, checkedAccountId]));
    });
  }

  async listAccountPhaseV4UserIds(
    phase: AccountPhase,
    options: { includeFailed: boolean }
  ): Promise<string[]> {
    const checkedPhase = assertPhase(phase);
    const includeFailed = assertIncludeFailed(options.includeFailed);
    return readV4UserIds(
      await AppDataSourceReadWrite.manager.query(LIST_RUNNABLE_SQL, [checkedPhase, includeFailed])
    );
  }

  async listAccountPhaseV4UserIdsByStatus(
    phase: AccountPhase,
    status: AccountPhaseStatusValue
  ): Promise<string[]> {
    const checkedPhase = assertPhase(phase);
    const checkedStatus = assertStatus(status);
    return readV4UserIds(
      await AppDataSourceReadWrite.manager.query(LIST_BY_STATUS_SQL, [checkedPhase, checkedStatus])
    );
  }

  async countAccountPhaseStatus(
    phase: AccountPhase
  ): Promise<Record<AccountPhaseStatusValue, number>> {
    const checkedPhase = assertPhase(phase);
    return readStatusCounts(await AppDataSourceReadWrite.manager.query(COUNT_SQL, [checkedPhase]));
  }
}

function assertNoMismatch(rows: unknown): void {
  if (!isUnknownArray(rows)) {
    throw new Error(RESULT_SHAPE);
  }
  if (rows.length === 0) {
    return;
  }
  const row = rows[0];
  if (rows.length !== 1 || !isRecord(row)) {
    throw new Error(RESULT_SHAPE);
  }
  throw new AccountPhaseStatusInputError('account_mismatch');
}

function assertWritableResult(result: unknown): void {
  if (!isUnknownArray(result)) {
    throw new Error(RESULT_SHAPE);
  }
}

function readCount(rows: unknown, key: 'inserted' | 'applied'): number {
  if (!isUnknownArray(rows) || rows.length !== 1) {
    throw new Error(RESULT_SHAPE);
  }
  const row = rows[0];
  if (!isRecord(row)) {
    throw new Error(RESULT_SHAPE);
  }
  const count = row[key];
  if (typeof count !== 'number' || !Number.isSafeInteger(count) || count < 0) {
    throw new Error(RESULT_SHAPE);
  }
  return count;
}

function readV4UserIds(rows: unknown): string[] {
  if (!isUnknownArray(rows)) {
    throw new Error(RESULT_SHAPE);
  }
  const ids: string[] = [];
  for (const row of rows) {
    if (!isV4UserIdRow(row)) {
      throw new Error(RESULT_SHAPE);
    }
    ids.push(row.v4_user_id);
  }
  return ids;
}

function readStatusCounts(rows: unknown): Record<AccountPhaseStatusValue, number> {
  if (!isUnknownArray(rows)) {
    throw new Error(RESULT_SHAPE);
  }
  const counts = emptyStatusCounts();
  for (const row of rows) {
    if (!isStatusCountRow(row) || !isAccountPhaseStatusValue(row.status)) {
      throw new Error(RESULT_SHAPE);
    }
    counts[row.status] = row.n;
  }
  return counts;
}

function isUnknownArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isV4UserIdRow(value: unknown): value is { v4_user_id: string } {
  return isRecord(value) && typeof value.v4_user_id === 'string';
}

function isStatusCountRow(value: unknown): value is { status: string; n: number } {
  return (
    isRecord(value) &&
    typeof value.status === 'string' &&
    typeof value.n === 'number' &&
    Number.isSafeInteger(value.n) &&
    value.n >= 0
  );
}

function isAccountPhaseStatusValue(value: string): value is AccountPhaseStatusValue {
  for (const status of ACCOUNT_PHASE_STATUSES) {
    if (value === status) {
      return true;
    }
  }
  return false;
}
