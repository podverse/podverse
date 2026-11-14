import { describe, expect, it } from 'vitest';

import { DEFAULT_MAX_ADD_BY_RSS_FEEDS } from '../accountTrust.js';
import {
  ADD_BY_RSS_FEED_LIMIT_UNLIMITED,
  addByRssFeedLimitReachedMessage,
  addByRssMigrationTier,
  decideAddByRssFeedInsert,
  isSavableAddByRssFeedLimit,
  resolveNumericAddByRssFeedLimit,
  selectAddByRssFeedLimitToStored,
  storedAddByRssFeedLimitToSelect,
} from './feedLimitTier.js';

const defaultLimit = DEFAULT_MAX_ADD_BY_RSS_FEEDS;

describe('decideAddByRssFeedInsert', () => {
  it('refuses a new feed when the shared default is full', () => {
    expect(
      decideAddByRssFeedInsert({
        alreadyFollowed: false,
        followedCount: 100,
        storedLimit: null,
        defaultLimit,
      })
    ).toEqual({ action: 'refuse', limit: 100 });
  });

  it('inserts the 101st feed when the stored tier is 200 and refuses the 201st', () => {
    expect(
      decideAddByRssFeedInsert({
        alreadyFollowed: false,
        followedCount: 100,
        storedLimit: 200,
        defaultLimit,
      })
    ).toEqual({ action: 'insert' });
    expect(
      decideAddByRssFeedInsert({
        alreadyFollowed: false,
        followedCount: 200,
        storedLimit: 200,
        defaultLimit,
      })
    ).toEqual({ action: 'refuse', limit: 200 });
  });

  it('updates a feed that is already followed at the cap', () => {
    expect(
      decideAddByRssFeedInsert({
        alreadyFollowed: true,
        followedCount: 100,
        storedLimit: null,
        defaultLimit,
      })
    ).toEqual({ action: 'update' });
  });

  it('inserts when the stored value is unlimited', () => {
    expect(
      decideAddByRssFeedInsert({
        alreadyFollowed: false,
        followedCount: 10000,
        storedLimit: ADD_BY_RSS_FEED_LIMIT_UNLIMITED,
        defaultLimit,
      })
    ).toEqual({ action: 'insert' });
  });

  it('honors a stored zero as a cap of zero', () => {
    expect(
      decideAddByRssFeedInsert({
        alreadyFollowed: false,
        followedCount: 0,
        storedLimit: 0,
        defaultLimit,
      })
    ).toEqual({ action: 'refuse', limit: 0 });
  });
});

describe('addByRssMigrationTier', () => {
  it('picks the smallest listed tier and never unlimited', () => {
    expect(addByRssMigrationTier(100, defaultLimit)).toEqual({ outcome: 'default' });
    expect(addByRssMigrationTier(150, defaultLimit)).toEqual({ outcome: 'tier', tier: 200 });
    expect(addByRssMigrationTier(600, defaultLimit)).toEqual({ outcome: 'tier', tier: 1000 });
    expect(addByRssMigrationTier(5215, defaultLimit)).toEqual({ outcome: 'tier', tier: 10000 });
    expect(addByRssMigrationTier(10001, defaultLimit)).toEqual({ outcome: 'needs_operator' });
  });
});

describe('resolveNumericAddByRssFeedLimit', () => {
  it('maps unlimited to the numeric default and keeps other stored numbers', () => {
    expect(resolveNumericAddByRssFeedLimit(null, defaultLimit)).toBe(100);
    expect(resolveNumericAddByRssFeedLimit(undefined, defaultLimit)).toBe(100);
    expect(resolveNumericAddByRssFeedLimit(ADD_BY_RSS_FEED_LIMIT_UNLIMITED, defaultLimit)).toBe(
      100
    );
    expect(resolveNumericAddByRssFeedLimit(7, defaultLimit)).toBe(7);
    expect(resolveNumericAddByRssFeedLimit(0, defaultLimit)).toBe(0);
  });
});

describe('isSavableAddByRssFeedLimit', () => {
  it('accepts empty, unlimited, and the listed tiers', () => {
    expect(isSavableAddByRssFeedLimit(null)).toBe(true);
    expect(isSavableAddByRssFeedLimit(ADD_BY_RSS_FEED_LIMIT_UNLIMITED)).toBe(true);
    expect(isSavableAddByRssFeedLimit(200)).toBe(true);
    expect(isSavableAddByRssFeedLimit(10000)).toBe(true);
    expect(isSavableAddByRssFeedLimit(100)).toBe(false);
    expect(isSavableAddByRssFeedLimit(0)).toBe(false);
    expect(isSavableAddByRssFeedLimit(17)).toBe(false);
  });
});

describe('Add by RSS limit select values', () => {
  it('maps storage to the select and back, and shows a legacy number as the default', () => {
    expect(storedAddByRssFeedLimitToSelect(null)).toBe('');
    expect(storedAddByRssFeedLimitToSelect(ADD_BY_RSS_FEED_LIMIT_UNLIMITED)).toBe('unlimited');
    expect(storedAddByRssFeedLimitToSelect(200)).toBe('200');
    expect(storedAddByRssFeedLimitToSelect(17)).toBe('');
    expect(selectAddByRssFeedLimitToStored('')).toBeNull();
    expect(selectAddByRssFeedLimitToStored('unlimited')).toBe(ADD_BY_RSS_FEED_LIMIT_UNLIMITED);
    expect(selectAddByRssFeedLimitToStored('200')).toBe(200);
    expect(selectAddByRssFeedLimitToStored('17')).toBeNull();
  });
});

describe('addByRssFeedLimitReachedMessage', () => {
  it('names the contact address when one is configured', () => {
    expect(addByRssFeedLimitReachedMessage(100, 'support@example.com')).toBe(
      'You have reached your limit of 100 Add by RSS feeds. To have it raised, email support@example.com.'
    );
    expect(addByRssFeedLimitReachedMessage(100, '')).toBe(
      'You have reached your limit of 100 Add by RSS feeds. To have it raised, contact support.'
    );
  });
});
