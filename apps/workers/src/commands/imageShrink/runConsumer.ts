import { createImageShrinkProcessor } from '@workers/commands/imageShrink/batch.js';
import type { CommandLineArgs } from '@workers/commands/index.js';
import {
  getImageShrinkConfig,
  getImageShrinkStorageConfig,
  isImageShrinkEnabled,
} from '@workers/config/index.js';
import { getActiveMQArtemisService } from '@workers/factories/activeMQArtemisService.js';
import { getLoggerService } from '@workers/factories/loggerService.js';

import { isObjectLike, MQ_IMAGE_SHRINK_HINTS_CONFIG, sleep } from '@podverse/helpers';
import { createActiveMQShutdown } from '@podverse/mq';
import { ChannelImageService, ImageShrinkSourceService, ItemImageService } from '@podverse/orm';

type ImageShrinkHintMessage = {
  url: string;
  entityType: 'channel' | 'item';
  hintCreatedAt: string;
};

const HINT_FRESHNESS_MS = 24 * 60 * 60 * 1000;

const isImageShrinkHintMessage = (value: unknown): value is ImageShrinkHintMessage => {
  if (!isObjectLike(value)) {
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

export const imageShrinkRunConsumer = async (_args: CommandLineArgs) => {
  const logger = getLoggerService();

  if (!isImageShrinkEnabled()) {
    logger.info('imageShrinkRunConsumer: disabled (image shrink env vars not set)');
    return;
  }

  const processor = createImageShrinkProcessor();
  const channelImageService = new ChannelImageService();
  const itemImageService = new ItemImageService();
  const imageShrinkSourceService = new ImageShrinkSourceService();
  const imageShrinkConfig = getImageShrinkConfig();
  const imageShrinkStorageConfig = getImageShrinkStorageConfig();
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
          logger.warn('imageShrinkRunConsumer: invalid hint message');
          context.delivery?.accept();
          return;
        }

        const hintTime = Date.parse(parsed.hintCreatedAt);
        if (Number.isNaN(hintTime) || hintTime < Date.now() - HINT_FRESHNESS_MS) {
          context.delivery?.accept();
          return;
        }

        if (parsed.entityType === 'channel') {
          const processedChannelIds = new Set<number>();
          const channelImages = await channelImageService.getByUrls([parsed.url], false);
          for (const image of channelImages) {
            const channelId = image.channel?.id;
            if (!channelId) {
              continue;
            }
            processedChannelIds.add(channelId);
            await processor.processTarget({
              entityType: 'channel',
              entityId: channelId,
              url: image.url,
              hinted: true,
            });
          }
          const sourceMeta = await imageShrinkSourceService.getByUrl(parsed.url);
          if (sourceMeta) {
            const resizedMatches = await channelImageService.findResizedRowsByOriginImageUrl({
              cdnBaseUrl: imageShrinkStorageConfig.cdnBaseUrl,
              sourceUrl: parsed.url,
              widthPx: imageShrinkConfig.widthPx,
            });
            for (const image of resizedMatches) {
              const channelId = image.channel?.id;
              if (!channelId || processedChannelIds.has(channelId)) {
                continue;
              }
              processedChannelIds.add(channelId);
              await processor.processTarget({
                entityType: 'channel',
                entityId: channelId,
                url: parsed.url,
                hinted: true,
              });
            }
          }
        } else {
          const processedItemIds = new Set<number>();
          const itemImages = await itemImageService.getByUrls([parsed.url], false);
          for (const image of itemImages) {
            const itemId = image.item?.id;
            if (!itemId) {
              continue;
            }
            processedItemIds.add(itemId);
            await processor.processTarget({
              entityType: 'item',
              entityId: itemId,
              url: image.url,
              hinted: true,
            });
          }
          const sourceMeta = await imageShrinkSourceService.getByUrl(parsed.url);
          if (sourceMeta) {
            const resizedMatches = await itemImageService.findResizedRowsByOriginImageUrl({
              cdnBaseUrl: imageShrinkStorageConfig.cdnBaseUrl,
              sourceUrl: parsed.url,
              widthPx: imageShrinkConfig.widthPx,
            });
            for (const image of resizedMatches) {
              const itemId = image.item?.id;
              if (!itemId || processedItemIds.has(itemId)) {
                continue;
              }
              processedItemIds.add(itemId);
              await processor.processTarget({
                entityType: 'item',
                entityId: itemId,
                url: parsed.url,
                hinted: true,
              });
            }
          }
        }

        context.delivery?.accept();
      } catch (error) {
        const err = error instanceof Error ? error : new Error('Unknown image shrink error');
        logger.logError('imageShrinkRunConsumer: error processing hint', err);
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
