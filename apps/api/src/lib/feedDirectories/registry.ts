import type { FeedDirectoryId } from '@podverse/helpers';

import { podcastIndexSearchProvider } from './podcastIndexSearchProvider.js';
import type { FeedDirectorySearchParams, FeedDirectorySearchProvider } from './types.js';

const providers: Record<FeedDirectoryId, FeedDirectorySearchProvider> = {
  'podcast-index': podcastIndexSearchProvider,
};

export function searchFeedDirectory(
  directoryId: FeedDirectoryId,
  params: FeedDirectorySearchParams
) {
  return providers[directoryId].search(params);
}
