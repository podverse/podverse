import { describe, expect, it } from 'vitest';

import { ADMIN_EDITABLE_GRANT_SOURCES, isAdminEditableGrant } from './membershipGrantSource.js';

const unlinked = {
  billing_subscription_id: null,
  billing_transaction_id: null,
  membership_claim_token_id: null,
};

describe('isAdminEditableGrant', () => {
  it.each(ADMIN_EDITABLE_GRANT_SOURCES)('lets the portal edit an unlinked %s grant', (source) => {
    expect(isAdminEditableGrant({ source, ...unlinked })).toBe(true);
  });

  it.each(['subscription_period', 'one_time_purchase', 'claim_token'])(
    'protects a %s grant',
    (source) => {
      expect(isAdminEditableGrant({ source, ...unlinked })).toBe(false);
    }
  );

  it('protects an admin-source grant that a subscription, transaction, or claim paid for', () => {
    expect(isAdminEditableGrant({ source: 'admin', ...unlinked, billing_subscription_id: 4 })).toBe(
      false
    );
    expect(isAdminEditableGrant({ source: 'admin', ...unlinked, billing_transaction_id: 9 })).toBe(
      false
    );
    expect(
      isAdminEditableGrant({
        source: 'migration_baseline',
        ...unlinked,
        membership_claim_token_id: '0b6f4f5e-4d7a-4e57-9a57-7a7f2f0d8c11',
      })
    ).toBe(false);
  });

  it('protects a source it does not recognize', () => {
    expect(isAdminEditableGrant({ source: 'gift', ...unlinked })).toBe(false);
  });

  it('protects a grant that is already revoked', () => {
    expect(
      isAdminEditableGrant({
        source: 'admin',
        ...unlinked,
        revoked_at: new Date('2026-09-27T23:01:00.000Z'),
      })
    ).toBe(false);
  });
});
