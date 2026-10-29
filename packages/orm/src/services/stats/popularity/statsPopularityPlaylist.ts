import { AppDataSourceRead } from '@orm/db/index.js';
import { StatsPopularityPlaylist } from '@orm/entities/stats/statsPopularityPlaylist.js';
import {
  PUBLIC_PLAYLIST_LIST_RELATIONS,
  PUBLIC_PLAYLIST_LIST_SELECT,
} from '@orm/services/playlist/publicPlaylistListSelect.js';
import type { FindManyOptions } from 'typeorm';
import { Equal, In, MoreThan } from 'typeorm';

import type { QueryParamsQueueMedium, StatsPopularityCountField } from '@podverse/helpers';
import { getQueueMediumIdFromType, SharableStatusEnum } from '@podverse/helpers';

const STATS_POPULARITY_SELECT_ALL = {
  playlist_id: true,
  day_count: true,
  week_count: true,
  month_count: true,
  all_time_count: true,
};

/**
 * Reads the range totals behind public Top lists. Rows are rebuilt from counted events and daily
 * totals by the popularity refresh job; see `docs/features/POPULARITY-AND-TASTE-PROFILE.md`.
 */
export class StatsPopularityPlaylistService {
  private repositoryRead = AppDataSourceRead.getRepository(StatsPopularityPlaylist);

  async getManyPublic(
    config: FindManyOptions<StatsPopularityPlaylist>,
    queueMediumType: QueryParamsQueueMedium | null,
    minCountField: StatsPopularityCountField
  ): Promise<StatsPopularityPlaylist[]> {
    const medium_id = getQueueMediumIdFromType(queueMediumType);

    return this.repositoryRead.find({
      ...config,
      select: {
        ...STATS_POPULARITY_SELECT_ALL,
        playlist: PUBLIC_PLAYLIST_LIST_SELECT,
      },
      where: {
        ...(config.where && !Array.isArray(config.where) ? config.where : {}),
        [minCountField]: MoreThan(0),
        playlist: {
          sharable_status_id: SharableStatusEnum.Public,
          ...(medium_id ? { medium_id: Equal(medium_id) } : {}),
        },
      },
      relations: {
        playlist: PUBLIC_PLAYLIST_LIST_RELATIONS,
      },
    });
  }

  async getManyPrivate(
    config: FindManyOptions<StatsPopularityPlaylist>,
    account_id: number,
    queueMediumType: QueryParamsQueueMedium | null
  ): Promise<[StatsPopularityPlaylist[], number]> {
    const medium_id = getQueueMediumIdFromType(queueMediumType);

    return this.repositoryRead.findAndCount({
      ...config,
      select: {
        ...STATS_POPULARITY_SELECT_ALL,
        playlist: PUBLIC_PLAYLIST_LIST_SELECT,
      },
      where: {
        playlist: {
          ...(medium_id ? { medium_id: Equal(medium_id) } : {}),
          ...(account_id ? { account: { id: Equal(account_id) } } : {}),
        },
      },
      relations: {
        playlist: PUBLIC_PLAYLIST_LIST_RELATIONS,
      },
    });
  }

  async getManyPrivateByPlaylists(
    playlist_ids: number[],
    config: FindManyOptions<StatsPopularityPlaylist>
  ): Promise<[StatsPopularityPlaylist[], number]> {
    return this.repositoryRead.findAndCount({
      ...config,
      where: {
        ...config.where,
        playlist: {
          id: In(playlist_ids),
        },
      },
    });
  }
}
