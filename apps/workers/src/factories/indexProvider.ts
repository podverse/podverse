import type { IndexProvider } from '@podverse/helpers';
import { PodcastIndexProvider } from '@podverse/external-services-podcast-index';

import { getPodcastIndexService } from './podcastIndexService.js';

let instance: IndexProvider | null = null;

export function getIndexProvider(): IndexProvider {
  if (instance === null) {
    instance = new PodcastIndexProvider(getPodcastIndexService());
  }
  return instance;
}
