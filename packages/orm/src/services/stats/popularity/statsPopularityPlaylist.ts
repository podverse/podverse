import { AppDataSourceRead } from '@orm/db/index.js';
import { PlaylistTag, PlaylistTagAssignment } from '@orm/entities/playlist/playlistTag.js';
import { StatsPopularityPlaylist } from '@orm/entities/stats/statsPopularityPlaylist.js';
import {
  omitUnlistedPlaylistListFields,
  PUBLIC_PLAYLIST_LIST_RELATIONS,
  PUBLIC_PLAYLIST_LIST_SELECT,
} from '@orm/services/playlist/publicPlaylistListSelect.js';
import type { FindManyOptions, SelectQueryBuilder } from 'typeorm';
import { Equal, In, MoreThan } from 'typeorm';

import type { QueryParamsQueueMedium, StatsPopularityCountField } from '@podverse/helpers';
import {
  getQueueMediumIdFromType,
  normalizePlaylistTagName,
  SharableStatusEnum,
} from '@podverse/helpers';

const STATS_POPULARITY_SELECT_ALL = {
  playlist_id: true,
  day_count: true,
  week_count: true,
  month_count: true,
  all_time_count: true,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function foldedPlaylistTagName(tagName: string | null): string | null {
  if (tagName === null) {
    return null;
  }
  const normalized = normalizePlaylistTagName(tagName);
  if (!normalized.ok) {
    return null;
  }
  return normalized.name;
}

function sortDirection(value: unknown): 'ASC' | 'DESC' {
  if (value === 'ASC' || value === 'asc' || value === 1) {
    return 'ASC';
  }
  if (value === 'DESC' || value === 'desc' || value === -1) {
    return 'DESC';
  }
  if (isRecord(value)) {
    const direction = value.direction;
    if (direction === 'ASC' || direction === 'asc' || direction === 1) {
      return 'ASC';
    }
    if (direction === 'DESC' || direction === 'desc' || direction === -1) {
      return 'DESC';
    }
  }
  throw new Error('Playlist top order is not supported');
}

function statsPageOrderColumn(column: string): string {
  switch (column) {
    case 'all_time_count':
    case 'day_count':
    case 'month_count':
    case 'playlist_id':
    case 'week_count':
      return `stats.${column}`;
    default:
      throw new Error('Playlist top order is not supported');
  }
}

function statsCountColumn(field: StatsPopularityCountField): string {
  switch (field) {
    case 'all_time_count':
    case 'day_count':
    case 'month_count':
    case 'week_count':
      return `stats.${field}`;
  }
}

function applyStatsPageOrder(
  qb: SelectQueryBuilder<StatsPopularityPlaylist>,
  order: FindManyOptions<StatsPopularityPlaylist>['order']
): void {
  if (order === undefined) {
    return;
  }
  for (const [column, direction] of Object.entries(order)) {
    qb.addOrderBy(statsPageOrderColumn(column), sortDirection(direction));
  }
}

function integerId(value: unknown): number | null {
  if (typeof value === 'number' && Number.isInteger(value)) {
    return value;
  }
  if (typeof value === 'string' && /^[0-9]+$/.test(value)) {
    return Number(value);
  }
  return null;
}

function statsPlaylistIdsFromRaw(value: unknown): number[] {
  if (!Array.isArray(value)) {
    throw new Error('Playlist tag page did not return rows');
  }
  const ids: number[] = [];
  for (const row of value) {
    if (!isRecord(row)) {
      throw new Error('Playlist tag page is missing a playlist id');
    }
    const id = integerId(row.playlist_id);
    if (id === null) {
      throw new Error('Playlist tag page is missing a playlist id');
    }
    ids.push(id);
  }
  return ids;
}

/**
 * Reads the range totals behind public Top lists. Rows are rebuilt from counted events and daily
 * totals by the popularity refresh job; see `docs/features/POPULARITY-AND-TASTE-PROFILE.md`.
 */
export class StatsPopularityPlaylistService {
  private repositoryRead = AppDataSourceRead.getRepository(StatsPopularityPlaylist);

  async getManyPublic(
    config: FindManyOptions<StatsPopularityPlaylist>,
    queueMediumType: QueryParamsQueueMedium | null,
    minCountField: StatsPopularityCountField,
    tagName: string | null = null
  ): Promise<StatsPopularityPlaylist[]> {
    const medium_id = getQueueMediumIdFromType(queueMediumType);
    const foldedTag = foldedPlaylistTagName(tagName);
    // A folded tag pages matching stats rows. Without a tag, the list query does not join
    // assignments, so skip and take count stats rows.
    const rows =
      foldedTag === null
        ? await this.repositoryRead.find({
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
          })
        : await this.loadPublicByTag(config, medium_id, minCountField, foldedTag);
    for (const row of rows) {
      if (row.playlist) {
        omitUnlistedPlaylistListFields(row.playlist);
      }
    }
    return rows;
  }

  private async loadPublicByTag(
    config: FindManyOptions<StatsPopularityPlaylist>,
    mediumId: number | null,
    minCountField: StatsPopularityCountField,
    foldedTag: string
  ): Promise<StatsPopularityPlaylist[]> {
    const qb = this.repositoryRead
      .createQueryBuilder('stats')
      .innerJoin('stats.playlist', 'playlist')
      .innerJoin(PlaylistTagAssignment, 'assignment', 'assignment.playlist_id = playlist.id')
      .innerJoin(
        PlaylistTag,
        'playlist_tag',
        'playlist_tag.id = assignment.playlist_tag_id AND playlist_tag.name = :tagName',
        { tagName: foldedTag }
      )
      .where(`${statsCountColumn(minCountField)} > 0`)
      .andWhere('playlist.sharable_status_id = :publicStatus', {
        publicStatus: SharableStatusEnum.Public,
      })
      .select('stats.playlist_id', 'playlist_id');
    if (mediumId) {
      qb.andWhere('playlist.medium_id = :mediumId', { mediumId });
    }
    // One tag name matches each playlist once, so limit and offset page stats rows.
    applyStatsPageOrder(qb, config.order);
    if (typeof config.skip === 'number') {
      qb.offset(config.skip);
    }
    if (typeof config.take === 'number') {
      qb.limit(config.take);
    }

    const ids = statsPlaylistIdsFromRaw(await qb.getRawMany());
    if (ids.length === 0) {
      return [];
    }
    const rows = await this.repositoryRead.find({
      select: {
        ...STATS_POPULARITY_SELECT_ALL,
        playlist: PUBLIC_PLAYLIST_LIST_SELECT,
      },
      where: { playlist_id: In(ids) },
      relations: {
        playlist: PUBLIC_PLAYLIST_LIST_RELATIONS,
      },
    });
    const byId = new Map(rows.map((row) => [row.playlist_id, row]));
    const ordered: StatsPopularityPlaylist[] = [];
    for (const id of ids) {
      const row = byId.get(id);
      if (row !== undefined) {
        ordered.push(row);
      }
    }
    return ordered;
  }

  async getManyPrivate(
    config: FindManyOptions<StatsPopularityPlaylist>,
    account_id: number,
    queueMediumType: QueryParamsQueueMedium | null
  ): Promise<[StatsPopularityPlaylist[], number]> {
    const medium_id = getQueueMediumIdFromType(queueMediumType);

    const [rows, count] = await this.repositoryRead.findAndCount({
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
    for (const row of rows) {
      if (row.playlist) {
        omitUnlistedPlaylistListFields(row.playlist);
      }
    }
    return [rows, count];
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
