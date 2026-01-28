import { MQ_QUEUES } from '@podverse/helpers';
import { parseRSSFeedAndSaveToDatabase } from '@podverse/parser';
import { MQQueueName, ActiveMQArtemisService } from '@queue/services/activeMQArtemis';
import { mqRSSAdd } from './add';

export const mqRSSRunParser = async (
  activeMQArtemisService: ActiveMQArtemisService,
  queueName: MQQueueName
) => {
  await activeMQArtemisService.initialize();

  await activeMQArtemisService.consumeMessages(queueName, async (context, receiver) => {
    try {
      const bodyStr = (context.message?.body as string) ?? '';
      const receivedMessage = JSON.parse(bodyStr);

      const { url, podcast_index_id, options } = receivedMessage;
      if (url || podcast_index_id) {
        const result = await parseRSSFeedAndSaveToDatabase(url, podcast_index_id, options);

        if (
          result &&
          Array.isArray(result.remoteItemsToParse) &&
          result.remoteItemsToParse.length > 0
        ) {
          const mqConfig = MQ_QUEUES['rss-slow'];
          for (const item of result.remoteItemsToParse) {
            try {
              await mqRSSAdd(
                activeMQArtemisService,
                {
                  queueName: mqConfig.queueName,
                  dedupeCacheTimeMS: mqConfig.dedupeCacheTimeMS,
                  priority: mqConfig.priority,
                  closeAfterSend: false,
                  feedUrl: item.url,
                  podcast_index_id: item.podcast_index_id,
                },
                item.options
              );
            } catch (err) {
              console.error('Error enqueueing remote item', err as Error);
            }
          }
        }
        context.delivery?.accept();
        receiver.add_credit(1);
      } else {
        throw new Error(`mqRSSRunParser: url or podcast_index_id not found in message ${bodyStr}`);
      }
    } catch (error) {
      console.error('Error processing message', error as Error);
      context.delivery?.reject({
        condition: 'podverse:processing-error',
        description: (error as Error).message,
      });
      receiver.add_credit(1);
    }
  });
};
