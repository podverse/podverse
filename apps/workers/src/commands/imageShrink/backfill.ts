import type { CommandLineArgs } from '@workers/commands/index.js';
import { getImageShrinkConfig, isImageShrinkEnabled } from '@workers/config/index.js';
import { getActiveMQArtemisService } from '@workers/factories/activeMQArtemisService.js';
import { getLoggerService } from '@workers/factories/loggerService.js';

import { MQ_IMAGE_SHRINK_HINTS_CONFIG } from '@podverse/helpers';
import { mqImageShrinkHintAdd } from '@podverse/mq';
import { ChannelImageService, ItemImageService } from '@podverse/orm';

export const imageShrinkBackfill = async (_args: CommandLineArgs) => {
  const logger = getLoggerService();

  if (!isImageShrinkEnabled()) {
    logger.info('imageShrinkBackfill: disabled (image shrink env vars not set)');
    return;
  }

  const imageShrinkConfig = getImageShrinkConfig();
  const batchSize = imageShrinkConfig.batchSize;
  const channelImageService = new ChannelImageService();
  const itemImageService = new ItemImageService();

  const channelImages = await channelImageService.getUnresizedImages(batchSize);
  const remaining = Math.max(0, batchSize - channelImages.length);
  const itemImages = remaining > 0 ? await itemImageService.getUnresizedImages(remaining) : [];

  const channelUrls = new Set<string>();
  for (const image of channelImages) {
    channelUrls.add(image.url);
  }

  const itemUrls = new Set<string>();
  for (const image of itemImages) {
    itemUrls.add(image.url);
  }

  const totalHints = channelUrls.size + itemUrls.size;
  if (totalHints === 0) {
    logger.info('imageShrinkBackfill: no unresized images found');
    return;
  }

  const activeMQArtemisService = getActiveMQArtemisService();
  await activeMQArtemisService.initialize();

  let sent = 0;
  const hintCreatedAt = new Date().toISOString();

  for (const url of channelUrls) {
    sent += 1;
    await mqImageShrinkHintAdd(
      activeMQArtemisService,
      {
        ...MQ_IMAGE_SHRINK_HINTS_CONFIG,
        closeAfterSend: sent === totalHints,
      },
      {
        url,
        entityType: 'channel',
        hintCreatedAt,
      }
    );
  }

  for (const url of itemUrls) {
    sent += 1;
    await mqImageShrinkHintAdd(
      activeMQArtemisService,
      {
        ...MQ_IMAGE_SHRINK_HINTS_CONFIG,
        closeAfterSend: sent === totalHints,
      },
      {
        url,
        entityType: 'item',
        hintCreatedAt,
      }
    );
  }

  logger.info(`imageShrinkBackfill: queued ${totalHints} hints`);
};
