'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';

import type {
  DTOMembershipComparison,
  MembershipComparisonMessages,
  MembershipComparisonNameKey,
} from '@podverse/helpers';
import {
  buildMembershipComparisonDocument,
  resolveProductMembershipDefaultsFromEnv,
} from '@podverse/helpers';

import { getApiRequestService } from '../../factories/apiRequestService';

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

function fallbackMessages(
  t: ReturnType<typeof useTranslations<'membership'>>,
  tMisc: ReturnType<typeof useTranslations<'misc'>>
): MembershipComparisonMessages {
  const names: Partial<Record<MembershipComparisonNameKey, string>> = {};
  for (const key of COMPARISON_NAME_KEYS) {
    names[key] = t(`comparison.${key}`);
  }
  return {
    available: tMisc('available'),
    availableOnMobileApp: t('available_on_mobile_app'),
    comingSoon: t('coming_soon'),
    feature: t('feature'),
    free: t('free'),
    freeOnMobileLegend: t('free_on_mobile_legend'),
    mobileOnlyLegend: t('mobile_only_legend'),
    nameMobileOnly: t('comparison_name_mobile_only', { name: '{name}' }),
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
    premium: t('premium'),
    trialDirectory: t('trial_limitations_directory_add_by_rss'),
    trialRefreshLimit: t('trial_limitations_manual_refresh_limit', {
      premium_refreshes: '{premium_refreshes}',
      trial_refreshes: '{trial_refreshes}',
    }),
    trialStats: t('trial_limitations_stats_tracking'),
    trialSummary: t('trial_limitations_summary'),
    trialTitle: t('trial_limitations_title'),
  };
}

/**
 * Server document when the request succeeds. Until then, the bundled catalog and the default
 * caps keep the table on screen.
 */
export function useMembershipComparison(
  initial: DTOMembershipComparison | null
): DTOMembershipComparison {
  const locale = useLocale();
  const t = useTranslations('membership');
  const tMisc = useTranslations('misc');
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
      fallbackMessages(t, tMisc)
    );
  }, [locale, t, tMisc]);
  const [document, setDocument] = useState<DTOMembershipComparison>(initial ?? fallback);

  useEffect(() => {
    let cancelled = false;
    void getApiRequestService()
      .reqMembershipComparisonGet({ locale })
      .then((body) => {
        if (!cancelled) {
          setDocument(body.data);
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
