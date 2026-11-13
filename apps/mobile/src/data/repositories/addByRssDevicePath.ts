/**
 * Pure decisions for Add by RSS feeds fetched and parsed on this device, for which stored rows a
 * session lists, and for which rows change hands when someone signs in or creates an account.
 * They test without a database; the SQLite half is in `addByRssRepository`.
 */
import { FIFTEEN_MINUTES_MS } from '@podverse/helpers';
import { getErrorResponseStatus } from '@podverse/helpers/error';
import { isObjectLike } from '@podverse/helpers/guards';
import { parseAccessDenialReason } from '@podverse/helpers-requests';
import { canonicalAddByRSSFeedUrl } from '@podverse/helpers-validation/client';

import type { SyncJobPriority } from '../../sync/syncQueue';

/** Conditional cache from a device fetch. Same field names as the device parse input. */
export type AddByRssDeviceCache = {
  etag: string | null;
  feedHash: string | null;
  lastModified: string | null;
};

/** A background device refresh skips a feed this device fetched more recently than this. */
export const ADD_BY_RSS_DEVICE_REFRESH_STALE_AFTER_MS = FIFTEEN_MINUTES_MS;

export type AddByRssDeviceRefreshEntry = {
  checkedAtMs: number | null;
  feedUrl: string;
  hasCredentials: boolean;
  requiresCredentials: boolean;
};

/** The key that identifies a feed across URL spellings, the same one the Library merge uses. */
export const addByRssFeedUrlKey = (feedUrl: string): string =>
  canonicalAddByRSSFeedUrl(feedUrl) ?? feedUrl.trim();

/**
 * The cache to send with a device fetch. Null when the row holds no bundle, because an unchanged
 * answer would then leave a row with no episodes, and null when nothing was cached.
 */
export const deviceCacheForFetch = (row: {
  deviceEtag: string | null;
  deviceFeedHash: string | null;
  deviceLastModified: string | null;
  hasBundle: boolean;
}): AddByRssDeviceCache | null => {
  if (!row.hasBundle) {
    return null;
  }
  if (row.deviceEtag === null && row.deviceFeedHash === null && row.deviceLastModified === null) {
    return null;
  }
  return {
    etag: row.deviceEtag,
    feedHash: row.deviceFeedHash,
    lastModified: row.deviceLastModified,
  };
};

/**
 * The cache to store after a device fetch, in the form `setDeviceFetchState` takes: an object
 * replaces, null clears, undefined keeps. A new bundle stores the cache that came with it; an
 * unchanged answer keeps the stored cache unless the host sent a new validator; a failure keeps the
 * cache that matches the stored bundle.
 */
export const deviceCacheToStore = (result: {
  conditionalCache: AddByRssDeviceCache | null;
  mappedFeed: unknown;
  status: string;
}): AddByRssDeviceCache | null | undefined => {
  if (result.status === 'parsed' && result.mappedFeed !== null) {
    return result.conditionalCache;
  }
  if (result.status === 'not_modified') {
    return result.conditionalCache ?? undefined;
  }
  return undefined;
};

/** A user-requested refresh always runs; a background one waits out the stale window. */
export const isDeviceRefreshDue = (params: {
  checkedAtMs: number | null;
  nowMs: number;
  priority: SyncJobPriority;
}): boolean => {
  if (params.priority === 'user' || params.checkedAtMs === null) {
    return true;
  }
  return params.nowMs - params.checkedAtMs >= ADD_BY_RSS_DEVICE_REFRESH_STALE_AFTER_MS;
};

/**
 * Feeds a device refresh fetches, in input order. A feed that needs credentials this device does
 * not hold is skipped, the same skip the server refresh applies to its tickets.
 */
export const selectDeviceRefreshFeedUrls = (params: {
  entries: readonly AddByRssDeviceRefreshEntry[];
  nowMs: number;
  priority: SyncJobPriority;
}): string[] =>
  params.entries
    .filter(
      (entry) =>
        !(entry.requiresCredentials && !entry.hasCredentials) &&
        isDeviceRefreshDue({
          checkedAtMs: entry.checkedAtMs,
          nowMs: params.nowMs,
          priority: params.priority,
        })
    )
    .map((entry) => entry.feedUrl);

/**
 * Whether the current session leaves a stored row out of its lists. While someone is signed in, a
 * followed row the signed-out user kept is hidden; signed out, nothing is. A listed-only row is
 * never hidden by this rule. `sessionVisibleFeedsCondition` in `addByRssRepository` is the SQL
 * form of the same rule.
 */
export const isAddByRssFeedHiddenInSession = (row: {
  followed: boolean;
  isSignedIn: boolean;
  signedOutOwned: boolean;
}): boolean => row.isSignedIn && row.followed && row.signedOutOwned;

/**
 * The ownership values a write that follows a feed stores. The session that follows owns the row.
 * `followedAt` is set only when the follow starts, so re-following a followed feed keeps its place
 * in the follow order.
 */
export const addByRssFollowOwnershipValues = (params: {
  isNewFeed: boolean;
  isSignedIn: boolean;
  nowMs: number;
  wasFollowed: boolean;
}): { followedAt?: number; signedOutOwned: 0 | 1 } => ({
  signedOutOwned: params.isSignedIn ? 0 : 1,
  ...(params.isNewFeed || !params.wasFollowed ? { followedAt: params.nowMs } : {}),
});

/** Written at login. The next Add by RSS refresh reads it and settles the phone's feeds. */
export type AddByRssLoginSettleMarker = {
  accountIdText: string;
  signedUpAtMs: number | null;
  signup: boolean;
};

export const parseAddByRssLoginSettleMarker = (raw: unknown): AddByRssLoginSettleMarker | null => {
  if (!isObjectLike(raw)) {
    return null;
  }
  if (typeof raw.accountIdText !== 'string' || raw.accountIdText.length === 0) {
    return null;
  }
  if (typeof raw.signup !== 'boolean') {
    return null;
  }
  let signedUpAtMs: number | null;
  if (raw.signedUpAtMs === null) {
    signedUpAtMs = null;
  } else if (typeof raw.signedUpAtMs === 'number' && Number.isFinite(raw.signedUpAtMs)) {
    signedUpAtMs = raw.signedUpAtMs;
  } else {
    return null;
  }
  return { accountIdText: raw.accountIdText, signedUpAtMs, signup: raw.signup };
};

/**
 * A pending sign-up for this account survives a later plain login that arrives before the carry
 * runs. Any other login replaces the marker.
 */
export const mergeAddByRssLoginSettleMarker = (
  existing: AddByRssLoginSettleMarker | null,
  next: AddByRssLoginSettleMarker
): AddByRssLoginSettleMarker => {
  if (
    existing !== null &&
    existing.accountIdText === next.accountIdText &&
    existing.signup &&
    !next.signup
  ) {
    return existing;
  }
  return next;
};

/**
 * Which followed rows change hands when an account signs in.
 *
 * A signed-out row the account also follows is claimed for the account. A row an earlier account
 * left, which this account does not follow and which was followed before this settle started, is
 * released to the signed-out user. A feed followed while the settle is running stays put, because
 * the account's follow list may not include it yet. Both lists are stored feed URLs, in input
 * order.
 */
export const planSignInOwnership = (params: {
  accountFeedUrls: readonly string[];
  rows: readonly { feedUrl: string; followedAtMs: number | null; signedOutOwned: boolean }[];
  startedAtMs: number;
}): { claim: string[]; release: string[] } => {
  const keys = new Set(params.accountFeedUrls.map((feedUrl) => addByRssFeedUrlKey(feedUrl)));
  const claim: string[] = [];
  const release: string[] = [];
  for (const row of params.rows) {
    const key = addByRssFeedUrlKey(row.feedUrl);
    if (row.signedOutOwned && keys.has(key)) {
      claim.push(row.feedUrl);
      continue;
    }
    if (
      !row.signedOutOwned &&
      !keys.has(key) &&
      (row.followedAtMs === null || row.followedAtMs < params.startedAtMs)
    ) {
      release.push(row.feedUrl);
    }
  }
  return { claim, release };
};

export type AddByRssSignupCarryPlan = { remove: string[]; save: string[] };

/**
 * Which of the signed-out user's feeds a new account keeps. Feeds arrive oldest first. The first
 * `limit` are saved. Of the rest, only feeds followed at or before the account was created are
 * removed. A feed followed after that stays the signed-out user's.
 */
export const planAddByRssSignupCarry = (params: {
  feeds: readonly { feedUrl: string; followedAtMs: number | null }[];
  limit: number;
  signedUpAtMs: number | null;
}): AddByRssSignupCarryPlan => {
  const save = params.feeds.slice(0, Math.max(0, params.limit)).map((feed) => feed.feedUrl);
  const remove: string[] = [];
  if (params.signedUpAtMs === null) {
    return { remove, save };
  }
  const signedUpAtMs = params.signedUpAtMs;
  for (const feed of params.feeds.slice(save.length)) {
    if (feed.followedAtMs === null || feed.followedAtMs <= signedUpAtMs) {
      remove.push(feed.feedUrl);
    }
  }
  return { remove, save };
};

export type SignupCarryFollowOutcome = 'rethrow' | 'skip' | 'stop';

/**
 * What one failed follow does to the rest of a sign-up carry. A membership denial stops the
 * carry. A rejected URL is skipped, because the server will refuse that feed again. Anything
 * else is thrown so the carry can resume on the next refresh.
 */
export const classifySignupCarryFollowError = (error: unknown): SignupCarryFollowOutcome => {
  const denial = parseAccessDenialReason(error);
  if (
    denial === 'limit_reached' ||
    denial === 'needs_membership' ||
    denial === 'membership_expired'
  ) {
    return 'stop';
  }
  if (getErrorResponseStatus(error) === 400) {
    return 'skip';
  }
  return 'rethrow';
};
