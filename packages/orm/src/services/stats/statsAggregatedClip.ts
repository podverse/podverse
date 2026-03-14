import { StatsAggregatedClip } from '@orm/entities/stats/statsAggregatedClip.js';
import { getActiveFeedWhere } from '@orm/lib/feedFlagHelpers.js';
import type { FindManyOptions } from 'typeorm';

import type { QueryParamsMedium } from '@podverse/helpers';
import { SharableStatusEnum } from '@podverse/helpers';

import type { UpdateHistoricalOptions } from './baseStatsAggregated.js';
import { BaseStatsAggregatedService } from './baseStatsAggregated.js';
import { StatsTrackEventClipService } from './statsTrackEventClip.js';

export class StatsAggregatedClipService extends BaseStatsAggregatedService<
  StatsAggregatedClip,
  number
> {
  private statsTrackEventClipService: StatsTrackEventClipService;

  constructor() {
    super(StatsAggregatedClip);
    this.statsTrackEventClipService = new StatsTrackEventClipService();
  }

  protected getIdFieldName(): string {
    return 'clip_id';
  }

  async getManyPublic(
    config: FindManyOptions<StatsAggregatedClip>,
    mediumType: QueryParamsMedium | null,
    category_id: number | null
  ): Promise<StatsAggregatedClip[]> {
    return this.repositoryRead.find({
      where: {
        clip: {
          sharable_status_id: SharableStatusEnum.Public,
          item: {
            ...getActiveFeedWhere({
              channel_ids: null,
              mediumType,
              category_id,
            }),
          },
        },
      },
      ...config,
    });
  }

  async getManyAndCountPublic(
    config: FindManyOptions<StatsAggregatedClip>,
    mediumType: QueryParamsMedium | null,
    category_id: number | null
  ): Promise<[StatsAggregatedClip[], number]> {
    return this.repositoryRead.findAndCount({
      where: {
        clip: {
          sharable_status_id: SharableStatusEnum.Public,
          item: {
            ...getActiveFeedWhere({
              channel_ids: null,
              mediumType,
              category_id,
            }),
          },
        },
      },
      ...config,
    });
  }

  async getManyByChannelsAndCountPublic(
    channel_ids: number[],
    config: FindManyOptions<StatsAggregatedClip>
  ): Promise<[StatsAggregatedClip[], number]> {
    return this.repositoryRead.findAndCount({
      where: {
        clip: {
          sharable_status_id: SharableStatusEnum.Public,
          item: {
            ...getActiveFeedWhere({
              channel_ids,
              mediumType: null,
              category_id: null,
            }),
          },
        },
      },
      ...config,
    });
  }

  async getManyByItemAndCountPublic(
    item_id: number,
    config: FindManyOptions<StatsAggregatedClip>
  ): Promise<[StatsAggregatedClip[], number]> {
    return this.repositoryRead.findAndCount({
      where: {
        clip: {
          sharable_status_id: SharableStatusEnum.Public,
          item: {
            id: item_id,
            ...getActiveFeedWhere({
              channel_ids: null,
              mediumType: null,
              category_id: null,
            }),
          },
        },
      },
      ...config,
    });
  }

  async updateAggregatedStats(clip_id: number, updateAllTime: boolean = false): Promise<void> {
    await this._updateAggregatedStats(clip_id, this.statsTrackEventClipService, updateAllTime);
  }

  async updateAggregatedStatsRolling(
    clip_id: number,
    updateHistoricalOptions: UpdateHistoricalOptions
  ): Promise<void> {
    await this._updateAggregatedStatsRolling(
      clip_id,
      this.statsTrackEventClipService,
      updateHistoricalOptions
    );
  }
}
