import type { CommandLineArgs } from '@workers/commands/index.js';
import { getActiveMQArtemisService } from '@workers/factories/activeMQArtemisService.js';
import { getPodcastIndexService } from '@workers/factories/podcastIndexService.js';

import type { MQQueueNameParamKey } from '@podverse/helpers';
import { MQ_QUEUES, validMQQueueNamesParamKeys } from '@podverse/helpers';
import { mqRSSAdd as mqRSSAddFunction } from '@podverse/mq';

export const mqRSSAdd = async (args: CommandLineArgs) => {
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

  const podcastIndexIdArg = Array.isArray(args.p) ? args.p[0] : args.p;
  if (!podcastIndexIdArg) {
    throw new Error('podcast_index_id (-p) parameter is required');
  }

  const podcast_index_id = Number(podcastIndexIdArg);
  if (isNaN(podcast_index_id)) {
    throw new Error('podcast_index_id (-p) must be a number');
  }

  const feedData = await getPodcastIndexService().podcastGetById(podcast_index_id);
  const feedUrl = feedData?.feed?.url;
  if (!feedUrl) {
    throw new Error(`No feedUrl found for podcast_index_id ${podcast_index_id}`);
  }

  const forceParse = args.f === '';

  const mqConstantMessageOptions = MQ_QUEUES[mqQueueNameParamKey];

  await mqRSSAddFunction(
    getActiveMQArtemisService(),
    {
      ...mqConstantMessageOptions,
      feedUrl,
      podcast_index_id,
      closeAfterSend: true,
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
};
