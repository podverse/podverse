import { getFollowedAddByRSSChannels } from './api';
import { bulkRemoveAddByRSSFeeds, clearAddByRSSItemsIndex, getAllAddByRSSFeeds } from './storage';

/**
 * Syncs the Add by RSS IndexedDB cache with the server: removes feeds that are not
 * followed by the account, and clears the items index when a feed is removed so
 * stale items are not shown.
 */
export async function syncAddByRSSCacheWithServer(accountIdText: string): Promise<void> {
  const remote = await getFollowedAddByRSSChannels(accountIdText);
  const existing = await getAllAddByRSSFeeds();
  const remoteUrls = new Set(remote.map((c) => c.feed_url));
  const toRemove = existing
    .filter((feed) => !remoteUrls.has(feed.feedUrl))
    .map((feed) => feed.idText);

  if (toRemove.length > 0) {
    await bulkRemoveAddByRSSFeeds(toRemove);
    await clearAddByRSSItemsIndex();
  }
}
