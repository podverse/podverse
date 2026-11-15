/** Listed per-account follow tiers. Empty storage uses the shared default. */
export const FOLLOW_LIMIT_TIERS = [1000, 2000, 3000, 4000, 5000, 10000] as const;

export type FollowLimitTier = (typeof FOLLOW_LIMIT_TIERS)[number];

/**
 * Stored on `max_follows` when management chooses unlimited.
 * Null stays the shared default. The default itself is not a stored tier.
 */
export const FOLLOW_LIMIT_UNLIMITED = -1;

/** Select value for unlimited. Empty string is the shared default. */
export const FOLLOW_LIMIT_SELECT_UNLIMITED = 'unlimited';

/** Largest tier a library copy or a shipping backfill may write. A larger count is left for an operator. */
export const FOLLOW_MIGRATION_CAP_MAX = 10000;

export const FOLLOW_LIMIT_REACHED_CODE = 'follow_limit_reached' as const;

export const FOLLOW_LIMIT_REACHED_I18N_KEY = 'membership.follow_limit_reached' as const;

export type FollowMigrationTier =
  | { outcome: 'default'; writeStoredTier: null }
  | { outcome: 'tier'; tier: FollowLimitTier; writeStoredTier: FollowLimitTier }
  | { outcome: 'needs_operator'; writeStoredTier: null };

export type FollowInsertDecision =
  { action: 'update' | 'insert' } | { action: 'refuse'; limit: number };

export function isUnlimitedFollowLimit(
  value: number | null | undefined
): value is typeof FOLLOW_LIMIT_UNLIMITED {
  return value === FOLLOW_LIMIT_UNLIMITED;
}

export function isListedFollowLimitTier(value: number): value is FollowLimitTier {
  for (const tier of FOLLOW_LIMIT_TIERS) {
    if (tier === value) {
      return true;
    }
  }
  return false;
}

/** Null, unlimited, or a listed tier. The shared default and other integers are not a management save. */
export function isSavableFollowLimit(value: number | null): boolean {
  if (value === null) {
    return true;
  }
  return isUnlimitedFollowLimit(value) || isListedFollowLimitTier(value);
}

/**
 * Numeric cap for callers that compare a count to a limit.
 * Unlimited becomes the shared default so the comparison stays a positive cap.
 * Enforcement that must skip unlimited reads the stored column.
 */
export function resolveNumericFollowLimit(
  stored: number | null | undefined,
  defaultLimit: number
): number {
  if (stored === null || stored === undefined || isUnlimitedFollowLimit(stored)) {
    return defaultLimit;
  }
  return stored;
}

export function decideFollowInsert(input: {
  alreadyFollowed: boolean;
  followedCount: number;
  storedLimit: number | null;
  defaultLimit: number;
}): FollowInsertDecision {
  if (input.alreadyFollowed) {
    return { action: 'update' };
  }
  if (isUnlimitedFollowLimit(input.storedLimit)) {
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
export function followMigrationTier(count: number, defaultLimit: number): FollowMigrationTier {
  if (count <= defaultLimit) {
    return { outcome: 'default', writeStoredTier: null };
  }
  if (count > FOLLOW_MIGRATION_CAP_MAX) {
    return { outcome: 'needs_operator', writeStoredTier: null };
  }
  for (const tier of FOLLOW_LIMIT_TIERS) {
    if (tier >= count && tier <= FOLLOW_MIGRATION_CAP_MAX) {
      return { outcome: 'tier', tier, writeStoredTier: tier };
    }
  }
  return { outcome: 'needs_operator', writeStoredTier: null };
}

export function followLimitReachedMessage(limit: number): string {
  return `You can follow up to ${limit} podcasts, playlists, and accounts.`;
}

export function followLimitRefusal(limit: number): {
  message: string;
  code: typeof FOLLOW_LIMIT_REACHED_CODE;
  i18nKey: typeof FOLLOW_LIMIT_REACHED_I18N_KEY;
  limit: number;
} {
  return {
    message: followLimitReachedMessage(limit),
    code: FOLLOW_LIMIT_REACHED_CODE,
    i18nKey: FOLLOW_LIMIT_REACHED_I18N_KEY,
    limit,
  };
}

/** Select value for a stored cap. A number that is not a tier shows as the default. */
export function storedFollowLimitToSelect(stored: number | null | undefined): string {
  if (stored === null || stored === undefined) {
    return '';
  }
  if (isUnlimitedFollowLimit(stored)) {
    return FOLLOW_LIMIT_SELECT_UNLIMITED;
  }
  if (isListedFollowLimitTier(stored)) {
    return String(stored);
  }
  return '';
}

/** Stored column for a select value. An unknown value stores the shared default. */
export function selectFollowLimitToStored(value: string): number | null {
  if (value === '') {
    return null;
  }
  if (value === FOLLOW_LIMIT_SELECT_UNLIMITED) {
    return FOLLOW_LIMIT_UNLIMITED;
  }
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || !isListedFollowLimitTier(parsed)) {
    return null;
  }
  return parsed;
}
