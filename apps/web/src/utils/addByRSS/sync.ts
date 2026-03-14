import { getFollowedAddByRSSChannels } from './api';
import { bulkRemoveAddByRSSFeeds, clearAddByRSSItemsIndex, getAllAddByRSSFeeds } from './storage';

/**
 * Syncs Add by RSS IndexedDB cache with the server: removes any feeds from IDB
 * that are no longer followed for the account, and clears the items index
 * when any feed is removed so stale items are not shown.
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
