import { getPodcastIndexService } from '@workers/factories/podcastIndexService.js';

export const podcastIndexValueUpdateAll = async () => {
  const podcastIndexFeedIds = await getPodcastIndexService().valueGetByPodcastIds();

  console.warn('podcastIndexFeedIds', podcastIndexFeedIds);
};
