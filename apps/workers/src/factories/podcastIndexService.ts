import { PodcastIndexService } from '@podverse/external-services';
import { config } from '@workers/config';
import { loggerService } from './loggerService';

const userAgent = config.userAgent || '';
const authKey = config.podcastIndex.authKey || '';
const baseUrl = config.podcastIndex.baseUrl || '';
const secretKey = config.podcastIndex.secretKey || '';

export const podcastIndexService = new PodcastIndexService({
  userAgent,
  authKey,
  baseUrl,
  secretKey,
  loggerService,
});
