import { getTableName, is } from 'drizzle-orm';
import { SQLiteTable } from 'drizzle-orm/sqlite-core';
import { describe, expect, it } from 'vitest';

import { SIGNED_OUT_CREDENTIAL_OWNER } from '../lib/addByRss/credentials';
import {
  customApiSqliteTableNames,
  selectAsyncStorageKeysForApiSwitch,
  splitSignedOutCredentialIndexRows,
} from './customApiLocalClearPlan';
import * as schema from './db/schema';

const SCHEMA_TABLE_NAMES = [
  'kv_meta',
  'account_snapshot',
  'queue_cache',
  'playback_outbox',
  'playback_local_state',
  'stats_listen_outbox',
  'add_by_rss_feed',
  'add_by_rss_listed_feed',
  'add_by_rss_credential_index',
  'download',
  'subscribed_channel',
  'channel_item',
  'channel_item_window',
  'sync_event_log',
  'channel_seen',
  'channel_live_status',
  'section_chrome_flags',
  'playlist',
  'playlist_resource',
  'channel_auto_download',
  'auto_download_candidate',
  'playable_item',
  'identity_remap_applied',
  'item_description_cache',
  'v4_carryover_entry',
] as const;

describe('customApiSqliteTableNames', () => {
  it('names every sqlite table exported from schema.ts', () => {
    const fromSchema = Object.values(schema).flatMap((value) =>
      is(value, SQLiteTable) ? [getTableName(value)] : []
    );
    expect(customApiSqliteTableNames()).toEqual(fromSchema);
    expect(fromSchema).toEqual([...SCHEMA_TABLE_NAMES]);
  });
});

describe('selectAsyncStorageKeysForApiSwitch', () => {
  it('keeps device preferences and removes per-server keys', () => {
    const keys = [
      'sort.channel:show-1',
      'sort.item:ep-1',
      'sort.playlist:pl-1',
      'sort.podcasts',
      'sort.channel',
      'notifications.subscribe_push_prompt_answered:acct',
      'notifications.sign_in_push_prompt_shown:acct',
      'notifications.banner_kinds',
      'membership.expiry_dismissed_for',
      'playback.handoff_dismissed_state',
      'auth.forced_logout_at',
      'auth.forced_logout_notice',
      'autoDownload.registrationHash',
      'pv_mobile_last_playback',
      'pv_mobile_playback_journal_cursor',
      'uit',
      'locale',
      'tabs.visible',
      'offline.mode',
      'downloads.quota_bytes',
      'downloads.auto_download_default',
      'aqc.rd',
      'aqc.rp',
      'preferred_media_type',
      'pmt',
      'clip.visibility',
      'clip.has_seen_make_clip_how_to',
      'api.custom_base_url',
    ];

    expect(selectAsyncStorageKeysForApiSwitch(keys)).toEqual([
      'sort.channel:show-1',
      'sort.item:ep-1',
      'sort.playlist:pl-1',
      'notifications.subscribe_push_prompt_answered:acct',
      'notifications.sign_in_push_prompt_shown:acct',
      'membership.expiry_dismissed_for',
      'playback.handoff_dismissed_state',
      'auth.forced_logout_at',
      'auth.forced_logout_notice',
      'autoDownload.registrationHash',
      'pv_mobile_last_playback',
      'pv_mobile_playback_journal_cursor',
    ]);
  });
});

describe('splitSignedOutCredentialIndexRows', () => {
  it('keeps signed-out-device rows and removes account rows', () => {
    const signedOutFeed = {
      accountIdText: SIGNED_OUT_CREDENTIAL_OWNER,
      feedUrl: 'https://example.com/a.xml',
      updatedAt: 1,
    };
    const accountFeed = {
      accountIdText: 'acct1234',
      feedUrl: 'https://example.com/b.xml',
      updatedAt: 2,
    };
    const signedOutOther = {
      accountIdText: SIGNED_OUT_CREDENTIAL_OWNER,
      feedUrl: 'https://example.com/c.xml',
      updatedAt: 3,
    };

    expect(splitSignedOutCredentialIndexRows([signedOutFeed, accountFeed, signedOutOther])).toEqual(
      {
        kept: [signedOutFeed, signedOutOther],
        removed: [accountFeed],
      }
    );
  });
});
