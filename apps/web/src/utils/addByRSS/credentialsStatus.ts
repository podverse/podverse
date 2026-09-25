import type {
  AddByRSSParseCredentialsState,
  AddByRSSParseFailureReason,
  AddByRSSParseStatus,
} from '@podverse/helpers';
import { canonicalAddByRSSFeedUrl } from '@podverse/helpers-validation/client';

import type { AddByRSSFeedRecord } from './types';

/** Why a feed sits in the end-of-list section instead of the normal list. */
export type AddByRSSCredentialsNeed = 'missing' | 'rejected';

export type AddByRSSNeedsCredentialsFeed = {
  feed: AddByRSSFeedRecord;
  need: AddByRSSCredentialsNeed;
};

/**
 * Null when the feed is usable on this browser. A rejection wins over everything so the user sees
 * why their saved credentials stopped working; otherwise a flagged feed needs credentials only
 * when this browser has none for it.
 */
export const getAddByRSSCredentialsNeed = (
  feed: Pick<AddByRSSFeedRecord, 'requiresCredentials' | 'lastFailureReason'>,
  hasLocalCredentials: boolean
): AddByRSSCredentialsNeed | null => {
  if (feed.lastFailureReason === 'credentials_rejected') {
    return 'rejected';
  }
  if (feed.lastFailureReason === 'credentials_required') {
    return 'missing';
  }
  if (feed.requiresCredentials === true && !hasLocalCredentials) {
    return 'missing';
  }
  return null;
};

const toCredentialFeedUrl = (feedUrl: string): string =>
  canonicalAddByRSSFeedUrl(feedUrl) ?? feedUrl.trim();

export const partitionAddByRSSFeedsByCredentials = (
  feeds: AddByRSSFeedRecord[],
  feedUrlsWithCredentials: ReadonlySet<string>
): { ready: AddByRSSFeedRecord[]; needsCredentials: AddByRSSNeedsCredentialsFeed[] } => {
  const ready: AddByRSSFeedRecord[] = [];
  const needsCredentials: AddByRSSNeedsCredentialsFeed[] = [];
  for (const feed of feeds) {
    const need = getAddByRSSCredentialsNeed(
      feed,
      feedUrlsWithCredentials.has(toCredentialFeedUrl(feed.feedUrl))
    );
    if (need === null) {
      ready.push(feed);
    } else {
      needsCredentials.push({ feed, need });
    }
  }
  return { ready, needsCredentials };
};

/**
 * Local copy of the worker's `requires_credentials` transition, so the list reacts to a parse
 * result without waiting for the next follow-list sync.
 */
export const nextLocalRequiresCredentials = (params: {
  current: boolean | undefined;
  status: AddByRSSParseStatus;
  failureReason?: AddByRSSParseFailureReason;
  credentialsState?: AddByRSSParseCredentialsState;
}): boolean | undefined => {
  const { current, status, failureReason, credentialsState } = params;
  if (status === 'parsed' || status === 'not_modified') {
    if (credentialsState === undefined || credentialsState === 'sent') {
      return current;
    }
    return false;
  }
  if (
    status === 'failed' &&
    (failureReason === 'credentials_required' || failureReason === 'credentials_rejected')
  ) {
    return true;
  }
  return current;
};
