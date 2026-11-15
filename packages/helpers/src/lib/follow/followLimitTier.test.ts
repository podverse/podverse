import { describe, expect, it } from 'vitest';

import { DEFAULT_MAX_FOLLOWS } from '../accountTrust.js';
import {
  decideFollowInsert,
  FOLLOW_LIMIT_SELECT_UNLIMITED,
  FOLLOW_LIMIT_UNLIMITED,
  followLimitRefusal,
  followMigrationTier,
  isSavableFollowLimit,
  resolveNumericFollowLimit,
  selectFollowLimitToStored,
  storedFollowLimitToSelect,
} from './followLimitTier.js';

describe('followMigrationTier', () => {
  it('writes nothing at or under the default, and never writes unlimited', () => {
    expect(followMigrationTier(0, DEFAULT_MAX_FOLLOWS)).toEqual({
      outcome: 'default',
      writeStoredTier: null,
    });
    expect(followMigrationTier(500, DEFAULT_MAX_FOLLOWS)).toEqual({
      outcome: 'default',
      writeStoredTier: null,
    });
    expect(followMigrationTier(563, DEFAULT_MAX_FOLLOWS).writeStoredTier).not.toBe(
      FOLLOW_LIMIT_UNLIMITED
    );
    expect(followMigrationTier(10001, DEFAULT_MAX_FOLLOWS).writeStoredTier).toBeNull();
  });

  it('uses the smallest listed tier that covers the count', () => {
    expect(followMigrationTier(563, DEFAULT_MAX_FOLLOWS)).toEqual({
      outcome: 'tier',
      tier: 1000,
      writeStoredTier: 1000,
    });
    expect(followMigrationTier(1910, DEFAULT_MAX_FOLLOWS)).toEqual({
      outcome: 'tier',
      tier: 2000,
      writeStoredTier: 2000,
    });
    expect(followMigrationTier(4314, DEFAULT_MAX_FOLLOWS)).toEqual({
      outcome: 'tier',
      tier: 5000,
      writeStoredTier: 5000,
    });
    expect(followMigrationTier(10000, DEFAULT_MAX_FOLLOWS)).toEqual({
      outcome: 'tier',
      tier: 10000,
      writeStoredTier: 10000,
    });
  });

  it('leaves a count past 10000 for an operator', () => {
    expect(followMigrationTier(10001, DEFAULT_MAX_FOLLOWS)).toEqual({
      outcome: 'needs_operator',
      writeStoredTier: null,
    });
  });
});

describe('decideFollowInsert', () => {
  it('treats an empty tier as 500 and a stored tier as the cap', () => {
    expect(
      decideFollowInsert({
        alreadyFollowed: false,
        followedCount: 500,
        storedLimit: null,
        defaultLimit: DEFAULT_MAX_FOLLOWS,
      })
    ).toEqual({ action: 'refuse', limit: 500 });
    expect(
      decideFollowInsert({
        alreadyFollowed: false,
        followedCount: 1000,
        storedLimit: 1000,
        defaultLimit: DEFAULT_MAX_FOLLOWS,
      })
    ).toEqual({ action: 'refuse', limit: 1000 });
    expect(
      decideFollowInsert({
        alreadyFollowed: false,
        followedCount: 500,
        storedLimit: 1000,
        defaultLimit: DEFAULT_MAX_FOLLOWS,
      })
    ).toEqual({ action: 'insert' });
  });

  it('does not refuse unlimited, and an existing follow does not count as a new one', () => {
    expect(
      decideFollowInsert({
        alreadyFollowed: false,
        followedCount: 10000,
        storedLimit: FOLLOW_LIMIT_UNLIMITED,
        defaultLimit: DEFAULT_MAX_FOLLOWS,
      })
    ).toEqual({ action: 'insert' });
    expect(
      decideFollowInsert({
        alreadyFollowed: true,
        followedCount: 500,
        storedLimit: null,
        defaultLimit: DEFAULT_MAX_FOLLOWS,
      })
    ).toEqual({ action: 'update' });
  });

  it('honors a stored zero as a cap of zero', () => {
    expect(
      decideFollowInsert({
        alreadyFollowed: false,
        followedCount: 0,
        storedLimit: 0,
        defaultLimit: DEFAULT_MAX_FOLLOWS,
      })
    ).toEqual({ action: 'refuse', limit: 0 });
  });
});

describe('follow limit storage', () => {
  it('saves null, unlimited, and the listed tiers, and not the default number', () => {
    expect(isSavableFollowLimit(null)).toBe(true);
    expect(isSavableFollowLimit(FOLLOW_LIMIT_UNLIMITED)).toBe(true);
    expect(isSavableFollowLimit(1000)).toBe(true);
    expect(isSavableFollowLimit(10000)).toBe(true);
    expect(isSavableFollowLimit(500)).toBe(false);
    expect(isSavableFollowLimit(17)).toBe(false);
  });

  it('maps the select both ways and resolves unlimited to the numeric default', () => {
    expect(storedFollowLimitToSelect(null)).toBe('');
    expect(storedFollowLimitToSelect(FOLLOW_LIMIT_UNLIMITED)).toBe(FOLLOW_LIMIT_SELECT_UNLIMITED);
    expect(storedFollowLimitToSelect(2000)).toBe('2000');
    expect(storedFollowLimitToSelect(500)).toBe('');
    expect(selectFollowLimitToStored('')).toBeNull();
    expect(selectFollowLimitToStored(FOLLOW_LIMIT_SELECT_UNLIMITED)).toBe(FOLLOW_LIMIT_UNLIMITED);
    expect(selectFollowLimitToStored('3000')).toBe(3000);
    expect(selectFollowLimitToStored('500')).toBeNull();
    expect(resolveNumericFollowLimit(FOLLOW_LIMIT_UNLIMITED, DEFAULT_MAX_FOLLOWS)).toBe(
      DEFAULT_MAX_FOLLOWS
    );
    expect(resolveNumericFollowLimit(null, DEFAULT_MAX_FOLLOWS)).toBe(DEFAULT_MAX_FOLLOWS);
    expect(resolveNumericFollowLimit(4000, DEFAULT_MAX_FOLLOWS)).toBe(4000);
  });

  it('builds a refusal with the tier and no renew path', () => {
    expect(followLimitRefusal(500)).toEqual({
      message: 'You can follow up to 500 podcasts, playlists, and accounts.',
      code: 'follow_limit_reached',
      i18nKey: 'membership.follow_limit_reached',
      limit: 500,
    });
    expect(followLimitRefusal(500)).not.toHaveProperty('renewPath');
  });
});
