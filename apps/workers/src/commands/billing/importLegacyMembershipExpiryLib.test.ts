import { describe, expect, it } from 'vitest';

import type { LegacyMembershipExpiryImportDeps } from './importLegacyMembershipExpiryLib.js';
import {
  importLegacyMembershipExpiryFromText,
  selectLegacyImportGrant,
} from './importLegacyMembershipExpiryLib.js';

const NOW = new Date('2026-09-27T15:00:00.000Z');

type StoredGrant = { id: number; endsAt: Date };

function createHarness() {
  const accounts = new Map<string, number[]>();
  const grants = new Map<number, StoredGrant>();
  const creates: Array<{ accountId: number; source: string; startsAt: Date; endsAt: Date }> = [];
  const raises: Array<{ grantId: number; accountId: number; endsAt: Date }> = [];
  let nextId = 1;

  const deps = (dryRun: boolean): LegacyMembershipExpiryImportDeps => ({
    now: NOW,
    dryRun,
    matchAccount: async (email) => {
      const ids = accounts.get(email) ?? [];
      const accountId = ids[0];
      if (ids.length === 0 || accountId === undefined) {
        return { status: 'unmatched' };
      }
      if (ids.length > 1) {
        return { status: 'ambiguous' };
      }
      return { status: 'matched', accountId };
    },
    findLegacyImport: async (accountId) => {
      const grant = grants.get(accountId);
      if (grant === undefined) {
        return null;
      }
      return { id: grant.id, endsAt: grant.endsAt };
    },
    createLegacyImport: async (params) => {
      const id = nextId;
      nextId += 1;
      creates.push(params);
      grants.set(params.accountId, { id, endsAt: params.endsAt });
      return { id };
    },
    raiseLegacyImportEnd: async (params) => {
      raises.push(params);
      const grant = grants.get(params.accountId);
      if (grant !== undefined) {
        grant.endsAt = params.endsAt;
      }
    },
  });

  return { accounts, grants, creates, raises, deps };
}

describe('selectLegacyImportGrant', () => {
  it('prefers an open grant and still returns a revoked grant when that is all there is', () => {
    expect(selectLegacyImportGrant([])).toBeNull();
    expect(
      selectLegacyImportGrant([
        {
          id: 1,
          endsAt: new Date('2028-01-01T00:00:00.000Z'),
          revokedAt: new Date('2026-01-01T00:00:00.000Z'),
        },
        { id: 2, endsAt: new Date('2027-01-01T00:00:00.000Z'), revokedAt: null },
      ])
    ).toEqual({ id: 2, endsAt: new Date('2027-01-01T00:00:00.000Z') });
    expect(
      selectLegacyImportGrant([
        {
          id: 3,
          endsAt: new Date('2027-06-01T00:00:00.000Z'),
          revokedAt: new Date('2026-01-01T00:00:00.000Z'),
        },
      ])
    ).toEqual({ id: 3, endsAt: new Date('2027-06-01T00:00:00.000Z') });
  });
});

describe('importLegacyMembershipExpiryFromText', () => {
  it('counts a dry run and does not write grants', async () => {
    const harness = createHarness();
    harness.accounts.set('member@example.com', [1]);
    harness.accounts.set('former@example.com', [2]);

    const result = await importLegacyMembershipExpiryFromText(
      [
        'email,membership_expires_at',
        'member@example.com,2027-06-01',
        'member@example.com,2028-01-01T00:00:00.000Z',
        'former@example.com,2020-01-01T00:00:00.000Z',
        'former@example.com,2026-09-27T15:00:00.000Z',
        'missing@example.com,2027-01-15T00:00:00.000Z',
        ',2027-01-15T00:00:00.000Z',
        'bad@example.com,not-a-date',
      ].join('\n'),
      harness.deps(true)
    );

    expect(result.counts).toEqual({
      rows: 7,
      created: 1,
      updated: 1,
      unchanged: 0,
      skippedExpired: 2,
      unmatched: 1,
      ambiguous: 0,
      invalid: 2,
    });
    expect(harness.creates).toEqual([]);
    expect(harness.raises).toEqual([]);
  });

  it('creates a legacy_import grant for a case-insensitive email match', async () => {
    const harness = createHarness();
    harness.accounts.set('user@example.com', [7]);

    const result = await importLegacyMembershipExpiryFromText(
      '{"email":"User@Example.com","membership_expires_at":"2027-01-15T00:00:00.000Z"}\n',
      harness.deps(false)
    );

    expect(result.counts.created).toBe(1);
    expect(harness.creates).toEqual([
      {
        accountId: 7,
        source: 'legacy_import',
        startsAt: NOW,
        endsAt: new Date('2027-01-15T00:00:00.000Z'),
      },
    ]);
    expect(result.reportRows).toEqual([]);
  });

  it('reports unmatched and ambiguous emails and does not write grants', async () => {
    const harness = createHarness();
    harness.accounts.set('shared@example.com', [3, 4]);

    const result = await importLegacyMembershipExpiryFromText(
      [
        'email,membership_expires_at',
        'missing@example.com,2027-01-15T00:00:00.000Z',
        'shared@example.com,2027-01-15T00:00:00.000Z',
      ].join('\n'),
      harness.deps(false)
    );

    expect(result.counts.unmatched).toBe(1);
    expect(result.counts.ambiguous).toBe(1);
    expect(result.counts.created).toBe(0);
    expect(harness.creates).toEqual([]);
    expect(result.reportRows).toEqual([
      {
        line: 2,
        email: 'missing@example.com',
        reason: 'unmatched',
        membershipExpiresAt: '2027-01-15T00:00:00.000Z',
      },
      {
        line: 3,
        email: 'shared@example.com',
        reason: 'ambiguous',
        membershipExpiresAt: '2027-01-15T00:00:00.000Z',
      },
    ]);
  });

  it('raises an existing legacy_import end only when a later file expiry arrives', async () => {
    const harness = createHarness();
    harness.accounts.set('user@example.com', [7]);
    const earlier = 'email,membership_expires_at\nuser@example.com,2027-01-15T00:00:00.000Z\n';
    const later = 'email,membership_expires_at\nuser@example.com,2028-01-15T00:00:00.000Z\n';

    const first = await importLegacyMembershipExpiryFromText(earlier, harness.deps(false));
    expect(first.counts.created).toBe(1);
    expect(harness.grants.get(7)?.endsAt.toISOString()).toBe('2027-01-15T00:00:00.000Z');

    const second = await importLegacyMembershipExpiryFromText(later, harness.deps(false));
    expect(second.counts.updated).toBe(1);
    expect(second.counts.created).toBe(0);
    expect(harness.raises).toEqual([
      {
        grantId: 1,
        accountId: 7,
        endsAt: new Date('2028-01-15T00:00:00.000Z'),
      },
    ]);
    expect(harness.grants.get(7)?.endsAt.toISOString()).toBe('2028-01-15T00:00:00.000Z');

    const third = await importLegacyMembershipExpiryFromText(earlier, harness.deps(false));
    expect(third.counts.unchanged).toBe(1);
    expect(third.counts.updated).toBe(0);
    expect(harness.raises).toHaveLength(1);
    expect(harness.grants.get(7)?.endsAt.toISOString()).toBe('2028-01-15T00:00:00.000Z');
  });

  it('rejects a CSV that is missing the membership_expires_at column', async () => {
    const harness = createHarness();

    await expect(
      importLegacyMembershipExpiryFromText(
        'email,expires\nuser@example.com,2027-01-15\n',
        harness.deps(true)
      )
    ).rejects.toThrow(/membership_expires_at/);
    expect(harness.creates).toEqual([]);
  });
});
