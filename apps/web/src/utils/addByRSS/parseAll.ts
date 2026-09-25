import type { AddByRSSBasicAuthCredentials } from '@podverse/helpers-validation/client';
import { canonicalAddByRSSFeedUrl } from '@podverse/helpers-validation/client';
import { buildCacheMaps } from '@podverse/parser-mapping';

import { pollAddByRSSParseStatus } from './actions';
import type { AddByRSSParseStatusResponse } from './api';
import { enqueueAddByRSSParseAll } from './api';
import { getCredentialsByFeedUrl } from './credentialStore';
import type { AddByRSSFeedRecord } from './types';

type RunAddByRSSParseAllParams = {
  accountId: string;
  feeds: AddByRSSFeedRecord[];
  onQueued?: (feedUrl: string) => Promise<void>;
  onStatusUpdate: (feedUrl: string, statusResponse: AddByRSSParseStatusResponse) => Promise<void>;
};

type RunAddByRSSParseAllResult = {
  requestIds: Array<{ requestId: string; feedUrl: string }>;
  dedupedFeedUrls: string[];
  dedupeTtlSeconds: number | null;
};

/**
 * Credentials for the feeds being refreshed only. Feeds the server flags as needing credentials
 * but that have none here are skipped server-side and come back as `credentials_required`.
 */
const buildCredentialsByUrl = async (
  accountId: string,
  feeds: AddByRSSFeedRecord[]
): Promise<Record<string, AddByRSSBasicAuthCredentials>> => {
  let stored: Record<string, AddByRSSBasicAuthCredentials>;
  try {
    stored = await getCredentialsByFeedUrl(accountId);
  } catch (error) {
    console.error('Could not read add-by-RSS credentials on this browser', error);
    return {};
  }

  const result: Record<string, AddByRSSBasicAuthCredentials> = {};
  for (const feed of feeds) {
    const canonical = canonicalAddByRSSFeedUrl(feed.feedUrl);
    const credentials = canonical ? stored[canonical] : undefined;
    if (canonical && credentials) {
      result[canonical] = credentials;
    }
  }
  return result;
};

export const runAddByRSSParseAll = async ({
  accountId,
  feeds,
  onQueued,
  onStatusUpdate,
}: RunAddByRSSParseAllParams): Promise<RunAddByRSSParseAllResult> => {
  const { feedHashesByUrl, etagsByUrl, lastModifiedByUrl } = buildCacheMaps(feeds);
  const credentialsByUrl = await buildCredentialsByUrl(accountId, feeds);
  const response = await enqueueAddByRSSParseAll({
    feedHashesByUrl,
    etagsByUrl,
    lastModifiedByUrl,
    credentialsByUrl,
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
