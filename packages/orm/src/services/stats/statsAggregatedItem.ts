import { QueryParamsMedium } from '@podverse/helpers';
import { StatsAggregatedItem } from '@orm/entities/stats/statsAggregatedItem';
import { StatsTrackEventItemService } from './statsTrackEventItem';
import { BaseStatsAggregatedService, UpdateHistoricalOptions } from './baseStatsAggregated';
import { Equal, FindManyOptions, IsNull, Not } from 'typeorm';
import { getActiveFeedWhere } from '@orm/lib/feedFlagHelpers';
import { getLiveItemStatusEnumValue } from '@orm/index';

export class StatsAggregatedItemService extends BaseStatsAggregatedService<StatsAggregatedItem, number> {
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
    liveItemType: 'pending' | 'live' | 'ended' | null,
  ): Promise<StatsAggregatedItem[]> {
    const live_item_status_id = getLiveItemStatusEnumValue(liveItemType);

    return this.repositoryRead.find({
      where: {
        item: {
          ...getActiveFeedWhere({
            channel_ids: null,
            mediumType,
            category_id,
          }),
          live_item: {
            id: itemType === 'live-item' ? Not(IsNull()) : IsNull(),
            ...(live_item_status_id ? { live_item_status_id: Equal(live_item_status_id) } : {}),

          },
        },
      },
      ...config,
    });
  }

  async getManyByChannelsAndCount(
    config: FindManyOptions<StatsAggregatedItem>,
    channel_ids: number[],
    itemType: 'normal' | 'live-item',
    liveItemType: 'pending' | 'live' | 'ended' | null,
  ): Promise<[StatsAggregatedItem[], number]> {
    const live_item_status_id = getLiveItemStatusEnumValue(liveItemType);

    return this.repositoryRead.findAndCount({
      where: {
        item: {
          ...getActiveFeedWhere({
            channel_ids,
            mediumType: null,
            category_id: null,
          }),
          live_item: {
            id: itemType === 'live-item' ? Not(IsNull()) : IsNull(),
            ...(live_item_status_id ? { live_item_status_id: Equal(live_item_status_id) } : {}),
          },
        },
      },
      ...config,
    });
  }

  async updateAggregatedStats(item_id: number, updateAllTime: boolean = false): Promise<void> {
    await this._updateAggregatedStats(item_id, this.statsTrackEventItemService, updateAllTime);
  }

  async updateAggregatedStatsRolling(item_id: number, updateHistoricalOptions: UpdateHistoricalOptions): Promise<void> {
    await this._updateAggregatedStatsRolling(item_id, this.statsTrackEventItemService, updateHistoricalOptions);
  }
}
