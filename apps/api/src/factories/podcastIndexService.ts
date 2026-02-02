import { PodcastIndexService } from '@podverse/external-services-podcast-index';
import { loggerService } from './loggerService.js';
import { config } from '../config/index.js';

export const podcastIndexService = new PodcastIndexService({
  userAgent: config.userAgent,
  authKey: config.podcastIndex.authKey,
  baseUrl: config.podcastIndex.baseUrl,
  secretKey: config.podcastIndex.secretKey,
  loggerService,
});
