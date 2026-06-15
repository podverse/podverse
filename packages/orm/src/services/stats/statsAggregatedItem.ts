import type { LiveItem } from '@orm/entities/liveItem/liveItem.js';
import { StatsAggregatedItem } from '@orm/entities/stats/statsAggregatedItem.js';
import { getLiveItemStatusEnumValue } from '@orm/index.js';
import { getActiveFeedWhere } from '@orm/lib/feedFlagHelpers.js';
import { buildEndedLiveItemTimeVariants } from '@orm/lib/liveItemWhere.js';
import type { FindManyOptions, FindOptionsWhere } from 'typeorm';
import { Equal, IsNull, Not } from 'typeorm';

import type { QueryParamsMedium } from '@podverse/helpers';

import type { UpdateHistoricalOptions } from './baseStatsAggregated.js';
import { BaseStatsAggregatedService } from './baseStatsAggregated.js';
import { StatsTrackEventItemService } from './statsTrackEventItem.js';

export class StatsAggregatedItemService extends BaseStatsAggregatedService<
  StatsAggregatedItem,
  number
> {
  private statsTrackEventItemService: StatsTrackEventItemService;

  constructor() {
    super(StatsAggregatedItem);
    this.statsTrackEventItemService = new StatsTrackEventItemService();
  }

  protected getIdFieldName(): string {
    return 'item_id';
  }

  async getMany(
    config: FindManyOptions<StatsAggregatedItem>,
    mediumType: QueryParamsMedium | null,
    category_id: number | null,
    itemType: 'normal' | 'live-item',
    liveItemType: 'pending' | 'live' | 'ended' | null
  ): Promise<StatsAggregatedItem[]> {
    const live_item_status_id = getLiveItemStatusEnumValue(liveItemType);

    const activeFeedWhere = getActiveFeedWhere({
      channel_ids: null,
      mediumType,
      category_id,
    });

    const liveItemWhere: FindOptionsWhere<LiveItem> = {
      id: itemType === 'live-item' ? Not(IsNull()) : IsNull(),
      ...(live_item_status_id ? { live_item_status_id: Equal(live_item_status_id) } : {}),
    };

    const buildWhere = (
      live_item: FindOptionsWhere<LiveItem>
    ): FindOptionsWhere<StatsAggregatedItem> => ({
      item: {
        ...activeFeedWhere,
        live_item,
      },
    });

    const where =
      liveItemType === 'ended'
        ? buildEndedLiveItemTimeVariants().map((variant) =>
            buildWhere({ ...liveItemWhere, ...variant })
          )
        : buildWhere(liveItemWhere);

    return this.repositoryRead.find({
      where,
      ...config,
    });
  }

  async getManyByChannelsAndCount(
    config: FindManyOptions<StatsAggregatedItem>,
    channel_ids: number[],
    itemType: 'normal' | 'live-item',
    liveItemType: 'pending' | 'live' | 'ended' | null
  ): Promise<[StatsAggregatedItem[], number]> {
    const live_item_status_id = getLiveItemStatusEnumValue(liveItemType);

    const activeFeedWhere = getActiveFeedWhere({
      channel_ids,
      mediumType: null,
      category_id: null,
    });

    const liveItemWhere: FindOptionsWhere<LiveItem> = {
      id: itemType === 'live-item' ? Not(IsNull()) : IsNull(),
      ...(live_item_status_id ? { live_item_status_id: Equal(live_item_status_id) } : {}),
    };

    const buildWhere = (
      live_item: FindOptionsWhere<LiveItem>
    ): FindOptionsWhere<StatsAggregatedItem> => ({
      item: {
        ...activeFeedWhere,
        live_item,
      },
    });

    const where =
      liveItemType === 'ended'
        ? buildEndedLiveItemTimeVariants().map((variant) =>
            buildWhere({ ...liveItemWhere, ...variant })
          )
        : buildWhere(liveItemWhere);

    return this.repositoryRead.findAndCount({
      where,
      ...config,
    });
  }

  async updateAggregatedStats(item_id: number, updateAllTime: boolean = false): Promise<void> {
    await this._updateAggregatedStats(item_id, this.statsTrackEventItemService, updateAllTime);
  }

  async updateAggregatedStatsRolling(
    item_id: number,
    updateHistoricalOptions: UpdateHistoricalOptions
  ): Promise<void> {
    await this._updateAggregatedStatsRolling(
      item_id,
      this.statsTrackEventItemService,
      updateHistoricalOptions
    );
  }
}
