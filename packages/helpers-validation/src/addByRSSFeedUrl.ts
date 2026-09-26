import { splitFeedUrlUserinfo } from '@podverse/helpers';

import { canonicalHttpOrHttpsUrl } from './url.js';

/** Upper bound for an add-by-RSS Basic Auth username or password. */
export const ADD_BY_RSS_CREDENTIAL_MAX_LENGTH = 255;

export type AddByRSSBasicAuthCredentials = {
  username: string;
  password: string;
};

export type ResolvedAddByRSSFeedUrlCredentials = {
  /** Canonical feed URL with any `user:pass@` removed. */
  feedUrl: string;
  credentials: AddByRSSBasicAuthCredentials | null;
};

const isUsableCredential = (value: string | null | undefined): value is string =>
  typeof value === 'string' && value.length > 0 && value.length <= ADD_BY_RSS_CREDENTIAL_MAX_LENGTH;

/**
 * Canonical add-by-RSS feed URL: userinfo removed, then canonicalized. This is the form the API
 * stores on follow rows, so clients key device-held credentials by it. Null when not http(s).
 */
export function canonicalAddByRSSFeedUrl(feedUrl: string): string | null {
  return canonicalHttpOrHttpsUrl(splitFeedUrlUserinfo(feedUrl).feedUrl);
}

/**
 * Separates credentials from a feed URL. Explicit credentials win; otherwise a complete
 * `user:pass@` pair on the URL is used. The returned URL never carries userinfo, even when the
 * userinfo was incomplete and therefore discarded. Returns null when the URL is not http(s).
 */
export function resolveAddByRSSFeedUrlCredentials(
  feedUrl: string,
  username?: string | null,
  password?: string | null
): ResolvedAddByRSSFeedUrlCredentials | null {
  const split = splitFeedUrlUserinfo(feedUrl);
  const canonicalUrl = canonicalHttpOrHttpsUrl(split.feedUrl);
  if (canonicalUrl === null) {
    return null;
  }

  if (isUsableCredential(username) && isUsableCredential(password)) {
    return { feedUrl: canonicalUrl, credentials: { username, password } };
  }
  if (isUsableCredential(split.username) && isUsableCredential(split.password)) {
    return {
      feedUrl: canonicalUrl,
      credentials: { username: split.username, password: split.password },
    };
  }
  return { feedUrl: canonicalUrl, credentials: null };
}

/**
 * Both Basic Auth fields are present and within length limits (username trimmed). Used by the
 * credentials screen and by add-feed when the username/password toggle is on.
 */
export function canSubmitAddByRssCredentials(username: string, password: string): boolean {
  return isUsableCredential(username.trim()) && isUsableCredential(password);
}

/**
 * Whether the Add by RSS form may submit: a valid http(s) feed URL, and when credentials are
 * required both username and password have at least one character (within the length limit).
 */
export function canSubmitAddByRssFeed(params: {
  feedUrl: string;
  password: string;
  requireCredentials: boolean;
  username: string;
}): boolean {
  if (resolveAddByRSSFeedUrlCredentials(params.feedUrl) === null) {
    return false;
  }
  if (!params.requireCredentials) {
    return true;
  }
  return canSubmitAddByRssCredentials(params.username, params.password);
}
