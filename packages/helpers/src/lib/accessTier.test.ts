import { describe, expect, it } from 'vitest';

import type { GatedFeature } from './accessTier.js';
import {
  accessTierFromMembership,
  accessTierSatisfies,
  evaluateFeatureAccess,
  FEATURE_REQUIRED_TIER,
  shouldSuppressExpiryReminder,
} from './accessTier.js';
import type { MembershipState } from './accountMembership.js';

const ANONYMOUS: MembershipState = {
  isLoggedIn: false,
  isMember: false,
  isExpired: false,
  tier: null,
  expiresAt: null,
};

const ACCOUNT: MembershipState = {
  isLoggedIn: true,
  isMember: false,
  isExpired: false,
  tier: null,
  expiresAt: null,
};

const MEMBER: MembershipState = {
  isLoggedIn: true,
  isMember: true,
  isExpired: false,
  tier: 'premium',
  expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
};

const LAPSED: MembershipState = {
  isLoggedIn: true,
  isMember: false,
  isExpired: true,
  tier: 'premium',
  expiresAt: new Date(Date.now() - 86_400_000).toISOString(),
};

describe('accessTierFromMembership', () => {
  it('maps the four account states onto three tiers', () => {
    expect(accessTierFromMembership(ANONYMOUS)).toBe('anonymous');
    expect(accessTierFromMembership(ACCOUNT)).toBe('account');
    expect(accessTierFromMembership(MEMBER)).toBe('membership');
  });

  it('treats a lapsed member as account tier, not a fourth state', () => {
    expect(accessTierFromMembership(LAPSED)).toBe('account');
  });
});

describe('accessTierSatisfies', () => {
  it('is satisfied by an equal or higher tier', () => {
    expect(accessTierSatisfies('membership', 'anonymous')).toBe(true);
    expect(accessTierSatisfies('account', 'account')).toBe(true);
    expect(accessTierSatisfies('anonymous', 'anonymous')).toBe(true);
  });

  it('is not satisfied by a lower tier', () => {
    expect(accessTierSatisfies('anonymous', 'account')).toBe(false);
    expect(accessTierSatisfies('account', 'membership')).toBe(false);
  });
});

const ANONYMOUS_FEATURES: GatedFeature[] = [
  'add_by_rss_view',
  'downloads',
  'offline_playback',
  'queue_history_local',
  'seen_state_local',
  'subscribe_local',
  'subscription_list',
  'unsubscribe',
];

const MEMBERSHIP_FEATURES: GatedFeature[] = [
  'add_by_rss_add',
  'add_by_rss_refresh',
  'directory_add_by_rss',
  'notifications',
  'queue_history_sync',
  'subscribe_sync',
];

describe('evaluateFeatureAccess', () => {
  it('allows every anonymous-tier capability with no account at all', () => {
    for (const feature of ANONYMOUS_FEATURES) {
      expect(evaluateFeatureAccess(feature, ANONYMOUS)).toEqual({ allowed: true });
    }
  });

  it('never gates unsubscribing, in any state', () => {
    for (const membership of [ANONYMOUS, ACCOUNT, MEMBER, LAPSED]) {
      expect(evaluateFeatureAccess('unsubscribe', membership).allowed).toBe(true);
    }
  });

  it('tells a signed-out user to sign in rather than to buy a membership', () => {
    for (const feature of MEMBERSHIP_FEATURES) {
      expect(evaluateFeatureAccess(feature, ANONYMOUS)).toEqual({
        allowed: false,
        reason: 'needs_account',
        requiredTier: 'membership',
      });
    }
  });

  it('distinguishes never-had-a-membership from lapsed', () => {
    expect(evaluateFeatureAccess('add_by_rss_add', ACCOUNT)).toEqual({
      allowed: false,
      reason: 'needs_membership',
      requiredTier: 'membership',
    });

    expect(evaluateFeatureAccess('add_by_rss_add', LAPSED)).toEqual({
      allowed: false,
      reason: 'membership_expired',
      requiredTier: 'membership',
    });
  });

  it('allows every membership-tier capability to a valid member', () => {
    for (const feature of MEMBERSHIP_FEATURES) {
      expect(evaluateFeatureAccess(feature, MEMBER)).toEqual({ allowed: true });
    }
  });

  it('gates cross-device seen sync at account tier, so signing in is enough', () => {
    expect(evaluateFeatureAccess('seen_state_sync', ANONYMOUS)).toEqual({
      allowed: false,
      reason: 'needs_account',
      requiredTier: 'account',
    });
    expect(evaluateFeatureAccess('seen_state_sync', ACCOUNT).allowed).toBe(true);
    expect(evaluateFeatureAccess('seen_state_sync', LAPSED).allowed).toBe(true);
  });

  it('leaves a lapsed member a working app', () => {
    for (const feature of ANONYMOUS_FEATURES) {
      expect(evaluateFeatureAccess(feature, LAPSED).allowed).toBe(true);
    }
    expect(evaluateFeatureAccess('add_by_rss_view', LAPSED).allowed).toBe(true);
    expect(evaluateFeatureAccess('add_by_rss_refresh', LAPSED).allowed).toBe(false);
    expect(evaluateFeatureAccess('add_by_rss_add', LAPSED).allowed).toBe(false);
  });

  it('classifies every declared feature, so a new one cannot land untested', () => {
    const declared: string[] = Object.keys(FEATURE_REQUIRED_TIER).sort();
    const covered: string[] = [
      ...ANONYMOUS_FEATURES,
      ...MEMBERSHIP_FEATURES,
      'seen_state_sync',
    ].sort();

    expect(covered).toEqual(declared);
  });
});

describe('shouldSuppressExpiryReminder', () => {
  it('suppresses nothing until payment functionality exists', () => {
    expect(shouldSuppressExpiryReminder()).toBe(false);
  });
});
