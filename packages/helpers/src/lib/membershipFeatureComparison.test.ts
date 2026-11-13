import { describe, expect, it } from 'vitest';

import type {
  MembershipComparisonMessages,
  MembershipComparisonNameKey,
} from './membershipFeatureComparison.js';
import {
  buildMembershipComparisonDocument,
  MEMBERSHIP_COMPARISON_FEATURES,
  membershipComparisonFreeOnMobileOnly,
  membershipComparisonMobileAppOnly,
} from './membershipFeatureComparison.js';

function featureNamed(nameKey: MembershipComparisonNameKey) {
  const feature = MEMBERSHIP_COMPARISON_FEATURES.find((row) => row.nameKey === nameKey);
  if (feature === undefined) {
    throw new Error(`Missing comparison feature ${nameKey}`);
  }
  return feature;
}

describe('membership comparison marks', () => {
  it('marks Free-on-mobile separately from a feature that is mobile-app only', () => {
    expect(membershipComparisonFreeOnMobileOnly(featureNamed('subscribe'))).toBe(true);
    expect(membershipComparisonMobileAppOnly(featureNamed('subscribe'))).toBe(false);
    expect(featureNamed('add_rss').free).toBe(true);
    expect(featureNamed('add_rss').premium).toBe(true);
    expect(membershipComparisonFreeOnMobileOnly(featureNamed('add_rss'))).toBe(true);
    expect(membershipComparisonFreeOnMobileOnly(featureNamed('download'))).toBe(false);
    expect(membershipComparisonMobileAppOnly(featureNamed('download'))).toBe(false);
    expect(membershipComparisonMobileAppOnly(featureNamed('carplay'))).toBe(false);
    expect(membershipComparisonMobileAppOnly(featureNamed('android_auto'))).toBe(false);
    expect(membershipComparisonMobileAppOnly(featureNamed('sleep_timer'))).toBe(false);
    expect(membershipComparisonMobileAppOnly(featureNamed('notifications'))).toBe(false);
    expect(membershipComparisonFreeOnMobileOnly(featureNamed('video'))).toBe(false);
    expect(
      membershipComparisonFreeOnMobileOnly({
        nameKey: 'comments',
        free: true,
        premium: true,
        freeOnMobileOnly: true,
        comingSoon: true,
      })
    ).toBe(false);
    expect(
      membershipComparisonMobileAppOnly({
        nameKey: 'comments',
        free: false,
        premium: false,
        mobileAppOnly: true,
        comingSoon: true,
      })
    ).toBe(false);
  });

  it('keeps Premium-only rows off the Free column', () => {
    expect(featureNamed('playback_handoff').premium).toBe(true);
    expect(featureNamed('playback_handoff').free).toBe(false);
    expect(featureNamed('queue').free).toBe(false);
    expect(featureNamed('recommendations').free).toBe(false);
    expect(featureNamed('api_keys').free).toBe(false);
    expect(featureNamed('notifications').premium).toBe(true);
    expect(featureNamed('sleep_timer').free).toBe(true);
    expect(featureNamed('sleep_timer').premium).toBe(true);
  });
});

const comparisonNames = {
  add_rss: 'add_rss',
  android_auto: 'android_auto',
  api_keys: 'api_keys',
  boostagrams: 'boostagrams',
  carplay: 'carplay',
  chapters: 'chapters',
  clips: 'clips',
  comments: 'comments',
  download: 'download',
  livestreams: 'livestreams',
  mark_played: 'mark_played',
  notifications: 'notifications',
  opml: 'opml',
  playback_handoff: 'playback_handoff',
  playlists: 'playlists',
  profiles: 'profiles',
  queue: 'queue',
  recommendations: 'recommendations',
  screen_reader: 'screen_reader',
  sleep_timer: 'sleep_timer',
  subscribe: 'Subscribe to Podcasts',
  support_foss: 'support_foss',
  sync: 'sync',
  transcripts: 'transcripts',
  video: 'video',
} satisfies Record<MembershipComparisonNameKey, string>;

const comparisonMessages: MembershipComparisonMessages = {
  available: 'Available',
  availableOnMobileApp: 'Available on the mobile app',
  comingSoon: 'Coming Soon',
  feature: 'Feature',
  free: 'Free',
  freeOnMobileLegend: 'Free on the mobile app only.',
  mobileOnlyLegend: 'Feature is only available in the mobile app',
  nameMobileOnly: '{name}*',
  names: comparisonNames,
  premium: 'Premium',
  trialDirectory: 'Directory blocked.',
  trialRefreshLimit: 'Refresh {trial_refreshes} and {premium_refreshes}.',
  trialStats: 'Listens are saved.',
  trialSummary: 'Some features are unavailable.',
  trialTitle: 'Trial Limitations',
};

describe('membership comparison document', () => {
  it('localizes the Free check mark and fills Trial caps', () => {
    const document = buildMembershipComparisonDocument(
      'en-US',
      {
        premiumAllowDirectoryAddByRSS: true,
        premiumMaxManualRefreshesPerHour: 20,
        trialAllowDirectoryAddByRSS: false,
        trialMaxManualRefreshesPerHour: 5,
      },
      comparisonMessages
    );

    const subscribe = document.features.find((row) => row.id === 'subscribe');
    expect(subscribe?.name).toBe('Subscribe to Podcasts *');
    expect(document.legends).toEqual([{ mark: '*', text: 'Free on the mobile app only.' }]);
    expect(document.features.map((row) => row.id).slice(0, 3)).toEqual([
      'subscribe',
      'download',
      'video',
    ]);
    expect(document.features.map((row) => row.id).at(-1)).toBe('support_foss');
    const screenReaderIndex = document.features.findIndex((row) => row.id === 'screen_reader');
    const addRssIndex = document.features.findIndex((row) => row.id === 'add_rss');
    const transcriptsIndex = document.features.findIndex((row) => row.id === 'transcripts');
    const boostagramsIndex = document.features.findIndex((row) => row.id === 'boostagrams');
    expect(addRssIndex).toBe(screenReaderIndex + 1);
    const addRss = document.features.find((row) => row.id === 'add_rss');
    expect(addRss?.name).toBe('add_rss *');
    expect(addRss?.free).toBe(true);
    expect(boostagramsIndex).toBe(transcriptsIndex + 1);
    expect(document.trialLimitations.items).toEqual([
      'Directory blocked.',
      'Refresh 5 and 20.',
      'Listens are saved.',
    ]);
  });

  it('drops a Trial sentence when Trial and Premium allow the same cap', () => {
    const document = buildMembershipComparisonDocument(
      'en-US',
      {
        premiumAllowDirectoryAddByRSS: true,
        premiumMaxManualRefreshesPerHour: 5,
        trialAllowDirectoryAddByRSS: true,
        trialMaxManualRefreshesPerHour: 5,
      },
      comparisonMessages
    );

    expect(document.trialLimitations.items).toEqual(['Listens are saved.']);
  });
});
