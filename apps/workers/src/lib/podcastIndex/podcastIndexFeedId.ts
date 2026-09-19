/**
 * Reads a Podcast Index feed object's numeric id without trusting the untyped PI payload.
 */
export function podcastIndexFeedId(feed: unknown): number | null {
  if (feed === null || feed === undefined || typeof feed !== 'object') {
    return null;
  }
  if (!('id' in feed)) {
    return null;
  }
  const idRaw = feed.id;
  if (idRaw === undefined || idRaw === null) {
    return null;
  }
  const id = typeof idRaw === 'number' ? idRaw : Number(idRaw);
  if (Number.isNaN(id) || id <= 0) {
    return null;
  }
  return id;
}
