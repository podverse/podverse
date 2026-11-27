import { getDataSourceRead } from '@orm/context.js';
import type { EntityManager } from 'typeorm';

import type {
  DTOPerson,
  DTOPersonAppearance,
  DTOPersonChannel,
  DTOPersonContentCounts,
  DTOPersonItem,
  StatsPopularityRange,
} from '@podverse/helpers';
import { MediumEnum, personNameKey, STATS_POPULARITY_COUNT_FIELDS } from '@podverse/helpers';

const PODCAST_MEDIUMS = [MediumEnum.Podcast, MediumEnum.PodcastL];
const ALBUM_MEDIUMS = [MediumEnum.Music, MediumEnum.MusicL];
const ARTIST_MEDIUMS = [MediumEnum.PublisherMusic];
const PUBLIC_PERSON = `(person.item_appearance_count > 0 OR person.channel_cast_count > 0)`;

const PUBLIC_CHANNEL = `COALESCE((
  SELECT policy.public_visible FROM feed_policy policy WHERE policy.feed_id = channel.feed_id
), true)`;

export class PersonNotFoundError extends Error {
  constructor() {
    super('Person not found');
    this.name = 'PersonNotFoundError';
  }
}

function asNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value !== '' && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return 0;
}

function asString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function asDateString(value: unknown): string | null {
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === 'string' && value !== '') {
    return value;
  }
  return null;
}

function rowObject(value: unknown): Record<string, unknown> | null {
  if (typeof value !== 'object' || value === null) {
    return null;
  }
  return Object.fromEntries(Object.entries(value));
}

function escapeLike(value: string): string {
  return value.replaceAll('\\', '\\\\').replaceAll('%', '\\%').replaceAll('_', '\\_');
}

function personFromRow(
  row: Record<string, unknown>,
  includeCounts: DTOPersonContentCounts | null
): DTOPerson {
  const person: DTOPerson = {
    channel_cast_count: asNumber(row.channel_cast_count),
    display_name: asString(row.display_name) ?? '',
    id_text: asString(row.id_text) ?? '',
    item_appearance_count: asNumber(row.item_appearance_count),
    latest_appearance_at: asDateString(row.latest_appearance_at),
    list_image_url: asString(row.list_image_url),
    summary: asString(row.summary),
  };
  if (row.is_followed === true || row.is_followed === false) {
    person.is_followed = row.is_followed;
  }
  if (includeCounts !== null) {
    person.counts = includeCounts;
  }
  return person;
}

function popularityColumn(range: StatsPopularityRange): string {
  return STATS_POPULARITY_COUNT_FIELDS[range];
}

export class PersonService {
  private manager(): EntityManager {
    return getDataSourceRead().manager;
  }

  async list(args: {
    accountId: number | null;
    limit: number;
    page: number;
    query: string;
    range: StatsPopularityRange;
    sort: 'recent' | 'top';
  }): Promise<{ people: DTOPerson[]; count: number }> {
    const nameKey = args.query.trim() === '' ? null : personNameKey(args.query);
    if (args.query.trim() !== '' && nameKey === null) {
      return { people: [], count: 0 };
    }
    const params: unknown[] = [];
    const filters = [PUBLIC_PERSON];
    if (nameKey !== null) {
      params.push(`%${escapeLike(nameKey)}%`);
      filters.push(`person.name_key LIKE $${params.length} ESCAPE '\\'`);
    }
    const where = filters.join(' AND ');
    const countRows: unknown = await this.manager().query(
      `SELECT count(*)::int AS total FROM person WHERE ${where}`,
      params
    );
    const countRow = Array.isArray(countRows) ? rowObject(countRows[0]) : null;
    const count = asNumber(countRow?.total);
    const offset = (args.page - 1) * args.limit;
    if (count === 0 || offset >= count) {
      return { people: [], count };
    }
    const followedSql =
      args.accountId === null
        ? 'false'
        : `EXISTS (
            SELECT 1 FROM account_following_person follow
            WHERE follow.person_id = person.id AND follow.account_id = $${params.length + 1}
          )`;
    const listParams = args.accountId === null ? params : [...params, args.accountId];
    const order =
      args.sort === 'top'
        ? `COALESCE(popularity.${popularityColumn(args.range)}, 0) DESC, person.latest_appearance_at DESC NULLS LAST, person.id DESC`
        : `person.latest_appearance_at DESC NULLS LAST, person.id DESC`;
    const prefixRank =
      nameKey === null
        ? ''
        : `CASE WHEN person.name_key LIKE $${params.length + (args.accountId === null ? 1 : 2)} ESCAPE '\\' THEN 0 ELSE 1 END, `;
    if (nameKey !== null) {
      listParams.push(`${escapeLike(nameKey)}%`);
    }
    listParams.push(args.limit, offset);
    const limitParam = listParams.length - 1;
    const offsetParam = listParams.length;
    const rows: unknown = await this.manager().query(
      `SELECT person.id_text,
              person.display_name,
              person.summary,
              person.list_image_url,
              person.item_appearance_count,
              person.channel_cast_count,
              person.latest_appearance_at,
              ${followedSql} AS is_followed
       FROM person
       LEFT JOIN stats_popularity_person popularity ON popularity.person_id = person.id
       WHERE ${where}
       ORDER BY ${prefixRank}${order}
       LIMIT $${limitParam} OFFSET $${offsetParam}`,
      listParams
    );
    return {
      count,
      people: Array.isArray(rows)
        ? rows.flatMap((row) => {
            const record = rowObject(row);
            return record === null ? [] : [personFromRow(record, null)];
          })
        : [],
    };
  }

  async getByIdText(idText: string, accountId: number | null): Promise<DTOPerson> {
    const params: unknown[] = [idText];
    const followedSql =
      accountId === null
        ? 'false'
        : `EXISTS (
            SELECT 1 FROM account_following_person follow
            WHERE follow.person_id = person.id AND follow.account_id = $2
          )`;
    if (accountId !== null) {
      params.push(accountId);
    }
    const rows: unknown = await this.manager().query(
      `SELECT person.id,
              person.id_text,
              person.display_name,
              person.summary,
              person.list_image_url,
              person.item_appearance_count,
              person.channel_cast_count,
              person.latest_appearance_at,
              ${followedSql} AS is_followed
       FROM person
       WHERE person.id_text = $1`,
      params
    );
    const row = Array.isArray(rows) ? rowObject(rows[0]) : null;
    if (row === null) {
      throw new PersonNotFoundError();
    }
    const personId = asNumber(row.id);
    return personFromRow(row, await this.contentCounts(personId));
  }

  async appearances(
    channelId: number,
    page: number,
    limit: number
  ): Promise<{
    appearances: DTOPersonAppearance[];
    count: number;
  }> {
    const countRows: unknown = await this.manager().query(
      `SELECT count(*)::int AS total
       FROM channel_item_person_count counted
       WHERE counted.channel_id = $1`,
      [channelId]
    );
    const count = asNumber((Array.isArray(countRows) ? rowObject(countRows[0]) : null)?.total);
    const offset = (page - 1) * limit;
    if (count === 0 || offset >= count) {
      return { appearances: [], count };
    }
    const rows: unknown = await this.manager().query(
      `SELECT person.id_text,
              person.display_name,
              counted.item_count,
              (
                SELECT credit.img
                FROM item_person credit
                JOIN item ON item.id = credit.item_id
                WHERE item.channel_id = counted.channel_id
                  AND credit.person_id = counted.person_id
                  AND credit.img IS NOT NULL
                  AND credit.img <> ''
                ORDER BY item.pub_date DESC NULLS LAST
                LIMIT 1
              ) AS img
       FROM channel_item_person_count counted
       JOIN person ON person.id = counted.person_id
       WHERE counted.channel_id = $1
       ORDER BY counted.item_count DESC, person.display_name ASC, person.id ASC
       LIMIT $2 OFFSET $3`,
      [channelId, limit, offset]
    );
    return {
      appearances: Array.isArray(rows)
        ? rows.flatMap((row) => {
            const record = rowObject(row);
            if (record === null || asString(record.id_text) === null) {
              return [];
            }
            return [
              {
                display_name: asString(record.display_name) ?? '',
                id_text: asString(record.id_text) ?? '',
                img: asString(record.img),
                item_count: asNumber(record.item_count),
              },
            ];
          })
        : [],
      count,
    };
  }

  async channels(args: {
    chip: 'podcasts' | 'albums' | 'artists';
    idText: string;
    limit: number;
    page: number;
    range: StatsPopularityRange;
    sort: 'recent' | 'top';
  }): Promise<{ channels: DTOPersonChannel[]; count: number }> {
    const personId = await this.requirePersonId(args.idText);
    const mediums =
      args.chip === 'podcasts'
        ? PODCAST_MEDIUMS
        : args.chip === 'albums'
          ? ALBUM_MEDIUMS
          : ARTIST_MEDIUMS;
    const params: unknown[] = [personId, mediums];
    const from = `FROM channel
      LEFT JOIN channel_person cast
        ON cast.channel_id = channel.id AND cast.person_id = $1
      LEFT JOIN channel_item_person_count counted
        ON counted.channel_id = channel.id AND counted.person_id = $1
      LEFT JOIN channel_about about ON about.channel_id = channel.id
      LEFT JOIN stats_popularity_channel popularity ON popularity.channel_id = channel.id
      WHERE channel.medium_id = ANY($2::int[])
        AND ${PUBLIC_CHANNEL}
        AND (cast.person_id IS NOT NULL OR counted.person_id IS NOT NULL)`;
    return this.pageChannels(from, params, args);
  }

  async items(args: {
    chip: 'episodes' | 'tracks' | 'livestreams';
    idText: string;
    limit: number;
    page: number;
    range: StatsPopularityRange;
    sort: 'recent' | 'top';
  }): Promise<{ items: DTOPersonItem[]; count: number }> {
    const personId = await this.requirePersonId(args.idText);
    const mediums = args.chip === 'tracks' ? ALBUM_MEDIUMS : PODCAST_MEDIUMS;
    const liveSql =
      args.chip === 'livestreams'
        ? 'EXISTS (SELECT 1 FROM live_item live WHERE live.item_id = item.id)'
        : 'NOT EXISTS (SELECT 1 FROM live_item live WHERE live.item_id = item.id)';
    const mediumSql = args.chip === 'livestreams' ? 'TRUE' : 'channel.medium_id = ANY($2::int[])';
    const params: unknown[] = args.chip === 'livestreams' ? [personId] : [personId, mediums];
    const from = `FROM item
      JOIN item_person credit ON credit.item_id = item.id AND credit.person_id = $1
      JOIN channel ON channel.id = item.channel_id
      LEFT JOIN stats_popularity_item popularity ON popularity.item_id = item.id
      WHERE ${mediumSql}
        AND ${liveSql}
        AND ${PUBLIC_CHANNEL}`;
    const count = await this.countDistinct('item.id', from, params);
    const offset = (args.page - 1) * args.limit;
    if (count === 0 || offset >= count) {
      return { items: [], count };
    }
    const rows: unknown = await this.manager().query(
      `SELECT picked.id_text,
              picked.title,
              picked.pub_date,
              picked.channel_id_text,
              picked.channel_title,
              picked.medium_id,
              picked.image_url
       FROM (
         SELECT DISTINCT ON (item.id)
                item.id,
                item.id_text,
                item.title,
                item.pub_date,
                channel.id_text AS channel_id_text,
                channel.title AS channel_title,
                channel.medium_id,
                credit.img AS image_url,
                COALESCE(popularity.${popularityColumn(args.range)}, 0) AS popularity_count
         ${from}
         ORDER BY item.id, credit.id
       ) picked
       ORDER BY ${
         args.sort === 'top'
           ? 'picked.popularity_count DESC, picked.pub_date DESC NULLS LAST, picked.id DESC'
           : 'picked.pub_date DESC NULLS LAST, picked.id DESC'
       }
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, args.limit, offset]
    );
    return {
      count,
      items: Array.isArray(rows)
        ? rows.flatMap((row) => {
            const record = rowObject(row);
            if (record === null) {
              return [];
            }
            return [
              {
                channel_id_text: asString(record.channel_id_text) ?? '',
                channel_title: asString(record.channel_title),
                id_text: asString(record.id_text) ?? '',
                image_url: asString(record.image_url),
                medium_id: asNumber(record.medium_id),
                pub_date: asDateString(record.pub_date),
                title: asString(record.title),
              },
            ];
          })
        : [],
    };
  }

  private async pageChannels(
    from: string,
    params: unknown[],
    args: { limit: number; page: number; range: StatsPopularityRange; sort: 'recent' | 'top' }
  ): Promise<{ channels: DTOPersonChannel[]; count: number }> {
    const count = await this.countDistinct('channel.id', from, params);
    const offset = (args.page - 1) * args.limit;
    if (count === 0 || offset >= count) {
      return { channels: [], count };
    }
    const rows: unknown = await this.manager().query(
      `SELECT picked.id_text,
              picked.title,
              picked.medium_id,
              picked.image_url,
              picked.role,
              picked.item_count
       FROM (
         SELECT DISTINCT ON (channel.id)
                channel.id,
                channel.id_text,
                channel.title,
                channel.medium_id,
                (
                  SELECT image.url
                  FROM channel_image image
                  WHERE image.channel_id = channel.id
                  ORDER BY image.image_width_size ASC NULLS LAST, image.id ASC
                  LIMIT 1
                ) AS image_url,
                cast.role,
                COALESCE(counted.item_count, 0) AS item_count,
                about.last_pub_date,
                COALESCE(popularity.${popularityColumn(args.range)}, 0) AS popularity_count
         ${from}
         ORDER BY channel.id, cast.id NULLS LAST
       ) picked
       ORDER BY ${
         args.sort === 'top'
           ? 'picked.popularity_count DESC, picked.last_pub_date DESC NULLS LAST, picked.id DESC'
           : 'picked.last_pub_date DESC NULLS LAST, picked.id DESC'
       }
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, args.limit, offset]
    );
    return {
      channels: Array.isArray(rows)
        ? rows.flatMap((row) => {
            const record = rowObject(row);
            if (record === null) {
              return [];
            }
            return [
              {
                id_text: asString(record.id_text) ?? '',
                image_url: asString(record.image_url),
                item_count: asNumber(record.item_count),
                medium_id: asNumber(record.medium_id),
                role: asString(record.role),
                title: asString(record.title),
              },
            ];
          })
        : [],
      count,
    };
  }

  private async countDistinct(column: string, from: string, params: unknown[]): Promise<number> {
    const rows: unknown = await this.manager().query(
      `SELECT count(DISTINCT ${column})::int AS total ${from}`,
      params
    );
    return asNumber((Array.isArray(rows) ? rowObject(rows[0]) : null)?.total);
  }

  private async requirePersonId(idText: string): Promise<number> {
    const rows: unknown = await this.manager().query(`SELECT id FROM person WHERE id_text = $1`, [
      idText,
    ]);
    const id = asNumber((Array.isArray(rows) ? rowObject(rows[0]) : null)?.id);
    if (!Number.isInteger(id) || id <= 0) {
      throw new PersonNotFoundError();
    }
    return id;
  }

  private async contentCounts(personId: number): Promise<DTOPersonContentCounts> {
    const rows: unknown = await this.manager().query(
      `WITH credited AS (
         SELECT channel_id FROM channel_person WHERE person_id = $1
         UNION
         SELECT channel_id FROM channel_item_person_count WHERE person_id = $1
       )
       SELECT
         (
           SELECT count(*)::int
           FROM credited
           JOIN channel ON channel.id = credited.channel_id
           WHERE channel.medium_id = ANY($2::int[]) AND ${PUBLIC_CHANNEL}
         ) AS podcasts,
         (
           SELECT count(*)::int
           FROM credited
           JOIN channel ON channel.id = credited.channel_id
           WHERE channel.medium_id = ANY($3::int[]) AND ${PUBLIC_CHANNEL}
         ) AS albums,
         (
           SELECT count(*)::int
           FROM credited
           JOIN channel ON channel.id = credited.channel_id
           WHERE channel.medium_id = ANY($4::int[]) AND ${PUBLIC_CHANNEL}
         ) AS artists,
         (
           SELECT count(DISTINCT item.id)::int
           FROM item_person credit
           JOIN item ON item.id = credit.item_id
           JOIN channel ON channel.id = item.channel_id
           WHERE credit.person_id = $1
             AND channel.medium_id = ANY($2::int[])
             AND ${PUBLIC_CHANNEL}
             AND NOT EXISTS (SELECT 1 FROM live_item live WHERE live.item_id = item.id)
         ) AS episodes,
         (
           SELECT count(DISTINCT item.id)::int
           FROM item_person credit
           JOIN item ON item.id = credit.item_id
           JOIN channel ON channel.id = item.channel_id
           WHERE credit.person_id = $1
             AND channel.medium_id = ANY($3::int[])
             AND ${PUBLIC_CHANNEL}
             AND NOT EXISTS (SELECT 1 FROM live_item live WHERE live.item_id = item.id)
         ) AS tracks,
         (
           SELECT count(DISTINCT item.id)::int
           FROM item_person credit
           JOIN item ON item.id = credit.item_id
           JOIN channel ON channel.id = item.channel_id
           WHERE credit.person_id = $1
             AND ${PUBLIC_CHANNEL}
             AND EXISTS (SELECT 1 FROM live_item live WHERE live.item_id = item.id)
         ) AS livestreams`,
      [personId, PODCAST_MEDIUMS, ALBUM_MEDIUMS, ARTIST_MEDIUMS]
    );
    const row = Array.isArray(rows) ? rowObject(rows[0]) : null;
    return {
      albums: asNumber(row?.albums),
      artists: asNumber(row?.artists),
      episodes: asNumber(row?.episodes),
      livestreams: asNumber(row?.livestreams),
      podcasts: asNumber(row?.podcasts),
      tracks: asNumber(row?.tracks),
    };
  }
}
