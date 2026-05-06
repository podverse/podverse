import {
  DEDUPE_WINDOW_ADD_BY_RSS_BACKGROUND_MS,
  DEDUPE_WINDOW_ADD_BY_RSS_ON_DEMAND_MS,
  DEDUPE_WINDOW_IMAGE_SHRINK_HINTS_MS,
  DEDUPE_WINDOW_RSS_NORMAL_MS,
  DEDUPE_WINDOW_RSS_ON_DEMAND_MS,
  DEDUPE_WINDOW_RSS_SLOW_MS,
} from './dedupeWindows.js';

export type MQQueueNameParamKey =
  | 'rss-slow'
  | 'rss-normal'
  | 'rss-on-demand'
  | 'rss-live'
  | 'add-by-rss-on-demand'
  | 'add-by-rss-background';

export const validMQQueueNamesParamKeys: MQQueueNameParamKey[] = [
  'rss-slow',
  'rss-normal',
  'rss-on-demand',
  'rss-live',
  'add-by-rss-on-demand',
  'add-by-rss-background',
];

type MQQueueName =
  | 'rss-normal'
  | 'rss-on-demand'
  | 'rss-live'
  | 'add-by-rss-on-demand'
  | 'add-by-rss-background'
  | 'image-shrinking-hints';

export type MQQueueConfig = {
  queueName: MQQueueName;
  dedupeCacheTimeMS: number | null;
  priority: 'normal' | 'slow';
};

export type MQQueueConfigFunctionParams = MQQueueConfig & {
  closeAfterSend: boolean;
};

export const MQ_QUEUES: Record<MQQueueNameParamKey, MQQueueConfig> = {
  'rss-slow': {
    queueName: 'rss-normal',
    dedupeCacheTimeMS: DEDUPE_WINDOW_RSS_SLOW_MS,
    priority: 'slow',
  },
  'rss-normal': {
    queueName: 'rss-normal',
    dedupeCacheTimeMS: DEDUPE_WINDOW_RSS_NORMAL_MS,
    priority: 'normal',
  },
  'rss-on-demand': {
    queueName: 'rss-on-demand',
    dedupeCacheTimeMS: DEDUPE_WINDOW_RSS_ON_DEMAND_MS,
    priority: 'normal',
  },
  'rss-live': {
    queueName: 'rss-live',
    dedupeCacheTimeMS: null,
    priority: 'normal',
  },
  'add-by-rss-on-demand': {
    queueName: 'add-by-rss-on-demand',
    dedupeCacheTimeMS: DEDUPE_WINDOW_ADD_BY_RSS_ON_DEMAND_MS,
    priority: 'normal',
  },
  'add-by-rss-background': {
    queueName: 'add-by-rss-background',
    dedupeCacheTimeMS: DEDUPE_WINDOW_ADD_BY_RSS_BACKGROUND_MS,
    priority: 'normal',
  },
};

export const MQ_IMAGE_SHRINK_HINTS_QUEUE_NAME: MQQueueName = 'image-shrinking-hints';

/** AMQP message priority (0–9) for channel-level images (RSS channel / podcast artwork). */
export const MQ_IMAGE_SHRINK_HINT_AMQP_PRIORITY_CHANNEL = 9;

/** AMQP message priority (0–9) for item-level images (episode artwork). Lower than channel. */
export const MQ_IMAGE_SHRINK_HINT_AMQP_PRIORITY_ITEM = 4;

/**
 * AMQP priority for image-shrink hint messages so channel artwork is processed before item artwork.
 * Pair with a broker prioritized queue on `image-shrinking-hints` for ordered delivery.
 */
export function mqImageShrinkHintAmqpPriority(entityType: 'channel' | 'item'): number {
  return entityType === 'channel'
    ? MQ_IMAGE_SHRINK_HINT_AMQP_PRIORITY_CHANNEL
    : MQ_IMAGE_SHRINK_HINT_AMQP_PRIORITY_ITEM;
}

export const MQ_IMAGE_SHRINK_HINTS_CONFIG: MQQueueConfig = {
  queueName: MQ_IMAGE_SHRINK_HINTS_QUEUE_NAME,
  dedupeCacheTimeMS: DEDUPE_WINDOW_IMAGE_SHRINK_HINTS_MS,
  priority: 'normal',
};
