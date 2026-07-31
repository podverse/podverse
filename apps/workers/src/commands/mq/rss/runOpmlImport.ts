import type { CommandLineArgs } from '@workers/commands/index.js';
import { getOpmlImportConfig } from '@workers/config/index.js';
import { getActiveMQArtemisService } from '@workers/factories/activeMQArtemisService.js';
import { getLoggerService } from '@workers/factories/loggerService.js';
import { getPodcastIndexService } from '@workers/factories/podcastIndexService.js';
import { cacheGetJson, cacheSetJson } from '@workers/lib/keyvaldb/keyvaldb.js';
import { setOpmlImportCacheEntry } from '@workers/lib/opmlImportCache.js';
import type { EventContext, Receiver } from 'rhea';

import type { CacheSetJson, MQQueueNameParamKey } from '@podverse/helpers';
import { emptyOpmlImportTotals, MQ_QUEUES } from '@podverse/helpers';
import type { MQOpmlImportMessage } from '@podverse/mq';
import { createActiveMQShutdown, processOpmlImportJob } from '@podverse/mq';

const allowedQueueParamKeys: MQQueueNameParamKey[] = ['opml-import'];

const cacheSetJsonAdapter: CacheSetJson = (key, value, ttlSeconds) =>
  cacheSetJson(key, value, ttlSeconds ?? undefined);

type OpmlImportMessageHandlerParams = {
  context: EventContext;
  receiver: Receiver;
  queueName: string;
  maxFeedsPerHour: number;
  isDev: boolean;
  logger: {
    info: (message: string, meta?: Record<string, unknown>) => void;
    logError: (message: string, error: Error) => void;
  };
  activeMQArtemisService: Parameters<typeof processOpmlImportJob>[0]['activeMQArtemisService'];
  podcastGetByFeedUrl: Parameters<typeof processOpmlImportJob>[0]['podcastGetByFeedUrl'];
  cacheGetJsonAdapter: typeof cacheGetJson;
  cacheSetJsonAdapter: CacheSetJson;
};

const parseRequiredOpmlImportMessage = (bodyStr: string): MQOpmlImportMessage => {
  const message = JSON.parse(bodyStr) as MQOpmlImportMessage;
  const { accountId, requestId, feeds } = message;
  if (!accountId || !requestId || !Array.isArray(feeds)) {
    throw new Error(`Missing required OPML import fields in message ${bodyStr}`);
  }
  return message;
};

export const handleOpmlImportMessage = async (
  params: OpmlImportMessageHandlerParams
): Promise<void> => {
  const {
    context,
    receiver,
    queueName,
    maxFeedsPerHour,
    isDev,
    logger,
    activeMQArtemisService,
    podcastGetByFeedUrl,
    cacheGetJsonAdapter,
    cacheSetJsonAdapter,
  } = params;
  const bodyStr = (context.message?.body as string) ?? '';
  let message: MQOpmlImportMessage | null = null;

  try {
    message = parseRequiredOpmlImportMessage(bodyStr);
    const { accountId, requestId, feeds } = message;

    if (isDev) {
      logger.info('mqOpmlImportRun: import started', {
        accountId,
        requestId,
        feedCount: feeds.length,
        queueName,
      });
    }

    await processOpmlImportJob({
      accountId,
      requestId,
      feeds,
      maxFeedsPerHour,
      cacheGetJson: cacheGetJsonAdapter,
      cacheSetJson: cacheSetJsonAdapter,
      activeMQArtemisService,
      podcastGetByFeedUrl,
      enqueueDownstreamJobs: true,
    });

    if (isDev) {
      logger.info('mqOpmlImportRun: import finished', {
        accountId,
        requestId,
        queueName,
      });
    }

    context.delivery?.accept();
    receiver.add_credit(1);
  } catch (error) {
    logger.logError('mqOpmlImportRun: error processing message', error as Error);
    try {
      if (message?.accountId && message?.requestId) {
        await setOpmlImportCacheEntry({
          requestId: message.requestId,
          accountId: message.accountId,
          status: 'failed',
          totals: emptyOpmlImportTotals(message.feeds?.length ?? 0),
          results: [],
          error: (error as Error).message,
          updatedAt: new Date().toISOString(),
        });
      }
    } catch (cacheError) {
      logger.logError('mqOpmlImportRun: failed to update cache entry', cacheError as Error);
    }
    context.delivery?.reject({
      condition: 'podverse:processing-error',
      description: (error as Error).message,
    });
    receiver.add_credit(1);
  }
};

export const mqOpmlImportRun = async (args: CommandLineArgs) => {
  const mqQueueNameParamKey = (Array.isArray(args.q) ? args.q[0] : args.q) as
    MQQueueNameParamKey | undefined;
  if (!mqQueueNameParamKey) {
    throw new Error('queueName (-q) parameter is required');
  }

  if (!allowedQueueParamKeys.includes(mqQueueNameParamKey)) {
    throw new Error(`Invalid queueName. Allowed values are: ${allowedQueueParamKeys.join(', ')}`);
  }

  const mqConstantMessageOptions = MQ_QUEUES[mqQueueNameParamKey];
  const activeMQArtemisService = getActiveMQArtemisService();
  const loggerService = getLoggerService();
  const podcastIndexService = getPodcastIndexService();
  const maxFeedsPerHour = getOpmlImportConfig().maxFeedsPerHour;
  const isDev = process.env.NODE_ENV === 'development';

  await activeMQArtemisService.initialize();

  await activeMQArtemisService.consumeMessages(
    mqConstantMessageOptions.queueName,
    async (context, receiver) => {
      await handleOpmlImportMessage({
        context,
        receiver,
        queueName: mqConstantMessageOptions.queueName,
        maxFeedsPerHour,
        isDev,
        logger: loggerService,
        activeMQArtemisService,
        podcastGetByFeedUrl: (feedUrl) => podcastIndexService.podcastGetByFeedUrl(feedUrl),
        cacheGetJsonAdapter: cacheGetJson,
        cacheSetJsonAdapter,
      });
    }
  );

  let keepRunning = true;

  const { unregister } = createActiveMQShutdown(activeMQArtemisService, console, () => {
    keepRunning = false;
  });

  while (keepRunning) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  unregister();
};
