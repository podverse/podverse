import { getMediumIdArrayFromType, PAGINATION, QueryParamsMedium } from '@podverse/helpers';
import { FindManyOptions, FindOptionsRelations, FindOptionsWhere,
  In, IsNull, Not, Repository, MoreThan, LessThan, 
  Equal, Brackets} from 'typeorm';
import { Channel } from '@orm/entities/channel/channel';
import { Item } from '@orm/entities/item/item';
import { applyProperties } from '@orm/lib/applyProperties';
import { AppDataSourceRead, AppDataSourceReadWrite } from '@orm/db';
import { ItemChaptersFeedService } from './itemChaptersFeed';
import { ItemEnclosureService } from './itemEnclosure';
import { ItemContentLinkService } from './itemContentLink';
import { ItemFundingService } from './itemFunding';
import { ItemImageService } from './itemImage';
import { ItemPersonService } from './itemPerson';
import { ItemSocialInteractService } from './itemSocialInteract';
import { ItemSoundbiteService } from './itemSoundbite';
import { ItemTranscriptService } from './itemTranscript';
import { ItemTxtService } from './itemTxt';
import { ItemValueService } from './itemValue';
import { ItemValueRecipientService } from './itemValueRecipient';
import { ItemValueTimeSplitService } from './itemValueTimeSplit';
import { ItemValueTimeSplitRecipientService } from './itemValueTimeSplitRecipient';
import { ItemValueTimeSplitRemoteItemService } from './itemValueTimeSplitRemoteItem';
import { ItemValueTimeSplit } from '@orm/entities/item/itemValueTimeSplit';
import { ItemFlagStatusService } from './itemFlagStatus';
import { ItemFlagStatusStatusEnum } from '@orm/entities/item/itemFlagStatus';
import { getLiveItemStatusEnumValue } from '@orm/entities/liveItem/liveItemStatus';

type ItemDto = {
  title: string | null
  pub_date: Date | null
  guid: string | null
  guid_enclosure_url: string | null
}

type ItemGetByDto = {
  guid: string | null
  guid_enclosure_url: string | null
}

const itemQueueListRelations = [
  'item_about',
  'item_enclosures', 'item_enclosures.item_enclosure_sources',
  'item_images',
  'channel', 'channel.channel_images',
];

export class ItemService {
  protected repositoryRead: Repository<Item>;
  protected repositoryReadWrite: Repository<Item>;

  constructor() {
    this.repositoryRead = AppDataSourceRead.getRepository(Item);
    this.repositoryReadWrite = AppDataSourceReadWrite.getRepository(Item);
  }

  async getItemWithRelations(
    where: FindOptionsWhere<Item>,
    relations: FindOptionsRelations<Item>,
  ): Promise<Item | null> {
    const oneToOneRelations = getItemOneToOneRelations(relations);

    const item = await this.repositoryRead.findOne({
      where,
      relations: oneToOneRelations,
    });

    if (!item) {
      return null;
    }

    if (relations.item_chapters_feed) {
      const itemChaptersFeedService = new ItemChaptersFeedService();
      const item_chapters_feed = await itemChaptersFeedService._get(item, {
        relations: ['item_chapters_feed_log'],
      });
      if (item_chapters_feed) {item.item_chapters_feed = item_chapters_feed;}
    }

    if (relations.item_content_links) {
      const itemContentLinkService = new ItemContentLinkService();
      const item_content_links = await itemContentLinkService._getAll(item);
      if (item_content_links) {item.item_content_links = item_content_links;}
    }

    if (relations.item_enclosures) {
      const itemEnclosureService = new ItemEnclosureService();
      const item_enclosures = await itemEnclosureService._getAll(item, {
        relations: ['item_enclosure_integrity', 'item_enclosure_sources'],
      });
      if (item_enclosures) {item.item_enclosures = item_enclosures;}
    }

    if (relations.item_fundings) {
      const itemFundingService = new ItemFundingService();
      const item_fundings = await itemFundingService._getAll(item);
      if (item_fundings) {item.item_fundings = item_fundings;}
    }

    if (relations.item_images) {
      const itemImageService = new ItemImageService();
      const item_images = await itemImageService._getAll(item);
      if (item_images) {item.item_images = item_images;}
    }

    if (relations.item_persons) {
      const itemPersonService = new ItemPersonService();
      const item_persons = await itemPersonService._getAll(item);
      if (item_persons) {item.item_persons = item_persons;}
    }

    if (relations.item_social_interacts) {
      const itemSocialInteractService = new ItemSocialInteractService();
      const item_social_interacts = await itemSocialInteractService._getAll(item);
      if (item_social_interacts) {item.item_social_interacts = item_social_interacts;}
    }

    if (relations.item_soundbites) {
      const itemSoundbiteService = new ItemSoundbiteService();
      const item_soundbites = await itemSoundbiteService._getAll(item);
      item.item_soundbites = item_soundbites;
    }

    if (relations.item_transcripts) {
      const itemTranscriptService = new ItemTranscriptService();
      const item_transcripts = await itemTranscriptService._getAll(item);
      if (item_transcripts) {item.item_transcripts = item_transcripts;}
    }

    if (relations.item_txts) {
      const itemTxtService = new ItemTxtService();
      const item_txts = await itemTxtService._getAll(item);
      if (item_txts) {item.item_txts = item_txts;}
    }

    if (relations.item_values) {
      const itemValueService = new ItemValueService();
      const item_values = await itemValueService._getAll(item);

      for (const item_value of item_values) {
        const itemValueRecipientsService = new ItemValueRecipientService();
        const item_value_recipients = await itemValueRecipientsService._getAll(item_value);
        if (item_value_recipients) {
          item_value.item_value_recipients = item_value_recipients;
        };

        const itemValueTimeSplitService = new ItemValueTimeSplitService();
        const item_value_time_splits = await itemValueTimeSplitService._getAll(item_value);

        const final_item_value_time_splits: ItemValueTimeSplit[] = [];
        for (const item_value_time_split of item_value_time_splits) {
          const itemValueTimeSplitRecipientsService = new ItemValueTimeSplitRecipientService();
          const item_value_time_split_recipients = await itemValueTimeSplitRecipientsService._getAll(item_value_time_split);
          if (item_value_time_split_recipients) {
            item_value_time_split.item_value_time_split_recipients = item_value_time_split_recipients;
          }

          const itemValueTimeSplitRemoteItemService = new ItemValueTimeSplitRemoteItemService();
          const item_value_time_split_remote_items = await itemValueTimeSplitRemoteItemService._getAll(item_value_time_split);
          if (item_value_time_split_remote_items?.[0]) {
            item_value_time_split.item_value_time_split_remote_item = item_value_time_split_remote_items[0];
          }
          final_item_value_time_splits.push(item_value_time_split);
        }

        if (final_item_value_time_splits) {
          item_value.item_value_time_splits = final_item_value_time_splits;
        }
      }

      if (item_values) {item.item_values = item_values;}
    }

    return item;
  }

  async get(id: number, relations: FindOptionsRelations<Item> = {}): Promise<Item | null> {
    if (!id) {
      return null;
    }

    return this.getItemWithRelations({ id }, relations);
  }

  async getByIdText(id_text: string, relations: FindOptionsRelations<Item> = {}): Promise<Item | null> {
    if (!id_text) {
      return null;
    }

    return this.getItemWithRelations({ id_text }, relations);
  }

  async getByIdOrIdText(idOrIdText: string, relations: FindOptionsRelations<Item> = {}): Promise<Item | null> {
    let item = null;

    if (isNaN(Number(idOrIdText))) {
      item = await this.getByIdText(idOrIdText, relations);
    } else {
      const id = parseInt(idOrIdText);
      item = await this.get(id, relations);
    }

    return item;
  }

  async getRandomItem(medium_id: number): Promise<Item | null> {
    const query = this.repositoryRead.createQueryBuilder('item')
      .innerJoin('item.channel', 'channel');

    const items = await query
      .where('channel.medium_id = :medium_id', { medium_id })
      .orderBy('RANDOM()')
      .limit(1)
      .getMany();

    return items[0] || null;
  }

  async getMany(
    config: FindManyOptions<Item>,
    mediumType: QueryParamsMedium | null,
    category_id: number | null,
    itemType: 'normal' | 'live-item',
    liveItemType: 'pending' | 'live' | 'ended' | null,
  ): Promise<Item[]> {
    const medium_ids = mediumType ? getMediumIdArrayFromType(mediumType) : null;
    const live_item_status_id = getLiveItemStatusEnumValue(liveItemType);
    
    return this.repositoryRead.find({
      ...config,
      where: {
        channel: {
          feed: {
            feed_flag_status: In([1, 2]),
          },
          ...(medium_ids ? { medium_id: In(medium_ids) } : {}),
          ...(category_id ? { channel_categories: { category_id: Equal(category_id) } } : {}),
        },
        item_flag_status: {
          id: ItemFlagStatusStatusEnum.Active,
        },
        live_item: {
          id: itemType === 'live-item' ? Not(IsNull()) : IsNull(),
          ...(live_item_status_id ? { live_item_status_id: Equal(live_item_status_id) } : {}),
        },
      },
    });
  }

  async getManyByPodcastGuidAndItemGuid(params: { podcast_guid: string, item_guid: string }[], options?: FindManyOptions<Item>): Promise<Item[]> {
    if (!params.length) {return [];}

    const where = params.map(param => ({
      guid: param.item_guid,
      channel: {
        podcast_guid: param.podcast_guid,
      },
      item_flag_status: {
        id: ItemFlagStatusStatusEnum.Active,
      },
    }));

    return this.repositoryRead.find({
      where,
      ...options,
    });
  }

  async getBy(channel: Channel, dto: ItemGetByDto): Promise<Item | null> {
    let item = null;

    if (dto.guid) {
      item = await this.getByGuid(channel, dto.guid);
    }
    
    if (!item && dto.guid_enclosure_url) {
      item = await this.getByEnclosureUrl(channel, dto.guid_enclosure_url);
    }

    return item;
  }

  async getByGuid(channel: Channel, guid: string): Promise<Item | null> {
    return this.repositoryRead.findOne({
      where: {
        channel,
        guid,
      },
    });
  }

  async getByEnclosureUrl(channel: Channel, guid_enclosure_url: string): Promise<Item | null> {
    return this.repositoryRead.findOne({
      where: {
        channel,
        guid_enclosure_url,
      },
    });
  }

  async getManyByGuid(channel: Channel, guids: string[], options?: FindManyOptions<Item>): Promise<Item[]> {
    return this.repositoryRead.find({
      where: {
        channel,
        guid: In(guids),
        item_flag_status: {
          id: ItemFlagStatusStatusEnum.Active,
        },
      },
      ...options,
    });
  }

  async getManyByGuidEnclosureUrl(channel: Channel, guidEnclosureUrls: string[], options?: FindManyOptions<Item>): Promise<Item[]> {
    return this.repositoryRead.find({
      where: {
        channel,
        guid_enclosure_url: In(guidEnclosureUrls),
        item_flag_status: {
          id: ItemFlagStatusStatusEnum.Active,
        },
      },
      ...options,
    });
  }

  async getManyByChannel(channel: Channel, options?: FindManyOptions<Item>): Promise<Item[]> {
    return this.repositoryRead.find({
      where: {
        channel,
        live_item: {
          id: IsNull(),
        },
        item_flag_status: {
          id: ItemFlagStatusStatusEnum.Active,
        },
      },
      ...options,
    });
  }

  async getManyForQueueByPubDate(
    item_id_text: string,
    order: 'forward' | 'backward',
  ): Promise<Item[]> {
    const item = await this.repositoryRead.findOne({
      where: { id_text: item_id_text },
      relations: { channel: true },
    });

    if (!item || !item.channel || !item.pub_date) {
      return [];
    }

    const pubDateOperator =
      order === 'forward'
        ? MoreThan(item.pub_date)
        : LessThan(item.pub_date);

    const pubDateSort =
      order === 'forward'
        ? 'ASC'
        : 'DESC';
    
    return this.repositoryRead.find({
      where: {
        channel: item.channel,
        live_item: {
          id: IsNull(),
        },
        item_flag_status: {
          id: ItemFlagStatusStatusEnum.Active,
        },
        pub_date: pubDateOperator,
      },
      order: {
        pub_date: pubDateSort,
      },
      take: PAGINATION.DEFAULT_LIMIT,
      relations: itemQueueListRelations,
    });
  }

  async getManyForQueueBySeason(
    item_id_text: string,
    order: 'forward' | 'backward',
  ): Promise<Item[]> {
    const item = await this.repositoryRead.findOne({
      where: { id_text: item_id_text },
      relations: {
        channel: true,
        item_season: { channel_season: true },
        item_season_episode: true,
      },
    });

    if (!item || !item.channel) {
      return [];
    }

    const currentSeasonNumber = item.item_season?.channel_season?.number ?? -1;
    const currentEpisodeNumber = item.item_season_episode?.number ?? null;
    const currentPubDate = item.pub_date ?? null;
    const LIMIT = PAGINATION.DEFAULT_LIMIT;

    // Helper function to create base query builder with all relations
    const createBaseQueryBuilder = () => {
      return this.repositoryRead.createQueryBuilder('item')
        .leftJoinAndSelect('item.item_about', 'item_about')
        .leftJoinAndSelect('item_about.item_itunes_episode_type', 'item_itunes_episode_type')
        .leftJoinAndSelect('item.item_enclosures', 'item_enclosures')
        .leftJoinAndSelect('item_enclosures.item_enclosure_sources', 'item_enclosure_sources')
        .leftJoinAndSelect('item.item_images', 'item_images')
        .leftJoinAndSelect('item.item_season', 'item_season')
        .leftJoinAndSelect('item_season.channel_season', 'cs')
        .leftJoinAndSelect('item.item_season_episode', 'item_season_episode')
        .leftJoinAndSelect('item.channel', 'channel')
        .leftJoinAndSelect('channel.channel_images', 'channel_images')
        .leftJoinAndSelect('item.live_item', 'live_item')
        .leftJoinAndSelect('item.item_flag_status', 'item_flag_status')
        .where('item.channel_id = :channel_id', { channel_id: item.channel.id })
        .andWhere('live_item.id IS NULL')
        .andWhere('item_flag_status.id = :status', { status: ItemFlagStatusStatusEnum.Active });
    };

    let finalResults: Item[] = [];

    if (currentSeasonNumber !== -1) {
      // Current item has an actual season number
      // Query for items with actual season numbers
      const seasonedQuery = createBaseQueryBuilder()
        .andWhere('cs.number IS NOT NULL');

      if (order === 'forward') {
        seasonedQuery
          .andWhere(new Brackets(qb => {
            qb.where('cs.number > :seasonNum', { seasonNum: currentSeasonNumber })
              .orWhere(
                new Brackets(qb2 => {
                  qb2.where('cs.number = :seasonNum', { seasonNum: currentSeasonNumber })
                    .andWhere('item_season_episode.number > :episodeNum', { episodeNum: currentEpisodeNumber });
                }),
              );
          }))
          .orderBy('cs.number', 'ASC')
          .addOrderBy('item_season_episode.number', 'ASC');
      } else { // backward
        seasonedQuery
          .andWhere(new Brackets(qb => {
            qb.where('cs.number < :seasonNum', { seasonNum: currentSeasonNumber })
              .orWhere(
                new Brackets(qb2 => {
                  qb2.where('cs.number = :seasonNum', { seasonNum: currentSeasonNumber })
                    .andWhere('item_season_episode.number < :episodeNum', { episodeNum: currentEpisodeNumber });
                }),
              );
          }))
          .orderBy('cs.number', 'DESC')
          .addOrderBy('item_season_episode.number', 'DESC');
      }

      seasonedQuery.limit(LIMIT);
      const seasonedResults = (await seasonedQuery.getRawAndEntities()).entities;
      finalResults = seasonedResults;

      // If we have fewer than 20 items and direction is backward, fill with -1 season items
      if (order === 'backward' && finalResults.length < LIMIT) {
        const remaining = LIMIT - finalResults.length;
        const unseasonedQuery = createBaseQueryBuilder()
          .andWhere('cs.number IS NULL')
          .andWhere('item.pub_date IS NOT NULL')
          .orderBy('item.pub_date', 'ASC')
          .limit(remaining);

        const unseasonedResults = (await unseasonedQuery.getRawAndEntities()).entities;
        finalResults = [...finalResults, ...unseasonedResults];
      }
    } else {
      // Current item does NOT have an actual season number (it's -1)
      if (order === 'forward') {
        // Query -1 items first
        const unseasonedQuery = createBaseQueryBuilder()
          .andWhere('cs.number IS NULL')
          .andWhere('item.pub_date IS NOT NULL');

        if (currentPubDate) {
          unseasonedQuery.andWhere('item.pub_date < :currentPubDate', { currentPubDate });
        }

        unseasonedQuery
          .orderBy('item.pub_date', 'DESC')
          .limit(LIMIT);

        const unseasonedResults = (await unseasonedQuery.getRawAndEntities()).entities;
        finalResults = unseasonedResults;

        // If we have fewer than 20 items, fill with actual season items
        if (finalResults.length < LIMIT) {
          const remaining = LIMIT - finalResults.length;
          const seasonedQuery = createBaseQueryBuilder()
            .andWhere('cs.number IS NOT NULL')
            .orderBy('cs.number', 'ASC')
            .addOrderBy('item_season_episode.number', 'ASC')
            .limit(remaining);

          const seasonedResults = (await seasonedQuery.getRawAndEntities()).entities;
          finalResults = [...finalResults, ...seasonedResults];
        }
      } else { // backward
        // Only query -1 items
        const unseasonedQuery = createBaseQueryBuilder()
          .andWhere('cs.number IS NULL')
          .andWhere('item.pub_date IS NOT NULL');

        if (currentPubDate) {
          unseasonedQuery.andWhere('item.pub_date > :currentPubDate', { currentPubDate });
        }

        unseasonedQuery
          .orderBy('item.pub_date', 'ASC')
          .limit(LIMIT);

        const unseasonedResults = (await unseasonedQuery.getRawAndEntities()).entities;
        finalResults = unseasonedResults;
      }
    }

    return finalResults.slice(0, LIMIT);
  }

  async getManyByChannelShuffle(
    channel: Channel,
    shuffleHash: string,
    options?: FindManyOptions<Item>,
  ): Promise<Item[]> {
    if (!channel) {
      return [];
    }

    if (!shuffleHash) {
      throw new Error('shuffleHash is required when order is "shuffle"');
    }

    const skip = options?.skip ?? 0;
    const take = options?.take ?? PAGINATION.DEFAULT_LIMIT;

    const createBaseQueryBuilder = () => {
      return this.repositoryRead.createQueryBuilder('item')
        .leftJoinAndSelect('item.item_about', 'item_about')
        .leftJoinAndSelect('item_about.item_itunes_episode_type', 'item_itunes_episode_type')
        .leftJoinAndSelect('item.item_enclosures', 'item_enclosures')
        .leftJoinAndSelect('item_enclosures.item_enclosure_sources', 'item_enclosure_sources')
        .leftJoinAndSelect('item.item_images', 'item_images')
        .leftJoinAndSelect('item.item_season', 'item_season')
        .leftJoinAndSelect('item_season.channel_season', 'cs')
        .leftJoinAndSelect('item.item_season_episode', 'item_season_episode')
        .leftJoinAndSelect('item.channel', 'channel')
        .leftJoinAndSelect('channel.channel_images', 'channel_images')
        .leftJoinAndSelect('item.live_item', 'live_item')
        .leftJoinAndSelect('item.item_flag_status', 'item_flag_status')
        .where('item.channel_id = :channel_id', { channel_id: channel.id })
        .andWhere('live_item.id IS NULL')
        .andWhere('item_flag_status.id = :status', { status: ItemFlagStatusStatusEnum.Active });
    };

    // Use a deterministic random order based on shuffleHash
    const query = createBaseQueryBuilder()
      .addSelect('MD5(item.id::text || (:shuffleHash)::text)', 'shuffle_order')
      .setParameter('shuffleHash', String(shuffleHash))
      .orderBy('shuffle_order', 'ASC')
      .skip(skip)
      .take(take);

    return (await query.getRawAndEntities()).entities;
  }

  async getManyByChannelBySeason(
    channel: Channel,
    order: 'forward' | 'backward',
    options?: FindManyOptions<Item>,
  ): Promise<Item[]> {
    if (!channel) {
      return [];
    }

    const skip = options?.skip ?? 0;
    const take = options?.take ?? PAGINATION.DEFAULT_LIMIT;

    const createBaseQueryBuilder = () => {
      return this.repositoryRead.createQueryBuilder('item')
        .leftJoinAndSelect('item.item_about', 'item_about')
        .leftJoinAndSelect('item_about.item_itunes_episode_type', 'item_itunes_episode_type')
        .leftJoinAndSelect('item.item_enclosures', 'item_enclosures')
        .leftJoinAndSelect('item_enclosures.item_enclosure_sources', 'item_enclosure_sources')
        .leftJoinAndSelect('item.item_images', 'item_images')
        .leftJoinAndSelect('item.item_season', 'item_season')
        .leftJoinAndSelect('item_season.channel_season', 'cs')
        .leftJoinAndSelect('item.item_season_episode', 'item_season_episode')
        .leftJoinAndSelect('item.channel', 'channel')
        .leftJoinAndSelect('channel.channel_images', 'channel_images')
        .leftJoinAndSelect('item.live_item', 'live_item')
        .leftJoinAndSelect('item.item_flag_status', 'item_flag_status')
        .where('item.channel_id = :channel_id', { channel_id: channel.id })
        .andWhere('live_item.id IS NULL')
        .andWhere('item_flag_status.id = :status', { status: ItemFlagStatusStatusEnum.Active });
    };

    let finalResults: Item[] = [];

    if (order === 'forward') {
      // Forward = unseasoned items first (DESC pub_date), then seasoned items (ASC season/episode)
      const unseasonedQuery = createBaseQueryBuilder()
        .andWhere('cs.number IS NULL')
        .andWhere('item.pub_date IS NOT NULL')
        .orderBy('item.pub_date', 'DESC')
        .skip(skip)
        .take(take);

      const unseasonedResults = (await unseasonedQuery.getRawAndEntities()).entities;
      finalResults = unseasonedResults;

      if (finalResults.length < take) {
        const remaining = take - finalResults.length;
        const unseasonedCount = await this.repositoryRead.createQueryBuilder('item')
          .leftJoin('item.item_season', 'item_season')
          .leftJoin('item_season.channel_season', 'cs')
          .leftJoin('item.live_item', 'live_item')
          .leftJoin('item.item_flag_status', 'item_flag_status')
          .where('item.channel_id = :channel_id', { channel_id: channel.id })
          .andWhere('live_item.id IS NULL')
          .andWhere('item_flag_status.id = :status', { status: ItemFlagStatusStatusEnum.Active })
          .andWhere('cs.number IS NULL')
          .andWhere('item.pub_date IS NOT NULL')
          .getCount();

        const seasonedSkip = Math.max(0, skip - unseasonedCount);

        const seasonedQuery = createBaseQueryBuilder()
          .andWhere('cs.number IS NOT NULL')
          .orderBy('cs.number', 'ASC')
          .addOrderBy('item_season_episode.number', 'ASC')
          .skip(seasonedSkip)
          .take(remaining);

        const seasonedResults = (await seasonedQuery.getRawAndEntities()).entities;
        finalResults = [...finalResults, ...seasonedResults];
      }
    } else {
      // Backward = seasoned items first (DESC season/episode), then unseasoned items (ASC pub_date)
      const seasonedQuery = createBaseQueryBuilder()
        .andWhere('cs.number IS NOT NULL')
        .orderBy('cs.number', 'DESC')
        .addOrderBy('item_season_episode.number', 'DESC')
        .skip(skip)
        .take(take);

      const seasonedResults = (await seasonedQuery.getRawAndEntities()).entities;
      finalResults = seasonedResults;

      if (finalResults.length < take) {
        const remaining = take - finalResults.length;
        const seasonedCount = await this.repositoryRead.createQueryBuilder('item')
          .leftJoin('item.item_season', 'item_season')
          .leftJoin('item_season.channel_season', 'cs')
          .leftJoin('item.live_item', 'live_item')
          .leftJoin('item.item_flag_status', 'item_flag_status')
          .where('item.channel_id = :channel_id', { channel_id: channel.id })
          .andWhere('live_item.id IS NULL')
          .andWhere('item_flag_status.id = :status', { status: ItemFlagStatusStatusEnum.Active })
          .andWhere('cs.number IS NOT NULL')
          .getCount();

        const unseasonedSkip = Math.max(0, skip - seasonedCount);

        const unseasonedQuery = createBaseQueryBuilder()
          .andWhere('cs.number IS NULL')
          .andWhere('item.pub_date IS NOT NULL')
          .orderBy('item.pub_date', 'ASC')
          .skip(unseasonedSkip)
          .take(remaining);

        const unseasonedResults = (await unseasonedQuery.getRawAndEntities()).entities;
        finalResults = [...finalResults, ...unseasonedResults];
      }
    }

    return finalResults;
  }

  async getManyByChannelWithLiveItem(channel: Channel, options?: FindManyOptions<Item>): Promise<Item[]> {
    return this.repositoryRead.find({
      where: {
        channel,
        live_item: {
          id: Not(IsNull()),
        },
        item_flag_status: {
          id: ItemFlagStatusStatusEnum.Active,
        },
      },
      ...options,
    });
  }

  async getManyByChannels(
    channels: Channel[],
    itemType: 'normal' | 'live-item',
    liveItemType: 'pending' | 'live' | 'ended' | null,
    options?: FindManyOptions<Item>,
  ): Promise<Item[]> {
    const live_item_status_id = getLiveItemStatusEnumValue(liveItemType);

    return this.repositoryRead.find({
      where: {
        channel: In(channels),
        live_item: {
          id: itemType === 'live-item' ? Not(IsNull()) : IsNull(),
          ...(live_item_status_id ? { live_item_status_id: Equal(live_item_status_id) } : {}),
        },
        item_flag_status: {
          id: ItemFlagStatusStatusEnum.Active,
        },
      },
      ...options,
    });
  }

  async getManyByChannelsWithLiveItem(channels: Channel[], options?: FindManyOptions<Item>): Promise<Item[]> {
    return this.repositoryRead.find({
      where: {
        channel: In(channels),
        live_item: {
          id: Not(IsNull()),
        },
        item_flag_status: {
          id: ItemFlagStatusStatusEnum.Active,
        },
      },
      ...options,
    });
  }

  async update(channel: Channel, item_flag_status_id: ItemFlagStatusStatusEnum, dto: ItemDto): Promise<Item> {
    let item = await this.getBy(channel, {
      guid_enclosure_url: dto.guid_enclosure_url,
      guid: dto.guid,
    });

    const itemFlagStatusService = new ItemFlagStatusService();
    const item_flag_status = await itemFlagStatusService.get(item_flag_status_id);
    if (!item_flag_status) {
      throw new Error(`ItemService.update: item status ${item_flag_status_id} not found`);
    }
    
    if (!item) {
      item = new Item();
      item.guid = dto.guid;
      item.item_flag_status = item_flag_status;
      item.guid_enclosure_url = dto.guid_enclosure_url;
      item.channel = channel;
      item = await this.repositoryReadWrite.save(item);
    }

    item.item_flag_status = item_flag_status;

    item = applyProperties(item, dto);

    return this.repositoryReadWrite.save(item);
  }

  async updateFlagStatus(item: Item, item_flag_status_id: ItemFlagStatusStatusEnum): Promise<Item> {
    const itemFlagStatusService = new ItemFlagStatusService();
    const item_flag_status = await itemFlagStatusService.get(item_flag_status_id);
  
    if (!item_flag_status) {
      throw new Error(`ItemService.updateFlagStatus: item status ${item_flag_status_id} not found`);
    }
  
    item.item_flag_status = item_flag_status;
  
    return this.repositoryReadWrite.save(item);
  }

  async updateManyFlagStatus(items: Item[], item_flag_status_id: ItemFlagStatusStatusEnum): Promise<Item[]> {
    const itemFlagStatusService = new ItemFlagStatusService();
    const item_flag_status = await itemFlagStatusService.get(item_flag_status_id);
  
    if (!item_flag_status) {
      throw new Error(`ItemService.updateManyFlagStatus: item status ${item_flag_status_id} not found`);
    }
  
    for (const item of items) {
      item.item_flag_status = item_flag_status;
    }
  
    return this.repositoryReadWrite.save(items);
  }

  async delete(id: number): Promise<void> {
    await this.repositoryReadWrite.delete(id);
  }

  async deleteMany(ids: number[]): Promise<void> {
    if (ids.length) {
      await this.repositoryReadWrite.delete(ids);
    }
  }
}

export type ItemGetManyRelations =
  | 'item_about'
  | 'item_about.item_itunes_episode_type'
  | 'item_chat'
  | 'item_description'
  | 'item_enclosures'
  | 'item_enclosures.item_enclosure_integrity'
  | 'item_enclosures.item_enclosure_sources'
  | 'item_images'
  | 'item_persons'
  | 'item_season'
  | 'item_season.channel_season'
  | 'live_item'
  | 'live_item.live_item_status';

export const itemGetManyRelations: ItemGetManyRelations[] = [
  'item_about',
  'item_about.item_itunes_episode_type',
  'item_chat',
  'item_description',
  'item_enclosures',
  'item_enclosures.item_enclosure_integrity',
  'item_enclosures.item_enclosure_sources',
  'item_images',
  'item_persons',
  'item_season',
  'item_season.channel_season',
  'live_item',
  'live_item.live_item_status',
];

export type SubItemGetManyRelations =
  | 'item'
  | 'item.item_about'
  | 'item.item_chat'
  | 'item.item_description'
  | 'item.item_enclosures'
  | 'item.item_enclosures.item_enclosure_integrity'
  | 'item.item_enclosures.item_enclosure_sources'
  | 'item.item_images'
  | 'item.item_persons'
  | 'item.item_season'
  | 'item.item_season.channel_season'
  | 'item.live_item';

export const subItemGetManyRelations: SubItemGetManyRelations[] = [
  'item',
  'item.item_about',
  'item.item_chat',
  'item.item_description',
  'item.item_enclosures',
  'item.item_enclosures.item_enclosure_integrity',
  'item.item_enclosures.item_enclosure_sources',
  'item.item_images',
  'item.item_persons',
  'item.item_season',
  'item.item_season.channel_season',
  'item.live_item',
];

export type ItemGetManyRelationsWithChannel =
  | ItemGetManyRelations
  | 'channel'
  | 'channel.channel_images'
  | 'channel.channel_about'

export const itemGetManyRelationsWithChannel: ItemGetManyRelationsWithChannel[] = [
  ...itemGetManyRelations,
  'channel',
  'channel.channel_images',
  'channel.channel_about',
];

export type SubItemGetManyRelationsWithChannel =
  | SubItemGetManyRelations
  | 'item.channel'
  | 'item.channel.channel_images';

export const subItemGetManyRelationsWithChannel: SubItemGetManyRelationsWithChannel[] = [
  ...subItemGetManyRelations,
  'item.channel',
  'item.channel.channel_images',
];

export const itemGetOneRelations: FindOptionsRelations<Item> = {
  item_about: true,
  item_chapters_feed: true,
  item_chat: true,
  item_content_links: true,
  item_description: true,
  item_enclosures: true,
  item_fundings: true,
  item_images: true,
  item_license: true,
  item_location: true,
  item_persons: true,
  item_season: true,
  item_social_interacts: true,
  item_soundbites: true,
  item_transcripts: true,
  item_txts: true,
  item_values: true,
  live_item: true,
};

const getItemOneToOneRelations = (relations: FindOptionsRelations<Item>) => {
  const oneToOneRelations: FindOptionsRelations<Item> = {
    ...(relations.item_about ? { item_about: { item_itunes_episode_type: true } } : {}),
    ...(relations.item_chat ? { item_chat: true } : {}),
    ...(relations.item_description ? { item_description: true } : {}),
    ...(relations.item_license ? { item_license: true } : {}),
    ...(relations.item_location ? { item_location: true } : {}),
    ...(relations.item_season ? { item_season: { channel_season: true } } : {}),
    ...(relations.live_item ? { live_item: true } : {}),
  };
   
  return oneToOneRelations;
};
