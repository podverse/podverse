import { PodcastIndexSearchPodcastsResponse } from 'src/dtos';
import { ApiRequestService } from '../../_request';
import { PodcastIndexPodcastByIdResponse } from 'src/dtos/podcast-index/podcastById';

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
