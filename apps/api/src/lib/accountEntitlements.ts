import {
  ACCOUNT_ENTITLEMENT_CAPABILITY,
  type AccountEntitlementCapability,
  AccountMembershipEnum,
  type AccountTrustEntitlements,
  type AccountTrustOverrides,
  resolveAccountEntitlements,
} from '@podverse/helpers';
import type { AccountMembershipStatus } from '@podverse/orm';

/** Trust-tier fields used to resolve entitlements (matches ORM `AccountMembershipStatus` columns). */
export type MembershipStatusForEntitlements = Pick<
  AccountMembershipStatus,
  | 'account_membership'
  | 'allow_directory_add_by_rss'
  | 'max_add_by_rss_feeds'
  | 'max_manual_refreshes_per_hour'
  | 'track_stats'
  | 'allow_notifications'
>;

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

const getMembershipDefaults = (membershipId: AccountMembershipEnum): AccountTrustEntitlements => {
  if (membershipId === AccountMembershipEnum.Premium) {
    return {
      allowDirectoryAddByRSS: parseBooleanEnv(
        'MEMBERSHIP_PREMIUM_ALLOW_DIRECTORY_ADD_BY_RSS',
        true
      ),
      maxAddByRSSFeeds: parsePositiveIntegerEnv('MEMBERSHIP_PREMIUM_MAX_ADD_BY_RSS_FEEDS', 100),
      maxManualRefreshesPerHour: parsePositiveIntegerEnv(
        'MEMBERSHIP_PREMIUM_MAX_MANUAL_REFRESHES_PER_HOUR',
        20
      ),
      trackStats: parseBooleanEnv('MEMBERSHIP_PREMIUM_TRACK_STATS', true),
      allowNotifications: parseBooleanEnv('MEMBERSHIP_PREMIUM_ALLOW_NOTIFICATIONS', true),
    };
  }

  return {
    allowDirectoryAddByRSS: parseBooleanEnv('MEMBERSHIP_TRIAL_ALLOW_DIRECTORY_ADD_BY_RSS', false),
    maxAddByRSSFeeds: parsePositiveIntegerEnv('MEMBERSHIP_TRIAL_MAX_ADD_BY_RSS_FEEDS', 10),
    maxManualRefreshesPerHour: parsePositiveIntegerEnv(
      'MEMBERSHIP_TRIAL_MAX_MANUAL_REFRESHES_PER_HOUR',
      5
    ),
    trackStats: parseBooleanEnv('MEMBERSHIP_TRIAL_TRACK_STATS', false),
    allowNotifications: parseBooleanEnv('MEMBERSHIP_TRIAL_ALLOW_NOTIFICATIONS', false),
  };
};

export const getAccountEntitlements = (
  membershipStatus: MembershipStatusForEntitlements
): AccountTrustEntitlements => {
  const membershipId =
    membershipStatus.account_membership?.id === AccountMembershipEnum.Premium
      ? AccountMembershipEnum.Premium
      : AccountMembershipEnum.Trial;

  const overrides: AccountTrustOverrides = {
    allow_directory_add_by_rss: membershipStatus.allow_directory_add_by_rss,
    max_add_by_rss_feeds: membershipStatus.max_add_by_rss_feeds,
    max_manual_refreshes_per_hour: membershipStatus.max_manual_refreshes_per_hour,
    track_stats: membershipStatus.track_stats,
    allow_notifications: membershipStatus.allow_notifications,
  };

  return resolveAccountEntitlements(membershipId, overrides, getMembershipDefaults(membershipId));
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
