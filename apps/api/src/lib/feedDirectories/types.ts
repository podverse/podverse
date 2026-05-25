import type {
  FeedDirectoryId,
  PodcastIndexSearchPodcastsResponse,
  QueryParamsPodcastIndexSearchMedium,
} from '@podverse/helpers';

export type FeedDirectorySearchParams = {
  q: string;
  medium: QueryParamsPodcastIndexSearchMedium;
};

export interface FeedDirectorySearchProvider {
  readonly directoryId: FeedDirectoryId;
  search(params: FeedDirectorySearchParams): Promise<PodcastIndexSearchPodcastsResponse | null>;
}
