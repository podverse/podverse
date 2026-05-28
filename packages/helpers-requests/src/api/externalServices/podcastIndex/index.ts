import type { PodcastIndexSearchPodcastsResponse } from '@podverse/helpers';
import type { PodcastIndexPodcastByIdResponse } from '@podverse/helpers';
import type { QueryParamsPodcastIndexSearchMedium } from '@podverse/helpers';

import type { ApiRequestService } from '../../_request.js';

export async function reqPodcastIndexFeedById(api: ApiRequestService, podcast_index_id: string) {
  return api.apiRequest<PodcastIndexPodcastByIdResponse>({
    path: `/external-services/podcast-index/feed/${encodeURIComponent(podcast_index_id)}`,
    method: 'GET',
  });
}

export async function reqPodcastIndexSearchPodcasts(
  api: ApiRequestService,
  options: {
    q: string;
    medium?: QueryParamsPodcastIndexSearchMedium;
  }
) {
  const params = new URLSearchParams({ q: options.q });
  if (options.medium !== undefined && options.medium !== 'all') {
    params.set('medium', options.medium);
  }

  return api.apiRequest<PodcastIndexSearchPodcastsResponse>({
    path: `/external-services/podcast-index/search/podcasts?${params.toString()}`,
    method: 'GET',
  });
}
