import { getMediumIdArrayFromType, MediumEnum, QueryParamsMedium } from '@podverse/helpers';
import {
  FindManyOptions,
  FindOptionsRelations,
  FindOptionsWhere,
  In,
  Repository,
  Equal,
} from 'typeorm';
import { Channel } from '@orm/entities/channel/channel';
import { Feed } from '@orm/entities/feed/feed';
import { applyProperties } from '@orm/lib/applyProperties';
import { AppDataSourceRead, AppDataSourceReadWrite } from '@orm/db';
import { ChannelCategoryService } from './channelCategory';
import { ChannelFundingService } from './channelFunding';
import { ChannelImageService } from './channelImage';
import { ChannelPersonService } from './channelPerson';
import { ChannelRemoteItemService } from './channelRemoteItem';
import { ChannelSeasonService } from './channelSeason';
import { ChannelSocialInteractService } from './channelSocialInteract';
import { ChannelTrailerService } from './channelTrailer';
import { ChannelTxtService } from './channelTxt';
import { ChannelValueService } from './channelValue';
import { ChannelValueRecipientService } from './channelValueRecipient';
import { FeedFlagStatusStatusEnum } from '@orm/entities/feed/feedFlagStatus';

type ChannelDto = {
  slug?: string | null;
  podcast_guid?: string | null;
  title?: string | null;
  sortable_title?: string | null;
  medium_id: MediumEnum;
  has_podcast_index_value?: boolean;
  has_value_time_splits?: boolean;
};

export const channelGetManyRelations = [
  'channel_about',
  'channel_categories',
  'channel_chat',
  'channel_description',
  'channel_images',
  'channel_internal_settings',
  'channel_license',
  'channel_location',
  'channel_persons',
];

export type SubChannelGetManyRelations =
  | 'channel'
  | 'channel.channel_about'
  | 'channel.channel_categories'
  | 'channel.channel_chat'
  | 'channel.channel_description'
  | 'channel.channel_images'
  | 'channel.channel_internal_settings'
  | 'channel.channel_license'
  | 'channel.channel_location'
  | 'channel.channel_persons';

export const subChannelGetManyRelations: SubChannelGetManyRelations[] = [
  'channel',
  'channel.channel_about',
  'channel.channel_categories',
  'channel.channel_chat',
  'channel.channel_description',
  'channel.channel_images',
  'channel.channel_internal_settings',
  'channel.channel_license',
  'channel.channel_location',
  'channel.channel_persons',
];

export const channelGetOneRelations: FindOptionsRelations<Channel> = {
  channel_about: true,
  channel_categories: true,
  channel_chat: true,
  channel_description: true,
  channel_fundings: true,
  channel_images: true,
  channel_internal_settings: true,
  channel_license: true,
  channel_location: true,
  channel_persons: true,
  channel_podroll: true,
  channel_publisher: true,
  channel_remote_items: true,
  channel_seasons: true,
  channel_social_interacts: true,
  channel_trailers: true,
  channel_txts: true,
  channel_values: true,
  feed: true,
};

const getChannelOneToOneRelations = (relations: FindOptionsRelations<Channel>) => {
  const oneToOneRelations: FindOptionsRelations<Channel> = {
    ...(relations.channel_about ? { channel_about: { itunes_type: true } } : {}),
    ...(relations.channel_chat ? { channel_chat: true } : {}),
    ...(relations.channel_description ? { channel_description: true } : {}),
    ...(relations.channel_internal_settings ? { channel_internal_settings: true } : {}),
    ...(relations.channel_license ? { channel_license: true } : {}),
    ...(relations.channel_location ? { channel_location: true } : {}),
    ...(relations.channel_podroll
      ? { channel_podroll: { channel_podroll_remote_items: true } }
      : {}),
    ...(relations.channel_publisher
      ? { channel_publisher: { channel_publisher_remote_items: true } }
      : {}),
  };

  return oneToOneRelations;
};

export type IChannelService = ChannelService;

export class ChannelService {
  protected repositoryRead: Repository<Channel>;
  protected repositoryReadWrite: Repository<Channel>;
  protected feedRepositoryRead: Repository<Feed>;

  constructor() {
    this.repositoryRead = AppDataSourceRead.getRepository(Channel);
    this.repositoryReadWrite = AppDataSourceReadWrite.getRepository(Channel);
    this.feedRepositoryRead = AppDataSourceRead.getRepository(Feed);
  }

  async getChannelWithRelations(
    where: FindOptionsWhere<Channel>,
    relations: FindOptionsRelations<Channel>
  ): Promise<Channel | null> {
    const oneToOneRelations = getChannelOneToOneRelations(relations);

    const channels = await this.repositoryRead.find({
      where,
      relations: oneToOneRelations,
    });

    const channel = channels.length > 0 ? channels[0] : null;

    if (!channel) {
      return null;
    }

    if (relations.channel_categories) {
      const channelCategoryService = new ChannelCategoryService();
      const channel_categories = await channelCategoryService._getAll(channel, {
        relations: { category: true },
      });
      channel.channel_categories = channel_categories;
    }

    if (relations.channel_fundings) {
      const channelFundingService = new ChannelFundingService();
      const channel_fundings = await channelFundingService._getAll(channel);
      channel.channel_fundings = channel_fundings;
    }

    if (relations.channel_images) {
      const channelImageService = new ChannelImageService();
      const channel_images = await channelImageService._getAll(channel);
      channel.channel_images = channel_images;
    }

    if (relations.channel_persons) {
      const channelPersonService = new ChannelPersonService();
      const channel_persons = await channelPersonService._getAll(channel);
      channel.channel_persons = channel_persons;
    }

    if (relations.channel_remote_items) {
      const channelRemoteItemService = new ChannelRemoteItemService();
      const channel_remote_items = await channelRemoteItemService._getAll(channel);
      channel.channel_remote_items = channel_remote_items;
    }

    if (relations.channel_seasons) {
      const channelSeasonService = new ChannelSeasonService();
      const channel_seasons = await channelSeasonService._getAll(channel);
      channel.channel_seasons = channel_seasons;
    }

    if (relations.channel_social_interacts) {
      const channelSocialInteractService = new ChannelSocialInteractService();
      const channel_social_interacts = await channelSocialInteractService._getAll(channel);
      channel.channel_social_interacts = channel_social_interacts;
    }

    if (relations.channel_trailers) {
      const channelTrailerService = new ChannelTrailerService();
      const channel_trailers = await channelTrailerService._getAll(channel);
      channel.channel_trailers = channel_trailers;
    }

    if (relations.channel_txts) {
      const channelTxtService = new ChannelTxtService();
      const channel_txts = await channelTxtService._getAll(channel);
      channel.channel_txts = channel_txts;
    }

    if (relations.channel_values) {
      const channelValueService = new ChannelValueService();
      const channel_values = await channelValueService._getAll(channel);

      for (const channel_value of channel_values) {
        const channelValueRecipientsService = new ChannelValueRecipientService();
        const channel_value_recipients = await channelValueRecipientsService._getAll(channel_value);
        if (channel_value_recipients) {
          channel_value.channel_value_recipients = channel_value_recipients;
        }
      }

      if (channel_values) {
        channel.channel_values = channel_values;
      }
    }

    if (relations.feed) {
      // can't use Feed service here because of circular dependency
      const feed = await this.feedRepositoryRead.findOne({
        where: { id: Equal(channel.feed_id) },
      });
      if (feed) {
        channel.feed = feed;
      }
    }

    return channel;
  }

  async get(id: number, relations: FindOptionsRelations<Channel> = {}): Promise<Channel | null> {
    if (!id) {
      return null;
    }
    return this.getChannelWithRelations({ id }, relations);
  }

  async getByIdText(
    id_text: string,
    relations: FindOptionsRelations<Channel> = {}
  ): Promise<Channel | null> {
    if (!id_text) {
      return null;
    }
    return this.getChannelWithRelations({ id_text }, relations);
  }

  async getByIdOrIdText(
    idOrIdText: string,
    relations: FindOptionsRelations<Channel> = {}
  ): Promise<Channel | null> {
    let channel = null;

    if (isNaN(Number(idOrIdText))) {
      channel = await this.getByIdText(idOrIdText, relations);
    } else {
      const id = parseInt(idOrIdText);
      channel = await this.get(id, relations);
    }

    return channel;
  }

  async getByPodcastIndexId(
    podcast_index_id: number,
    relations: FindOptionsRelations<Channel> = {}
  ) {
    return this.repositoryRead.findOne({
      where: { feed: { podcast_index_id } },
      relations,
    }) as unknown as Promise<Channel | null>;
  }

  async getMany(
    config: FindManyOptions<Channel>,
    mediumType: QueryParamsMedium,
    category_id: number | null
  ): Promise<Channel[]> {
    const medium_ids = mediumType ? getMediumIdArrayFromType(mediumType) : null;

    return this.repositoryRead.find({
      where: {
        feed: {
          feed_flag_status: In([
            FeedFlagStatusStatusEnum.Active,
            FeedFlagStatusStatusEnum.AlwaysParse,
          ]),
        },
        ...(medium_ids ? { medium_id: In(medium_ids) } : {}),
        ...(category_id ? { channel_categories: { category_id: Equal(category_id) } } : {}),
      },
      ...config,
    });
  }

  async getManyCount(config: FindManyOptions<Channel>): Promise<number> {
    return this.repositoryRead.count({
      where: {
        feed: {
          feed_flag_status: In([
            FeedFlagStatusStatusEnum.Active,
            FeedFlagStatusStatusEnum.AlwaysParse,
          ]),
        },
      },
      ...config,
    });
  }

  async getAllByPodcastGuids(
    config: FindManyOptions<Channel>,
    podcast_guids: string[]
  ): Promise<Channel[]> {
    return this.repositoryRead.find({
      where: {
        podcast_guid: In(podcast_guids),
      },
      ...config,
    });
  }

  async getOrCreateByFeed(feed: Feed): Promise<Channel> {
    let channel = await this.repositoryRead.findOne({
      where: { feed_id: feed.id },
    });

    if (!channel) {
      channel = new Channel();
      channel.feed = feed;
      channel.feed_id = feed.id;
      channel.medium_id = MediumEnum.Podcast; // default to podcast. This will be overridden after channel is parsed.
      channel.medium = MediumEnum.Podcast; // default to podcast. This will be overridden after channel is parsed.
      channel = await this.repositoryReadWrite.save(channel);
    }

    return channel;
  }

  async update(id: number, dto: ChannelDto): Promise<Channel> {
    let channel = await this.get(id);

    if (!channel) {
      channel = new Channel();
    }

    channel = applyProperties(channel, dto);

    return this.repositoryReadWrite.save(channel);
  }
}
