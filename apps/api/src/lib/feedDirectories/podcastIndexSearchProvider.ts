import { config } from '@api/config/index.js';
import { podcastIndexService } from '@api/factories/podcastIndexService.js';

import type { FeedDirectorySearchParams, FeedDirectorySearchProvider } from './types.js';

export const podcastIndexSearchProvider: FeedDirectorySearchProvider = {
  directoryId: 'podcast-index',

  async search(params: FeedDirectorySearchParams) {
    const options = { max: config.podcastIndex.searchMax };

    if (params.medium === 'music') {
      return podcastIndexService.searchMusicByTerm(params.q, options);
    }

    return podcastIndexService.searchPodcasts(params.q, options);
  },
};
