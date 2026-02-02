import type { FeedObject } from 'podverse-partytime';
import type { Channel, ChannelSeasonIndex, EntityManager } from '@podverse/orm';
import { AppDataSourceReadWrite, ChannelService } from '@podverse/orm';
import { compatChannelDto } from '@parser/lib/compat/partytime/channel.js';
import { handleParsedChannelAbout } from '@parser/lib/rss/channel/channelAbout.js';
import { handleParsedChannelCategory } from '@parser/lib/rss/channel/channelCategory.js';
import { handleParsedChannelChat } from '@parser/lib/rss/channel/channelChat.js';
import { handleParsedChannelDescription } from '@parser/lib/rss/channel/channelDescription.js';
import { handleParsedChannelFunding } from '@parser/lib/rss/channel/channelFunding.js';
import { handleParsedChannelImage } from '@parser/lib/rss/channel/channelImage.js';
import { handleParsedChannelLicense } from '@parser/lib/rss/channel/channelLicense.js';
import { handleParsedChannelLocation } from '@parser/lib/rss/channel/channelLocation.js';
import { handleParsedChannelPerson } from '@parser/lib/rss/channel/channelPerson.js';
import { handleParsedChannelPodroll } from '@parser/lib/rss/channel/channelPodroll.js';
import { handleParsedChannelPublisher } from '@parser/lib/rss/channel/channelPublisher.js';
import { handleParsedChannelRemoteItem } from '@parser/lib/rss/channel/channelRemoteItem.js';
import { handleParsedChannelSocialInteract } from '@parser/lib/rss/channel/channelSocialInteract.js';
import { handleParsedChannelTrailer } from '@parser/lib/rss/channel/channelTrailer.js';
import { handleParsedChannelTxt } from '@parser/lib/rss/channel/channelTxt.js';
import { handleParsedChannelValue } from '@parser/lib/rss/channel/channelValue.js';
import { timerManager } from '@parser/factories/timerManager.js';

export const handleParsedChannel = async (
  parsedFeed: FeedObject,
  channel: Channel,
  channelSeasonIndex: ChannelSeasonIndex
) => {
  timerManager.start('handleParsedChannel');

  const channelService = new ChannelService();
  const channelDto = compatChannelDto(parsedFeed);
  await channelService.update(channel.id, channelDto);

  if (timerManager.shouldLogTimer) {
    await handleParsingTables(parsedFeed, channel, channelSeasonIndex);
  } else {
    await AppDataSourceReadWrite.manager.transaction(async (transactionalEntityManager) => {
      await handleParsingTables(
        parsedFeed,
        channel,
        channelSeasonIndex,
        transactionalEntityManager
      );
    });
  }

  timerManager.end('handleParsedChannel');
};

const handleParsingTables = async (
  parsedFeed: FeedObject,
  channel: Channel,
  channelSeasonIndex: ChannelSeasonIndex,
  transactionalEntityManager?: EntityManager
) => {
  await handleParsedChannelAbout(parsedFeed, channel, transactionalEntityManager);
  await handleParsedChannelCategory(parsedFeed, channel, transactionalEntityManager);
  await handleParsedChannelChat(parsedFeed, channel, transactionalEntityManager);
  await handleParsedChannelDescription(parsedFeed, channel, transactionalEntityManager);
  await handleParsedChannelFunding(parsedFeed, channel, transactionalEntityManager);
  await handleParsedChannelImage(parsedFeed, channel, transactionalEntityManager);
  await handleParsedChannelLicense(parsedFeed, channel, transactionalEntityManager);
  await handleParsedChannelLocation(parsedFeed, channel, transactionalEntityManager);
  await handleParsedChannelPerson(parsedFeed, channel, transactionalEntityManager);
  await handleParsedChannelPodroll(parsedFeed, channel, transactionalEntityManager);
  await handleParsedChannelPublisher(parsedFeed, channel, transactionalEntityManager);
  await handleParsedChannelRemoteItem(parsedFeed, channel, transactionalEntityManager);
  await handleParsedChannelSocialInteract(parsedFeed, channel, transactionalEntityManager);
  await handleParsedChannelTrailer(
    parsedFeed,
    channel,
    channelSeasonIndex,
    transactionalEntityManager
  );
  await handleParsedChannelTxt(parsedFeed, channel, transactionalEntityManager);
  await handleParsedChannelValue(parsedFeed, channel, transactionalEntityManager);
};
