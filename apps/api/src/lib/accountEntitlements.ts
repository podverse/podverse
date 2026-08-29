import type {
  AccountEntitlementCapability,
  AccountTrustEntitlements,
  AccountTrustOverrides,
  ProductMembershipCapDefaults,
} from '@podverse/helpers';
import {
  ACCOUNT_ENTITLEMENT_CAPABILITY,
  AccountMembershipEnum,
  resolveAccountEntitlements,
} from '@podverse/helpers';
import type { AccountMembershipStatus } from '@podverse/orm';

/** Trust-tier fields for resolving entitlements (matches ORM `AccountMembershipStatus` columns). */
export type MembershipStatusForEntitlements = Pick<
  AccountMembershipStatus,
  | 'account_membership'
  | 'allow_directory_add_by_rss'
  | 'max_add_by_rss_feeds'
  | 'max_manual_refreshes_per_hour'
  | 'track_stats'
  | 'allow_notifications'
>;

const getMembershipDefaults = (
  membershipId: AccountMembershipEnum,
  capDefaults: ProductMembershipCapDefaults
): AccountTrustEntitlements => {
  if (membershipId === AccountMembershipEnum.Premium) {
    return {
      allowDirectoryAddByRSS: capDefaults.premiumAllowDirectoryAddByRSS,
      maxAddByRSSFeeds: capDefaults.premiumMaxAddByRSSFeeds,
      maxManualRefreshesPerHour: capDefaults.premiumMaxManualRefreshesPerHour,
      trackStats: capDefaults.premiumTrackStats,
      allowNotifications: capDefaults.premiumAllowNotifications,
    };
  }

  return {
    allowDirectoryAddByRSS: capDefaults.trialAllowDirectoryAddByRSS,
    maxAddByRSSFeeds: capDefaults.trialMaxAddByRSSFeeds,
    maxManualRefreshesPerHour: capDefaults.trialMaxManualRefreshesPerHour,
    trackStats: capDefaults.trialTrackStats,
    allowNotifications: capDefaults.trialAllowNotifications,
  };
};

export const getAccountEntitlements = (
  membershipStatus: MembershipStatusForEntitlements,
  capDefaults: ProductMembershipCapDefaults
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

  return resolveAccountEntitlements(
    membershipId,
    overrides,
    getMembershipDefaults(membershipId, capDefaults)
  );
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
