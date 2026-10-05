import { describe, expect, it } from 'vitest';

import { ONE_DAY_MS, SECONDS_PER_DAY } from '../timeConstants.js';
import type {
  MembershipAccess,
  MembershipGrantInput,
  MembershipSubscriptionInput,
} from './grantLedger.js';
import { computeMembershipAccess } from './grantLedger.js';

const NOW = new Date('2026-06-01T12:00:00.000Z');
const BUFFER_SECONDS = 2 * SECONDS_PER_DAY;
const GRACE_SECONDS = 7 * SECONDS_PER_DAY;

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

const subscription = (
  overrides: Partial<MembershipSubscriptionInput> = {}
): MembershipSubscriptionInput => ({
  status: 'active',
  purchaseKind: 'auto_renew',
  currentPeriodStart: at(-20),
  currentPeriodEnd: at(10),
  cancelAtPeriodEnd: false,
  ...overrides,
});

const compute = (
  grants: MembershipGrantInput[],
  subscriptions: MembershipSubscriptionInput[] = []
): MembershipAccess =>
  computeMembershipAccess({
    now: NOW,
    grants,
    subscriptions,
    renewalEntitlementBufferExpiration: BUFFER_SECONDS,
    paymentFailureGraceExpiration: GRACE_SECONDS,
  });

describe('computeMembershipAccess — grants', () => {
  it('grants nothing to an account with no grants or subscriptions', () => {
    expect(compute([])).toEqual({
      membershipExpiresAt: null,
      isEntitled: false,
      inGrace: false,
      suppressExpiryReminder: false,
      activeAutoRenew: false,
    });
  });

  it('entitles through a one-time grant that covers now', () => {
    const access = compute([grant(-5, 25)]);

    expect(access.isEntitled).toBe(true);
    expect(access.membershipExpiresAt).toEqual(at(25));
    expect(access.activeAutoRenew).toBe(false);
    expect(access.suppressExpiryReminder).toBe(false);
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

describe('computeMembershipAccess — subscriptions', () => {
  it('extends an active auto-renewing subscription by the renewal buffer', () => {
    const access = compute([], [subscription({ currentPeriodEnd: at(10) })]);

    expect(access.isEntitled).toBe(true);
    expect(access.membershipExpiresAt).toEqual(at(12));
    expect(access.activeAutoRenew).toBe(true);
    expect(access.suppressExpiryReminder).toBe(true);
  });

  it('keeps a member entitled while a renewal is late, until the buffer runs out', () => {
    const late = compute([], [subscription({ currentPeriodEnd: at(-1) })]);
    const lapsed = compute([], [subscription({ currentPeriodEnd: at(-3) })]);

    expect(late.isEntitled).toBe(true);
    expect(late.membershipExpiresAt).toEqual(at(1));

    expect(lapsed.isEntitled).toBe(false);
    expect(lapsed.membershipExpiresAt).toEqual(at(-1));
    expect(lapsed.activeAutoRenew).toBe(false);
    expect(lapsed.suppressExpiryReminder).toBe(false);
  });

  it('ends a cancelled subscription with its paid period, without the buffer', () => {
    const cancelled = { status: 'cancelled_active', cancelAtPeriodEnd: true } as const;
    const inPeriod = compute([], [subscription({ ...cancelled, currentPeriodEnd: at(10) })]);
    const afterPeriod = compute([], [subscription({ ...cancelled, currentPeriodEnd: at(-1) })]);

    expect(inPeriod.isEntitled).toBe(true);
    expect(inPeriod.membershipExpiresAt).toEqual(at(10));
    expect(inPeriod.activeAutoRenew).toBe(false);

    expect(afterPeriod.isEntitled).toBe(false);
    expect(afterPeriod.membershipExpiresAt).toEqual(at(-1));
  });

  it('does not add the buffer to a one-time purchase', () => {
    const access = compute(
      [],
      [subscription({ purchaseKind: 'one_time', currentPeriodEnd: at(-1) })]
    );

    expect(access.isEntitled).toBe(false);
    expect(access.membershipExpiresAt).toEqual(at(-1));
  });

  it('keeps access through the grace window while a failed renewal is retried', () => {
    const inside = compute(
      [],
      [subscription({ status: 'in_grace_period', currentPeriodEnd: at(-3) })]
    );
    const outside = compute(
      [],
      [subscription({ status: 'in_grace_period', currentPeriodEnd: at(-8) })]
    );

    expect(inside.isEntitled).toBe(true);
    expect(inside.inGrace).toBe(true);
    expect(inside.membershipExpiresAt).toEqual(at(4));

    expect(outside.isEntitled).toBe(false);
    expect(outside.inGrace).toBe(false);
    expect(outside.membershipExpiresAt).toEqual(at(-1));
  });

  it('never gives grace less time than the renewal buffer', () => {
    const access = computeMembershipAccess({
      now: NOW,
      grants: [],
      subscriptions: [subscription({ status: 'in_grace_period', currentPeriodEnd: at(-1) })],
      renewalEntitlementBufferExpiration: BUFFER_SECONDS,
      paymentFailureGraceExpiration: 3600,
    });

    expect(access.isEntitled).toBe(true);
    expect(access.membershipExpiresAt).toEqual(at(1));
  });

  it('grants nothing for pending, past-due, expired, or revoked subscriptions', () => {
    for (const status of ['pending', 'past_due', 'expired', 'revoked'] as const) {
      const access = compute([], [subscription({ status })]);

      expect(access.isEntitled).toBe(false);
      expect(access.membershipExpiresAt).toBeNull();
    }
  });

  it('keeps a leftover grant after the subscription expired', () => {
    const access = compute(
      [grant(-2, 20, { source: 'claim_token' })],
      [subscription({ status: 'expired', currentPeriodEnd: at(-5) })]
    );

    expect(access.isEntitled).toBe(true);
    expect(access.membershipExpiresAt).toEqual(at(20));
    expect(access.activeAutoRenew).toBe(false);
  });

  it('bridges to a subscription whose first charge is when the current membership ends', () => {
    const access = compute(
      [grant(-20, 10)],
      [subscription({ currentPeriodStart: at(10), currentPeriodEnd: at(10) })]
    );

    expect(access.isEntitled).toBe(true);
    expect(access.membershipExpiresAt).toEqual(at(12));
    expect(access.suppressExpiryReminder).toBe(true);
  });

  it('rejects a negative or non-finite duration', () => {
    const base = { now: NOW, grants: [], subscriptions: [] };

    expect(() =>
      computeMembershipAccess({
        ...base,
        renewalEntitlementBufferExpiration: -1,
        paymentFailureGraceExpiration: GRACE_SECONDS,
      })
    ).toThrow(TypeError);
    expect(() =>
      computeMembershipAccess({
        ...base,
        renewalEntitlementBufferExpiration: BUFFER_SECONDS,
        paymentFailureGraceExpiration: Number.NaN,
      })
    ).toThrow(TypeError);
  });
});

describe('computeMembershipAccess — expiry reminder suppression', () => {
  const cases: {
    name: string;
    subscription: MembershipSubscriptionInput;
    suppress: boolean;
  }[] = [
    { name: 'active and auto-renewing', subscription: subscription(), suppress: true },
    {
      name: 'retrying a failed renewal',
      subscription: subscription({ status: 'in_grace_period', currentPeriodEnd: at(-1) }),
      suppress: true,
    },
    {
      name: 'set to cancel at period end',
      subscription: subscription({ cancelAtPeriodEnd: true }),
      suppress: false,
    },
    {
      name: 'cancelled with time left',
      subscription: subscription({ status: 'cancelled_active', cancelAtPeriodEnd: true }),
      suppress: false,
    },
    { name: 'past due', subscription: subscription({ status: 'past_due' }), suppress: false },
    { name: 'expired', subscription: subscription({ status: 'expired' }), suppress: false },
    {
      name: 'a one-time purchase',
      subscription: subscription({ purchaseKind: 'one_time' }),
      suppress: false,
    },
    {
      name: 'auto-renewing but past its buffer',
      subscription: subscription({ currentPeriodEnd: at(-5) }),
      suppress: false,
    },
  ];

  for (const { name, subscription: sub, suppress } of cases) {
    it(`${suppress ? 'suppresses' : 'keeps'} the reminder for a member ${name}`, () => {
      const access = compute([grant(-10, 30)], [sub]);

      expect(access.isEntitled).toBe(true);
      expect(access.activeAutoRenew).toBe(suppress);
      expect(access.suppressExpiryReminder).toBe(suppress);
    });
  }
});
