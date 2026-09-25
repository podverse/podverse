import type {
  AddByRSSParseCredentialsState,
  AddByRSSParseFailureReason,
  AddByRSSParseStatus,
} from '@podverse/helpers';
import { sha256Hex, splitFeedUrlUserinfo } from '@podverse/helpers';
import { isObjectLike } from '@podverse/helpers/guards';
import {
  ADD_BY_RSS_CREDENTIAL_MAX_LENGTH,
  canonicalAddByRSSFeedUrl,
} from '@podverse/helpers-validation/client';

import type { AddByRssAuthFailure, MobileAddByRSSFeedRecord } from '../../prefs/addByRSSFeeds';

/**
 * Device-local add-by-RSS Basic Auth credentials. Pure helpers only: SecureStore and SQLite access
 * live in `addByRssCredentialStore`, so everything here runs under the node unit tests.
 */

export type AddByRssCredentials = {
  password: string;
  username: string;
};

/** Why a feed sits in the end-of-list section instead of the normal list. */
export type AddByRssCredentialsNeed = 'missing' | 'rejected';

export type AddByRssNeedsCredentialsFeed<T> = {
  feed: T;
  need: AddByRssCredentialsNeed;
};

type CredentialFlags = Pick<MobileAddByRSSFeedRecord, 'lastAuthFailure' | 'requiresCredentials'>;
type PartitionableFeed = CredentialFlags & Pick<MobileAddByRSSFeedRecord, 'feedUrl'>;

const SECURE_STORE_KEY_PREFIX = 'abrss-cred';
/** SecureStore keys accept only alphanumerics, `.`, `-`, and `_`. */
const SECURE_STORE_KEY_SEGMENT = /^[A-Za-z0-9_-]+$/;

/**
 * The feed URL credentials are keyed by: userinfo removed and canonicalized, the same form the API
 * stores on the follow row, so a pasted `https://user:pass@host/feed` and the stored feed match.
 */
export const toAddByRssCredentialFeedUrl = (feedUrl: string): string =>
  canonicalAddByRSSFeedUrl(feedUrl) ?? feedUrl.trim();

/**
 * SecureStore key for one account's credentials for one feed. The feed URL is hashed so the key
 * stays within SecureStore's character set and never spells out the address.
 */
export const buildAddByRssCredentialKey = (accountIdText: string, feedUrl: string): string => {
  const accountSegment = SECURE_STORE_KEY_SEGMENT.test(accountIdText)
    ? accountIdText
    : sha256Hex(accountIdText);
  return `${SECURE_STORE_KEY_PREFIX}.${accountSegment}.${sha256Hex(
    toAddByRssCredentialFeedUrl(feedUrl)
  )}`;
};

const isUsableCredential = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0 && value.length <= ADD_BY_RSS_CREDENTIAL_MAX_LENGTH;

/** Both fields present and within the API's length limit, or null. */
export const toAddByRssCredentials = (
  username: string,
  password: string
): AddByRssCredentials | null => {
  const trimmedUsername = username.trim();
  if (!isUsableCredential(trimmedUsername) || !isUsableCredential(password)) {
    return null;
  }
  return { password, username: trimmedUsername };
};

export const serializeAddByRssCredentials = (credentials: AddByRssCredentials): string =>
  JSON.stringify({ password: credentials.password, username: credentials.username });

/** A stored SecureStore value read back, or null when missing or unreadable. */
export const parseStoredAddByRssCredentials = (raw: string | null): AddByRssCredentials | null => {
  if (raw === null) {
    return null;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isObjectLike(parsed)) {
    return null;
  }
  const { password, username } = parsed;
  if (!isUsableCredential(username) || !isUsableCredential(password)) {
    return null;
  }
  return { password, username };
};

export type AddByRssPastedUrlSplit = {
  credentials: AddByRssCredentials | null;
  feedUrl: string;
};

/**
 * Pulls `user:pass@` out of a pasted feed URL so the add form can move it into the username and
 * password fields. Null when the value carries no userinfo, so the field keeps what was typed.
 */
export const splitAddByRssPastedUrl = (value: string): AddByRssPastedUrlSplit | null => {
  const split = splitFeedUrlUserinfo(value);
  if (split.username === null && split.password === null) {
    return null;
  }
  const credentials =
    split.username !== null && split.password !== null
      ? toAddByRssCredentials(split.username, split.password)
      : null;
  return { credentials, feedUrl: split.feedUrl };
};

/**
 * Null when the feed is usable on this device. A rejection wins so the user sees why their saved
 * credentials stopped working; otherwise a flagged feed needs credentials only when this device
 * holds none for it.
 */
export const getAddByRssCredentialsNeed = (
  feed: CredentialFlags,
  hasLocalCredentials: boolean
): AddByRssCredentialsNeed | null => {
  if (feed.lastAuthFailure === 'credentials_rejected') {
    return 'rejected';
  }
  if (feed.lastAuthFailure === 'credentials_required') {
    return 'missing';
  }
  if (feed.requiresCredentials === true && !hasLocalCredentials) {
    return 'missing';
  }
  return null;
};

/** Splits feeds into the normal list and the needs-credentials section at the end of it. */
export const partitionAddByRssFeedsByCredentials = <T extends PartitionableFeed>(
  feeds: readonly T[],
  feedUrlsWithCredentials: ReadonlySet<string>
): { needsCredentials: AddByRssNeedsCredentialsFeed<T>[]; ready: T[] } => {
  const ready: T[] = [];
  const needsCredentials: AddByRssNeedsCredentialsFeed<T>[] = [];
  for (const feed of feeds) {
    const need = getAddByRssCredentialsNeed(
      feed,
      feedUrlsWithCredentials.has(toAddByRssCredentialFeedUrl(feed.feedUrl))
    );
    if (need === null) {
      ready.push(feed);
    } else {
      needsCredentials.push({ feed, need });
    }
  }
  return { needsCredentials, ready };
};

export type AddByRssCredentialStatus = {
  lastAuthFailure: AddByRssAuthFailure | null;
  requiresCredentials: boolean;
};

/**
 * The local copy of what a parse result says about credentials, so the list reacts without
 * waiting for the next follow-list sync. Null leaves the stored flags as they are: a parse still
 * pending, or a failure unrelated to credentials (the host being down says nothing about them).
 */
export const resolveAddByRssCredentialStatus = (params: {
  credentialsState?: AddByRSSParseCredentialsState;
  current: boolean;
  failureReason?: AddByRSSParseFailureReason;
  status: AddByRSSParseStatus | 'pending';
}): AddByRssCredentialStatus | null => {
  const { credentialsState, current, failureReason, status } = params;
  if (status === 'parsed' || status === 'not_modified') {
    return {
      lastAuthFailure: null,
      requiresCredentials:
        credentialsState === undefined || credentialsState === 'sent' ? current : false,
    };
  }
  if (
    status === 'failed' &&
    (failureReason === 'credentials_required' || failureReason === 'credentials_rejected')
  ) {
    return { lastAuthFailure: failureReason, requiresCredentials: true };
  }
  return null;
};

export const isAddByRssAuthFailure = (value: unknown): value is AddByRssAuthFailure =>
  value === 'credentials_required' || value === 'credentials_rejected';

/** Inline copy for a parse that ended on a credential problem, or null for any other outcome. */
export const credentialNoticeKeyForParse = (result: {
  failureReason?: AddByRSSParseFailureReason;
  status: AddByRSSParseStatus | 'pending';
}): string | null => {
  if (result.status !== 'failed') {
    return null;
  }
  switch (result.failureReason) {
    case 'credentials_rejected':
      return 'features.add_by_rss.credentials_rejected';
    case 'credentials_required':
      return 'features.add_by_rss.basic_auth_requires';
    case 'credentials_withheld_insecure':
    case 'credentials_withheld_other_domain':
      return 'features.add_by_rss.credentials_withheld';
    default:
      return null;
  }
};
