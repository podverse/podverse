import { resolveCredentialScope } from '@podverse/helpers';
import type {
  AddByRSSChapterResponse,
  ReqAccountAddByRSSChaptersTranscriptParams,
} from '@podverse/helpers-requests';
import {
  getChaptersAndTranscriptUrls,
  mapAddByRSSChaptersToDTOItemChapters,
} from '@podverse/parser-mapping';

import { getCredentials } from './credentialStore';

export type AddByRSSChaptersTranscriptCredentials = Pick<
  ReqAccountAddByRSSChaptersTranscriptParams,
  'basic_auth_username' | 'basic_auth_password'
>;

/**
 * Device-held credentials for a chapters/transcript request, or an empty object. They are
 * omitted when every resource is on another domain than the feed: the API would withhold them
 * anyway, so they never leave the device. The API owns the insecure-scheme rule.
 */
export async function getAddByRSSChaptersTranscriptCredentials(params: {
  accountId: string | null | undefined;
  feedUrl: string | null | undefined;
  resourceUrls: (string | null | undefined)[];
}): Promise<AddByRSSChaptersTranscriptCredentials> {
  const { accountId, feedUrl } = params;
  const resourceUrls = params.resourceUrls.filter(
    (url): url is string => typeof url === 'string' && url.trim() !== ''
  );
  if (!accountId || !feedUrl || resourceUrls.length === 0) {
    return {};
  }

  const inScope = resourceUrls.some(
    (url) =>
      resolveCredentialScope(feedUrl, url, { allowInsecure: true }) !== 'withheld_other_domain'
  );
  if (!inScope) {
    return {};
  }

  try {
    const credentials = await getCredentials(accountId, feedUrl);
    return credentials
      ? { basic_auth_username: credentials.username, basic_auth_password: credentials.password }
      : {};
  } catch (error) {
    console.error(error);
    return {};
  }
}

/** Cached chapters/transcript API response keyed by itemIdText (in-memory; cleared on reload). */
export type CachedChaptersTranscriptEntry = {
  chapters: AddByRSSChapterResponse[];
  transcriptText?: string;
};

const chaptersTranscriptCache = new Map<string, CachedChaptersTranscriptEntry>();

export function getCachedChaptersTranscript(
  itemIdText: string
): CachedChaptersTranscriptEntry | undefined {
  return chaptersTranscriptCache.get(itemIdText);
}

export function setCachedChaptersTranscript(
  itemIdText: string,
  data: CachedChaptersTranscriptEntry
): void {
  chaptersTranscriptCache.set(itemIdText, data);
}

/** For future invalidation (e.g. when feed is re-parsed). */
export function clearChaptersTranscriptCacheForItem(itemIdText: string): void {
  chaptersTranscriptCache.delete(itemIdText);
}

export { getChaptersAndTranscriptUrls, mapAddByRSSChaptersToDTOItemChapters };
