import { Clip } from '@orm/entities/clip.js';
import { FeedFlagStatusStatusEnum } from '@orm/entities/feed/feedFlagStatus.js';
import { AccountService } from '@orm/services/account/account.js';
import { BaseManyService } from '@orm/services/base/baseManyService.js';
import type { EntityManager, FindManyOptions, FindOneOptions } from 'typeorm';
import { Equal, In } from 'typeorm';

import type { QueryParamsMedium } from '@podverse/helpers';
import { getMediumIdArrayFromType, SharableStatusEnum } from '@podverse/helpers';

import { ItemService } from './item/item.js';

export type ClipDto = {
  start_time: string;
  end_time?: string | null;
  title?: string | null;
  description?: string | null;
  item_id_text: string;
  sharable_status_id: number;
};

export class ClipService extends BaseManyService<Clip, 'account'> {
  private accountService: AccountService;
  private itemService: ItemService;

  constructor(transactionalEntityManager?: EntityManager) {
    super(Clip, 'account', transactionalEntityManager);
    this.accountService = new AccountService();
    this.itemService = new ItemService();
  }

  async create(account_id: number, dto: ClipDto): Promise<Clip> {
    const account = await this.accountService.get(account_id);
    if (!account) {
      throw new Error('Account not found.');
    }

    const item = await this.itemService.getByIdOrIdText(dto.item_id_text);
    if (!item) {
      throw new Error('Item not found.');
    }

    if (dto.end_time && parseFloat(dto.end_time) <= parseFloat(dto.start_time)) {
      throw new Error('End time must be greater than start time.');
    }

    const finalDto = {
      start_time: dto.start_time,
      end_time: dto.end_time || null,
      title: dto.title || null,
      description: dto.description || null,
      account,
      item,
      sharable_status_id: dto.sharable_status_id,
    };

    const whereKeys = [] as (keyof Clip)[];
    return this._update(account, whereKeys, finalDto);
  }

  async update(account_id: number, clip_id_text: string, dto: ClipDto): Promise<Clip> {
    const account = await this.accountService.get(account_id);
    if (!account) {
      throw new Error('Account not found.');
    }

    const clip = await this._get(account, { id_text: clip_id_text });
    if (!clip) {
      throw new Error('Clip not found.');
    }

    const item = await this.itemService.getByIdOrIdText(dto.item_id_text);
    if (!item) {
      throw new Error('Item not found.');
    }

    if (dto.end_time && parseFloat(dto.end_time) <= parseFloat(dto.start_time)) {
      throw new Error('End time must be greater than start time.');
    }

    const finalDto = {
      start_time: dto.start_time,
      end_time: dto.end_time || null,
      title: dto.title || null,
      description: dto.description || null,
      item,
      sharable_status_id: dto.sharable_status_id,
    };

    const whereKeys = ['id_text'] as (keyof Clip)[];
    return this._update(account, whereKeys, finalDto, undefined, clip);
  }

  async delete(account_id: number, clip_id_text: string): Promise<void> {
    const account = await this.accountService.get(account_id);
    if (!account) {
      throw new Error('Account not found.');
    }

    return this._delete(account, { id_text: clip_id_text });
  }

  async getByIdText(clip_id_text: string, config?: FindOneOptions<Clip>): Promise<Clip | null> {
    const options: FindOneOptions<Clip> = {
      where: { id_text: clip_id_text },
      ...config,
    };

    return this.repositoryRead.findOne(options);
  }

  async getManyPublic(
    mediumType: QueryParamsMedium | null,
    category_id: number | null,
    config: FindManyOptions<Clip>
  ): Promise<Clip[]> {
    const medium_ids = mediumType ? getMediumIdArrayFromType(mediumType) : null;
    return this.repositoryRead.find({
      where: {
        sharable_status_id: SharableStatusEnum.Public,
        item: {
          channel: {
            feed: {
              feed_flag_status: In([
                FeedFlagStatusStatusEnum.Active,
                FeedFlagStatusStatusEnum.AlwaysParse,
              ]),
            },
            ...(medium_ids ? { medium_id: In(medium_ids) } : {}),
            ...(category_id ? { channel_categories: { category_id: Equal(category_id) } } : {}),
          },
        },
      },
      ...config,
    });
  }

  async getManyByChannels(
    channel_ids: number[],
    config: FindManyOptions<Clip>
  ): Promise<[Clip[], number]> {
    return this.repositoryRead.findAndCount({
      where: {
        sharable_status_id: SharableStatusEnum.Public,
        item: {
          channel: {
            id: In(channel_ids),
            feed: {
              feed_flag_status: In([
                FeedFlagStatusStatusEnum.Active,
                FeedFlagStatusStatusEnum.AlwaysParse,
              ]),
            },
          },
        },
      },
      ...config,
    });
  }

  async getManyByChannelAndCountPublic(
    channel_id_text: string,
    config: FindManyOptions<Clip>
  ): Promise<[Clip[], number]> {
    return this.repositoryRead.findAndCount({
      where: {
        sharable_status_id: SharableStatusEnum.Public,
        item: {
          channel: {
            feed: {
              feed_flag_status: In([
                FeedFlagStatusStatusEnum.Active,
                FeedFlagStatusStatusEnum.AlwaysParse,
              ]),
            },
            id_text: channel_id_text,
          },
        },
      },
      ...config,
    });
  }

  async getManyByItemAndCountPublic(
    item_id_text: string,
    config: FindManyOptions<Clip>
  ): Promise<[Clip[], number]> {
    return this.repositoryRead.findAndCount({
      where: {
        sharable_status_id: SharableStatusEnum.Public,
        item: {
          id_text: item_id_text,
          channel: {
            feed: {
              feed_flag_status: In([
                FeedFlagStatusStatusEnum.Active,
                FeedFlagStatusStatusEnum.AlwaysParse,
              ]),
            },
          },
        },
      },
      ...config,
    });
  }

  async getManyByAccount(account_id: number): Promise<Clip[]> {
    const account = await this.accountService.get(account_id);
    if (!account) {
      throw new Error('Account not found.');
    }

    return this._getAll(account);
  }

  async getManyByAccountIdTextAndCount(
    account_id_text: string,
    config: FindManyOptions<Clip>
  ): Promise<[Clip[], number]> {
    return this.repositoryRead.findAndCount({
      where: {
        account: {
          id_text: account_id_text,
        },
        item: {
          channel: {
            feed: {
              feed_flag_status: In([
                FeedFlagStatusStatusEnum.Active,
                FeedFlagStatusStatusEnum.AlwaysParse,
              ]),
            },
          },
        },
      },
      ...config,
    });
  }

  async getManyByAccountIdTextPublicAndCount(
    account_id_text: string,
    config: FindManyOptions<Clip>
  ): Promise<[Clip[], number]> {
    return this.repositoryRead.findAndCount({
      where: {
        account: {
          id_text: account_id_text,
        },
        sharable_status_id: SharableStatusEnum.Public,
        item: {
          channel: {
            feed: {
              feed_flag_status: In([
                FeedFlagStatusStatusEnum.Active,
                FeedFlagStatusStatusEnum.AlwaysParse,
              ]),
            },
          },
        },
      },
      ...config,
    });
  }

  async getRandomClip(medium_id: number): Promise<Clip | null> {
    const query = this.repositoryRead
      .createQueryBuilder('clip')
      .innerJoin('clip.item', 'item')
      .innerJoin('item.channel', 'channel');

    const clips = await query
      .where('channel.medium_id = :medium_id', { medium_id })
      .orderBy('RANDOM()')
      .limit(1)
      .getMany();

    return clips[0] || null;
  }
}
