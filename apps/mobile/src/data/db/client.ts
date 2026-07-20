import { drizzle } from 'drizzle-orm/expo-sqlite';
import type { SQLiteDatabase } from 'expo-sqlite';
import { openDatabaseSync } from 'expo-sqlite';

import * as schema from './schema';

const DATABASE_NAME = 'podverse.db';

let sqliteInstance: SQLiteDatabase | null = null;
let drizzleInstance: ReturnType<typeof createDrizzle> | null = null;

const createDrizzle = (sqlite: SQLiteDatabase) => drizzle(sqlite, { schema });

/**
 * Lazily open the underlying expo-sqlite handle. Opening is cheap and synchronous; the native
 * module is available after RN bootstrap, so first access happens from `initializeDatabase()`.
 */
export const getSqlite = (): SQLiteDatabase => {
  if (sqliteInstance === null) {
    sqliteInstance = openDatabaseSync(DATABASE_NAME);
  }

  return sqliteInstance;
};

/**
 * Drizzle client used by repositories for typed reads/writes. Repositories should depend on this
 * (or a repository seam) rather than opening SQLite directly.
 */
export const getDb = (): ReturnType<typeof createDrizzle> => {
  if (drizzleInstance === null) {
    drizzleInstance = createDrizzle(getSqlite());
  }

  return drizzleInstance;
};

export type AppDatabase = ReturnType<typeof getDb>;
