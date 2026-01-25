import { podcastIndexService } from '@workers/factories/podcastIndexService';

export const podcastIndexValueUpdateAll = async () => {
  const podcastIndexFeedIds = await podcastIndexService.valueGetByPodcastIds();

  console.warn('podcastIndexFeedIds', podcastIndexFeedIds);
};
