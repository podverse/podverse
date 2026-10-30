import { AppDataSourceRead } from '@orm/db/index.js';
import { StatsPopularityClip } from '@orm/entities/stats/statsPopularityClip.js';
import { getActiveFeedWhere } from '@orm/lib/feedFlagHelpers.js';
import type { FindManyOptions } from 'typeorm';
import { MoreThan } from 'typeorm';

import type { QueryParamsMedium, StatsPopularityCountField } from '@podverse/helpers';
import { SharableStatusEnum } from '@podverse/helpers';

/**
 * Reads the range totals behind public Top lists. Rows are rebuilt from counted events and daily
 * totals by the popularity refresh job; see `docs/features/POPULARITY-AND-TASTE-PROFILE.md`.
 */
export class StatsPopularityClipService {
  private repositoryRead = AppDataSourceRead.getRepository(StatsPopularityClip);

  private mergeWhere(baseWhere: object, configWhere: object | undefined) {
    return { ...baseWhere, ...(configWhere || {}) };
  }

  private buildPublicWhere(
    mediumType: QueryParamsMedium | null,
    category_id: number | null,
    minCountField: StatsPopularityCountField
  ) {
    return {
      [minCountField]: MoreThan(0),
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
    };
  }

  async getManyPublic(
    config: FindManyOptions<StatsPopularityClip>,
    mediumType: QueryParamsMedium | null,
    category_id: number | null,
    minCountField: StatsPopularityCountField
  ): Promise<StatsPopularityClip[]> {
    return this.repositoryRead.find({
      ...config,
      where: this.mergeWhere(
        this.buildPublicWhere(mediumType, category_id, minCountField),
        config.where
      ),
    });
  }

  async getManyAndCountPublic(
    config: FindManyOptions<StatsPopularityClip>,
    mediumType: QueryParamsMedium | null,
    category_id: number | null,
    minCountField: StatsPopularityCountField
  ): Promise<[StatsPopularityClip[], number]> {
    return this.repositoryRead.findAndCount({
      ...config,
      where: this.mergeWhere(
        this.buildPublicWhere(mediumType, category_id, minCountField),
        config.where
      ),
    });
  }

  async getManyByChannelsAndCountPublic(
    channel_ids: number[],
    config: FindManyOptions<StatsPopularityClip>
  ): Promise<[StatsPopularityClip[], number]> {
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
    config: FindManyOptions<StatsPopularityClip>
  ): Promise<[StatsPopularityClip[], number]> {
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
}
