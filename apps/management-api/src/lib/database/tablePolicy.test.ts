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

    it('includes feed_flag_status in policies', () => {
      const policy = getTablePolicy('feed_flag_status');
      expect(policy).toBeDefined();
      expect(policy?.permissionResource).toBe('feed_flag_statuses');
    });

    it('includes feed_flag_status_reason in policies', () => {
      const policy = getTablePolicy('feed_flag_status_reason');
      expect(policy).toBeDefined();
      expect(policy?.permissionResource).toBe('feed_flag_status_reasons');
    });
  });

  describe('isTableAllowlisted', () => {
    it('returns true for allowlisted tables', () => {
      expect(isTableAllowlisted('feed')).toBe(true);
      expect(isTableAllowlisted('feed_flag_status')).toBe(true);
      expect(isTableAllowlisted('feed_flag_status_reason')).toBe(true);
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

    it('returns false for feed_flag_status_reason table', () => {
      expect(isTableReadOnly('feed_flag_status_reason')).toBe(false);
    });

    it('returns false for feed_flag_status table', () => {
      expect(isTableReadOnly('feed_flag_status')).toBe(false);
    });

    it('returns true for unknown tables', () => {
      expect(isTableReadOnly('nonexistent_table')).toBe(true);
    });
  });

  describe('query bounds', () => {
    it('all tables have maxFilters set', () => {
      for (const tableName of ['feed', 'feed_flag_status', 'feed_flag_status_reason']) {
        const policy = getTablePolicy(tableName);
        expect(policy?.maxFilters).toBeGreaterThan(0);
      }
    });

    it('all tables have maxSorts set', () => {
      for (const tableName of ['feed', 'feed_flag_status', 'feed_flag_status_reason']) {
        const policy = getTablePolicy(tableName);
        expect(policy?.maxSorts).toBeGreaterThan(0);
      }
    });

    it('all tables have maxInValues set', () => {
      for (const tableName of ['feed', 'feed_flag_status', 'feed_flag_status_reason']) {
        const policy = getTablePolicy(tableName);
        expect(policy?.maxInValues).toBeGreaterThan(0);
      }
    });
  });

  describe('field definitions', () => {
    it('feed table has reason fields as updatable', () => {
      const policy = getTablePolicy('feed');
      expect(policy).toBeDefined();

      const reasonIdField = policy?.fields.find((f) => f.name === 'feed_flag_status_reason_id');
      expect(reasonIdField).toBeDefined();
      expect(reasonIdField?.updatable).toBe(true);

      const reasonNoteField = policy?.fields.find((f) => f.name === 'feed_flag_status_reason_note');
      expect(reasonNoteField).toBeDefined();
      expect(reasonNoteField?.updatable).toBe(true);
    });

    it('feed_flag_status has status as non-updatable', () => {
      const policy = getTablePolicy('feed_flag_status');
      const statusField = policy?.fields.find((f) => f.name === 'status');
      expect(statusField?.updatable).toBe(false);
    });

    it('feed_flag_status_reason has reason as updatable', () => {
      const policy = getTablePolicy('feed_flag_status_reason');
      const reasonField = policy?.fields.find((f) => f.name === 'reason');
      expect(reasonField?.updatable).toBe(true);
    });
  });
});
