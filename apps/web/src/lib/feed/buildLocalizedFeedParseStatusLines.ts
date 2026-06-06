import { formatDateTimeAbbrev } from '@podverse/helpers';

import {
  buildFeedParseStatusLines,
  type FeedParseStatusInput,
  type FeedParseStatusLabels,
  type FeedParseStatusLines,
} from './buildFeedParseStatusLines';

export type FeedParseStatusTranslateSettings = (
  key: 'feed.last_parsed' | 'feed.last_failed_parse' | 'feed.never_fully_parsed',
  values?: { date?: string }
) => string;

export function createFeedParseStatusLabels(
  tSettings: FeedParseStatusTranslateSettings
): FeedParseStatusLabels {
  return {
    lastParsed: (date) => tSettings('feed.last_parsed', { date }),
    lastFailedParse: (date) => tSettings('feed.last_failed_parse', { date }),
    neverFullyParsed: tSettings('feed.never_fully_parsed'),
  };
}

export function buildLocalizedFeedParseStatusLines(
  input: FeedParseStatusInput,
  locale: string,
  tSettings: FeedParseStatusTranslateSettings
): FeedParseStatusLines {
  return buildFeedParseStatusLines(
    input,
    (iso) => formatDateTimeAbbrev(iso, locale),
    createFeedParseStatusLabels(tSettings)
  );
}
