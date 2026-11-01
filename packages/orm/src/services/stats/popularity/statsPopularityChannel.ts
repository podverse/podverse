import { AppDataSourceRead } from '@orm/db/index.js';
import { StatsPopularityChannel } from '@orm/entities/stats/statsPopularityChannel.js';
import { getActiveFeedWhere } from '@orm/lib/feedFlagHelpers.js';
import type { FindManyOptions } from 'typeorm';
import { MoreThan } from 'typeorm';

import type { QueryParamsMedium, StatsPopularityCountField } from '@podverse/helpers';

export type StatsPopularityListOptions = {
  channelIds?: number[] | null;
  excludeIds?: number[] | null;
  minCountField?: StatsPopularityCountField;
};

/**
 * Reads the range totals behind public Top lists. Rows are rebuilt from counted events and daily
 * totals by the popularity refresh job; see `docs/features/POPULARITY-AND-TASTE-PROFILE.md`.
 */
export class StatsPopularityChannelService {
  private repositoryRead = AppDataSourceRead.getRepository(StatsPopularityChannel);

  private mergeWhere(feedWhere: object | undefined, configWhere: object | undefined) {
    return { ...(feedWhere || {}), ...(configWhere || {}) };
  }

  private buildWhere(
    mediumType: QueryParamsMedium | null,
    category_id: number | null,
    options?: StatsPopularityListOptions
  ) {
    const feedWhere = getActiveFeedWhere({
      channel_ids: options?.channelIds ?? null,
      exclude_channel_ids: options?.excludeIds ?? null,
      mediumType,
      category_id,
    });
    const countWhere = options?.minCountField ? { [options.minCountField]: MoreThan(0) } : {};
    return this.mergeWhere(feedWhere, countWhere);
  }

  async getMany(
    config: FindManyOptions<StatsPopularityChannel>,
    mediumType: QueryParamsMedium | null,
    category_id: number | null,
    options?: StatsPopularityListOptions
  ): Promise<StatsPopularityChannel[]> {
    return this.repositoryRead.find({
      ...config,
      where: this.mergeWhere(this.buildWhere(mediumType, category_id, options), config.where),
    });
  }

  async countRanked(
    mediumType: QueryParamsMedium | null,
    category_id: number | null,
    minCountField: StatsPopularityCountField,
    channelIds?: number[] | null,
    excludeIds?: number[] | null
  ): Promise<number> {
    return this.repositoryRead.count({
      where: this.buildWhere(mediumType, category_id, { channelIds, excludeIds, minCountField }),
    });
  }

  async getRankedChannelIds(
    mediumType: QueryParamsMedium | null,
    category_id: number | null,
    minCountField: StatsPopularityCountField,
    take: number,
    channelIds?: number[] | null,
    excludeIds?: number[] | null
  ): Promise<number[]> {
    const rows = await this.repositoryRead.find({
      select: { channel_id: true },
      take,
      where: this.buildWhere(mediumType, category_id, { channelIds, excludeIds, minCountField }),
    });
    return rows.map((row) => row.channel_id);
  }
}
