import { deriveMembershipState, evaluateFeatureAccess } from '@podverse/helpers';

import { applyAddByRSSParseStatus } from './actions';
import { toAddByRSSFeedChangedUrl } from './feedChangedEvent';
import { enqueueAddByRSSFirstParses } from './firstParse';
import { runAddByRSSParseAll } from './parseAll';
import { getAllAddByRSSFeeds } from './storage';
import { syncAddByRSSFollowStubs } from './sync';

export const ADD_BY_RSS_BACKGROUND_REFRESH_INTERVAL_MS = 30 * 60 * 1000;

/** The signed-in account: its id keys the throttle, its membership decides the full refresh. */
export type AddByRSSBackgroundRefreshAccount = { id_text: string } & NonNullable<
  Parameters<typeof deriveMembershipState>[0]
>;

const LAST_STARTED_AT_KEY_PREFIX = 'podverse.addByRSS.backgroundRefreshStartedAt.';

/** Used only when `localStorage` cannot be read or written (private modes, quota). */
const lastStartedAtInMemory = new Map<string, number>();
const loggedRefreshErrors = new Set<string>();

const logRefreshErrorOnce = (step: string, error: unknown): void => {
  if (loggedRefreshErrors.has(step)) {
    return;
  }
  loggedRefreshErrors.add(step);
  console.error(`Add by RSS background refresh: ${step} failed`, error);
};

/**
 * Claims this account's refresh slot when the last start is at least the interval ago. The start
 * time is written before any work, so another tab that loads meanwhile sees it and stays idle.
 */
export const claimAddByRSSBackgroundRefresh = (accountIdText: string, nowMs: number): boolean => {
  const key = `${LAST_STARTED_AT_KEY_PREFIX}${accountIdText}`;
  const isDue = (lastStartedAtMs: number | null): boolean =>
    lastStartedAtMs === null ||
    !Number.isFinite(lastStartedAtMs) ||
    lastStartedAtMs > nowMs ||
    nowMs - lastStartedAtMs >= ADD_BY_RSS_BACKGROUND_REFRESH_INTERVAL_MS;

  try {
    const stored = window.localStorage.getItem(key);
    if (!isDue(stored === null ? null : Number(stored))) {
      return false;
    }
    window.localStorage.setItem(key, String(nowMs));
    return true;
  } catch {
    if (!isDue(lastStartedAtInMemory.get(key) ?? null)) {
      return false;
    }
    lastStartedAtInMemory.set(key, nowMs);
    return true;
  }
};

/**
 * Keeps this browser's Add by RSS feeds current without the user asking: syncs follows into
 * stubs, first-parses feeds never parsed here (any signed-in account), then refreshes the rest
 * for members. Unchanged feeds cost a 304 because the cache maps go with the request. Runs at most
 * once per interval per account. Failures are logged once per session and never shown.
 */
export async function runAddByRSSBackgroundRefresh(
  account: AddByRSSBackgroundRefreshAccount,
  nowMs: number = Date.now()
): Promise<void> {
  const accountId = account.id_text;
  if (!claimAddByRSSBackgroundRefresh(accountId, nowMs)) {
    return;
  }

  try {
    await syncAddByRSSFollowStubs(accountId);
  } catch (error) {
    logRefreshErrorOnce('follow sync', error);
  }

  let firstParsedFeedUrls: string[] = [];
  try {
    firstParsedFeedUrls = await enqueueAddByRSSFirstParses({ accountId });
  } catch (error) {
    logRefreshErrorOnce('first parse', error);
  }

  if (!evaluateFeatureAccess('add_by_rss_refresh', deriveMembershipState(account)).allowed) {
    return;
  }

  try {
    const firstParsed = new Set(firstParsedFeedUrls.map(toAddByRSSFeedChangedUrl));
    const feeds = (await getAllAddByRSSFeeds()).filter(
      (feed) => !firstParsed.has(toAddByRSSFeedChangedUrl(feed.feedUrl))
    );
    await runAddByRSSParseAll({
      accountId,
      feeds,
      force: false,
      onQueued: async (feedUrl) => {
        await applyAddByRSSParseStatus({ feedUrl, parsedFeed: undefined, status: 'queued' });
      },
      onStatusUpdate: async (feedUrl, statusResponse) => {
        await applyAddByRSSParseStatus({
          feedUrl,
          parsedFeed: statusResponse.payload,
          status: statusResponse.status,
          cache: statusResponse.cache,
          outcome: statusResponse,
        });
      },
    });
  } catch (error) {
    logRefreshErrorOnce('parse all', error);
  }
}
