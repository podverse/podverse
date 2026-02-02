import type { ActiveMQArtemisService } from '@queue/services/activeMQArtemis/index.js';
import type { MQAddByRSSMessage } from '@queue/types/mq.js';
import type { MQQueueConfigFunctionParams } from '@podverse/helpers';

type MQAddByRSSAddOptions = MQQueueConfigFunctionParams & {
  accountId: number;
  feedUrl: string;
  requestId: string;
  feedHash?: string;
  etag?: string;
  lastModified?: string;
};

export const mqAddByRSSAdd = async (
  activeMQArtemisService: ActiveMQArtemisService,
  options: MQAddByRSSAddOptions
) => {
  await activeMQArtemisService.initialize();

  try {
    const message: MQAddByRSSMessage = {
      accountId: options.accountId,
      feedUrl: options.feedUrl,
      requestId: options.requestId,
      feedHash: options.feedHash,
      etag: options.etag,
      lastModified: options.lastModified,
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
