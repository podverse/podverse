import type { IndexProvider } from '@podverse/helpers';
import { PodcastIndexProvider } from '@podverse/external-services-podcast-index';

import { podcastIndexService } from './podcastIndexService.js';

export const indexProvider: IndexProvider = new PodcastIndexProvider(podcastIndexService);
