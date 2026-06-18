import {
  parsePodcastIndexClientOptionsFromEnv,
  PodcastIndexService,
} from '@podverse/external-services-podcast-index';

import { config } from '../config/index.js';
import { loggerService } from './loggerService.js';

const podcastIndexClientOptions = parsePodcastIndexClientOptionsFromEnv(process.env);

export const podcastIndexService = new PodcastIndexService({
  userAgent: config.userAgent,
  authKey: config.podcastIndex.authKey,
  baseUrl: config.podcastIndex.baseUrl,
  secretKey: config.podcastIndex.secretKey,
  loggerService,
  ...podcastIndexClientOptions,
});
