import { FeedObject } from 'podverse-partytime';
import {
  AppDataSourceReadWrite,
  Channel,
  ChannelService,
  ChannelSeasonIndex,
  EntityManager,
} from '@podverse/orm';
import { compatChannelDto } from '@parser/lib/compat/partytime/channel';
import { handleParsedChannelAbout } from '@parser/lib/rss/channel/channelAbout';
import { handleParsedChannelCategory } from '@parser/lib/rss/channel/channelCategory';
import { handleParsedChannelChat } from '@parser/lib/rss/channel/channelChat';
import { handleParsedChannelDescription } from '@parser/lib/rss/channel/channelDescription';
import { handleParsedChannelFunding } from '@parser/lib/rss/channel/channelFunding';
import { handleParsedChannelImage } from '@parser/lib/rss/channel/channelImage';
import { handleParsedChannelLicense } from '@parser/lib/rss/channel/channelLicense';
import { handleParsedChannelLocation } from '@parser/lib/rss/channel/channelLocation';
import { handleParsedChannelPerson } from '@parser/lib/rss/channel/channelPerson';
import { handleParsedChannelPodroll } from '@parser/lib/rss/channel/channelPodroll';
import { handleParsedChannelPublisher } from '@parser/lib/rss/channel/channelPublisher';
import { handleParsedChannelRemoteItem } from '@parser/lib/rss/channel/channelRemoteItem';
import { handleParsedChannelSocialInteract } from '@parser/lib/rss/channel/channelSocialInteract';
import { handleParsedChannelTrailer } from '@parser/lib/rss/channel/channelTrailer';
import { handleParsedChannelTxt } from '@parser/lib/rss/channel/channelTxt';
import { handleParsedChannelValue } from '@parser/lib/rss/channel/channelValue';
import { timerManager } from '@parser/factories/timerManager';

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
