import { CommandLineArgs } from '@workers/commands';
import { activeMQArtemisService } from '@workers/factories/activeMQArtemisService';
import { MQ_QUEUES, MQQueueNameParamKey, validMQQueueNamesParamKeys } from '@podverse/helpers';
import { mqRSSRunParser as mqRSSRunParserFunction, createActiveMQShutdown } from '@podverse/mq';

export const mqRSSRunParser = async (args: CommandLineArgs) => {
  const mqQueueNameParamKey = (Array.isArray(args.q) ? args.q[0] : args.q) as MQQueueNameParamKey | undefined;
  if (!mqQueueNameParamKey) {
    throw new Error('queueName (-q) parameter is required');
  }

  if (!validMQQueueNamesParamKeys.includes(mqQueueNameParamKey)) {
    throw new Error(`Invalid queueName. Allowed values are: ${validMQQueueNamesParamKeys.join(', ')}`);
  }

  const mqConstantMessageOptions = MQ_QUEUES[mqQueueNameParamKey];

  await mqRSSRunParserFunction(
    activeMQArtemisService,
    mqConstantMessageOptions.queueName,
  );

  let keepRunning = true;

  const { unregister } = createActiveMQShutdown(
    activeMQArtemisService,
    console,
    () => { keepRunning = false; },
  );

  while (keepRunning) {
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  unregister();
};
