import { describe, expect, it } from 'vitest';

import { AccountMembershipEnum } from '@podverse/helpers';
import type { DTOAccount, DTOAccountMembershipStatus } from '@podverse/helpers/dto';

import { resolveAddByRssParsePath } from './parsePath';

const FUTURE = '2099-01-01T00:00:00.000Z';
const PAST = '2020-01-01T00:00:00.000Z';

const makeStatus = (
  overrides: Partial<DTOAccountMembershipStatus>
): DTOAccountMembershipStatus => ({
  id: 1,
  account_id: 1,
  account_membership_id: AccountMembershipEnum.Premium,
  membership_expires_at: null,
  billing_cadence: null,
  last_extension_idempotency_key: null,
  allow_directory_add_by_rss: null,
  max_add_by_rss_feeds: null,
  max_manual_refreshes_per_hour: null,
  track_stats: null,
  allow_notifications: null,
  ...overrides,
});

const makeAccount = (status?: DTOAccountMembershipStatus): DTOAccount => ({
  id: 1,
  id_text: 'acct-1',
  verified: true,
  ...(status !== undefined ? { account_membership_status: status } : {}),
});

describe('resolveAddByRssParsePath', () => {
  it('parses on the device when signed out', () => {
    expect(resolveAddByRssParsePath(null)).toBe('device');
    expect(resolveAddByRssParsePath(null, { isAuthenticated: false })).toBe('device');
  });

  it('parses on the server while a signed-in account snapshot has not loaded yet', () => {
    expect(resolveAddByRssParsePath(null, { isAuthenticated: true })).toBe('server');
  });

  it('parses on the server for a signed-in account whatever its membership', () => {
    const accounts = [
      makeAccount(
        makeStatus({
          account_membership_id: AccountMembershipEnum.Trial,
          membership_expires_at: FUTURE,
        })
      ),
      makeAccount(
        makeStatus({
          account_membership_id: AccountMembershipEnum.Premium,
          membership_expires_at: FUTURE,
        })
      ),
      makeAccount(),
      makeAccount(
        makeStatus({
          account_membership_id: AccountMembershipEnum.Premium,
          membership_expires_at: PAST,
        })
      ),
    ];

    for (const account of accounts) {
      expect(resolveAddByRssParsePath(account)).toBe('server');
      expect(resolveAddByRssParsePath(account, { isAuthenticated: true })).toBe('server');
    }
  });
});
