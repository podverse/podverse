import { describe, expect, it } from 'vitest';

import {
  QUEUE_RESOURCE_DEFAULT_LIMIT,
  queueResourceLimitFor,
  queueResourceMigrationTier,
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
