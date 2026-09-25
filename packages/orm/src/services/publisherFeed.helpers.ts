/**
 * Pure helpers for splitting artist-album remote-item rows (channel-level
 * podcast:remoteItem without an item_guid) into local matches vs still-unparsed.
 */

export type PublisherAlbumRemoteRef = {
  feed_guid: string | null | undefined;
  feed_url: string | null | undefined;
  item_guid: string | null | undefined;
};

export function isPublisherAlbumRemoteRef(ref: PublisherAlbumRemoteRef): boolean {
  if (ref.item_guid) {
    return false;
  }
  const hasGuid = typeof ref.feed_guid === 'string' && ref.feed_guid.trim().length > 0;
  const hasUrl = typeof ref.feed_url === 'string' && ref.feed_url.trim().length > 0;
  return hasGuid || hasUrl;
}

/** Non-empty trimmed feed URLs from album refs that did not match a local channel by guid. */
export function feedUrlsForPublisherAlbumUrlLookup(
  unmatchedAlbumRefs: PublisherAlbumRemoteRef[]
): string[] {
  const seen = new Set<string>();
  const urls: string[] = [];
  for (const ref of unmatchedAlbumRefs) {
    if (!isPublisherAlbumRemoteRef(ref)) {
      continue;
    }
    const url = typeof ref.feed_url === 'string' ? ref.feed_url.trim() : '';
    if (url.length === 0 || seen.has(url)) {
      continue;
    }
    seen.add(url);
    urls.push(url);
  }
  return urls;
}
