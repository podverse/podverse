import { desc, eq, inArray } from 'drizzle-orm';

import { getDb, initializeDatabase, schema } from '../db';
import type { SyncEventLogRow } from '../db/schema';
import type { SyncEventLogDetails, SyncEventLogEntry, SyncEventOutcome } from './syncEventLog';
import {
  isSyncEventOutcome,
  parseSyncEventLogDetails,
  selectSyncEventEvictions,
  serializeSyncEventLogDetails,
  SYNC_EVENT_LOG_CAP,
} from './syncEventLog';

/**
 * The capped store behind the error log.
 *
 * Only failures, skips, and directory reconciles are written. Successes are the overwhelming
 * majority of sync work — a single library pass settles dozens of jobs — so recording them would
 * turn a diagnostic log into a transcript, and the entries worth keeping would be the ones squeezed
 * out. Leaving them out means the cap can only ever be reached by things that went wrong or by a
 * follow the directory no longer has, which is when it should be.
 */

export type SyncEventLogAppend = {
  details?: SyncEventLogDetails;
  errorCode: string | null;
  jobKind: string;
  message: string | null;
  occurredAt: number;
  outcome: Exclude<SyncEventOutcome, 'success'>;
};

const toEntry = (row: SyncEventLogRow): SyncEventLogEntry | null => {
  if (!isSyncEventOutcome(row.outcome)) {
    return null;
  }
  return {
    details: parseSyncEventLogDetails(row.detailsJson),
    errorCode: row.errorCode,
    id: row.id,
    jobKind: row.jobKind,
    message: row.message,
    occurredAt: row.occurredAt,
    outcome: row.outcome,
  };
};

/**
 * Trim back to the cap. The candidate read is unfiltered because the retention rule needs to see
 * every row to know which ones it is allowed to drop, and at 200 narrow rows that is cheap enough
 * to prefer over a second copy of the rule expressed in SQL.
 */
const evictOverflow = async (): Promise<void> => {
  const candidates = await getDb()
    .select({
      id: schema.syncEventLog.id,
      occurredAt: schema.syncEventLog.occurredAt,
      outcome: schema.syncEventLog.outcome,
    })
    .from(schema.syncEventLog);

  const evictable = candidates.flatMap((row) =>
    isSyncEventOutcome(row.outcome)
      ? [{ id: row.id, occurredAt: row.occurredAt, outcome: row.outcome }]
      : []
  );

  const evictedIds = selectSyncEventEvictions(evictable, SYNC_EVENT_LOG_CAP);
  if (evictedIds.length === 0) {
    return;
  }

  await getDb().delete(schema.syncEventLog).where(inArray(schema.syncEventLog.id, evictedIds));
};

export const syncEventLogRepository = {
  /**
   * Record an outcome, then trim. Callers are listeners on a queue that must keep draining, or a
   * player reporting an error, so this never throws: a log that cannot be written is a worse
   * problem to surface than the failure it was trying to describe.
   */
  append: async (event: SyncEventLogAppend): Promise<void> => {
    try {
      await initializeDatabase();
      await getDb()
        .insert(schema.syncEventLog)
        .values({
          detailsJson: serializeSyncEventLogDetails(event.details),
          errorCode: event.errorCode,
          jobKind: event.jobKind,
          message: event.message,
          occurredAt: event.occurredAt,
          outcome: event.outcome,
        });
      await evictOverflow();
    } catch {
      // Nothing to escalate to: the user already sees no error for the sync failure itself.
    }
  },

  clear: async (): Promise<void> => {
    await initializeDatabase();
    await getDb().delete(schema.syncEventLog);
  },

  /** One entry for the detail screen. Null when it was cleared or evicted since the list loaded. */
  getById: async (id: number): Promise<SyncEventLogEntry | null> => {
    await initializeDatabase();
    const rows = await getDb()
      .select()
      .from(schema.syncEventLog)
      .where(eq(schema.syncEventLog.id, id))
      .limit(1);
    const row = rows[0];
    return row === undefined ? null : toEntry(row);
  },

  /** Newest first, which is both the reading order and the order that matters when it is long. */
  list: async (): Promise<SyncEventLogEntry[]> => {
    await initializeDatabase();
    await evictOverflow();
    const rows = await getDb()
      .select()
      .from(schema.syncEventLog)
      .orderBy(desc(schema.syncEventLog.occurredAt), desc(schema.syncEventLog.id));

    return rows.flatMap((row) => {
      const entry = toEntry(row);
      return entry === null ? [] : [entry];
    });
  },
};
