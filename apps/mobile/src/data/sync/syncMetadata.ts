import { eq } from 'drizzle-orm';

import { getDb, initializeDatabase, schema } from '../db';

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
