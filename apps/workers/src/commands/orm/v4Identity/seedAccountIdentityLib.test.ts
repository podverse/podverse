import { describe, expect, it } from 'vitest';

import {
  CARRIED_TRIAL_WINDOW_DAYS,
  decideIdentitySeed,
  decideV4Membership,
  parseV4IdentityRow,
  preferV4Identity,
} from './seedAccountIdentityLib.js';

const BCRYPT = `$2b$10$${'a'.repeat(53)}`;

function row(overrides: Partial<Parameters<typeof parseV4IdentityRow>[0]> = {}) {
  return {
    idText: 'abcd123',
    email: 'Person@Example.com',
    displayName: 'Person',
    verified: true,
    passwordHash: BCRYPT,
    ...overrides,
  };
}

describe('parseV4IdentityRow', () => {
  it('keeps a bcrypt hash and lowercases the email', () => {
    const parsed = parseV4IdentityRow(row());
    expect(parsed).toEqual({
      ok: true,
      source: {
        idText: 'abcd123',
        email: 'person@example.com',
        displayName: 'Person',
        verified: true,
        passwordHash: BCRYPT,
      },
    });
  });

  it('stores a blank name as null', () => {
    const parsed = parseV4IdentityRow(row({ displayName: '   ' }));
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.source.displayName).toBeNull();
    }
  });

  it('rejects an email, a name, a missing verified flag, and a non-bcrypt hash', () => {
    expect(parseV4IdentityRow(row({ email: 'not-an-email' })).ok).toBe(false);
    expect(parseV4IdentityRow(row({ displayName: 'n'.repeat(256) }))).toEqual({
      ok: false,
      reason: 'bad_name',
    });
    expect(parseV4IdentityRow(row({ verified: null }))).toEqual({
      ok: false,
      reason: 'bad_verified',
    });
    expect(parseV4IdentityRow(row({ passwordHash: 'plain' }))).toEqual({
      ok: false,
      reason: 'bad_password',
    });
  });
});

describe('decideIdentitySeed', () => {
  it('leaves an existing email unchanged even when the id is also taken', () => {
    expect(decideIdentitySeed({ emailAccountId: 4, idTextAccountId: 9 })).toBe(
      'skip_existing_email'
    );
  });

  it('refuses to reuse an id that already belongs to another account', () => {
    expect(decideIdentitySeed({ emailAccountId: null, idTextAccountId: 9 })).toBe('skip_id_taken');
  });

  it('creates when neither the email nor the id is taken', () => {
    expect(decideIdentitySeed({ emailAccountId: null, idTextAccountId: null })).toBe('create');
  });

  it('repairs when the email and the id already belong to the same account', () => {
    expect(decideIdentitySeed({ emailAccountId: 4, idTextAccountId: 4 })).toBe('repair');
  });
});

describe('decideV4Membership', () => {
  const now = new Date('2026-06-01T00:00:00.000Z');
  const dayMs = 24 * 60 * 60 * 1000;

  function atDays(days: number): Date {
    return new Date(now.getTime() + days * dayMs);
  }

  it('sets Premium for a future paid expiry and still carries a trial inside the window', () => {
    expect(
      decideV4Membership({
        membershipExpiresAt: atDays(400),
        freeTrialExpiresAt: atDays(10),
        now,
      })
    ).toEqual({ tier: 'premium', carriedTrialEndsAt: atDays(10) });
  });

  it('leaves a trial that ends after the window uncarried', () => {
    expect(
      decideV4Membership({
        membershipExpiresAt: null,
        freeTrialExpiresAt: atDays(CARRIED_TRIAL_WINDOW_DAYS + 1),
        now,
      })
    ).toEqual({ tier: 'trial', carriedTrialEndsAt: null });
  });

  it('carries a trial that ends on the window boundary and ignores a past paid expiry', () => {
    const boundary = atDays(CARRIED_TRIAL_WINDOW_DAYS);
    expect(
      decideV4Membership({
        membershipExpiresAt: atDays(-1),
        freeTrialExpiresAt: boundary,
        now,
      })
    ).toEqual({ tier: 'trial', carriedTrialEndsAt: boundary });
  });

  function usage(overrides: Partial<Parameters<typeof preferV4Identity>[0]['current']> = {}) {
    return {
      activityAt: null,
      hasLists: false,
      verified: true,
      updatedAt: atDays(-30),
      ...overrides,
    };
  }

  it('keeps a used row over a newer row that was never used', () => {
    expect(
      preferV4Identity({
        current: usage({ hasLists: true, updatedAt: atDays(-300) }),
        incoming: usage({ updatedAt: atDays(-1) }),
      })
    ).toBe('current');
  });

  it('keeps the later dated activity, and a dated row over a row with lists only', () => {
    expect(
      preferV4Identity({
        current: usage({ activityAt: atDays(-20), updatedAt: atDays(-1) }),
        incoming: usage({ activityAt: atDays(-2), updatedAt: atDays(-40) }),
      })
    ).toBe('incoming');
    expect(
      preferV4Identity({
        current: usage({ hasLists: true, updatedAt: atDays(-1) }),
        incoming: usage({ activityAt: atDays(-200) }),
      })
    ).toBe('incoming');
  });

  it('prefers a verified row, then the later update, when neither has dated activity', () => {
    expect(
      preferV4Identity({
        current: usage({ verified: true, updatedAt: atDays(-90) }),
        incoming: usage({ verified: false, updatedAt: atDays(-1) }),
      })
    ).toBe('current');
    expect(
      preferV4Identity({
        current: usage({ updatedAt: atDays(-90) }),
        incoming: usage({ updatedAt: atDays(-1) }),
      })
    ).toBe('incoming');
    expect(preferV4Identity({ current: usage(), incoming: usage() })).toBe('current');
  });

  it('grants nothing for a past trial and an expiry that is not still in the future', () => {
    expect(
      decideV4Membership({
        membershipExpiresAt: now,
        freeTrialExpiresAt: atDays(-3),
        now,
      })
    ).toEqual({ tier: 'trial', carriedTrialEndsAt: null });
  });
});
