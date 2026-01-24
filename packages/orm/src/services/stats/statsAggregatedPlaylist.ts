import { getQueueMediumIdFromType, QueryParamsQueueMedium, SharableStatusEnum } from '@podverse/helpers';
import { Equal, FindManyOptions, In } from 'typeorm';
import { StatsAggregatedPlaylist } from '@orm/entities/stats/statsAggregatedPlaylist';
import { StatsTrackEventPlaylistService } from './statsTrackEventPlaylist';
import { BaseStatsAggregatedService, STATS_AGGREGATED_SELECT_ALL, UpdateHistoricalOptions } from './baseStatsAggregated';

export class StatsAggregatedPlaylistService extends BaseStatsAggregatedService<StatsAggregatedPlaylist, number> {
  private statsTrackEventPlaylistService: StatsTrackEventPlaylistService;

  constructor() {
    super(StatsAggregatedPlaylist);
    this.statsTrackEventPlaylistService = new StatsTrackEventPlaylistService();
  }

  protected getIdFieldName(): string {
    return 'playlist_id';
  }

  async getMany(config: FindManyOptions<StatsAggregatedPlaylist>): Promise<StatsAggregatedPlaylist[]> {
    return this.repositoryRead.find(config);
  }

  async getManyCount(config: FindManyOptions<StatsAggregatedPlaylist>): Promise<number> {
    return this.repositoryRead.count(config);
  }

  async getManyPublic(
    config: FindManyOptions<StatsAggregatedPlaylist>,
    queueMediumType: QueryParamsQueueMedium | null,
  ): Promise<StatsAggregatedPlaylist[]> {
    const medium_id = getQueueMediumIdFromType(queueMediumType);

    return this.repositoryRead.find({
      ...config,
      select: {
        ...STATS_AGGREGATED_SELECT_ALL,
        playlist: {
          id_text: true,
          title: true,
          description: true,
          is_default_favorites: true,
          item_count: true,
          account: {
            id_text: true,
            account_profile: {
              display_name: true,
            },
          },
        },
      },
      where: {
        playlist: {
          sharable_status_id: SharableStatusEnum.Public,
          ...(medium_id ? { medium_id: Equal(medium_id) } : {}),
        },
      },
      relations: [
        'playlist',
        'playlist.account',
        'playlist.account.account_profile',
        'playlist.sharable_status',
        'playlist.medium',
      ],
    });
  }

  async getManyPrivate(
    config: FindManyOptions<StatsAggregatedPlaylist>,
    account_id: number,
    queueMediumType: QueryParamsQueueMedium | null,
  ): Promise<[StatsAggregatedPlaylist[], number]> {
    const medium_id = getQueueMediumIdFromType(queueMediumType);

    return this.repositoryRead.findAndCount({
      ...config,
      select: {
        ...STATS_AGGREGATED_SELECT_ALL,
        playlist: {
          id_text: true,
          title: true,
          description: true,
          is_default_favorites: true,
          item_count: true,
          account: {
            id_text: true,
            account_profile: {
              display_name: true,
            },
          },
        },
      },
      where: {
        playlist: {
          ...(medium_id ? { medium_id: Equal(medium_id) } : {}),
          ...(account_id ? { account: { id: Equal(account_id) } } : {}),
        },
      },
      relations: [
        'playlist',
        'playlist.account',
        'playlist.account.account_profile',
        'playlist.sharable_status',
        'playlist.medium',
      ],
    });
  }

  async getManyPrivateByPlaylists(playlist_ids: number[], config: FindManyOptions<StatsAggregatedPlaylist>): Promise<[StatsAggregatedPlaylist[], number]> {
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

  async updateAggregatedStats(playlist_id: number, updateAllTime: boolean = false): Promise<void> {
    await this._updateAggregatedStats(playlist_id, this.statsTrackEventPlaylistService, updateAllTime);
  }

  async updateAggregatedStatsRolling(playlist_id: number, updateHistoricalOptions: UpdateHistoricalOptions): Promise<void> {
    await this._updateAggregatedStatsRolling(playlist_id, this.statsTrackEventPlaylistService, updateHistoricalOptions);
  }
}
