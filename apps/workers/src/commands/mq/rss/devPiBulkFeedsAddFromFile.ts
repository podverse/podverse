import type { CommandLineArgs } from '@workers/commands/index.js';
import { getDefaultFeedsCsvPath } from '@workers/commands/mq/rss/feedsDbPath.js';
import { getActiveMQArtemisService } from '@workers/factories/activeMQArtemisService.js';
import { getLoggerService } from '@workers/factories/loggerService.js';

import { iterateFeedsFromDb } from '@podverse/external-services-podcast-index';
import type { MQQueueNameParamKey } from '@podverse/helpers';
import { MQ_QUEUES, validMQQueueNamesParamKeys } from '@podverse/helpers';
import { mqRSSAdd as mqRSSAddFunction } from '@podverse/mq';

export const devPiBulkFeedsAddFromFile = async (args: CommandLineArgs) => {
  const mqQueueNameParamKey = (Array.isArray(args.q) ? args.q[0] : args.q) as
    | MQQueueNameParamKey
    | undefined;
  if (!mqQueueNameParamKey) {
    throw new Error('queueName (-q) parameter is required');
  }

  if (!validMQQueueNamesParamKeys.includes(mqQueueNameParamKey)) {
    throw new Error(
      `Invalid queueName. Allowed values are: ${validMQQueueNamesParamKeys.join(', ')}`
    );
  }

  const startIdArg = 'startId' in args ? args.startId : undefined;
  const startIdRaw = Array.isArray(startIdArg) ? startIdArg[0] : startIdArg;
  const startId = startIdRaw !== undefined ? parseInt(String(startIdRaw), 10) : NaN;
  if (isNaN(startId) || startId < 0) {
    throw new Error('startId (-startId) parameter is required and must be a non-negative number');
  }

  const endIdArg = 'endId' in args ? args.endId : undefined;
  const endIdRaw = Array.isArray(endIdArg) ? endIdArg[0] : endIdArg;
  const endId = endIdRaw !== undefined ? parseInt(String(endIdRaw), 10) : NaN;
  if (isNaN(endId) || endId < startId) {
    throw new Error('endId (-endId) parameter is required and must be a number >= startId');
  }

  const forceParse = args.f === '';

  const csvPath = getDefaultFeedsCsvPath();
  getLoggerService().info('devPiBulkFeedsAddFromFile: feeds CSV path', { csvPath });

  const mqConstantMessageOptions = MQ_QUEUES[mqQueueNameParamKey];
  const artemis = getActiveMQArtemisService();

  try {
    for await (const row of iterateFeedsFromDb(csvPath, startId, endId)) {
      await mqRSSAddFunction(
        artemis,
        {
          ...mqConstantMessageOptions,
          feedUrl: row.url,
          podcast_index_id: row.id,
          closeAfterSend: false,
        },
        {
          forceParse,
          onDemandParserEvent: {
            accountId: null,
            type: null,
            remoteParentPodcastIndexId: null,
          },
        }
      );
    }
  } finally {
    try {
      await artemis.close();
    } catch {
      // swallow
    }
  }
};
