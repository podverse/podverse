import { describe, expect, it } from 'vitest';

import { AccountMembershipEnum } from './accountMembership.js';
import {
  membershipCountsTowardPopularity,
  membershipStoresListens,
  resolveAccountEntitlements,
} from './accountTrust.js';
import { ADD_BY_RSS_FEED_LIMIT_UNLIMITED } from './addByRSS/feedLimitTier.js';

describe('resolveAccountEntitlements Add by RSS limit', () => {
  it('gives Trial and Premium the same default and lets an override win on either tier', () => {
    expect(resolveAccountEntitlements(AccountMembershipEnum.Trial, null).maxAddByRSSFeeds).toBe(
      100
    );
    expect(resolveAccountEntitlements(AccountMembershipEnum.Premium, null).maxAddByRSSFeeds).toBe(
      100
    );
    expect(
      resolveAccountEntitlements(AccountMembershipEnum.Trial, { max_add_by_rss_feeds: 7 })
        .maxAddByRSSFeeds
    ).toBe(7);
    expect(
      resolveAccountEntitlements(AccountMembershipEnum.Premium, { max_add_by_rss_feeds: 7 })
        .maxAddByRSSFeeds
    ).toBe(7);
  });

  it('resolves unlimited to the numeric default so a count comparison stays a real cap', () => {
    expect(
      resolveAccountEntitlements(AccountMembershipEnum.Trial, {
        max_add_by_rss_feeds: ADD_BY_RSS_FEED_LIMIT_UNLIMITED,
      }).maxAddByRSSFeeds
    ).toBe(100);
    expect(
      resolveAccountEntitlements(AccountMembershipEnum.Premium, {
        max_add_by_rss_feeds: ADD_BY_RSS_FEED_LIMIT_UNLIMITED,
      }).maxAddByRSSFeeds
    ).toBe(100);
  });
});

describe('membershipStoresListens', () => {
  it('stores a trial listen whether or not trackStats is on', () => {
    expect(membershipStoresListens(AccountMembershipEnum.Trial, false)).toBe(true);
    expect(membershipStoresListens(AccountMembershipEnum.Trial, true)).toBe(true);
  });

  it('stores a premium listen only while trackStats is on', () => {
    expect(membershipStoresListens(AccountMembershipEnum.Premium, true)).toBe(true);
    expect(membershipStoresListens(AccountMembershipEnum.Premium, false)).toBe(false);
  });
});

describe('membershipCountsTowardPopularity', () => {
  it('leaves every trial listen out of popularity', () => {
    expect(membershipCountsTowardPopularity(AccountMembershipEnum.Trial, false)).toBe(false);
    expect(membershipCountsTowardPopularity(AccountMembershipEnum.Trial, true)).toBe(false);
  });

  it('counts a premium listen only while trackStats is on', () => {
    expect(membershipCountsTowardPopularity(AccountMembershipEnum.Premium, true)).toBe(true);
    expect(membershipCountsTowardPopularity(AccountMembershipEnum.Premium, false)).toBe(false);
  });
});
