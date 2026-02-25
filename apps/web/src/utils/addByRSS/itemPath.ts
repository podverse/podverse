/**
 * URL path helper for Add by RSS item pages (episodes, tracks).
 * Items use a short nano-id (idText) as the URL segment.
 */

export const getAddByRSSItemPath = (
  idText: string,
  resourceType: 'episodes' | 'tracks' = 'episodes'
): string => {
  const segment = resourceType === 'tracks' ? 'track' : 'episode';
  return `/add-by-rss/${segment}/${idText}`;
};

export const getAddByRSSLivestreamPath = (
  idText: string,
  mediumSlug: 'podcast' | 'music'
): string => {
  return `/add-by-rss/${mediumSlug}/livestream/${idText}`;
};
