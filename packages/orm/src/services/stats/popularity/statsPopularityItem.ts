import { AppDataSourceRead } from '@orm/db/index.js';
import type { LiveItem } from '@orm/entities/liveItem/liveItem.js';
import { StatsPopularityItem } from '@orm/entities/stats/statsPopularityItem.js';
import { getLiveItemStatusEnumValue } from '@orm/index.js';
import { getActiveFeedWhere } from '@orm/lib/feedFlagHelpers.js';
import {
  buildEndedLiveItemTimeVariants,
  buildPendingLiveItemTimeWhere,
} from '@orm/lib/liveItemWhere.js';
import type { FindManyOptions, FindOptionsWhere } from 'typeorm';
import { Equal, IsNull, MoreThan, Not } from 'typeorm';

import type { QueryParamsMedium, StatsPopularityCountField } from '@podverse/helpers';

export type StatsPopularityItemListOptions = {
  channelIds?: number[] | null;
  excludeChannelIds?: number[] | null;
  minCountField?: StatsPopularityCountField;
};

/**
 * Reads the range totals behind public Top lists. Rows are rebuilt from counted events and daily
 * totals by the popularity refresh job; see `docs/features/POPULARITY-AND-TASTE-PROFILE.md`.
 */
export class StatsPopularityItemService {
  private repositoryRead = AppDataSourceRead.getRepository(StatsPopularityItem);

  private buildListWhere(
    mediumType: QueryParamsMedium | null,
    category_id: number | null,
    itemType: 'normal' | 'live-item',
    liveItemType: 'pending' | 'live' | 'ended' | null,
    options?: StatsPopularityItemListOptions
  ): FindOptionsWhere<StatsPopularityItem> | FindOptionsWhere<StatsPopularityItem>[] {
    const live_item_status_id = getLiveItemStatusEnumValue(liveItemType);

    const activeFeedWhere = getActiveFeedWhere({
      channel_ids: options?.channelIds ?? null,
      exclude_channel_ids: options?.excludeChannelIds ?? null,
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
    ): FindOptionsWhere<StatsPopularityItem> => ({
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
      : liveItemType === 'pending'
        ? buildWhere({ ...liveItemWhere, ...buildPendingLiveItemTimeWhere() })
        : buildWhere(liveItemWhere);
  }

  async getMany(
    config: FindManyOptions<StatsPopularityItem>,
    mediumType: QueryParamsMedium | null,
    category_id: number | null,
    itemType: 'normal' | 'live-item',
    liveItemType: 'pending' | 'live' | 'ended' | null,
    options?: StatsPopularityItemListOptions
  ): Promise<StatsPopularityItem[]> {
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
    minCountField: StatsPopularityCountField,
    channelIds?: number[] | null,
    excludeChannelIds?: number[] | null
  ): Promise<number> {
    return this.repositoryRead.count({
      where: this.buildListWhere(mediumType, category_id, itemType, liveItemType, {
        channelIds,
        excludeChannelIds,
        minCountField,
      }),
    });
  }

  async getRankedItemIds(
    mediumType: QueryParamsMedium | null,
    category_id: number | null,
    itemType: 'normal' | 'live-item',
    liveItemType: 'pending' | 'live' | 'ended' | null,
    minCountField: StatsPopularityCountField,
    take: number,
    channelIds?: number[] | null,
    excludeChannelIds?: number[] | null
  ): Promise<number[]> {
    const rows = await this.repositoryRead.find({
      select: { item_id: true },
      take,
      where: this.buildListWhere(mediumType, category_id, itemType, liveItemType, {
        channelIds,
        excludeChannelIds,
        minCountField,
      }),
    });
    return rows.map((row) => row.item_id);
  }
}
