/**
 * Marketing comparison rows for Membership / About. The API localizes this list and the Trial
 * limitations for the caller's language. Clients render that document. These rows are the
 * structure the server fills, and the fallback when the request fails.
 *
 * Free vs Premium only — Trial caps belong in the Trial limitations list, not in this table.
 *
 * A mark sits after the feature name, never beside a check.
 * - `freeOnMobileOnly` adds * after the name: Free is the mobile app, and Premium includes the website.
 * - `mobileAppOnly` adds * after the name when the whole feature is in the mobile app only.
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
  | 'playback_handoff'
  | 'queue'
  | 'notifications'
  | 'clips'
  | 'playlists'
  | 'mark_played'
  | 'profiles'
  | 'recommendations'
  | 'api_keys'
  | 'support_foss';

export const MEMBERSHIP_COMPARISON_MOBILE_APP_MARK = '*';
export const MEMBERSHIP_COMPARISON_FREE_ON_MOBILE_MARK = '*';

export type MembershipComparisonFeature = {
  nameKey: MembershipComparisonNameKey;
  free: boolean;
  premium: boolean;
  /** The feature is in the mobile app only. The name ends with *. */
  mobileAppOnly?: boolean;
  /** Free is the mobile app. Premium includes the website. The name ends with *. */
  freeOnMobileOnly?: boolean;
  comingSoon?: boolean;
};

export function membershipComparisonMobileAppOnly(feature: MembershipComparisonFeature): boolean {
  return feature.comingSoon !== true && feature.mobileAppOnly === true;
}

export function membershipComparisonFreeOnMobileOnly(
  feature: MembershipComparisonFeature
): boolean {
  return feature.comingSoon !== true && feature.free === true && feature.freeOnMobileOnly === true;
}

export const MEMBERSHIP_COMPARISON_FEATURES: readonly MembershipComparisonFeature[] = [
  { nameKey: 'subscribe', free: true, premium: true, freeOnMobileOnly: true },
  { nameKey: 'download', free: true, premium: true },
  { nameKey: 'video', free: true, premium: true },
  { nameKey: 'livestreams', free: true, premium: true },
  { nameKey: 'carplay', free: true, premium: true },
  { nameKey: 'android_auto', free: true, premium: true },
  { nameKey: 'chapters', free: true, premium: true },
  { nameKey: 'transcripts', free: true, premium: true },
  { nameKey: 'boostagrams', free: true, premium: true },
  { nameKey: 'opml', free: true, premium: true },
  { nameKey: 'sleep_timer', free: true, premium: true },
  { nameKey: 'screen_reader', free: true, premium: true },
  { nameKey: 'add_rss', free: true, premium: true, freeOnMobileOnly: true },
  { nameKey: 'sync', free: false, premium: true },
  { nameKey: 'playback_handoff', free: false, premium: true },
  { nameKey: 'queue', free: false, premium: true },
  { nameKey: 'notifications', free: false, premium: true },
  { nameKey: 'clips', free: false, premium: true },
  { nameKey: 'playlists', free: false, premium: true },
  { nameKey: 'mark_played', free: false, premium: true },
  { nameKey: 'profiles', free: false, premium: true },
  { nameKey: 'recommendations', free: false, premium: true },
  { nameKey: 'api_keys', free: false, premium: true },
  { nameKey: 'support_foss', free: true, premium: true },
];

/** Caps that change which Trial limitation sentences are shown, and the numbers in them. */
export type MembershipComparisonCaps = {
  premiumAllowDirectoryAddByRSS: boolean;
  premiumMaxManualRefreshesPerHour: number;
  trialAllowDirectoryAddByRSS: boolean;
  trialMaxManualRefreshesPerHour: number;
};

/**
 * Catalog strings for one locale. The refresh limit sentence still contains `{trial_refreshes}`
 * and `{premium_refreshes}`.
 */
export type MembershipComparisonMessages = {
  available: string;
  availableOnMobileApp: string;
  comingSoon: string;
  feature: string;
  free: string;
  freeOnMobileLegend: string;
  mobileOnlyLegend: string;
  nameMobileOnly: string;
  names: Record<MembershipComparisonNameKey, string>;
  premium: string;
  trialDirectory: string;
  trialRefreshLimit: string;
  trialStats: string;
  trialSummary: string;
  trialTitle: string;
};

export type DTOMembershipComparisonFeature = {
  comingSoon: boolean;
  free: boolean;
  id: MembershipComparisonNameKey;
  name: string;
  premium: boolean;
};

export type DTOMembershipComparison = {
  availableLabel: string;
  comingSoonLabel: string;
  featureColumnLabel: string;
  features: DTOMembershipComparisonFeature[];
  legends: { mark: string; text: string }[];
  locale: string;
  tiers: { id: 'free' | 'premium'; label: string }[];
  trialLimitations: {
    items: string[];
    summary: string;
    title: string;
  };
};

function fillMembershipComparisonTemplate(
  template: string,
  values: Record<string, number | string>
): string {
  return template.replace(/\{([a-z0-9_]+)\}/g, (match, key: string) => {
    const value = values[key];
    if (value === undefined) {
      return match;
    }
    return String(value);
  });
}

/**
 * Localized Free versus Premium table and Trial limitations. Trial sentences that depend on a
 * cap are omitted when Trial and Premium allow the same thing.
 */
export function buildMembershipComparisonDocument(
  locale: string,
  caps: MembershipComparisonCaps,
  messages: MembershipComparisonMessages
): DTOMembershipComparison {
  let showMobileAppLegend = false;
  let showFreeOnMobileLegend = false;

  const features: DTOMembershipComparisonFeature[] = MEMBERSHIP_COMPARISON_FEATURES.map(
    (feature) => {
      const mobileAppOnly = membershipComparisonMobileAppOnly(feature);
      const freeOnMobileOnly = membershipComparisonFreeOnMobileOnly(feature);
      if (mobileAppOnly) {
        showMobileAppLegend = true;
      }
      if (freeOnMobileOnly) {
        showFreeOnMobileLegend = true;
      }
      const plainName = messages.names[feature.nameKey];
      const name = mobileAppOnly
        ? fillMembershipComparisonTemplate(messages.nameMobileOnly, { name: plainName })
        : freeOnMobileOnly
          ? `${plainName} ${MEMBERSHIP_COMPARISON_FREE_ON_MOBILE_MARK}`
          : plainName;
      return {
        comingSoon: feature.comingSoon === true,
        free: feature.free,
        id: feature.nameKey,
        name,
        premium: feature.premium,
      };
    }
  );

  const legends: { mark: string; text: string }[] = [];
  if (showMobileAppLegend) {
    legends.push({
      mark: MEMBERSHIP_COMPARISON_MOBILE_APP_MARK,
      text: messages.mobileOnlyLegend,
    });
  }
  if (showFreeOnMobileLegend) {
    legends.push({
      mark: MEMBERSHIP_COMPARISON_FREE_ON_MOBILE_MARK,
      text: messages.freeOnMobileLegend,
    });
  }

  const items: string[] = [];
  if (!caps.trialAllowDirectoryAddByRSS && caps.premiumAllowDirectoryAddByRSS) {
    items.push(messages.trialDirectory);
  }
  if (caps.trialMaxManualRefreshesPerHour < caps.premiumMaxManualRefreshesPerHour) {
    items.push(
      fillMembershipComparisonTemplate(messages.trialRefreshLimit, {
        premium_refreshes: caps.premiumMaxManualRefreshesPerHour,
        trial_refreshes: caps.trialMaxManualRefreshesPerHour,
      })
    );
  }
  items.push(messages.trialStats);

  return {
    availableLabel: messages.available,
    comingSoonLabel: messages.comingSoon,
    featureColumnLabel: messages.feature,
    features,
    legends,
    locale,
    tiers: [
      { id: 'free', label: messages.free },
      { id: 'premium', label: messages.premium },
    ],
    trialLimitations: {
      items,
      summary: messages.trialSummary,
      title: messages.trialTitle,
    },
  };
}
