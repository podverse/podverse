/** Per-queue row cap when `max_queue_resources` is null. There is no unlimited value. */
export const QUEUE_RESOURCE_DEFAULT_LIMIT = 10000;

/** Listed per-account queue tiers. The default itself is not a stored tier. */
export const QUEUE_RESOURCE_LIMIT_TIERS = [20000, 30000, 40000, 50000, 60000, 100000] as const;

export type QueueResourceLimitTier = (typeof QUEUE_RESOURCE_LIMIT_TIERS)[number];

export type QueueResourceMigrationTier =
  | { outcome: 'default' }
  | { outcome: 'tier'; tier: QueueResourceLimitTier }
  | { outcome: 'needs_operator' };

/** Null uses the default. A stored number is the cap. */
export function queueResourceLimitFor(stored: number | null | undefined): number {
  if (stored === null || stored === undefined) {
    return QUEUE_RESOURCE_DEFAULT_LIMIT;
  }
  return stored;
}

/**
 * Smallest listed tier that covers `largestQueue`. A count within the default writes nothing.
 * A count past the last tier is left for an operator.
 */
export function queueResourceMigrationTier(largestQueue: number): QueueResourceMigrationTier {
  if (largestQueue <= QUEUE_RESOURCE_DEFAULT_LIMIT) {
    return { outcome: 'default' };
  }
  const maxTier = QUEUE_RESOURCE_LIMIT_TIERS[QUEUE_RESOURCE_LIMIT_TIERS.length - 1];
  if (maxTier === undefined || largestQueue > maxTier) {
    return { outcome: 'needs_operator' };
  }
  for (const tier of QUEUE_RESOURCE_LIMIT_TIERS) {
    if (tier >= largestQueue) {
      return { outcome: 'tier', tier };
    }
  }
  return { outcome: 'needs_operator' };
}
