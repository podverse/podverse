import type { FeedObject } from 'podverse-partytime';
import type { Channel, EntityManager } from '@podverse/orm';
import { ChannelLicenseService } from '@podverse/orm';
import { compatChannelLicenseDto } from '@podverse/parser-mapping';
import { handleParsedOneData } from '../base/handleParsedOneData.js';
import { timerManager } from '@parser/factories/timerManager.js';

export const handleParsedChannelLicense = async (
  parsedFeed: FeedObject,
  channel: Channel,
  transactionalEntityManager?: EntityManager
) => {
  timerManager.start('handleParsedChannelLicense');
  const channelLicenseService = new ChannelLicenseService(transactionalEntityManager);
  const channelLicenseDtos = compatChannelLicenseDto(parsedFeed);
  await handleParsedOneData(channel, channelLicenseService, channelLicenseDtos);
  timerManager.end('handleParsedChannelLicense');
};
