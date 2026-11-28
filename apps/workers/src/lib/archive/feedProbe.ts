import { getBaseConfig } from '@workers/config/index.js';

import { fetchForOutbound } from '@podverse/helpers-requests/outbound-requests';
import type { FeedProbe } from '@podverse/orm';

export type { FeedProbe };

const PROBE_TIMEOUT_MS = 10_000;
const PROBE_MAX_BODY_BYTES = 65_536;

/**
 * One GET. Success is a 2xx whose first 64 KB contains an RSS or Atom feed tag.
 * Any thrown error, including a timeout, is a failed probe.
 */
export const probeFeedUrl: FeedProbe = async (feedUrl: string): Promise<boolean> => {
  try {
    const response = await fetchForOutbound(feedUrl, {
      headers: { 'User-Agent': getBaseConfig().userAgent },
      maxBodyBytes: PROBE_MAX_BODY_BYTES,
      method: 'GET',
      timeoutMs: PROBE_TIMEOUT_MS,
    });
    if (response.status < 200 || response.status > 299) {
      return false;
    }
    const text = await response.text();
    return /<rss|<feed/i.test(text);
  } catch {
    return false;
  }
};
