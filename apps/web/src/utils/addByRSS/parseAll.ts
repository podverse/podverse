import { buildCacheMaps } from '@podverse/parser-mapping';

import type { AddByRSSParseStatusResponse } from './api';
import { enqueueAddByRSSParseAll } from './api';
import { pollAddByRSSParseStatus } from './actions';
import type { AddByRSSFeedRecord } from './types';

type RunAddByRSSParseAllParams = {
  feeds: AddByRSSFeedRecord[];
  onQueued?: (feedUrl: string) => Promise<void>;
  onStatusUpdate: (feedUrl: string, statusResponse: AddByRSSParseStatusResponse) => Promise<void>;
};

type RunAddByRSSParseAllResult = {
  requestIds: Array<{ requestId: string; feedUrl: string }>;
  dedupedFeedUrls: string[];
  dedupeTtlSeconds: number | null;
};

export const runAddByRSSParseAll = async ({
  feeds,
  onQueued,
  onStatusUpdate,
}: RunAddByRSSParseAllParams): Promise<RunAddByRSSParseAllResult> => {
  const { feedHashesByUrl, etagsByUrl, lastModifiedByUrl } = buildCacheMaps(feeds);
  const response = await enqueueAddByRSSParseAll({
    feedHashesByUrl,
    etagsByUrl,
    lastModifiedByUrl,
  });

  const requestIds = response.request_ids.map(({ request_id, feed_url }) => ({
    requestId: request_id,
    feedUrl: feed_url,
  }));
  const dedupedFeedUrls = response.deduped_feed_urls ?? [];
  const dedupeTtlSeconds = response.dedupe_ttl_seconds ?? null;

  for (const { feed_url: feedUrl } of response.request_ids) {
    await onQueued?.(feedUrl);
  }

  await Promise.all(
    response.request_ids.map(({ request_id, feed_url }) =>
      pollAddByRSSParseStatus({
        requestId: request_id,
        onStatusUpdate: async (statusResponse) => onStatusUpdate(feed_url, statusResponse),
      })
    )
  );

  return { requestIds, dedupedFeedUrls, dedupeTtlSeconds };
};
