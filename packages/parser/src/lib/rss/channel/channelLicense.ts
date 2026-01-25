import { FeedObject } from 'podverse-partytime';
import { Channel, ChannelLicenseService, EntityManager } from '@podverse/orm';
import { compatChannelLicenseDto } from '@parser/lib/compat/partytime/channel';
import { handleParsedOneData } from '../base/handleParsedOneData';
import { timerManager } from '@parser/factories/timerManager';

export const handleParsedChannelLicense = async (
  parsedFeed: FeedObject,
  channel: Channel,
  transactionalEntityManager?: EntityManager,
) => {
  timerManager.start('handleParsedChannelLicense');
  const channelLicenseService = new ChannelLicenseService(transactionalEntityManager);
  const channelLicenseDtos = compatChannelLicenseDto(parsedFeed);
  await handleParsedOneData(channel, channelLicenseService, channelLicenseDtos);
  timerManager.end('handleParsedChannelLicense');
};
