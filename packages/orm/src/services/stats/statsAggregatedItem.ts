import type { LiveItem } from '@orm/entities/liveItem/liveItem.js';
import { StatsAggregatedItem } from '@orm/entities/stats/statsAggregatedItem.js';
import { getLiveItemStatusEnumValue } from '@orm/index.js';
import { getActiveFeedWhere } from '@orm/lib/feedFlagHelpers.js';
import { buildEndedLiveItemTimeVariants } from '@orm/lib/liveItemWhere.js';
import type { FindManyOptions, FindOptionsWhere } from 'typeorm';
import { Equal, IsNull, MoreThan, Not } from 'typeorm';

import type { QueryParamsMedium, StatsAggregatedRangeCountField } from '@podverse/helpers';

import type { UpdateHistoricalOptions } from './baseStatsAggregated.js';
import { BaseStatsAggregatedService } from './baseStatsAggregated.js';
import { StatsTrackEventItemService } from './statsTrackEventItem.js';

export type StatsAggregatedItemListOptions = {
  channelIds?: number[] | null;
  minCountField?: StatsAggregatedRangeCountField;
};

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

  private buildListWhere(
    mediumType: QueryParamsMedium | null,
    category_id: number | null,
    itemType: 'normal' | 'live-item',
    liveItemType: 'pending' | 'live' | 'ended' | null,
    options?: StatsAggregatedItemListOptions
  ): FindOptionsWhere<StatsAggregatedItem> | FindOptionsWhere<StatsAggregatedItem>[] {
    const live_item_status_id = getLiveItemStatusEnumValue(liveItemType);

    const activeFeedWhere = getActiveFeedWhere({
      channel_ids: options?.channelIds ?? null,
      mediumType,
      category_id,
    });

    const liveItemWhere: FindOptionsWhere<LiveItem> = {
      id: itemType === 'live-item' ? Not(IsNull()) : IsNull(),
      ...(live_item_status_id ? { live_item_status_id: Equal(live_item_status_id) } : {}),
    };

    const countWhere = options?.minCountField ? { [options.minCountField]: MoreThan(0) } : {};

    const buildWhere = (
      live_item: FindOptionsWhere<LiveItem>
    ): FindOptionsWhere<StatsAggregatedItem> => ({
      ...countWhere,
      item: {
        ...activeFeedWhere,
        live_item,
      },
    });

    return liveItemType === 'ended'
      ? buildEndedLiveItemTimeVariants().map((variant) =>
          buildWhere({ ...liveItemWhere, ...variant })
        )
      : buildWhere(liveItemWhere);
  }

  async getMany(
    config: FindManyOptions<StatsAggregatedItem>,
    mediumType: QueryParamsMedium | null,
    category_id: number | null,
    itemType: 'normal' | 'live-item',
    liveItemType: 'pending' | 'live' | 'ended' | null,
    options?: StatsAggregatedItemListOptions
  ): Promise<StatsAggregatedItem[]> {
    const { where: _configWhere, ...restConfig } = config;
    return this.repositoryRead.find({
      ...restConfig,
      where: this.buildListWhere(mediumType, category_id, itemType, liveItemType, options),
    });
  }

  async countRanked(
    mediumType: QueryParamsMedium | null,
    category_id: number | null,
    itemType: 'normal' | 'live-item',
    liveItemType: 'pending' | 'live' | 'ended' | null,
    minCountField: StatsAggregatedRangeCountField,
    channelIds?: number[] | null
  ): Promise<number> {
    return this.repositoryRead.count({
      where: this.buildListWhere(mediumType, category_id, itemType, liveItemType, {
        channelIds,
        minCountField,
      }),
    });
  }

  async getRankedItemIds(
    mediumType: QueryParamsMedium | null,
    category_id: number | null,
    itemType: 'normal' | 'live-item',
    liveItemType: 'pending' | 'live' | 'ended' | null,
    minCountField: StatsAggregatedRangeCountField,
    take: number,
    channelIds?: number[] | null
  ): Promise<number[]> {
    const rows = await this.repositoryRead.find({
      select: { id: true, item_id: true },
      take,
      where: this.buildListWhere(mediumType, category_id, itemType, liveItemType, {
        channelIds,
        minCountField,
      }),
    });
    return rows.map((row) => row.item_id);
  }

  async getManyByChannelsAndCount(
    config: FindManyOptions<StatsAggregatedItem>,
    channel_ids: number[],
    itemType: 'normal' | 'live-item',
    liveItemType: 'pending' | 'live' | 'ended' | null
  ): Promise<[StatsAggregatedItem[], number]> {
    const { where: _configWhere, ...restConfig } = config;
    return this.repositoryRead.findAndCount({
      ...restConfig,
      where: this.buildListWhere(null, null, itemType, liveItemType, {
        channelIds: channel_ids,
      }),
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
