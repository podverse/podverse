import { MQ_QUEUES, MQQueueNameParamKey, validMQQueueNamesParamKeys } from '@podverse/helpers';
import { mqRSSAddRecentlyUpdatedFeedsFromPodcastIndex as mqRSSAddRecentlyUpdatedFeedsFromPodcastIndexFunction } from '@podverse/mq';
import { CommandLineArgs } from '@workers/commands';
import { podcastIndexService } from '@workers/factories/podcastIndexService';
import { activeMQArtemisService } from '@workers/factories/activeMQArtemisService';

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
    activeMQArtemisService,
    podcastIndexService,
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
