import type { PodcastIndexSearchPodcastsResponse } from '@podverse/helpers';
import type { ApiRequestService } from '../../_request.js';
import type { PodcastIndexPodcastByIdResponse } from '@podverse/helpers';

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
  }
) {
  return api.apiRequest<PodcastIndexSearchPodcastsResponse>({
    path: `/external-services/podcast-index/search/podcasts?q=${encodeURIComponent(options.q)}`,
    method: 'GET',
  });
}
