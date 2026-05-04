import {
  ACCOUNT_ENTITLEMENT_CAPABILITY,
  type AccountEntitlementCapability,
  type AccountTrustEntitlements,
  type AccountTrustOverrides,
  AccountTrustTierEnum,
  resolveAccountEntitlements,
} from '@podverse/helpers';

type MembershipStatusLike = {
  account_trust_tier_id?: number | null;
  allow_directory_add_by_rss?: boolean | null;
  max_add_by_rss_feeds?: number | null;
  max_manual_refreshes_per_hour?: number | null;
  track_stats?: boolean | null;
  allow_notifications?: boolean | null;
};

const parseBooleanEnv = (name: string, fallback: boolean): boolean => {
  const raw = process.env[name];
  if (raw === undefined || raw === '') {
    return fallback;
  }

  return raw === 'true';
};

const parsePositiveIntegerEnv = (name: string, fallback: number): number => {
  const raw = process.env[name];
  if (raw === undefined || raw === '') {
    return fallback;
  }

  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 0) {
    return fallback;
  }

  return parsed;
};

const getTierDefaults = (trustTier: AccountTrustTierEnum): AccountTrustEntitlements => {
  if (trustTier === AccountTrustTierEnum.Trusted) {
    return {
      allowDirectoryAddByRSS: parseBooleanEnv('TRUST_TRUSTED_ALLOW_DIRECTORY_ADD_BY_RSS', true),
      maxAddByRSSFeeds: parsePositiveIntegerEnv('TRUST_TRUSTED_MAX_ADD_BY_RSS_FEEDS', 100),
      maxManualRefreshesPerHour: parsePositiveIntegerEnv(
        'TRUST_TRUSTED_MAX_MANUAL_REFRESHES_PER_HOUR',
        20
      ),
      trackStats: parseBooleanEnv('TRUST_TRUSTED_TRACK_STATS', true),
      allowNotifications: parseBooleanEnv('TRUST_TRUSTED_ALLOW_NOTIFICATIONS', true),
    };
  }

  return {
    allowDirectoryAddByRSS: parseBooleanEnv('TRUST_UNTRUSTED_ALLOW_DIRECTORY_ADD_BY_RSS', false),
    maxAddByRSSFeeds: parsePositiveIntegerEnv('TRUST_UNTRUSTED_MAX_ADD_BY_RSS_FEEDS', 10),
    maxManualRefreshesPerHour: parsePositiveIntegerEnv(
      'TRUST_UNTRUSTED_MAX_MANUAL_REFRESHES_PER_HOUR',
      5
    ),
    trackStats: parseBooleanEnv('TRUST_UNTRUSTED_TRACK_STATS', false),
    allowNotifications: parseBooleanEnv('TRUST_UNTRUSTED_ALLOW_NOTIFICATIONS', false),
  };
};

export const getAccountEntitlements = (
  membershipStatus: MembershipStatusLike
): AccountTrustEntitlements => {
  const trustTier =
    membershipStatus.account_trust_tier_id === AccountTrustTierEnum.Trusted
      ? AccountTrustTierEnum.Trusted
      : AccountTrustTierEnum.Untrusted;

  const overrides: AccountTrustOverrides = {
    allow_directory_add_by_rss: membershipStatus.allow_directory_add_by_rss,
    max_add_by_rss_feeds: membershipStatus.max_add_by_rss_feeds,
    max_manual_refreshes_per_hour: membershipStatus.max_manual_refreshes_per_hour,
    track_stats: membershipStatus.track_stats,
    allow_notifications: membershipStatus.allow_notifications,
  };

  return resolveAccountEntitlements(trustTier, overrides, getTierDefaults(trustTier));
};

export const accountHasCapability = (
  entitlements: AccountTrustEntitlements,
  capability: AccountEntitlementCapability
): boolean => {
  if (capability === ACCOUNT_ENTITLEMENT_CAPABILITY.allowDirectoryAddByRSS) {
    return entitlements.allowDirectoryAddByRSS;
  }
  if (capability === ACCOUNT_ENTITLEMENT_CAPABILITY.trackStats) {
    return entitlements.trackStats;
  }
  if (capability === ACCOUNT_ENTITLEMENT_CAPABILITY.allowNotifications) {
    return entitlements.allowNotifications;
  }
  if (capability === ACCOUNT_ENTITLEMENT_CAPABILITY.maxAddByRSSFeeds) {
    return entitlements.maxAddByRSSFeeds > 0;
  }
  if (capability === ACCOUNT_ENTITLEMENT_CAPABILITY.maxManualRefreshesPerHour) {
    return entitlements.maxManualRefreshesPerHour > 0;
  }

  return false;
};
