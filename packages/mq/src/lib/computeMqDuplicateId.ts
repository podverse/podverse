import crypto from 'crypto';

import type {
  MQAddByRSSMessage,
  MQImageShrinkHintMessage,
  MQOpmlImportMessage,
} from '../types/mq.js';

type MQRSSDedupeMessage = {
  url: string;
  podcast_index_id: number | null;
};

export type MQDedupeMessage =
  MQRSSDedupeMessage | MQAddByRSSMessage | MQImageShrinkHintMessage | MQOpmlImportMessage;

/**
 * Resolve the value for deduping an MQ message. Each message shape has a
 * different stable identity: RSS parse jobs dedupe on the Podcast Index id (or
 * feed url), add-by-rss jobs on the feed url, OPML import jobs on the per-batch
 * requestId, and everything else on the url. OPML import batches contain many
 * feeds and no single feedUrl/url, so requestId is the only stable identity.
 */
export const resolveMqDedupeValue = (message: MQDedupeMessage): string | number | undefined => {
  if ('podcast_index_id' in message) {
    return message.podcast_index_id ?? message.url;
  }
  if ('feedUrl' in message) {
    return message.feedUrl;
  }
  if ('feeds' in message) {
    return message.requestId;
  }
  return message.url;
};

/**
 * Compute the `_AMQ_DUPL_ID` value for an MQ message, or null when dedupe is
 * disabled (non-positive window). The id is bucketed by the dedupe window so
 * identical messages within the same window collapse to one delivery.
 */
export const computeMqDuplicateId = (
  queueName: string,
  message: MQDedupeMessage,
  dedupeCacheTimeMS: number | null,
  now: number = Date.now()
): string | null => {
  if (!dedupeCacheTimeMS || dedupeCacheTimeMS <= 0) {
    return null;
  }
  const dedupeValue = resolveMqDedupeValue(message);
  const baseHash = crypto.createHash('sha256').update(String(dedupeValue)).digest('hex');
  const bucketStart = Math.floor(now / dedupeCacheTimeMS) * dedupeCacheTimeMS;
  return `${queueName}:${bucketStart}:${baseHash}`;
};
