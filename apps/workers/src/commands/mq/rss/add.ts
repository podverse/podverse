import { MQ_QUEUES, MQQueueNameParamKey, validMQQueueNamesParamKeys } from '@podverse/helpers';
import { mqRSSAdd as mqRSSAddFunction } from '@podverse/mq';
import { CommandLineArgs } from '@workers/commands';
import { activeMQArtemisService } from '@workers/factories/activeMQArtemisService';
import { podcastIndexService } from '@workers/factories/podcastIndexService';

export const mqRSSAdd = async (args: CommandLineArgs) => {
  const mqQueueNameParamKey = (Array.isArray(args.q) ? args.q[0] : args.q) as MQQueueNameParamKey | undefined;
  if (!mqQueueNameParamKey) {
    throw new Error('queueName (-q) parameter is required');
  }

  if (!validMQQueueNamesParamKeys.includes(mqQueueNameParamKey)) {
    throw new Error(`Invalid queueName. Allowed values are: ${validMQQueueNamesParamKeys.join(', ')}`);
  }

  const podcastIndexIdArg = Array.isArray(args.p) ? args.p[0] : args.p;
  if (!podcastIndexIdArg) {
    throw new Error('podcast_index_id (-p) parameter is required');
  }

  const podcast_index_id = Number(podcastIndexIdArg);
  if (isNaN(podcast_index_id)) {
    throw new Error('podcast_index_id (-p) must be a number');
  }

  const feedData = await podcastIndexService.podcastGetById(podcast_index_id);
  const feedUrl = feedData?.feed?.url;
  if (!feedUrl) {
    throw new Error(`No feedUrl found for podcast_index_id ${podcast_index_id}`);
  }

  const forceParse = args.f === '';

  const mqConstantMessageOptions = MQ_QUEUES[mqQueueNameParamKey];

  await mqRSSAddFunction(
    activeMQArtemisService,
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
    },
  );
};