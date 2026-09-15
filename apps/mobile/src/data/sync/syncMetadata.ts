import { eq } from 'drizzle-orm';

import { getDb, initializeDatabase, schema } from '../db';

const PLAYBACK_CLOCK_OFFSET_KEY = 'playback.clock_offset_ms';

/**
 * Per-domain sync watermarks stored in `kv_meta`. Repositories use these to decide whether a local
 * read is stale and a background fetch should run. Values are `Date.now()` epoch milliseconds.
 */
export const readSyncWatermark = async (key: string): Promise<number | null> => {
  await initializeDatabase();
  const rows = await getDb()
    .select({ value: schema.kvMeta.value })
    .from(schema.kvMeta)
    .where(eq(schema.kvMeta.key, key))
    .limit(1);

  const raw = rows[0]?.value ?? null;
  if (raw === null) {
    return null;
  }

  const parsed = Number.parseInt(raw, 10);
  return Number.isNaN(parsed) ? null : parsed;
};

export const writeSyncWatermark = async (key: string, timestampMs: number): Promise<void> => {
  await initializeDatabase();
  await getDb()
    .insert(schema.kvMeta)
    .values({ key, value: String(timestampMs), updatedAt: timestampMs })
    .onConflictDoUpdate({
      target: schema.kvMeta.key,
      set: { value: String(timestampMs), updatedAt: timestampMs },
    });
};

export const isWatermarkStale = async (key: string, ttlMs: number): Promise<boolean> => {
  const lastSyncedAt = await readSyncWatermark(key);
  if (lastSyncedAt === null) {
    return true;
  }

  return Date.now() - lastSyncedAt > ttlMs;
};

export type PlaybackClockOffsetSnapshot = {
  offsetMs: number;
  measuredAtMs: number;
};

export const readPlaybackClockOffsetMs = async (): Promise<PlaybackClockOffsetSnapshot | null> => {
  await initializeDatabase();
  const rows = await getDb()
    .select({ value: schema.kvMeta.value, updatedAt: schema.kvMeta.updatedAt })
    .from(schema.kvMeta)
    .where(eq(schema.kvMeta.key, PLAYBACK_CLOCK_OFFSET_KEY))
    .limit(1);

  const row = rows[0];
  if (row === undefined || row.value === null || row.updatedAt === null) {
    return null;
  }

  const offsetMs = Number.parseInt(row.value, 10);
  if (Number.isNaN(offsetMs)) {
    return null;
  }

  return { offsetMs, measuredAtMs: row.updatedAt };
};

export const writePlaybackClockOffsetMs = async (offsetMs: number): Promise<void> => {
  await initializeDatabase();
  const measuredAtMs = Date.now();
  await getDb()
    .insert(schema.kvMeta)
    .values({
      key: PLAYBACK_CLOCK_OFFSET_KEY,
      value: String(Math.trunc(offsetMs)),
      updatedAt: measuredAtMs,
    })
    .onConflictDoUpdate({
      target: schema.kvMeta.key,
      set: { value: String(Math.trunc(offsetMs)), updatedAt: measuredAtMs },
    });
};
