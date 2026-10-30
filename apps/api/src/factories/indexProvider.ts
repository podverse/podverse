import { PodcastIndexProvider } from '@podverse/external-services-podcast-index';
import type { IndexProvider } from '@podverse/helpers';

import { podcastIndexService } from './podcastIndexService.js';

export const indexProvider: IndexProvider = new PodcastIndexProvider(podcastIndexService);
