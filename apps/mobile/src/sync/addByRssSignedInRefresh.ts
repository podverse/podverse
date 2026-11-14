import type { AddByRssMatchFeedInput } from '../lib/addByRss/directoryMatch';
import { buildAddByRssMatchRefs, shouldRunDirectoryMatch } from '../lib/addByRss/directoryMatch';

export type SignedInDirectoryRefreshFailure = 'match' | 'promotion';

export type SignedInAddByRssRefreshDeps = {
  convertAccountFeed: (feed: { feedUrl: string; feedGuid: string | null }) => Promise<unknown>;
  findMatches: (
    feeds: readonly AddByRssMatchFeedInput[]
  ) => Promise<ReadonlyMap<string, unknown>>;
  force: boolean;
  lastDirectoryMatchAtMs: number | null;
  listMatchFeeds: () => Promise<readonly AddByRssMatchFeedInput[]>;
  logFailure: (kind: SignedInDirectoryRefreshFailure, error: unknown, feedCount: number) => void;
  matchRequestAnswered: (error: unknown) => boolean;
  membershipAllowsRefresh: () => boolean;
  nowMs: number;
  requestRefreshAll: () => Promise<void>;
};

/**
 * Signed-in Add by RSS refresh after stored userinfo is split out of feed URLs.
 *
 * A feed the directory already has is converted first. That replaces a follow, so it does not
 * need a membership. A failure is logged and the parse refresh still runs when a membership
 * allows it. The match itself is asked at most once an hour unless this run is forced.
 */
export const runSignedInAddByRssRefresh = async (
  deps: SignedInAddByRssRefreshDeps
): Promise<{ lastDirectoryMatchAtMs: number | null }> => {
  let lastDirectoryMatchAtMs = deps.lastDirectoryMatchAtMs;

  if (shouldRunDirectoryMatch(lastDirectoryMatchAtMs, deps.nowMs, deps.force)) {
    let feedCount = 0;
    try {
      const feeds = await deps.listMatchFeeds();
      feedCount = feeds.length;
      if (buildAddByRssMatchRefs(feeds).length > 0) {
        try {
          const matches = await deps.findMatches(feeds);
          lastDirectoryMatchAtMs = deps.nowMs;
          for (const feed of feeds) {
            if (!matches.has(feed.feedUrl)) {
              continue;
            }
            try {
              await deps.convertAccountFeed({
                feedGuid: feed.podcastGuid,
                feedUrl: feed.feedUrl,
              });
            } catch (error) {
              deps.logFailure('promotion', error, feedCount);
            }
          }
        } catch (error) {
          if (deps.matchRequestAnswered(error)) {
            lastDirectoryMatchAtMs = deps.nowMs;
          }
          deps.logFailure('match', error, feedCount);
        }
      }
    } catch (error) {
      deps.logFailure('match', error, feedCount);
    }
  }

  if (!deps.membershipAllowsRefresh()) {
    return { lastDirectoryMatchAtMs };
  }
  await deps.requestRefreshAll();
  return { lastDirectoryMatchAtMs };
};
