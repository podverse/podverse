import { describe, expect, it } from 'vitest';

import { LATEST_MIGRATION_VERSION, MIGRATIONS } from './migrations';
import type { MigrationDatabase } from './runMigrations';
import { runMigrations } from './runMigrations';

const createRecordingDatabase = (userVersion: number) => {
  const executed: string[] = [];
  const database: MigrationDatabase = {
    execAsync: async (source) => {
      executed.push(source);
    },
    getFirstAsync: async () => ({ user_version: userVersion }),
    withTransactionAsync: async (task) => {
      await task();
    },
  };
  return { database, executed };
};

const TABLE_NAMES = [
  'kv_meta',
  'account_snapshot',
  'queue_cache',
  'add_by_rss_feed',
  'download',
  'subscribed_channel',
  'sync_event_log',
  'channel_item',
  'channel_item_window',
  'channel_seen',
  'channel_live_status',
  'section_chrome_flags',
  'playback_outbox',
  'playback_local_state',
  'playlist',
  'playlist_resource',
  'channel_auto_download',
  'auto_download_candidate',
  'add_by_rss_credential_index',
  'playable_item',
  'identity_remap_applied',
  'item_description_cache',
  'add_by_rss_listed_feed',
  'stats_listen_outbox',
];

const firstMigrationSql = (): string =>
  (MIGRATIONS.find((migration) => migration.version === 1)?.statements ?? [])
    .join('\n')
    .toLowerCase();

describe('mobile SQLite migrations', () => {
  it('holds versions 1 to 3, and version 3 is the latest', () => {
    expect(MIGRATIONS).toHaveLength(3);
    expect(MIGRATIONS[0]?.version).toBe(1);
    expect(MIGRATIONS[1]?.version).toBe(2);
    expect(MIGRATIONS[2]?.version).toBe(3);
    expect(LATEST_MIGRATION_VERSION).toBe(3);
  });

  it('runs every pending statement on a new database and records version 3', async () => {
    const { database, executed } = createRecordingDatabase(0);

    await runMigrations(database);

    const version1 = MIGRATIONS[0]?.statements ?? [];
    const version2 = MIGRATIONS[1]?.statements ?? [];
    const version3 = MIGRATIONS[2]?.statements ?? [];
    expect(executed).toEqual([
      ...version1,
      'PRAGMA user_version = 1;',
      ...version2,
      'PRAGMA user_version = 2;',
      ...version3,
      'PRAGMA user_version = 3;',
    ]);
  });

  it('creates every table the schema declares', () => {
    const sql = firstMigrationSql();

    for (const table of TABLE_NAMES) {
      expect(sql).toContain(`create table if not exists ${table} (`);
    }
  });

  it('carries every column with its constraint and every index', () => {
    const sql = firstMigrationSql();

    for (const fragment of [
      'followed integer not null default 1',
      'may_have_livestreams integer not null default 0',
      'requires_credentials integer not null default 0',
      "kind text not null default 'podcasts'",
      'dismissed_from_list integer not null default 0',
      'details_json text',
      'latest_item_pub_date_ms integer',
      'create index if not exists idx_add_by_rss_feed_podcast_guid',
      'create index if not exists idx_download_channel_id',
      'create index if not exists idx_subscribed_channel_kind',
    ]) {
      expect(sql).toContain(fragment);
    }
  });

  it('only creates tables and indexes', () => {
    const sql = firstMigrationSql();

    for (const fragment of ['alter table', 'update ', 'delete from', 'drop table']) {
      expect(sql.includes(fragment)).toBe(false);
    }
  });

  it('has no column for a feed secret', () => {
    const sql = firstMigrationSql();

    expect(sql.includes('password')).toBe(false);
    expect(sql.includes('username')).toBe(false);
  });

  it('runs versions 2 and 3 on a database already at version 1', async () => {
    const { database, executed } = createRecordingDatabase(1);

    await runMigrations(database);

    const version2 = MIGRATIONS[1]?.statements ?? [];
    const version3 = MIGRATIONS[2]?.statements ?? [];
    expect(executed).toEqual([
      ...version2,
      'PRAGMA user_version = 2;',
      ...version3,
      'PRAGMA user_version = 3;',
    ]);
  });

  it('runs only version 3 on a database already at version 2', async () => {
    const { database, executed } = createRecordingDatabase(2);

    await runMigrations(database);

    const version3 = MIGRATIONS[2]?.statements ?? [];
    expect(executed).toEqual([...version3, 'PRAGMA user_version = 3;']);
  });

  it('adds Add by RSS feed columns in version 3 and none for a feed secret', () => {
    const statements = (MIGRATIONS[2]?.statements ?? []).map((statement) =>
      statement.toLowerCase()
    );

    expect(statements.length).toBeGreaterThan(0);
    for (const statement of statements) {
      expect(statement.startsWith('alter table add_by_rss_feed add column ')).toBe(true);
      const column = statement.slice('alter table add_by_rss_feed add column '.length);
      expect(column.includes('password')).toBe(false);
      expect(column.includes('username')).toBe(false);
    }
  });

  it('rejects a database above the latest version without running anything', async () => {
    const { database, executed } = createRecordingDatabase(26);

    await expect(runMigrations(database)).rejects.toThrow(
      "SQLite user_version 26 is newer than this build's latest migration 3"
    );
    expect(executed).toEqual([]);
  });
});
