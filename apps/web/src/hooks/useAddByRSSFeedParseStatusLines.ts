'use client';

import { useMemo } from 'react';

import {
  buildLocalizedFeedParseStatusLines,
  type FeedParseStatusTranslateSettings,
} from '../lib/feed/buildLocalizedFeedParseStatusLines';
import type { AddByRSSFeedRecord } from '../utils/addByRSS/types';

type TranslateFeatures = (
  key:
    | 'add_by_rss.status'
    | 'add_by_rss.status_pending'
    | 'add_by_rss.status_parsing'
    | 'add_by_rss.status_failed'
) => string;

export function useAddByRSSFeedParseStatusLines(
  localFeed: Pick<AddByRSSFeedRecord, 'status' | 'lastParsedAt' | 'lastFailedParseAt'>,
  locale: string,
  tFeatures: TranslateFeatures,
  tSettings: FeedParseStatusTranslateSettings
): string[] {
  return useMemo(() => {
    if (localFeed.status === 'queued' || localFeed.status === 'processing') {
      const statusLabel =
        localFeed.status === 'queued'
          ? tFeatures('add_by_rss.status_pending')
          : tFeatures('add_by_rss.status_parsing');
      return [`${tFeatures('add_by_rss.status')}: ${statusLabel}`];
    }

    if (localFeed.status === 'failed' && !localFeed.lastFailedParseAt) {
      return [`${tFeatures('add_by_rss.status')}: ${tFeatures('add_by_rss.status_failed')}`];
    }

    const { lines } = buildLocalizedFeedParseStatusLines(
      {
        lastFinishedParseTime: localFeed.lastParsedAt ?? null,
        lastFailedParseTime: localFeed.lastFailedParseAt ?? null,
      },
      locale,
      tSettings
    );

    return lines;
  }, [
    localFeed.lastFailedParseAt,
    localFeed.lastParsedAt,
    localFeed.status,
    locale,
    tFeatures,
    tSettings,
  ]);
}
