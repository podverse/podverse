import { ONE_MINUTE_MS } from './timeConstants.js';

/**
 * Max duration for client-side polling after directory "Add feed" / "Add podcast"
 * (`POST /mq/rss/add/on-demand`) until `GET /channel/podcast-index/:id` is parsed-ready.
 * Shared by web and mobile so neither polls forever.
 */
export const DIRECTORY_ADD_POLL_TIMEOUT_MS = 10 * ONE_MINUTE_MS;
