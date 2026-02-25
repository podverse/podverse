import type { PodcastIndexService } from '@podverse/external-services-podcast-index';

let instance: PodcastIndexService | null = null;

export function setPodcastIndexService(service: PodcastIndexService): void {
  instance = service;
}

export function getPodcastIndexService(): PodcastIndexService {
  if (instance === null) {
    throw new Error(
      'PodcastIndexService not initialized; call setPodcastIndexService from runApp first'
    );
  }
  return instance;
}
