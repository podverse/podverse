import { StatsAggregatedChannel } from '@orm/entities/stats/statsAggregatedChannel.js';
import { getActiveFeedWhere } from '@orm/lib/feedFlagHelpers.js';
import type { FindManyOptions } from 'typeorm';

import type { QueryParamsMedium } from '@podverse/helpers';

import type { UpdateHistoricalOptions } from './baseStatsAggregated.js';
import { BaseStatsAggregatedService } from './baseStatsAggregated.js';
import { StatsTrackEventChannelService } from './statsTrackEventChannel.js';

export class StatsAggregatedChannelService extends BaseStatsAggregatedService<
  StatsAggregatedChannel,
  number
> {
  private statsTrackEventChannelService: StatsTrackEventChannelService;

  constructor() {
    super(StatsAggregatedChannel);
    this.statsTrackEventChannelService = new StatsTrackEventChannelService();
  }

  protected getIdFieldName(): string {
    return 'channel_id';
  }

  private mergeWhere(feedWhere: object | undefined, configWhere: object | undefined) {
    return { ...(feedWhere || {}), ...(configWhere || {}) };
  }

  async getMany(
    config: FindManyOptions<StatsAggregatedChannel>,
    mediumType: QueryParamsMedium | null,
    category_id: number | null
  ): Promise<StatsAggregatedChannel[]> {
    const feedWhere = getActiveFeedWhere({
      channel_ids: null,
      mediumType,
      category_id,
    });
    return this.repositoryRead.find({
      ...config,
      where: this.mergeWhere(feedWhere, config.where),
    });
  }

  async getManyByChannelsAndCount(
    channel_ids: number[],
    config: FindManyOptions<StatsAggregatedChannel>
  ): Promise<[StatsAggregatedChannel[], number]> {
    const feedWhere = getActiveFeedWhere({
      channel_ids,
      mediumType: null,
      category_id: null,
    });
    return this.repositoryRead.findAndCount({
      ...config,
      where: this.mergeWhere(feedWhere, config.where),
    });
  }

  async updateAggregatedStats(channel_id: number, updateAllTime: boolean = false): Promise<void> {
    await this._updateAggregatedStats(
      channel_id,
      this.statsTrackEventChannelService,
      updateAllTime
    );
  }

  async updateAggregatedStatsRolling(
    channel_id: number,
    updateHistoricalOptions: UpdateHistoricalOptions
  ): Promise<void> {
    await this._updateAggregatedStatsRolling(
      channel_id,
      this.statsTrackEventChannelService,
      updateHistoricalOptions
    );
  }
}
