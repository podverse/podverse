/**
 * Marketing comparison rows for Membership / About. Free vs Premium only — Trial caps belong
 * in the Trial limitations accordion, not in this table.
 */
export type MembershipComparisonNameKey =
  | 'subscribe'
  | 'download'
  | 'video'
  | 'livestreams'
  | 'carplay'
  | 'android_auto'
  | 'boostagrams'
  | 'chapters'
  | 'comments'
  | 'transcripts'
  | 'add_rss'
  | 'opml'
  | 'sleep_timer'
  | 'screen_reader'
  | 'sync'
  | 'notifications'
  | 'clips'
  | 'playlists'
  | 'mark_played'
  | 'profiles'
  | 'support_foss';

export type MembershipComparisonFeature = {
  nameKey: MembershipComparisonNameKey;
  free: boolean;
  premium: boolean;
  freeMobileOnly?: boolean;
  premiumMobileOnly?: boolean;
  comingSoon?: boolean;
};

/** True when an available Free or Premium check is mobile-only. Web marks that feature name. */
export function membershipComparisonIsMobileOnly(feature: MembershipComparisonFeature): boolean {
  if (feature.comingSoon === true) {
    return false;
  }

  return (
    (feature.free && feature.freeMobileOnly === true) ||
    (feature.premium && feature.premiumMobileOnly === true)
  );
}

export const MEMBERSHIP_COMPARISON_FEATURES: readonly MembershipComparisonFeature[] = [
  { nameKey: 'subscribe', free: true, premium: true, freeMobileOnly: true },
  {
    nameKey: 'download',
    free: true,
    premium: true,
    freeMobileOnly: true,
    premiumMobileOnly: true,
  },
  { nameKey: 'video', free: true, premium: true },
  { nameKey: 'livestreams', free: true, premium: true },
  {
    nameKey: 'carplay',
    free: true,
    premium: true,
    freeMobileOnly: true,
    premiumMobileOnly: true,
  },
  {
    nameKey: 'android_auto',
    free: true,
    premium: true,
    freeMobileOnly: true,
    premiumMobileOnly: true,
  },
  { nameKey: 'boostagrams', free: true, premium: true },
  { nameKey: 'chapters', free: true, premium: true },
  { nameKey: 'transcripts', free: true, premium: true },
  { nameKey: 'add_rss', free: true, premium: true },
  { nameKey: 'opml', free: true, premium: true },
  {
    nameKey: 'sleep_timer',
    free: true,
    premium: true,
    freeMobileOnly: true,
    premiumMobileOnly: true,
  },
  { nameKey: 'screen_reader', free: true, premium: true },
  { nameKey: 'sync', free: false, premium: true },
  { nameKey: 'notifications', free: false, premium: true, premiumMobileOnly: true },
  { nameKey: 'clips', free: false, premium: true },
  { nameKey: 'playlists', free: false, premium: true },
  { nameKey: 'mark_played', free: false, premium: true },
  { nameKey: 'profiles', free: false, premium: true },
  { nameKey: 'support_foss', free: true, premium: true },
];
