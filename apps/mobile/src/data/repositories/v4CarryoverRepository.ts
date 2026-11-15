import { and, eq, inArray } from 'drizzle-orm';

import type { V4StagedEntry, V4StagedLegacyKind } from '../../migration/v4/parseV4LocalState';
import { getDb, initializeDatabase, schema } from '../db';

const READ_AT_KEY = 'v4_carryover.read_at';
const COPY_ALLOWED_KEY = 'v4_carryover.copy_allowed';
const COPY_ALLOWED_VALUE = '1';
const INSERT_CHUNK = 80;

export type V4CarryoverStatus = 'pending' | 'subscribed' | 'add_by_rss' | 'blocked' | 'waiting';

/** Error-log code for one finished carryover pass. The four counts live on the entry's detail fields. */
export const V4_CARRYOVER_DONE_CODE = 'v4_carryover_done';

export type V4CarryoverRow = V4StagedEntry & {
  attempts: number;
  status: V4CarryoverStatus;
  updatedAt: number;
};

export type V4CarryoverCounts = {
  byKind: Record<V4StagedLegacyKind, number>;
  byStatus: Record<V4CarryoverStatus, number>;
  total: number;
  withCachedFeedUrl: number;
  withCachedTitle: number;
};

const CARRYOVER_STATUSES = [
  'pending',
  'subscribed',
  'add_by_rss',
  'blocked',
  'waiting',
] as const satisfies readonly V4CarryoverStatus[];

const isLegacyKind = (value: string): value is V4StagedLegacyKind =>
  value === 'podcast' || value === 'add_by_rss';

const isCarryoverStatus = (value: string): value is V4CarryoverStatus =>
  CARRYOVER_STATUSES.some((status) => status === value);

const readKv = async (key: string): Promise<string | null> => {
  await initializeDatabase();
  const rows = await getDb()
    .select({ value: schema.kvMeta.value })
    .from(schema.kvMeta)
    .where(eq(schema.kvMeta.key, key))
    .limit(1);
  return rows[0]?.value ?? null;
};

const writeKv = async (key: string, value: string): Promise<void> => {
  await initializeDatabase();
  const updatedAt = Date.now();
  await getDb().insert(schema.kvMeta).values({ key, updatedAt, value }).onConflictDoUpdate({
    target: schema.kvMeta.key,
    set: { updatedAt, value },
  });
};

const toRow = (row: typeof schema.v4CarryoverEntry.$inferSelect): V4CarryoverRow | null => {
  if (!isLegacyKind(row.legacyKind) || !isCarryoverStatus(row.status)) {
    return null;
  }
  return {
    attempts: row.attempts,
    cachedFeedUrl: row.cachedFeedUrl,
    cachedTitle: row.cachedTitle,
    legacyId: row.legacyId,
    legacyKind: row.legacyKind,
    status: row.status,
    updatedAt: row.updatedAt,
  };
};

const emptyCounts = (): V4CarryoverCounts => ({
  byKind: { add_by_rss: 0, podcast: 0 },
  byStatus: {
    add_by_rss: 0,
    blocked: 0,
    pending: 0,
    subscribed: 0,
    waiting: 0,
  },
  total: 0,
  withCachedFeedUrl: 0,
  withCachedTitle: 0,
});

/**
 * Staged rows from the previous app's signed-out subscriptions.
 *
 * `v4_carryover.read_at` is set when that read finishes, including when it found nothing.
 * `v4_carryover.copy_allowed` is `'1'` when those rows may be resolved.
 */
export const v4CarryoverRepository = {
  bumpAttempts: async (legacyKind: V4StagedLegacyKind, legacyId: string): Promise<void> => {
    await initializeDatabase();
    const updatedAt = Date.now();
    await getDb().transaction(async (transaction) => {
      const rows = await transaction
        .select({ attempts: schema.v4CarryoverEntry.attempts })
        .from(schema.v4CarryoverEntry)
        .where(
          and(
            eq(schema.v4CarryoverEntry.legacyKind, legacyKind),
            eq(schema.v4CarryoverEntry.legacyId, legacyId)
          )
        )
        .limit(1);
      const current = rows[0];
      if (current === undefined) {
        return;
      }
      await transaction
        .update(schema.v4CarryoverEntry)
        .set({ attempts: current.attempts + 1, updatedAt })
        .where(
          and(
            eq(schema.v4CarryoverEntry.legacyKind, legacyKind),
            eq(schema.v4CarryoverEntry.legacyId, legacyId)
          )
        );
    });
  },

  /** Drops staged rows and both flags so the read can run again. */
  clearRead: async (): Promise<void> => {
    await initializeDatabase();
    await getDb().transaction(async (transaction) => {
      await transaction.delete(schema.v4CarryoverEntry);
      await transaction
        .delete(schema.kvMeta)
        .where(inArray(schema.kvMeta.key, [READ_AT_KEY, COPY_ALLOWED_KEY]));
    });
  },

  counts: async (): Promise<V4CarryoverCounts> => {
    await initializeDatabase();
    const rows = await getDb()
      .select({
        cachedFeedUrl: schema.v4CarryoverEntry.cachedFeedUrl,
        cachedTitle: schema.v4CarryoverEntry.cachedTitle,
        legacyKind: schema.v4CarryoverEntry.legacyKind,
        status: schema.v4CarryoverEntry.status,
      })
      .from(schema.v4CarryoverEntry);
    const counts = emptyCounts();
    for (const row of rows) {
      const mapped = toRow({
        attempts: 0,
        cachedFeedUrl: row.cachedFeedUrl,
        cachedTitle: row.cachedTitle,
        legacyId: '',
        legacyKind: row.legacyKind,
        status: row.status,
        updatedAt: 0,
      });
      if (mapped === null) {
        continue;
      }
      counts.total += 1;
      counts.byKind[mapped.legacyKind] += 1;
      counts.byStatus[mapped.status] += 1;
      if (mapped.cachedFeedUrl !== null) {
        counts.withCachedFeedUrl += 1;
      }
      if (mapped.cachedTitle !== null) {
        counts.withCachedTitle += 1;
      }
    }
    return counts;
  },

  hasRead: async (): Promise<boolean> => (await readKv(READ_AT_KEY)) !== null,

  isCopyAllowed: async (): Promise<boolean> =>
    (await readKv(COPY_ALLOWED_KEY)) === COPY_ALLOWED_VALUE,

  listByStatus: async (statuses: readonly V4CarryoverStatus[]): Promise<V4CarryoverRow[]> => {
    if (statuses.length === 0) {
      return [];
    }
    await initializeDatabase();
    const rows = await getDb()
      .select()
      .from(schema.v4CarryoverEntry)
      .where(inArray(schema.v4CarryoverEntry.status, [...statuses]));
    const listed: V4CarryoverRow[] = [];
    for (const row of rows) {
      const mapped = toRow(row);
      if (mapped !== null) {
        listed.push(mapped);
      }
    }
    return listed;
  },

  /** Records that the read finished without inserting rows. */
  markRead: async (): Promise<void> => {
    await writeKv(READ_AT_KEY, String(Date.now()));
  },

  saveRead: async (entries: readonly V4StagedEntry[]): Promise<void> => {
    await initializeDatabase();
    const updatedAt = Date.now();
    await getDb().transaction(async (transaction) => {
      for (let index = 0; index < entries.length; index += INSERT_CHUNK) {
        const chunk = entries.slice(index, index + INSERT_CHUNK).map((entry) => ({
          attempts: 0,
          cachedFeedUrl: entry.cachedFeedUrl,
          cachedTitle: entry.cachedTitle,
          legacyId: entry.legacyId,
          legacyKind: entry.legacyKind,
          status: 'pending' as const,
          updatedAt,
        }));
        await transaction
          .insert(schema.v4CarryoverEntry)
          .values(chunk)
          .onConflictDoNothing({
            target: [schema.v4CarryoverEntry.legacyKind, schema.v4CarryoverEntry.legacyId],
          });
      }
      await transaction
        .insert(schema.kvMeta)
        .values({ key: READ_AT_KEY, updatedAt, value: String(updatedAt) })
        .onConflictDoUpdate({
          target: schema.kvMeta.key,
          set: { updatedAt, value: String(updatedAt) },
        });
    });
  },

  setCopyAllowed: async (): Promise<void> => {
    await writeKv(COPY_ALLOWED_KEY, COPY_ALLOWED_VALUE);
  },

  setStatus: async (
    legacyKind: V4StagedLegacyKind,
    legacyId: string,
    status: V4CarryoverStatus
  ): Promise<void> => {
    await initializeDatabase();
    await getDb()
      .update(schema.v4CarryoverEntry)
      .set({ status, updatedAt: Date.now() })
      .where(
        and(
          eq(schema.v4CarryoverEntry.legacyKind, legacyKind),
          eq(schema.v4CarryoverEntry.legacyId, legacyId)
        )
      );
  },
};
