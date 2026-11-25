import type { QueueHistoryLimitNotice } from '@podverse/helpers';
import {
  QUEUE_RESOURCE_DEFAULT_LIMIT,
  queueResourceLimitFor,
  shouldShowQueueHistoryLimitNotice,
} from '@podverse/helpers';

import { getDataSourceRead, getDataSourceReadWrite } from '../../context.js';

export type AcknowledgeQueueHistoryLimitNoticeResult =
  | { outcome: 'saved'; notice: QueueHistoryLimitNotice }
  | { outcome: 'stale'; limit: number }
  | { outcome: 'missing' };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function rowsOf(result: unknown): Record<string, unknown>[] {
  if (!Array.isArray(result)) {
    return [];
  }
  return result.filter(isRecord);
}

function readNullableInt(value: unknown): number | null {
  if (typeof value === 'number' && Number.isInteger(value)) {
    return value;
  }
  if (typeof value === 'string' && /^-?\d+$/.test(value)) {
    return Number.parseInt(value, 10);
  }
  return null;
}

function noticeFor(input: {
  acknowledgedLimit: number | null;
  largestQueueCount: number;
  limit: number;
}): QueueHistoryLimitNotice {
  return {
    show: shouldShowQueueHistoryLimitNotice(input),
    limit: input.limit,
    at_limit: input.largestQueueCount >= input.limit,
  };
}

/** Reads the notice. Skips the queue count when this cap was already acknowledged. */
export async function readQueueHistoryLimitNotice(
  accountId: number
): Promise<QueueHistoryLimitNotice | null> {
  const rows = rowsOf(
    await getDataSourceRead().manager.query(
      `SELECT max_queue_resources, queue_history_limit_notice_limit
       FROM account_membership_status
       WHERE account_id = $1`,
      [accountId]
    )
  );
  const row = rows[0];
  if (row === undefined) {
    return null;
  }
  const limit = queueResourceLimitFor(readNullableInt(row.max_queue_resources));
  const acknowledgedLimit = readNullableInt(row.queue_history_limit_notice_limit);
  if (acknowledgedLimit === limit) {
    return { show: false, limit, at_limit: false };
  }
  const countRows = rowsOf(
    await getDataSourceRead().manager.query(
      `SELECT COALESCE(MAX(resource_count), 0)::int AS largest
       FROM (
         SELECT COUNT(*)::int AS resource_count
         FROM queue q
         INNER JOIN queue_resource qr ON qr.queue_id = q.id
         WHERE q.account_id = $1
         GROUP BY q.id
       ) counts`,
      [accountId]
    )
  );
  const largestQueueCount = readNullableInt(countRows[0]?.largest) ?? 0;
  return noticeFor({ acknowledgedLimit, largestQueueCount, limit });
}

/**
 * Stores the acknowledgement only when the posted cap is still the effective cap.
 * A mismatch leaves the stored acknowledgement unchanged.
 */
export async function acknowledgeQueueHistoryLimitNotice(
  accountId: number,
  limit: number
): Promise<AcknowledgeQueueHistoryLimitNoticeResult> {
  const updated = rowsOf(
    await getDataSourceReadWrite().manager.query(
      `UPDATE account_membership_status
       SET queue_history_limit_notice_limit = $2
       WHERE account_id = $1
         AND COALESCE(max_queue_resources, $3) = $2
       RETURNING queue_history_limit_notice_limit`,
      [accountId, limit, QUEUE_RESOURCE_DEFAULT_LIMIT]
    )
  );
  if (updated.length > 0) {
    return {
      outcome: 'saved',
      notice: { show: false, limit, at_limit: false },
    };
  }
  const current = rowsOf(
    await getDataSourceReadWrite().manager.query(
      `SELECT max_queue_resources
       FROM account_membership_status
       WHERE account_id = $1`,
      [accountId]
    )
  );
  const row = current[0];
  if (row === undefined) {
    return { outcome: 'missing' };
  }
  return {
    outcome: 'stale',
    limit: queueResourceLimitFor(readNullableInt(row.max_queue_resources)),
  };
}
