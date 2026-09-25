import { resolveCredentialScope } from '@podverse/helpers';

import { getAddByRSSFeedByIdText, getAddByRSSItemByIdText } from './storage';
import type { AddByRSSFeedRecord } from './types';

/**
 * Why a media or download request for a password-protected add-by-RSS feed likely failed on
 * web. The browser always requests the plain URL: a media element cannot attach Basic Auth, and
 * web has no media proxy, so these failures are explained rather than retried with credentials.
 */
export type AddByRSSProtectedMediaFailure = 'media_other_domain' | 'media_needs_credentials';

export type AddByRSSProtectedMediaSurface = 'playback' | 'download';

/**
 * Null for feeds that are not flagged as needing credentials, so their failures keep the
 * existing generic handling. `allowInsecure` is set because only the domain matters here: web
 * never sends credentials to media, whatever the scheme.
 */
export const classifyAddByRSSProtectedMediaFailure = (
  feed: Pick<AddByRSSFeedRecord, 'feedUrl' | 'requiresCredentials'> | null,
  mediaUrl: string | null | undefined
): AddByRSSProtectedMediaFailure | null => {
  if (!feed || feed.requiresCredentials !== true) {
    return null;
  }
  if (
    mediaUrl &&
    resolveCredentialScope(feed.feedUrl, mediaUrl, { allowInsecure: true }) ===
      'withheld_other_domain'
  ) {
    return 'media_other_domain';
  }
  return 'media_needs_credentials';
};

export const addByRSSProtectedMediaMessageKey = (failure: AddByRSSProtectedMediaFailure): string =>
  failure === 'media_other_domain'
    ? 'add_by_rss.media_other_domain'
    : 'add_by_rss.media_needs_credentials';

/** The local feed record for an item, by its channel idText or, failing that, the item index. */
export const findAddByRSSFeedForItem = async (params: {
  channelIdText?: string | null;
  itemIdText?: string | null;
}): Promise<AddByRSSFeedRecord | null> => {
  const channelIdText = params.channelIdText?.trim();
  if (channelIdText) {
    const feed = await getAddByRSSFeedByIdText(channelIdText);
    if (feed) {
      return feed;
    }
  }

  const itemIdText = params.itemIdText?.trim();
  if (!itemIdText) {
    return null;
  }
  const item = await getAddByRSSItemByIdText(itemIdText);
  return item?.channelIdText ? getAddByRSSFeedByIdText(item.channelIdText) : null;
};

const hostOf = (url: string | null | undefined): string | null => {
  if (!url) {
    return null;
  }
  try {
    return new URL(url).host;
  } catch {
    return null;
  }
};

/**
 * Logs the host only: media URLs can carry signed query tokens, and nothing about the user's
 * credentials is known or sent on this path.
 */
export const logAddByRSSProtectedMediaFailure = (params: {
  surface: AddByRSSProtectedMediaSurface;
  failure: AddByRSSProtectedMediaFailure;
  feed: Pick<AddByRSSFeedRecord, 'idText' | 'feedUrl'>;
  mediaUrl: string | null | undefined;
  mediaErrorCode?: number | null;
}): void => {
  console.warn('Add-by-RSS protected media failed', {
    surface: params.surface,
    failure: params.failure,
    feedIdText: params.feed.idText,
    feedHost: hostOf(params.feed.feedUrl),
    mediaHost: hostOf(params.mediaUrl),
    mediaErrorCode: params.mediaErrorCode ?? null,
    credentialsState: 'not_applicable',
  });
};
