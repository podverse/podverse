import type { ActiveMQArtemisService } from '@queue/services/activeMQArtemis/index.js';
import type { MQImageShrinkHintMessage } from '@queue/types/mq.js';
import type { MQQueueConfigFunctionParams } from '@podverse/helpers';

type MQImageShrinkHintAddOptions = MQQueueConfigFunctionParams;

export const mqImageShrinkHintAdd = async (
  activeMQArtemisService: ActiveMQArtemisService,
  options: MQImageShrinkHintAddOptions,
  message: MQImageShrinkHintMessage
) => {
  await activeMQArtemisService.initialize();

  try {
    await activeMQArtemisService.sendMessage({
      queueName: options.queueName,
      message,
      priority: options.priority,
      dedupeCacheTimeMS: options.dedupeCacheTimeMS,
    });
  } finally {
    try {
      if (options.closeAfterSend) {
        await activeMQArtemisService.close();
      }
    } catch {
      // swallow
    }
  }
};
