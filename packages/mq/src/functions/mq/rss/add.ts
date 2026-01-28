import { ActiveMQArtemisService } from '@queue/services/activeMQArtemis';
import { MQFeedMessage } from '@queue/types/mq';
import { MQQueueConfigFunctionParams } from '@podverse/helpers';
import { ParseRSSFeedAndSaveToDatabaseOptions } from '@podverse/parser';

type MQRSSAddOptions = MQQueueConfigFunctionParams & {
  feedUrl: string;
  podcast_index_id: number;
};

export const mqRSSAdd = async (
  activeMQArtemisService: ActiveMQArtemisService,
  options: MQRSSAddOptions,
  msgOptions: ParseRSSFeedAndSaveToDatabaseOptions
) => {
  await activeMQArtemisService.initialize();

  try {
    const message: MQFeedMessage = {
      url: options.feedUrl,
      podcast_index_id: options.podcast_index_id,
      options: msgOptions,
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
