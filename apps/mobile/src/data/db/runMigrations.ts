import type { SQLiteDatabase } from 'expo-sqlite';

import { MIGRATIONS } from './migrations';

type UserVersionRow = {
  user_version: number;
};

const readUserVersion = async (sqlite: SQLiteDatabase): Promise<number> => {
  const row = await sqlite.getFirstAsync<UserVersionRow>('PRAGMA user_version;');
  return row?.user_version ?? 0;
};

/**
 * Apply pending forward-only migrations in ascending version order. Each migration runs in a
 * single transaction; `PRAGMA user_version` records the highest applied version so cold starts
 * only run what is new. Versions come from `MIGRATIONS` (authored integers), so interpolating them
 * into the PRAGMA statement is safe — never pass external input here.
 */
export const runMigrations = async (sqlite: SQLiteDatabase): Promise<void> => {
  const currentVersion = await readUserVersion(sqlite);

  const pending = MIGRATIONS.filter((migration) => migration.version > currentVersion).sort(
    (a, b) => a.version - b.version
  );

  for (const migration of pending) {
    if (!Number.isInteger(migration.version)) {
      throw new Error(`Migration version must be an integer: ${String(migration.version)}`);
    }

    await sqlite.withTransactionAsync(async () => {
      for (const statement of migration.statements) {
        await sqlite.execAsync(statement);
      }
    });

    await sqlite.execAsync(`PRAGMA user_version = ${migration.version};`);
  }
};
