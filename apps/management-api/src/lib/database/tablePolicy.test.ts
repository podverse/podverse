import { getTablePolicy } from '@management-api/lib/database/queryEngine.js';
import { describe, expect, it } from 'vitest';

import { isTableReadOnly } from './tablePolicy.js';
import { isTableAllowlisted } from './tablePolicy.js';

describe('tablePolicy', () => {
  describe('getTablePolicy', () => {
    it('returns policy for allowlisted table', () => {
      const policy = getTablePolicy('feed');
      expect(policy).toBeDefined();
      expect(policy?.tableName).toBe('feed');
      expect(policy?.primaryKeyField).toBe('id');
    });

    it('returns undefined for non-allowlisted table', () => {
      const policy = getTablePolicy('account');
      expect(policy).toBeUndefined();
    });

    it('includes feed_takedown_reason in policies', () => {
      const policy = getTablePolicy('feed_takedown_reason');
      expect(policy).toBeDefined();
      expect(policy?.permissionResource).toBe('feed_takedown_reasons');
    });
  });

  describe('isTableAllowlisted', () => {
    it('returns true for allowlisted tables', () => {
      expect(isTableAllowlisted('feed')).toBe(true);
      expect(isTableAllowlisted('feed_takedown_reason')).toBe(true);
      expect(isTableAllowlisted('billing_price')).toBe(true);
    });

    it('returns false for non-allowlisted tables', () => {
      expect(isTableAllowlisted('account')).toBe(false);
      expect(isTableAllowlisted('admin_account')).toBe(false);
      expect(isTableAllowlisted('item')).toBe(false);
      expect(isTableAllowlisted('users')).toBe(false);
    });
  });

  describe('isTableReadOnly', () => {
    it('returns true for feed table by default (no feature flag)', () => {
      expect(isTableReadOnly('feed')).toBe(true);
    });

    it('returns false for feed_takedown_reason table', () => {
      expect(isTableReadOnly('feed_takedown_reason')).toBe(false);
    });

    it('returns true for unknown tables', () => {
      expect(isTableReadOnly('nonexistent_table')).toBe(true);
    });
  });

  describe('query bounds', () => {
    it('all tables have maxFilters set', () => {
      for (const tableName of ['feed', 'feed_takedown_reason', 'billing_price']) {
        const policy = getTablePolicy(tableName);
        expect(policy?.maxFilters).toBeGreaterThan(0);
      }
    });

    it('all tables have maxSorts set', () => {
      for (const tableName of ['feed', 'feed_takedown_reason', 'billing_price']) {
        const policy = getTablePolicy(tableName);
        expect(policy?.maxSorts).toBeGreaterThan(0);
      }
    });

    it('all tables have maxInValues set', () => {
      for (const tableName of ['feed', 'feed_takedown_reason', 'billing_price']) {
        const policy = getTablePolicy(tableName);
        expect(policy?.maxInValues).toBeGreaterThan(0);
      }
    });
  });

  describe('field definitions', () => {
    it('feed table exposes override fields as updatable where policy allows', () => {
      const policy = getTablePolicy('feed');
      expect(policy).toBeDefined();

      const spamOverride = policy?.fields.find((f) => f.name === 'spam_item_limit_override');
      expect(spamOverride).toBeDefined();
      expect(spamOverride?.updatable).toBe(true);
    });

    it('feed table keeps the description tier and its telemetry read-only', () => {
      const policy = getTablePolicy('feed');
      for (const name of [
        'description_length_tier_override',
        'description_truncated_count',
        'description_longest_source_length',
        'description_truncated_at',
      ]) {
        const field = policy?.fields.find((f) => f.name === name);
        expect(field).toBeDefined();
        expect(field?.updatable).toBe(false);
      }
    });

    it('feed_takedown_reason has reason as updatable', () => {
      const policy = getTablePolicy('feed_takedown_reason');
      const reasonField = policy?.fields.find((f) => f.name === 'reason');
      expect(reasonField?.updatable).toBe(true);
    });

    it('billing_price keeps source metadata read-only', () => {
      const policy = getTablePolicy('billing_price');
      const sourceField = policy?.fields.find((f) => f.name === 'source');
      expect(sourceField?.updatable).toBe(false);
    });
  });

  describe('popularity tables', () => {
    const popularityTables = [
      { tableName: 'stats_popularity_channel', primaryKeyField: 'channel_id' },
      { tableName: 'stats_popularity_item', primaryKeyField: 'item_id' },
      { tableName: 'stats_popularity_clip', primaryKeyField: 'clip_id' },
      { tableName: 'stats_popularity_playlist', primaryKeyField: 'playlist_id' },
      { tableName: 'stats_popularity_account', primaryKeyField: 'account_id' },
    ] as const;

    it('lists each popularity table as a read-only stats policy', () => {
      for (const { tableName, primaryKeyField } of popularityTables) {
        const policy = getTablePolicy(tableName);
        expect(policy).toBeDefined();
        expect(policy?.primaryKeyField).toBe(primaryKeyField);
        expect(policy?.permissionResource).toBe('stats');
        expect(policy?.readOnly).toBe(true);
        expect(policy?.defaultSortField).toBe('all_time_count');
        expect(policy?.fields.map((field) => field.name)).toEqual([
          primaryKeyField,
          'day_count',
          'week_count',
          'month_count',
          'all_time_count',
        ]);
        expect(policy?.fields.every((field) => field.updatable === false)).toBe(true);
        expect(isTableAllowlisted(tableName)).toBe(true);
        expect(isTableReadOnly(tableName)).toBe(true);
      }
    });

    it('keeps daily, event, taste, and aggregate tables off the allowlist', () => {
      for (const tableName of [
        'stats_aggregated_channel',
        'stats_aggregated_item',
        'stats_aggregated_clip',
        'stats_aggregated_playlist',
        'stats_aggregated_account',
        'stats_daily_channel',
        'stats_daily_item',
        'stats_daily_clip',
        'stats_daily_playlist',
        'stats_daily_account',
        'stats_listen_event',
        'stats_open_event',
        'stats_taste_profile',
        'stats_taste_profile_hidden',
        'stats_recommendation',
        'stats_channel_hidden',
        'stats_recommendation_state',
        'stats_listener',
        'stats_flagged_listener',
        'stats_flag_signal',
      ]) {
        expect(isTableAllowlisted(tableName)).toBe(false);
      }
    });
  });
});
