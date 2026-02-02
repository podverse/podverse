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
  | 'add-by-rss-background';

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
    dedupeCacheTimeMS: 15 * 60 * 1000,
    priority: 'slow',
  },
  'rss-normal': {
    queueName: 'rss-normal',
    dedupeCacheTimeMS: 5 * 60 * 1000,
    priority: 'normal',
  },
  'rss-on-demand': {
    queueName: 'rss-on-demand',
    dedupeCacheTimeMS: 1 * 60 * 1000,
    priority: 'normal',
  },
  'rss-live': {
    queueName: 'rss-live',
    dedupeCacheTimeMS: null,
    priority: 'normal',
  },
  'add-by-rss-on-demand': {
    queueName: 'add-by-rss-on-demand',
    dedupeCacheTimeMS: 1 * 60 * 1000,
    priority: 'normal',
  },
  'add-by-rss-background': {
    queueName: 'add-by-rss-background',
    dedupeCacheTimeMS: 5 * 60 * 1000,
    priority: 'normal',
  },
};
