import type { DTOIndexProviderFeedTarget, IndexProviderId } from '@podverse/helpers';

export type SearchResultDetailParams = {
  /** Provider feed id (the Podcast Index feed id, and the deep link's `resultId`). */
  resultId: string;
  /** Which index provider `resultId` belongs to. Omitted means 'podcast_index'. */
  indexProvider?: IndexProviderId;
  author?: string;
  /** Omitted when the caller has none (a stub); the screen then refreshes from the provider. */
  description?: string;
  feedUrl?: string;
  imageUrl?: string | null;
  title?: string;
};

export const buildSearchResultDetailParams = (
  target: DTOIndexProviderFeedTarget
): SearchResultDetailParams => ({
  ...(target.author !== null && target.author.length > 0 ? { author: target.author } : {}),
  feedUrl: target.feed_url,
  imageUrl: target.image_url,
  indexProvider: target.index_provider,
  resultId: target.provider_feed_id,
  ...(target.title !== null && target.title.length > 0 ? { title: target.title } : {}),
});
