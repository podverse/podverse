import { getTablePolicy } from '@mgmt-api/lib/database/queryEngine.js';
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
});
