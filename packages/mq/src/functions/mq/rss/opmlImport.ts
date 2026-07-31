import type { ActiveMQArtemisService } from '@queue/services/activeMQArtemis/index.js';
import type { MQOpmlImportFeed, MQOpmlImportMessage } from '@queue/types/mq.js';

import type { MQQueueConfigFunctionParams } from '@podverse/helpers';

type MQOpmlImportAddOptions = MQQueueConfigFunctionParams & {
  accountId: number;
  requestId: string;
  feeds: MQOpmlImportFeed[];
};

export const mqOpmlImportAdd = async (
  activeMQArtemisService: ActiveMQArtemisService,
  options: MQOpmlImportAddOptions
) => {
  await activeMQArtemisService.initialize();

  try {
    const message: MQOpmlImportMessage = {
      accountId: options.accountId,
      requestId: options.requestId,
      feeds: options.feeds,
    };

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
