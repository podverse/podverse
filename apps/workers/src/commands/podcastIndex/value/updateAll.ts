import { getPodcastIndexService } from '@workers/factories/podcastIndexService';

export const podcastIndexValueUpdateAll = async () => {
  const podcastIndexFeedIds = await getPodcastIndexService().valueGetByPodcastIds();

  console.warn('podcastIndexFeedIds', podcastIndexFeedIds);
};
