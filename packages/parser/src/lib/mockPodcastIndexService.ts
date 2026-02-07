import type { PodcastIndexService } from '@podverse/external-services-podcast-index';

/**
 * Minimal mock for test-assets mode. Never calls the network.
 * remoteItemParser only uses podcastGetByGuid(); returning null means no remote items are queued.
 */
export function createMockPodcastIndexService(): PodcastIndexService {
  return {
    podcastGetByGuid: async (): Promise<null> => null,
  } as unknown as PodcastIndexService;
}
