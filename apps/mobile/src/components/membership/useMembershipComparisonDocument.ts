import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type {
  DTOMembershipComparison,
  MembershipComparisonMessages,
  MembershipComparisonNameKey,
} from '@podverse/helpers';
import {
  buildMembershipComparisonDocument,
  resolveProductMembershipDefaultsFromEnv,
} from '@podverse/helpers';

import { createMobileApiRequestService } from '../../auth/mobileApi';
import { resolveSupportedLocale } from '../../i18n/locale';

const COMPARISON_NAME_KEYS = [
  'subscribe',
  'download',
  'video',
  'livestreams',
  'carplay',
  'android_auto',
  'boostagrams',
  'chapters',
  'comments',
  'transcripts',
  'add_rss',
  'opml',
  'sleep_timer',
  'screen_reader',
  'sync',
  'playback_handoff',
  'queue',
  'notifications',
  'clips',
  'playlists',
  'mark_played',
  'profiles',
  'recommendations',
  'api_keys',
  'support_foss',
] as const satisfies readonly MembershipComparisonNameKey[];

let cachedLocale = '';
let cachedDocument: DTOMembershipComparison | null = null;
let inflightLocale = '';
let inflight: Promise<DTOMembershipComparison> | null = null;

function fallbackMessages(
  t: (key: string, options?: Record<string, string>) => string
): MembershipComparisonMessages {
  const names: Partial<Record<MembershipComparisonNameKey, string>> = {};
  for (const key of COMPARISON_NAME_KEYS) {
    names[key] = t(`membership.comparison.${key}`);
  }
  return {
    available: t('misc.available'),
    availableOnMobileApp: t('membership.available_on_mobile_app'),
    comingSoon: t('membership.coming_soon'),
    feature: t('membership.feature'),
    free: t('membership.free'),
    freeOnMobileLegend: t('membership.free_on_mobile_legend'),
    mobileOnlyLegend: t('membership.mobile_only_legend'),
    nameMobileOnly: t('membership.comparison_name_mobile_only', { name: '{name}' }),
    names: {
      add_rss: names.add_rss ?? '',
      android_auto: names.android_auto ?? '',
      api_keys: names.api_keys ?? '',
      boostagrams: names.boostagrams ?? '',
      carplay: names.carplay ?? '',
      chapters: names.chapters ?? '',
      clips: names.clips ?? '',
      comments: names.comments ?? '',
      download: names.download ?? '',
      livestreams: names.livestreams ?? '',
      mark_played: names.mark_played ?? '',
      notifications: names.notifications ?? '',
      opml: names.opml ?? '',
      playback_handoff: names.playback_handoff ?? '',
      playlists: names.playlists ?? '',
      profiles: names.profiles ?? '',
      queue: names.queue ?? '',
      recommendations: names.recommendations ?? '',
      screen_reader: names.screen_reader ?? '',
      sleep_timer: names.sleep_timer ?? '',
      subscribe: names.subscribe ?? '',
      support_foss: names.support_foss ?? '',
      sync: names.sync ?? '',
      transcripts: names.transcripts ?? '',
      video: names.video ?? '',
    },
    premium: t('membership.premium'),
    trialDirectory: t('membership.trial_limitations_directory_add_by_rss'),
    trialRefreshLimit: t('membership.trial_limitations_manual_refresh_limit', {
      premium_refreshes: '{premium_refreshes}',
      trial_refreshes: '{trial_refreshes}',
    }),
    trialStats: t('membership.trial_limitations_stats_tracking'),
    trialSummary: t('membership.trial_limitations_summary'),
    trialTitle: t('membership.trial_limitations_title'),
  };
}

function loadDocument(locale: string): Promise<DTOMembershipComparison> {
  if (cachedDocument !== null && cachedLocale === locale) {
    return Promise.resolve(cachedDocument);
  }
  if (inflight !== null && inflightLocale === locale) {
    return inflight;
  }
  const api = createMobileApiRequestService();
  if (api === null) {
    return Promise.reject(new Error('Mobile API is not configured'));
  }
  inflightLocale = locale;
  inflight = api
    .reqMembershipComparisonGet({ locale })
    .then((body) => {
      cachedLocale = locale;
      cachedDocument = body.data;
      return body.data;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

/** Server comparison for the current language, with the bundled catalog until that returns. */
export function useMembershipComparisonDocument(): DTOMembershipComparison {
  const { i18n, t } = useTranslation();
  const locale = resolveSupportedLocale(i18n.language);
  const fallback = useMemo(() => {
    const defaults = resolveProductMembershipDefaultsFromEnv();
    return buildMembershipComparisonDocument(
      locale,
      {
        premiumAllowDirectoryAddByRSS: defaults.premiumAllowDirectoryAddByRSS,
        premiumMaxManualRefreshesPerHour: defaults.premiumMaxManualRefreshesPerHour,
        trialAllowDirectoryAddByRSS: defaults.trialAllowDirectoryAddByRSS,
        trialMaxManualRefreshesPerHour: defaults.trialMaxManualRefreshesPerHour,
      },
      fallbackMessages(t)
    );
  }, [locale, t]);
  const [document, setDocument] = useState<DTOMembershipComparison>(fallback);

  useEffect(() => {
    let cancelled = false;
    void loadDocument(locale)
      .then((next) => {
        if (!cancelled) {
          setDocument(next);
        }
      })
      .catch(() => {
        // The bundled document stays.
      });
    return () => {
      cancelled = true;
    };
  }, [locale]);

  return document;
}
