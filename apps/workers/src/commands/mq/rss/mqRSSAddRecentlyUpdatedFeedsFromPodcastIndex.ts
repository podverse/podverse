import type { MQQueueNameParamKey } from '@podverse/helpers';
import { MQ_QUEUES, validMQQueueNamesParamKeys } from '@podverse/helpers';
import { mqRSSAddRecentlyUpdatedFeedsFromPodcastIndex as mqRSSAddRecentlyUpdatedFeedsFromPodcastIndexFunction } from '@podverse/mq';
import type { CommandLineArgs } from '@workers/commands/index.js';
import { getPodcastIndexService } from '@workers/factories/podcastIndexService.js';
import { getActiveMQArtemisService } from '@workers/factories/activeMQArtemisService.js';

export const mqRSSAddRecentlyUpdatedFeedsFromPodcastIndex = async (args: CommandLineArgs) => {
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

  let sinceRange: number | undefined;
  const sinceRangeArg = 'sinceRange' in args ? args.sinceRange : 'sr' in args ? args.sr : undefined;
  if (sinceRangeArg !== undefined) {
    const rawValue = Array.isArray(sinceRangeArg) ? sinceRangeArg[0] : sinceRangeArg;
    const parsedSinceRange = parseInt(rawValue ?? '', 10);
    if (!isNaN(parsedSinceRange) && parsedSinceRange > 0) {
      sinceRange = parsedSinceRange;
    }
  }

  if (!sinceRange) {
    throw new Error('sinceRange (-sr) parameter is required');
  }

  const mqConstantMessageOptions = MQ_QUEUES[mqQueueNameParamKey];

  await mqRSSAddRecentlyUpdatedFeedsFromPodcastIndexFunction(
    getActiveMQArtemisService(),
    getPodcastIndexService(),
    {
      ...mqConstantMessageOptions,
      sinceRange,
      closeAfterSend: true,
    },
    {
      forceParse: false,
      onDemandParserEvent: {
        accountId: null,
        type: null,
        remoteParentPodcastIndexId: null,
      },
    }
  );
};
