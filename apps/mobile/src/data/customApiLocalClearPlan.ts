import { getTableName, is } from 'drizzle-orm';
import { SQLiteTable } from 'drizzle-orm/sqlite-core';

import { SIGNED_OUT_CREDENTIAL_OWNER } from '../lib/addByRss/credentials';
import * as schema from './db/schema';

const ASYNC_STORAGE_EXACT_KEYS = [
  'membership.expiry_dismissed_for',
  'playback.handoff_dismissed_state',
  'auth.forced_logout_at',
  'auth.forced_logout_notice',
  'autoDownload.registrationHash',
  'pv_mobile_last_playback',
  'pv_mobile_playback_journal_cursor',
] as const;

const ASYNC_STORAGE_KEY_PREFIXES = [
  'sort.channel:',
  'sort.item:',
  'sort.playlist:',
  'notifications.subscribe_push_prompt_answered:',
  'notifications.sign_in_push_prompt_shown:',
] as const;

export type CredentialIndexRow = {
  accountIdText: string;
  feedUrl: string;
  updatedAt: number;
};

/** Every Drizzle table in the local schema, in export order. A new table is included here. */
export const customApiSqliteTables = (): SQLiteTable[] => {
  const tables: SQLiteTable[] = [];
  for (const value of Object.values(schema)) {
    if (is(value, SQLiteTable)) {
      tables.push(value);
    }
  }
  return tables;
};

export const customApiSqliteTableNames = (): string[] => {
  return customApiSqliteTables().map((table) => getTableName(table));
};

/**
 * AsyncStorage keys an address change removes. Device preferences that are not tied to one
 * server stay, including list-level sort keys that do not use a per-show prefix.
 */
export const selectAsyncStorageKeysForApiSwitch = (keys: readonly string[]): string[] => {
  return keys.filter((key) => {
    if (ASYNC_STORAGE_EXACT_KEYS.some((exact) => exact === key)) {
      return true;
    }
    return ASYNC_STORAGE_KEY_PREFIXES.some((prefix) => key.startsWith(prefix));
  });
};

/**
 * Signed-out feed passwords stay. Their SecureStore values are not deleted, so the index rows
 * are put back after the tables are emptied. Every other owner is removed.
 */
export const splitSignedOutCredentialIndexRows = (
  rows: readonly CredentialIndexRow[]
): { kept: CredentialIndexRow[]; removed: CredentialIndexRow[] } => {
  const kept: CredentialIndexRow[] = [];
  const removed: CredentialIndexRow[] = [];
  for (const row of rows) {
    if (row.accountIdText === SIGNED_OUT_CREDENTIAL_OWNER) {
      kept.push(row);
    } else {
      removed.push(row);
    }
  }
  return { kept, removed };
};
