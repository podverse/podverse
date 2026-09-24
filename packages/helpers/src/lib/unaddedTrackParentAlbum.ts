export type UnaddedTrackParentAlbum =
  | { kind: 'album'; albumIdText: string }
  | { kind: 'podcast-index'; podcastIndexId: string };

type ParentAlbumRef = {
  id_text: string;
  podcast_guid: string | null;
};

/**
 * Where an unadded track reference opens. A local album wins. Otherwise a positive Podcast
 * Index feed id opens that feed's preview. Neither means the row is not shown.
 */
export function resolveUnaddedTrackParentAlbum(params: {
  albums: readonly ParentAlbumRef[];
  feedGuid?: string | null;
  feedId?: number | null;
}): UnaddedTrackParentAlbum | null {
  const feedGuid = params.feedGuid?.trim() ?? '';
  if (feedGuid.length > 0) {
    const album = params.albums.find((row) => row.podcast_guid === feedGuid);
    if (album !== undefined && album.id_text.length > 0) {
      return { kind: 'album', albumIdText: album.id_text };
    }
  }

  const feedId = params.feedId;
  if (typeof feedId === 'number' && Number.isFinite(feedId) && feedId > 0) {
    return { kind: 'podcast-index', podcastIndexId: String(feedId) };
  }

  return null;
}
