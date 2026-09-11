import { StatsAggregatedChannel } from '@orm/entities/stats/statsAggregatedChannel.js';
import { getActiveFeedWhere } from '@orm/lib/feedFlagHelpers.js';
import type { FindManyOptions } from 'typeorm';
import { MoreThan } from 'typeorm';

import type { QueryParamsMedium, StatsAggregatedRangeCountField } from '@podverse/helpers';

import type { UpdateHistoricalOptions } from './baseStatsAggregated.js';
import { BaseStatsAggregatedService } from './baseStatsAggregated.js';
import { StatsTrackEventChannelService } from './statsTrackEventChannel.js';

export type StatsAggregatedListOptions = {
  channelIds?: number[] | null;
  minCountField?: StatsAggregatedRangeCountField;
};

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

  private buildWhere(
    mediumType: QueryParamsMedium | null,
    category_id: number | null,
    options?: StatsAggregatedListOptions
  ) {
    const feedWhere = getActiveFeedWhere({
      channel_ids: options?.channelIds ?? null,
      mediumType,
      category_id,
    });
    const countWhere = options?.minCountField ? { [options.minCountField]: MoreThan(0) } : {};
    return this.mergeWhere(feedWhere, countWhere);
  }

  async getMany(
    config: FindManyOptions<StatsAggregatedChannel>,
    mediumType: QueryParamsMedium | null,
    category_id: number | null,
    options?: StatsAggregatedListOptions
  ): Promise<StatsAggregatedChannel[]> {
    return this.repositoryRead.find({
      ...config,
      where: this.mergeWhere(this.buildWhere(mediumType, category_id, options), config.where),
    });
  }

  async countRanked(
    mediumType: QueryParamsMedium | null,
    category_id: number | null,
    minCountField: StatsAggregatedRangeCountField,
    channelIds?: number[] | null
  ): Promise<number> {
    return this.repositoryRead.count({
      where: this.buildWhere(mediumType, category_id, { channelIds, minCountField }),
    });
  }

  async getRankedChannelIds(
    mediumType: QueryParamsMedium | null,
    category_id: number | null,
    minCountField: StatsAggregatedRangeCountField,
    take: number,
    channelIds?: number[] | null
  ): Promise<number[]> {
    const rows = await this.repositoryRead.find({
      select: { channel_id: true, id: true },
      take,
      where: this.buildWhere(mediumType, category_id, { channelIds, minCountField }),
    });
    return rows.map((row) => row.channel_id);
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
