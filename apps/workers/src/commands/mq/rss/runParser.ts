import type { CommandLineArgs } from '@workers/commands/index.js';
import { getActiveMQArtemisService } from '@workers/factories/activeMQArtemisService.js';

import type { MQQueueNameParamKey } from '@podverse/helpers';
import { MQ_QUEUES, sleep, validMQQueueNamesParamKeys } from '@podverse/helpers';
import { createActiveMQShutdown, mqRSSRunParser as mqRSSRunParserFunction } from '@podverse/mq';

export const mqRSSRunParser = async (args: CommandLineArgs) => {
  const mqQueueNameParamKey = (Array.isArray(args.q) ? args.q[0] : args.q) as
    MQQueueNameParamKey | undefined;
  if (!mqQueueNameParamKey) {
    throw new Error('queueName (-q) parameter is required');
  }

  if (!validMQQueueNamesParamKeys.includes(mqQueueNameParamKey)) {
    throw new Error(
      `Invalid queueName. Allowed values are: ${validMQQueueNamesParamKeys.join(', ')}`
    );
  }

  const mqConstantMessageOptions = MQ_QUEUES[mqQueueNameParamKey];

  const activeMQArtemisService = getActiveMQArtemisService();
  await mqRSSRunParserFunction(activeMQArtemisService, mqConstantMessageOptions.queueName);

  let keepRunning = true;

  const { unregister } = createActiveMQShutdown(activeMQArtemisService, console, () => {
    keepRunning = false;
  });

  while (keepRunning) {
    await sleep(1000);
  }

  unregister();
};
