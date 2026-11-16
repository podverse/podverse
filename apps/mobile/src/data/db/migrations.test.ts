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
  it('holds versions 1 to 7, and version 7 is the latest', () => {
    expect(MIGRATIONS).toHaveLength(7);
    expect(MIGRATIONS[0]?.version).toBe(1);
    expect(MIGRATIONS[1]?.version).toBe(2);
    expect(MIGRATIONS[2]?.version).toBe(3);
    expect(MIGRATIONS[3]?.version).toBe(4);
    expect(MIGRATIONS[4]?.version).toBe(5);
    expect(MIGRATIONS[5]?.version).toBe(6);
    expect(MIGRATIONS[6]?.version).toBe(7);
    expect(LATEST_MIGRATION_VERSION).toBe(7);
  });

  it('runs every pending statement on a new database and records version 7', async () => {
    const { database, executed } = createRecordingDatabase(0);

    await runMigrations(database);

    const version1 = MIGRATIONS[0]?.statements ?? [];
    const version2 = MIGRATIONS[1]?.statements ?? [];
    const version3 = MIGRATIONS[2]?.statements ?? [];
    const version4 = MIGRATIONS[3]?.statements ?? [];
    const version5 = MIGRATIONS[4]?.statements ?? [];
    const version6 = MIGRATIONS[5]?.statements ?? [];
    const version7 = MIGRATIONS[6]?.statements ?? [];
    expect(executed).toEqual([
      ...version1,
      'PRAGMA user_version = 1;',
      ...version2,
      'PRAGMA user_version = 2;',
      ...version3,
      'PRAGMA user_version = 3;',
      ...version4,
      'PRAGMA user_version = 4;',
      ...version5,
      'PRAGMA user_version = 5;',
      ...version6,
      'PRAGMA user_version = 6;',
      ...version7,
      'PRAGMA user_version = 7;',
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

  it('runs versions 2 through 7 on a database already at version 1', async () => {
    const { database, executed } = createRecordingDatabase(1);

    await runMigrations(database);

    const version2 = MIGRATIONS[1]?.statements ?? [];
    const version3 = MIGRATIONS[2]?.statements ?? [];
    const version4 = MIGRATIONS[3]?.statements ?? [];
    const version5 = MIGRATIONS[4]?.statements ?? [];
    const version6 = MIGRATIONS[5]?.statements ?? [];
    const version7 = MIGRATIONS[6]?.statements ?? [];
    expect(executed).toEqual([
      ...version2,
      'PRAGMA user_version = 2;',
      ...version3,
      'PRAGMA user_version = 3;',
      ...version4,
      'PRAGMA user_version = 4;',
      ...version5,
      'PRAGMA user_version = 5;',
      ...version6,
      'PRAGMA user_version = 6;',
      ...version7,
      'PRAGMA user_version = 7;',
    ]);
  });

  it('runs versions 3 through 7 on a database already at version 2', async () => {
    const { database, executed } = createRecordingDatabase(2);

    await runMigrations(database);

    const version3 = MIGRATIONS[2]?.statements ?? [];
    const version4 = MIGRATIONS[3]?.statements ?? [];
    const version5 = MIGRATIONS[4]?.statements ?? [];
    const version6 = MIGRATIONS[5]?.statements ?? [];
    const version7 = MIGRATIONS[6]?.statements ?? [];
    expect(executed).toEqual([
      ...version3,
      'PRAGMA user_version = 3;',
      ...version4,
      'PRAGMA user_version = 4;',
      ...version5,
      'PRAGMA user_version = 5;',
      ...version6,
      'PRAGMA user_version = 6;',
      ...version7,
      'PRAGMA user_version = 7;',
    ]);
  });

  it('runs versions 4 through 7 on a database already at version 3', async () => {
    const { database, executed } = createRecordingDatabase(3);

    await runMigrations(database);

    const version4 = MIGRATIONS[3]?.statements ?? [];
    const version5 = MIGRATIONS[4]?.statements ?? [];
    const version6 = MIGRATIONS[5]?.statements ?? [];
    const version7 = MIGRATIONS[6]?.statements ?? [];
    expect(executed).toEqual([
      ...version4,
      'PRAGMA user_version = 4;',
      ...version5,
      'PRAGMA user_version = 5;',
      ...version6,
      'PRAGMA user_version = 6;',
      ...version7,
      'PRAGMA user_version = 7;',
    ]);
  });

  it('runs versions 5, 6, and 7 on a database already at version 4', async () => {
    const { database, executed } = createRecordingDatabase(4);

    await runMigrations(database);

    const version5 = MIGRATIONS[4]?.statements ?? [];
    const version6 = MIGRATIONS[5]?.statements ?? [];
    const version7 = MIGRATIONS[6]?.statements ?? [];
    expect(executed).toEqual([
      ...version5,
      'PRAGMA user_version = 5;',
      ...version6,
      'PRAGMA user_version = 6;',
      ...version7,
      'PRAGMA user_version = 7;',
    ]);
  });

  it('runs versions 6 and 7 on a database already at version 5', async () => {
    const { database, executed } = createRecordingDatabase(5);

    await runMigrations(database);

    const version6 = MIGRATIONS[5]?.statements ?? [];
    const version7 = MIGRATIONS[6]?.statements ?? [];
    expect(executed).toEqual([
      ...version6,
      'PRAGMA user_version = 6;',
      ...version7,
      'PRAGMA user_version = 7;',
    ]);
  });

  it('runs only version 7 on a database already at version 6', async () => {
    const { database, executed } = createRecordingDatabase(6);

    await runMigrations(database);

    const version7 = MIGRATIONS[6]?.statements ?? [];
    expect(executed).toEqual([...version7, 'PRAGMA user_version = 7;']);
  });

  it('does nothing on a database already at version 7', async () => {
    const { database, executed } = createRecordingDatabase(7);

    await runMigrations(database);

    expect(executed).toEqual([]);
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

  it('creates the carryover table in version 4 and stores no feed secret', () => {
    const statements = (MIGRATIONS[3]?.statements ?? []).map((statement) =>
      statement.toLowerCase()
    );
    const sql = statements.join('\n');

    expect(statements.length).toBe(1);
    expect(sql).toContain('create table if not exists v4_carryover_entry (');
    expect(sql).toContain('legacy_kind text not null');
    expect(sql).toContain('legacy_id text not null');
    expect(sql).toContain('cached_feed_url text');
    expect(sql).toContain('cached_title text');
    expect(sql).toContain('status text not null');
    expect(sql).toContain('attempts integer not null default 0');
    expect(sql).toContain('updated_at integer not null');
    expect(sql).toContain('primary key (legacy_kind, legacy_id)');
    expect(sql.includes('password')).toBe(false);
    expect(sql.includes('username')).toBe(false);
  });

  it('creates the local episode table in version 5 and stores no feed secret', () => {
    const statements = (MIGRATIONS[4]?.statements ?? []).map((statement) =>
      statement.toLowerCase()
    );
    const sql = statements.join('\n');

    expect(statements.length).toBe(2);
    expect(sql).toContain('create table if not exists add_by_rss_local_episode (');
    expect(sql).toContain('download_id_text text primary key not null');
    expect(sql).toContain('feed_url text not null');
    expect(sql).toContain('item_bundle_json text not null');
    expect(sql).toContain('created_at integer not null');
    expect(sql).toContain('create index if not exists idx_add_by_rss_local_episode_feed_url');
    expect(sql).toContain('on add_by_rss_local_episode (feed_url)');
    expect(sql.includes('password')).toBe(false);
    expect(sql.includes('username')).toBe(false);
  });

  it('creates the download carryover table in version 6 and stores no feed secret', () => {
    const statements = (MIGRATIONS[5]?.statements ?? []).map((statement) =>
      statement.toLowerCase()
    );
    const sql = statements.join('\n');

    expect(statements.length).toBe(2);
    expect(sql).toContain('create table if not exists v4_download_carryover_entry (');
    expect(sql).toContain('file_key text primary key');
    expect(sql).toContain('status text not null');
    expect(sql).toContain('adopted_file_name text');
    expect(sql).toContain('create index if not exists idx_v4_download_carryover_status');
    expect(sql).toContain('on v4_download_carryover_entry (status)');
    expect(sql.includes('password')).toBe(false);
    expect(sql.includes('username')).toBe(false);
  });

  it('adds kept_for_download on channel_item in version 7', () => {
    const statements = MIGRATIONS[6]?.statements ?? [];
    expect(statements).toEqual([
      'ALTER TABLE channel_item ADD COLUMN kept_for_download INTEGER NOT NULL DEFAULT 0;',
    ]);
  });

  it('rejects a database above the latest version without running anything', async () => {
    const { database, executed } = createRecordingDatabase(26);

    await expect(runMigrations(database)).rejects.toThrow(
      "SQLite user_version 26 is newer than this build's latest migration 7"
    );
    expect(executed).toEqual([]);
  });
});
