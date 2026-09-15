import { hydrateSectionChromeFlagsMemory } from '../../lib/sectionChromeFlags';
import { getDb, getSqlite } from './client';
import { runMigrations } from './runMigrations';
import * as schema from './schema';

let initializePromise: Promise<void> | null = null;

const initialize = async (): Promise<void> => {
  const sqlite = getSqlite();
  // WAL improves concurrent read/write behavior for the background sync layer.
  await sqlite.execAsync('PRAGMA journal_mode = WAL;');
  await runMigrations(sqlite);
  const chromeRows = await getDb()
    .select({
      cacheKey: schema.sectionChromeFlags.cacheKey,
      flagsJson: schema.sectionChromeFlags.flagsJson,
    })
    .from(schema.sectionChromeFlags);
  hydrateSectionChromeFlagsMemory(chromeRows);
};

/**
 * Open the offline-first database and apply pending migrations. Idempotent: repeated calls (from
 * bootstrap and from repositories) share one in-flight promise, so cold start only migrates once.
 *
 * Call from app bootstrap without blocking render on success; repositories may `await` this before
 * their first query to guarantee the schema exists.
 */
export const initializeDatabase = (): Promise<void> => {
  if (initializePromise === null) {
    initializePromise = initialize();
  }

  return initializePromise;
};

export { getDb, getSqlite } from './client';
export type { AppDatabase } from './client';
export { safeJsonParse } from './serialization';
export * as schema from './schema';
