import type { MQQueueNameParamKey } from '@podverse/helpers';
import { MQ_QUEUES, validMQQueueNamesParamKeys } from '@podverse/helpers';
import { mqRSSAddAll as mqRSSAddAllFunction } from '@podverse/mq';
import type { CommandLineArgs } from '@workers/commands/index.js';
import { getActiveMQArtemisService } from '@workers/factories/activeMQArtemisService.js';

export const mqRSSAddAll = async (args: CommandLineArgs) => {
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

  const forceParse = args.f === '';

  const mqConstantMessageOptions = MQ_QUEUES[mqQueueNameParamKey];
  await mqRSSAddAllFunction(
    getActiveMQArtemisService(),
    {
      ...mqConstantMessageOptions,
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
