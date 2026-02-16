import type { CommandLineArgs } from '@workers/commands/index.js';
import { createImageShrinkProcessor } from '@workers/commands/imageShrink/batch.js';
import { getActiveMQArtemisService } from '@workers/factories/activeMQArtemisService.js';
import { getLoggerService } from '@workers/factories/loggerService.js';
import { isImageShrinkEnabled } from '@workers/config/index.js';
import { MQ_IMAGE_SHRINK_HINTS_CONFIG, sleep } from '@podverse/helpers';
import { ChannelImageService, ItemImageService } from '@podverse/orm';
import { createActiveMQShutdown } from '@podverse/mq';

type ImageShrinkHintMessage = {
  url: string;
  entityType: 'channel' | 'item';
  hintCreatedAt: string;
};

const HINT_FRESHNESS_MS = 24 * 60 * 60 * 1000;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isImageShrinkHintMessage = (value: unknown): value is ImageShrinkHintMessage => {
  if (!isRecord(value)) {
    return false;
  }
  const url = value.url;
  const entityType = value.entityType;
  const hintCreatedAt = value.hintCreatedAt;
  return (
    typeof url === 'string' &&
    (entityType === 'channel' || entityType === 'item') &&
    typeof hintCreatedAt === 'string'
  );
};

export const mqImageShrinkRunConsumer = async (_args: CommandLineArgs) => {
  const logger = getLoggerService();

  if (!isImageShrinkEnabled()) {
    logger.info('mqImageShrinkRunConsumer: disabled (image shrink env vars not set)');
    return;
  }

  const processor = createImageShrinkProcessor();
  const channelImageService = new ChannelImageService();
  const itemImageService = new ItemImageService();
  const activeMQArtemisService = getActiveMQArtemisService();
  await activeMQArtemisService.initialize();

  let keepRunning = true;
  const { unregister } = createActiveMQShutdown(activeMQArtemisService, console, () => {
    keepRunning = false;
  });

  await activeMQArtemisService.consumeMessages(
    MQ_IMAGE_SHRINK_HINTS_CONFIG.queueName,
    async (context, receiver) => {
      try {
        const body = context.message?.body;
        const bodyStr = typeof body === 'string' ? body : '';
        const parsed: unknown = JSON.parse(bodyStr);
        if (!isImageShrinkHintMessage(parsed)) {
          logger.warn('mqImageShrinkRunConsumer: invalid hint message');
          context.delivery?.accept();
          return;
        }

        const hintTime = Date.parse(parsed.hintCreatedAt);
        if (Number.isNaN(hintTime) || hintTime < Date.now() - HINT_FRESHNESS_MS) {
          context.delivery?.accept();
          return;
        }

        if (parsed.entityType === 'channel') {
          const channelImages = await channelImageService.getByUrls([parsed.url], false);
          for (const image of channelImages) {
            const channelId = image.channel?.id;
            if (!channelId) {
              continue;
            }
            await processor.processTarget({
              entityType: 'channel',
              entityId: channelId,
              url: image.url,
              hinted: true,
            });
          }
        } else {
          const itemImages = await itemImageService.getByUrls([parsed.url], false);
          for (const image of itemImages) {
            const itemId = image.item?.id;
            if (!itemId) {
              continue;
            }
            await processor.processTarget({
              entityType: 'item',
              entityId: itemId,
              url: image.url,
              hinted: true,
            });
          }
        }

        context.delivery?.accept();
      } catch (error) {
        const err = error instanceof Error ? error : new Error('Unknown image shrink error');
        logger.logError('mqImageShrinkRunConsumer: error processing hint', err);
        context.delivery?.reject();
      } finally {
        receiver.add_credit(1);
      }
    }
  );

  while (keepRunning) {
    await sleep(1000);
  }

  unregister();
  await processor.pruneSources();
  await activeMQArtemisService.close();
};
