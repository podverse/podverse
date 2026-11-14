/** Listed per-account Add by RSS tiers. Empty storage uses the shared default. */
export const ADD_BY_RSS_FEED_TIERS = [200, 300, 400, 500, 1000, 10000] as const;

export type AddByRssFeedTier = (typeof ADD_BY_RSS_FEED_TIERS)[number];

/**
 * Stored on `max_add_by_rss_feeds` when management chooses unlimited.
 * Null stays the shared default, and 0 stays a cap of zero.
 */
export const ADD_BY_RSS_FEED_LIMIT_UNLIMITED = -1;

/** Select value for unlimited. Empty string is the shared default. */
export const ADD_BY_RSS_FEED_LIMIT_SELECT_UNLIMITED = 'unlimited';

/** Largest tier a library copy may write. A larger count is left for an operator. */
export const ADD_BY_RSS_MIGRATION_CAP_MAX = 10000;

export type AddByRssMigrationTier =
  | { outcome: 'default' }
  | { outcome: 'tier'; tier: AddByRssFeedTier }
  | { outcome: 'needs_operator' };

export type AddByRssFeedInsertDecision =
  | { action: 'update' | 'insert' }
  | { action: 'refuse'; limit: number };

export function isUnlimitedAddByRssFeedLimit(
  value: number | null | undefined
): value is typeof ADD_BY_RSS_FEED_LIMIT_UNLIMITED {
  return value === ADD_BY_RSS_FEED_LIMIT_UNLIMITED;
}

export function isListedAddByRssFeedTier(value: number): value is AddByRssFeedTier {
  for (const tier of ADD_BY_RSS_FEED_TIERS) {
    if (tier === value) {
      return true;
    }
  }
  return false;
}

/** Null, unlimited, or a listed tier. Other integers are not a management save. */
export function isSavableAddByRssFeedLimit(value: number | null): boolean {
  if (value === null) {
    return true;
  }
  return isUnlimitedAddByRssFeedLimit(value) || isListedAddByRssFeedTier(value);
}

/**
 * Numeric cap for callers that compare a count to a limit.
 * Unlimited becomes the shared default so the comparison stays a positive cap.
 * Enforcement that must skip unlimited reads the stored column.
 */
export function resolveNumericAddByRssFeedLimit(
  stored: number | null | undefined,
  defaultLimit: number
): number {
  if (stored === null || stored === undefined || isUnlimitedAddByRssFeedLimit(stored)) {
    return defaultLimit;
  }
  return stored;
}

export function decideAddByRssFeedInsert(input: {
  alreadyFollowed: boolean;
  followedCount: number;
  storedLimit: number | null;
  defaultLimit: number;
}): AddByRssFeedInsertDecision {
  if (input.alreadyFollowed) {
    return { action: 'update' };
  }
  if (isUnlimitedAddByRssFeedLimit(input.storedLimit)) {
    return { action: 'insert' };
  }
  const limit = input.storedLimit ?? input.defaultLimit;
  if (input.followedCount >= limit) {
    return { action: 'refuse', limit };
  }
  return { action: 'insert' };
}

/**
 * Smallest listed tier that covers `count`. A count within the default writes nothing.
 * A count past the last tier is left for an operator. Unlimited is never a result.
 */
export function addByRssMigrationTier(count: number, defaultLimit: number): AddByRssMigrationTier {
  if (count <= defaultLimit) {
    return { outcome: 'default' };
  }
  if (count > ADD_BY_RSS_MIGRATION_CAP_MAX) {
    return { outcome: 'needs_operator' };
  }
  for (const tier of ADD_BY_RSS_FEED_TIERS) {
    if (tier >= count && tier <= ADD_BY_RSS_MIGRATION_CAP_MAX) {
      return { outcome: 'tier', tier };
    }
  }
  return { outcome: 'needs_operator' };
}

export function addByRssFeedLimitReachedMessage(limit: number, contactEmail: string): string {
  if (contactEmail !== '') {
    return `You have reached your limit of ${limit} Add by RSS feeds. To have it raised, email ${contactEmail}.`;
  }
  return `You have reached your limit of ${limit} Add by RSS feeds. To have it raised, contact support.`;
}

/** Select value for a stored cap. A legacy number that is not a tier shows as the default. */
export function storedAddByRssFeedLimitToSelect(stored: number | null | undefined): string {
  if (stored === null || stored === undefined) {
    return '';
  }
  if (isUnlimitedAddByRssFeedLimit(stored)) {
    return ADD_BY_RSS_FEED_LIMIT_SELECT_UNLIMITED;
  }
  if (isListedAddByRssFeedTier(stored)) {
    return String(stored);
  }
  return '';
}

/** Stored column for a select value. An unknown value stores the shared default. */
export function selectAddByRssFeedLimitToStored(value: string): number | null {
  if (value === '') {
    return null;
  }
  if (value === ADD_BY_RSS_FEED_LIMIT_SELECT_UNLIMITED) {
    return ADD_BY_RSS_FEED_LIMIT_UNLIMITED;
  }
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || !isListedAddByRssFeedTier(parsed)) {
    return null;
  }
  return parsed;
}
