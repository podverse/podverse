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

/** Rows still available when the one-time history notice starts showing. */
export const QUEUE_HISTORY_LIMIT_NOTICE_REMAINING = 50;

export const QUEUE_HISTORY_LIMIT_CHANGED_CODE = 'queue_history_limit_changed' as const;

export type QueueHistoryLimitNotice = {
  show: boolean;
  limit: number;
  at_limit: boolean;
};

export function isListedQueueResourceLimitTier(value: number): value is QueueResourceLimitTier {
  for (const tier of QUEUE_RESOURCE_LIMIT_TIERS) {
    if (tier === value) {
      return true;
    }
  }
  return false;
}

/** Null or a listed tier. The shared default and other integers are not a management save. */
export function isSavableQueueResourceLimit(value: number | null): boolean {
  if (value === null) {
    return true;
  }
  return isListedQueueResourceLimitTier(value);
}

/**
 * Show once per effective cap, including the default, when the fullest queue has 50 or fewer
 * rows left. A matching acknowledgement hides it until the cap changes.
 */
export function shouldShowQueueHistoryLimitNotice(input: {
  acknowledgedLimit: number | null;
  largestQueueCount: number;
  limit: number;
}): boolean {
  if (input.acknowledgedLimit === input.limit) {
    return false;
  }
  return input.largestQueueCount >= input.limit - QUEUE_HISTORY_LIMIT_NOTICE_REMAINING;
}

/** Select value for a stored cap. A number that is not a listed tier shows as the default. */
export function storedQueueResourceLimitToSelect(stored: number | null | undefined): string {
  if (stored === null || stored === undefined) {
    return '';
  }
  if (isListedQueueResourceLimitTier(stored)) {
    return String(stored);
  }
  return '';
}

/** Stored column for a select value. An unknown value stores the shared default. */
export function selectQueueResourceLimitToStored(value: string): number | null {
  if (value === '') {
    return null;
  }
  const parsed = Number.parseInt(value, 10);
  if (String(parsed) !== value || !isListedQueueResourceLimitTier(parsed)) {
    return null;
  }
  return parsed;
}
