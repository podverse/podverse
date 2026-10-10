import { describe, expect, it } from 'vitest';

import { ONE_DAY_MS } from '../timeConstants.js';
import type { MembershipAccess, MembershipGrantInput } from './grantLedger.js';
import { computeMembershipAccess } from './grantLedger.js';

const NOW = new Date('2026-06-01T12:00:00.000Z');

const at = (days: number): Date => new Date(NOW.getTime() + days * ONE_DAY_MS);

const grant = (
  startDays: number,
  endDays: number,
  overrides: Partial<MembershipGrantInput> = {}
): MembershipGrantInput => ({
  source: 'one_time_purchase',
  startsAt: at(startDays),
  endsAt: at(endDays),
  ...overrides,
});

const compute = (grants: MembershipGrantInput[]): MembershipAccess =>
  computeMembershipAccess({
    now: NOW,
    grants,
  });

describe('computeMembershipAccess — grants', () => {
  it('grants nothing to an account with no grants', () => {
    expect(compute([])).toEqual({
      membershipExpiresAt: null,
      isEntitled: false,
    });
  });

  it('entitles through a one-time grant that covers now', () => {
    const access = compute([grant(-5, 25)]);

    expect(access.isEntitled).toBe(true);
    expect(access.membershipExpiresAt).toEqual(at(25));
  });

  it('takes the latest end among overlapping grants', () => {
    const access = compute([
      grant(-30, 10),
      grant(-5, 40, { source: 'claim_token' }),
      grant(-60, 5, { source: 'admin' }),
    ]);

    expect(access.membershipExpiresAt).toEqual(at(40));
  });

  it('extends access through a grant that starts where the current one ends', () => {
    expect(compute([grant(-10, 5), grant(5, 35)]).membershipExpiresAt).toEqual(at(35));
  });

  it('merges overlapping paid grants and an admin grant into one continuous run', () => {
    const access = compute([grant(-12, -1), grant(-5, 15), grant(15, 30, { source: 'admin' })]);

    expect(access.isEntitled).toBe(true);
    expect(access.membershipExpiresAt).toEqual(at(30));
  });

  it('treats a seam of a few seconds as continuous', () => {
    const roundedStart = new Date(at(5).getTime() + 30_000);
    const access = compute([grant(-10, 5), { ...grant(5, 35), startsAt: roundedStart }]);

    expect(access.membershipExpiresAt).toEqual(at(35));
  });

  it('does not bridge a real gap to a later grant', () => {
    const access = compute([grant(-10, 5), grant(6, 36)]);

    expect(access.isEntitled).toBe(true);
    expect(access.membershipExpiresAt).toEqual(at(5));
  });

  it('does not entitle before a future grant starts', () => {
    const access = compute([grant(3, 33)]);

    expect(access.isEntitled).toBe(false);
    expect(access.membershipExpiresAt).toBeNull();
  });

  it('ignores revoked grants', () => {
    const access = compute([grant(-5, 25, { revokedAt: at(-1) })]);

    expect(access.isEntitled).toBe(false);
    expect(access.membershipExpiresAt).toBeNull();
  });

  it('dates a lapse to the end of the latest past access', () => {
    const access = compute([grant(-60, -30, { source: 'trial' }), grant(-29, -3)]);

    expect(access.isEntitled).toBe(false);
    expect(access.membershipExpiresAt).toEqual(at(-3));
  });
});
