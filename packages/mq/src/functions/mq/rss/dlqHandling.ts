import type {
  ActiveMQArtemisService,
  MQQueueName,
} from '../../../services/activeMQArtemis/index.js';
import type { EventContext, Receiver } from 'rhea';

export type DQLMessageLogger = (logMessage: string) => void;

const processDlqMessage = (
  context: EventContext,
  queue: string,
  logger: DQLMessageLogger,
  receiver: Receiver
) => {
  try {
    const bodyRaw = context.message?.body;
    const bodyStr = typeof bodyRaw === 'string' ? bodyRaw : (bodyRaw?.toString?.() ?? '');
    const appProps = context.message?.application_properties || {};
    const annotations = context.message?.message_annotations || {};

    const failureReason =
      appProps['_AMQ_DLQ_DELIVERY_FAILURE_CAUSE'] ||
      appProps['x-opt-delivery-failure-cause'] ||
      annotations['x-opt-delivery-failure-cause'] ||
      annotations['_AMQ_DLQ_DELIVERY_FAILURE_CAUSE'] ||
      'Unknown reason';

    const logObject = {
      level: 'info',
      message: 'Processed DLQ message',
      timestamp: new Date().toISOString(),
      queue,
      body: bodyStr ? safeJson(bodyStr) : null,
      failureReason: String(failureReason),
      appProps,
      annotations,
    };

    logger(JSON.stringify(logObject));
    context.delivery?.accept();
    receiver.add_credit(1);
  } catch (error) {
    const errorObject = {
      level: 'error',
      message: 'Error processing DLQ message',
      timestamp: new Date().toISOString(),
      error: (error as Error).message,
      stack: (error as Error).stack,
      queue,
    };
    logger(JSON.stringify(errorObject));
    context.delivery?.reject({
      condition: 'dlq-processing-error',
      description: (error as Error).message,
    });
    receiver.add_credit(1);
  }
};

function safeJson(s: string) {
  try {
    return JSON.parse(s);
  } catch {
    return s;
  }
}

export const mqRSSSetupDlqConsumers = async (
  artemisService: ActiveMQArtemisService,
  logger: DQLMessageLogger
) => {
  const dlqQueues: MQQueueName[] = [
    'DLQ.rss-normal',
    'DLQ.rss-on-demand',
    'DLQ.rss-live',
    'DLQ.add-by-rss-on-demand',
    'DLQ.add-by-rss-background',
  ];

  for (let i = 0; i < 10; i++) {
    await artemisService.sendSampleToDLQ(
      'rss-normal',
      { url: 'https://example.com/feed.xml', podcast_index_id: 123 },
      'Manual DLQ seed for verification'
    );
    await artemisService.sendSampleToDLQ(
      'rss-on-demand',
      { url: 'https://example.com/feed.xml', podcast_index_id: 123 },
      'Manual DLQ seed for verification'
    );
    await artemisService.sendSampleToDLQ(
      'rss-live',
      { url: 'https://example.com/feed.xml', podcast_index_id: 123 },
      'Manual DLQ seed for verification'
    );
    await artemisService.sendSampleToDLQ(
      'add-by-rss-on-demand',
      { feedUrl: 'https://example.com/feed.xml', requestId: '123' },
      'Manual DLQ seed for verification'
    );
    await artemisService.sendSampleToDLQ(
      'add-by-rss-background',
      { feedUrl: 'https://example.com/feed.xml', requestId: '123' },
      'Manual DLQ seed for verification'
    );
  }

  for (const q of dlqQueues) {
    await artemisService.consumeMessages(q, (context: EventContext, receiver: Receiver) => {
      processDlqMessage(context, q, logger, receiver);
    });
  }
};
