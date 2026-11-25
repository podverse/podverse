import { describe, expect, it } from 'vitest';

import {
  QUEUE_RESOURCE_DEFAULT_LIMIT,
  queueResourceLimitFor,
  queueResourceMigrationTier,
  selectQueueResourceLimitToStored,
  shouldShowQueueHistoryLimitNotice,
  storedQueueResourceLimitToSelect,
} from './queueResourceLimitTier.js';

describe('queueResourceMigrationTier', () => {
  it('writes nothing at the default and uses the smallest listed tier above it', () => {
    expect(queueResourceMigrationTier(10000)).toEqual({ outcome: 'default' });
    expect(queueResourceMigrationTier(10001)).toEqual({ outcome: 'tier', tier: 20000 });
    expect(queueResourceMigrationTier(60000)).toEqual({ outcome: 'tier', tier: 60000 });
    expect(queueResourceMigrationTier(60001)).toEqual({ outcome: 'tier', tier: 100000 });
    expect(queueResourceMigrationTier(100000)).toEqual({ outcome: 'tier', tier: 100000 });
  });

  it('leaves a count past the last tier for an operator', () => {
    expect(queueResourceMigrationTier(100001)).toEqual({ outcome: 'needs_operator' });
  });
});

describe('queueResourceLimitFor', () => {
  it('uses 10000 when the column is empty and the stored number otherwise', () => {
    expect(queueResourceLimitFor(null)).toBe(QUEUE_RESOURCE_DEFAULT_LIMIT);
    expect(queueResourceLimitFor(undefined)).toBe(QUEUE_RESOURCE_DEFAULT_LIMIT);
    expect(queueResourceLimitFor(60000)).toBe(60000);
  });
});

describe('shouldShowQueueHistoryLimitNotice', () => {
  const limit = QUEUE_RESOURCE_DEFAULT_LIMIT;

  it('stays hidden until 50 rows remain, then stays up through the cap', () => {
    expect(
      shouldShowQueueHistoryLimitNotice({
        acknowledgedLimit: null,
        largestQueueCount: limit - 51,
        limit,
      })
    ).toBe(false);
    expect(
      shouldShowQueueHistoryLimitNotice({
        acknowledgedLimit: null,
        largestQueueCount: limit - 50,
        limit,
      })
    ).toBe(true);
    expect(
      shouldShowQueueHistoryLimitNotice({
        acknowledgedLimit: null,
        largestQueueCount: limit - 49,
        limit,
      })
    ).toBe(true);
    expect(
      shouldShowQueueHistoryLimitNotice({
        acknowledgedLimit: null,
        largestQueueCount: limit,
        limit,
      })
    ).toBe(true);
    expect(
      shouldShowQueueHistoryLimitNotice({
        acknowledgedLimit: null,
        largestQueueCount: limit + 1,
        limit,
      })
    ).toBe(true);
  });

  it('hides a cap that was already acknowledged and shows again when the cap changes', () => {
    expect(
      shouldShowQueueHistoryLimitNotice({
        acknowledgedLimit: limit,
        largestQueueCount: limit,
        limit,
      })
    ).toBe(false);
    expect(
      shouldShowQueueHistoryLimitNotice({
        acknowledgedLimit: limit,
        largestQueueCount: 20000 - 50,
        limit: 20000,
      })
    ).toBe(true);
  });
});

describe('queue resource limit select', () => {
  it('maps the empty default and listed tiers, and rejects the default and other integers', () => {
    expect(storedQueueResourceLimitToSelect(null)).toBe('');
    expect(storedQueueResourceLimitToSelect(10000)).toBe('');
    expect(storedQueueResourceLimitToSelect(20000)).toBe('20000');
    expect(selectQueueResourceLimitToStored('')).toBeNull();
    expect(selectQueueResourceLimitToStored('20000')).toBe(20000);
    expect(selectQueueResourceLimitToStored('10000')).toBeNull();
    expect(selectQueueResourceLimitToStored('-1')).toBeNull();
  });
});
