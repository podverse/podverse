import { AppDataSourceRead, AppDataSourceReadWrite } from '@orm/db/index.js';
import { Feed } from '@orm/entities/feed/feed.js';
import type { FeedConditionSourceEnum } from '@orm/entities/feed/feedCondition.js';
import type { FeedConditionTypeKeyEnum } from '@orm/entities/feed/feedConditionType.js';
import { FeedLifecycleStateKeyEnum } from '@orm/entities/feed/feedLifecycleStateType.js';
import type { FeedPolicy } from '@orm/entities/feed/feedPolicy.js';
import { applyProperties } from '@orm/lib/applyProperties.js';
import { isPostgresUniqueViolation } from '@orm/lib/postgresUniqueViolation.js';
import { readQueryResultRows } from '@orm/lib/queryResultRows.js';
import type { EntityManager, FindOptionsRelations } from 'typeorm';
import { QueryFailedError } from 'typeorm';

import { canonicalHttpOrHttpsUrl } from '@podverse/helpers-validation';

import { computeParsingStaleBefore, deriveHttpsAndHttpUrlsFromInput } from './feed.helpers.js';
import type { SetFeedLifecycleStateParams } from './feedLifecycleState.js';
import { FeedLifecycleStateService } from './feedLifecycleState.js';
import { FeedPolicyService } from './feedPolicy.js';

type FeedCreateDto = {
  url: string;
  podcast_index_id: number;
};

type FeedUpdateDto = {
  url?: string;
  is_parsing?: Date | null;
  parsing_priority?: number;
  last_parsed_file_hash?: string | null;
  container_id?: string | null;
  description_truncated_count?: number;
  description_longest_source_length?: number | null;
  description_truncated_at?: Date;
};

/** Mutations applied inside {@link FeedService.applyFeedModerationChanges}. */
export type FeedConditionMutation = {
  conditionKey: FeedConditionTypeKeyEnum;
  isActive: boolean;
  source: FeedConditionSourceEnum;
  note?: string | null;
};

export type ApplyFeedModerationChangesParams = {
  conditionMutations?: FeedConditionMutation[];
  lifecycle?: SetFeedLifecycleStateParams;
  refreshPolicy?: boolean;
  /** When set, lifecycle and policy writes join this transaction instead of opening one. */
  manager?: EntityManager;
};

const FEED_RELATIONS: FindOptionsRelations<Feed> = {
  channel: true,
  feed_lifecycle_state: { feed_lifecycle_state_type: true },
  feed_log: true,
  feed_policy: true,
};

export class FeedService {
  private repositoryRead = AppDataSourceRead.getRepository(Feed);
  private repositoryReadWrite = AppDataSourceReadWrite.getRepository(Feed);

  async get(id: number): Promise<Feed | null> {
    return this.repositoryRead.findOne({
      where: { id },
      relations: FEED_RELATIONS,
    });
  }

  async getAll(): Promise<Feed[]> {
    return await this.repositoryRead.find({
      relations: FEED_RELATIONS,
    });
  }

  async getByPodcastGuid(podcast_guid: string): Promise<Feed | null> {
    return this.repositoryRead.findOne({
      where: {
        channel: {
          podcast_guid,
        },
      },
      relations: FEED_RELATIONS,
    });
  }

  async getByUrl({ url }: { url: string }): Promise<Feed | null> {
    const { httpsUrl, httpUrl } = deriveHttpsAndHttpUrlsFromInput(url);

    const httpsFeed = await this.repositoryRead.findOne({
      where: {
        url: httpsUrl,
      },
      relations: FEED_RELATIONS,
    });
    if (httpsFeed) {
      return httpsFeed;
    }

    const httpFeed = await this.repositoryRead.findOne({
      where: {
        url: httpUrl,
      },
      relations: FEED_RELATIONS,
    });
    if (httpFeed) {
      return httpFeed;
    }

    return null;
  }

  async getByUrlAndPodcastIndexId({
    url,
    podcast_index_id,
  }: {
    url: string;
    podcast_index_id: number;
  }): Promise<Feed | null> {
    return this.repositoryRead.findOne({
      where: {
        url,
        podcast_index_id,
      },
      relations: FEED_RELATIONS,
    });
  }

  async getByPodcastIndexId(podcast_index_id: number): Promise<Feed | null> {
    return this.repositoryRead.findOne({
      where: {
        podcast_index_id,
      },
      relations: FEED_RELATIONS,
    });
  }

  async listPodcastIndexIds(): Promise<number[]> {
    const rows = await this.repositoryRead
      .createQueryBuilder('feed')
      .select('feed.podcast_index_id', 'podcast_index_id')
      .where('feed.podcast_index_id IS NOT NULL')
      .getRawMany<{ podcast_index_id: number | string }>();
    const ids: number[] = [];
    for (const row of rows) {
      const id =
        typeof row.podcast_index_id === 'number'
          ? row.podcast_index_id
          : Number(row.podcast_index_id);
      if (Number.isFinite(id)) {
        ids.push(id);
      }
    }
    return ids;
  }

  /** Returns the maximum podcast_index_id in the feeds table, or null if empty. Used in test-assets mode for auto-increment. */
  async getMaxPodcastIndexId(): Promise<number | null> {
    const result = await this.repositoryRead
      .createQueryBuilder('feed')
      .select('MAX(feed.podcast_index_id)', 'max')
      .getRawOne<{ max: number | string | null }>();
    const max = result?.max;
    if (max === null || max === undefined) return null;
    const n = typeof max === 'number' ? max : parseInt(String(max), 10);
    return Number.isNaN(n) ? null : n;
  }

  async getOrCreate({ url: urlRaw, podcast_index_id }: FeedCreateDto): Promise<Feed> {
    const url = canonicalHttpOrHttpsUrl(urlRaw) ?? urlRaw;
    const feed = await this.repositoryRead.findOne({
      where: { url },
      relations: FEED_RELATIONS,
    });

    if (feed) {
      return feed;
    }

    try {
      return await this.create({ url, podcast_index_id });
    } catch (error) {
      if (!isPostgresUniqueViolation(error)) {
        throw error;
      }

      const existingByPodcastIndexId = await this.getByPodcastIndexId(podcast_index_id);
      if (existingByPodcastIndexId) {
        return existingByPodcastIndexId;
      }

      const existingByUrl = await this.getByUrl({ url });
      if (existingByUrl) {
        return existingByUrl;
      }

      throw error;
    }
  }

  async create({ url: urlRaw, podcast_index_id }: FeedCreateDto): Promise<Feed> {
    const url = canonicalHttpOrHttpsUrl(urlRaw) ?? urlRaw;
    const feed = new Feed();
    feed.url = url;
    feed.podcast_index_id = podcast_index_id;
    feed.is_parsing = null;
    feed.parsing_priority = 0;
    feed.container_id = '';

    return this.repositoryReadWrite.save(feed);
  }

  async update(id: number, dto: FeedUpdateDto): Promise<Feed> {
    if (dto.url !== undefined && dto.url !== null) {
      dto = { ...dto, url: canonicalHttpOrHttpsUrl(dto.url) ?? dto.url };
    }

    let feed = await this.get(id);

    if (!feed) {
      throw new Error(`FeedService.update: feed ${id} not found`);
    }

    feed = applyProperties(feed, dto);

    return this.repositoryReadWrite.save(feed);
  }

  async tryStartParsing(id: number, maxParsingAgeMinutes = 15): Promise<boolean> {
    const parsingStaleBefore = computeParsingStaleBefore(Date.now(), maxParsingAgeMinutes);
    const now = new Date();
    const result = await this.repositoryReadWrite
      .createQueryBuilder()
      .update(Feed)
      .set({ is_parsing: now })
      .where('id = :id', { id })
      .andWhere('(is_parsing IS NULL OR is_parsing < :parsingStaleBefore)', { parsingStaleBefore })
      .execute();

    return (result.affected ?? 0) > 0;
  }

  /** Transactionally applies condition rows, optional lifecycle update, and policy recompute. */
  async applyFeedModerationChanges(
    feedId: number,
    params: ApplyFeedModerationChangesParams
  ): Promise<Feed> {
    const apply = async (manager: EntityManager) => {
      const fp = new FeedPolicyService(manager);
      const lifecycleSvc = new FeedLifecycleStateService(manager);

      if (params.conditionMutations) {
        for (const m of params.conditionMutations) {
          await fp.setCondition({
            feedId,
            conditionKey: m.conditionKey,
            isActive: m.isActive,
            source: m.source,
            note: m.note,
          });
        }
      }

      if (params.lifecycle) {
        await lifecycleSvc.setLifecycleState(feedId, params.lifecycle);
      }

      if (params.refreshPolicy !== false) {
        await fp.recomputePolicy(feedId);
      }
    };

    if (params.manager) {
      await apply(params.manager);
    } else {
      await AppDataSourceReadWrite.transaction(apply);
    }

    const fed = params.manager
      ? await params.manager.findOne(Feed, { where: { id: feedId }, relations: FEED_RELATIONS })
      : await this.get(feedId);
    if (!fed) {
      throw new Error(
        `FeedService.applyFeedModerationChanges: feed ${feedId} not found after update`
      );
    }
    return fed;
  }

  async setFeedConditions(
    feedId: number,
    mutations: FeedConditionMutation[],
    options?: { refreshPolicy?: boolean }
  ): Promise<Feed> {
    return this.applyFeedModerationChanges(feedId, {
      conditionMutations: mutations,
      refreshPolicy: options?.refreshPolicy !== false,
    });
  }

  async setFeedLifecycleState(
    feedId: number,
    lifecycle: SetFeedLifecycleStateParams,
    options?: { refreshPolicy?: boolean; manager?: EntityManager }
  ): Promise<Feed> {
    return this.applyFeedModerationChanges(feedId, {
      lifecycle,
      refreshPolicy: options?.refreshPolicy !== false,
      ...(options?.manager ? { manager: options.manager } : {}),
    });
  }

  /** Recomputes derived policy from current conditions/lifecycle. */
  async refreshFeedPolicy(feedId: number): Promise<FeedPolicy> {
    let policy: FeedPolicy | undefined;
    await AppDataSourceReadWrite.transaction(async (manager) => {
      const fp = new FeedPolicyService(manager);
      policy = await fp.recomputePolicy(feedId);
    });

    if (!policy) {
      throw new Error(
        `FeedService.refreshFeedPolicy: policy missing after recompute for feed ${feedId}`
      );
    }

    return policy;
  }

  /**
   * Feed id and lifecycle state key for each Podcast Index id we store.
   * A feed with no lifecycle row has `stateKey` null.
   */
  async listLifecycleByPodcastIndexIds(
    podcastIndexIds: readonly number[]
  ): Promise<FeedLifecycleByPodcastIndexId[]> {
    const rows: FeedLifecycleByPodcastIndexId[] = [];
    const chunkSize = 2000;
    for (let index = 0; index < podcastIndexIds.length; index += chunkSize) {
      const chunk = podcastIndexIds.slice(index, index + chunkSize);
      if (chunk.length === 0) {
        continue;
      }
      const found = await this.repositoryRead
        .createQueryBuilder('feed')
        .leftJoin('feed.feed_lifecycle_state', 'lifecycle')
        .leftJoin('lifecycle.feed_lifecycle_state_type', 'lifecycle_type')
        .select('feed.id', 'feed_id')
        .addSelect('feed.podcast_index_id', 'podcast_index_id')
        .addSelect('lifecycle_type.state_key', 'state_key')
        .where('feed.podcast_index_id IN (:...ids)', { ids: chunk })
        .getRawMany<{
          feed_id: number | string;
          podcast_index_id: number | string;
          state_key: string | null;
        }>();
      for (const row of found) {
        const feedId = finiteInteger(row.feed_id);
        const podcastIndexId = finiteInteger(row.podcast_index_id);
        if (feedId === null || podcastIndexId === null) {
          continue;
        }
        rows.push({
          feedId,
          podcastIndexId,
          stateKey: feedLifecycleStateKey(row.state_key),
        });
      }
    }
    return rows;
  }

  /**
   * Up to `limit` feeds with `feed.id` above `afterFeedId`, in `feed.id` order, with what a sweep
   * against Podcast Index needs. `stateKey` and `lastFinishedParseTime` are null without a
   * lifecycle or feed log row.
   */
  async listForGapSweep(params: {
    afterFeedId: number;
    limit: number;
  }): Promise<FeedGapSweepRow[]> {
    const found = await this.repositoryRead
      .createQueryBuilder('feed')
      .leftJoin('feed.feed_lifecycle_state', 'lifecycle')
      .leftJoin('lifecycle.feed_lifecycle_state_type', 'lifecycle_type')
      .leftJoin('feed.feed_log', 'feed_log')
      .select('feed.id', 'feed_id')
      .addSelect('feed.url', 'url')
      .addSelect('feed.podcast_index_id', 'podcast_index_id')
      .addSelect('lifecycle_type.state_key', 'state_key')
      .addSelect('feed_log.last_finished_parse_time', 'last_finished_parse_time')
      .where('feed.id > :afterFeedId', { afterFeedId: params.afterFeedId })
      .orderBy('feed.id', 'ASC')
      .limit(params.limit)
      .getRawMany<{
        feed_id: number | string;
        url: string;
        podcast_index_id: number | string;
        state_key: string | null;
        last_finished_parse_time: Date | string | null;
      }>();
    const rows: FeedGapSweepRow[] = [];
    for (const row of found) {
      const feedId = finiteInteger(row.feed_id);
      const podcastIndexId = finiteInteger(row.podcast_index_id);
      if (feedId === null || podcastIndexId === null) {
        continue;
      }
      rows.push({
        feedId,
        url: row.url,
        podcastIndexId,
        stateKey: feedLifecycleStateKey(row.state_key),
        lastFinishedParseTime: dateOrNull(row.last_finished_parse_time),
      });
    }
    return rows;
  }

  /**
   * The item with the latest `pub_date` in each feed's channel. Feeds without a channel or without
   * a dated item are absent from the result.
   */
  async listNewestItemByFeedIds(feedIds: readonly number[]): Promise<FeedNewestItem[]> {
    if (feedIds.length === 0) {
      return [];
    }
    const result: unknown = await this.repositoryRead.query(
      `SELECT channel.feed_id, newest.guid, newest.guid_enclosure_url, newest.pub_date
       FROM public.channel AS channel
       CROSS JOIN LATERAL (
         SELECT item.guid, item.guid_enclosure_url, item.pub_date
         FROM public.item AS item
         WHERE item.channel_id = channel.id AND item.pub_date IS NOT NULL
         ORDER BY item.pub_date DESC
         LIMIT 1
       ) AS newest
       WHERE channel.feed_id = ANY($1::int[])`,
      [[...feedIds]]
    );
    const rows: FeedNewestItem[] = [];
    for (const row of readQueryResultRows(result) ?? []) {
      if (typeof row !== 'object' || row === null) {
        continue;
      }
      const feedId = finiteInteger(numberOrStringField(row, 'feed_id'));
      if (feedId === null) {
        continue;
      }
      rows.push({
        feedId,
        guid: stringOrNullField(row, 'guid'),
        enclosureUrl: stringOrNullField(row, 'guid_enclosure_url'),
        pubDate: dateOrNull(Reflect.get(row, 'pub_date')),
      });
    }
    return rows;
  }

  /** Feeds with this lifecycle reason and no channel row. Ordered by Podcast Index id. */
  async listByLifecycleReasonWithoutChannel(reasonKey: string): Promise<FeedIdAndPodcastIndexId[]> {
    const found = await this.repositoryRead
      .createQueryBuilder('feed')
      .innerJoin('feed.feed_lifecycle_state', 'lifecycle')
      .leftJoin('feed.channel', 'channel')
      .select('feed.id', 'feed_id')
      .addSelect('feed.podcast_index_id', 'podcast_index_id')
      .where('lifecycle.reason_key = :reasonKey', { reasonKey })
      .andWhere('channel.id IS NULL')
      .orderBy('feed.podcast_index_id', 'ASC')
      .getRawMany<{ feed_id: number | string; podcast_index_id: number | string }>();
    const rows: FeedIdAndPodcastIndexId[] = [];
    for (const row of found) {
      const id = finiteInteger(row.feed_id);
      const podcastIndexId = finiteInteger(row.podcast_index_id);
      if (id === null || podcastIndexId === null) {
        continue;
      }
      rows.push({ id, podcastIndexId });
    }
    return rows;
  }

  /**
   * Deletes the feed when no channel points at it.
   * `blocked` means a foreign key refused the delete. The row is left in place.
   */
  async deleteFeedWithoutChannel(feedId: number): Promise<FeedDeleteWithoutChannelResult> {
    try {
      const result: unknown = await this.repositoryReadWrite.query(
        `DELETE FROM public.feed AS target
         WHERE target.id = $1
           AND NOT EXISTS (
             SELECT 1 FROM public.channel AS channel WHERE channel.feed_id = target.id
           )`,
        [feedId]
      );
      return postgresRowCount(result) > 0 ? 'deleted' : 'skipped';
    } catch (error) {
      if (isPostgresForeignKeyViolation(error)) {
        return 'blocked';
      }
      throw error;
    }
  }
}

export type FeedLifecycleByPodcastIndexId = {
  feedId: number;
  podcastIndexId: number;
  stateKey: FeedLifecycleStateKeyEnum | null;
};

export type FeedIdAndPodcastIndexId = {
  id: number;
  podcastIndexId: number;
};

export type FeedDeleteWithoutChannelResult = 'deleted' | 'skipped' | 'blocked';

export type FeedGapSweepRow = {
  feedId: number;
  url: string;
  podcastIndexId: number;
  stateKey: FeedLifecycleStateKeyEnum | null;
  lastFinishedParseTime: Date | null;
};

/** `enclosureUrl` is the stored `item.guid_enclosure_url`. */
export type FeedNewestItem = {
  feedId: number;
  guid: string | null;
  enclosureUrl: string | null;
  pubDate: Date | null;
};

function dateOrNull(value: unknown): Date | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}

function numberOrStringField(row: object, key: string): number | string | null {
  const value: unknown = Reflect.get(row, key);
  return typeof value === 'number' || typeof value === 'string' ? value : null;
}

function stringOrNullField(row: object, key: string): string | null {
  const value: unknown = Reflect.get(row, key);
  return typeof value === 'string' ? value : null;
}

function finiteInteger(value: number | string | null | undefined): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function feedLifecycleStateKey(value: string | null): FeedLifecycleStateKeyEnum | null {
  if (
    value === FeedLifecycleStateKeyEnum.Active ||
    value === FeedLifecycleStateKeyEnum.PendingArchive ||
    value === FeedLifecycleStateKeyEnum.Archived ||
    value === FeedLifecycleStateKeyEnum.Merged ||
    value === FeedLifecycleStateKeyEnum.Takedown
  ) {
    return value;
  }
  return null;
}

function postgresRowCount(result: unknown): number {
  if (Array.isArray(result)) {
    const rowCount = result[1];
    return typeof rowCount === 'number' ? rowCount : 0;
  }
  if (typeof result === 'object' && result !== null) {
    const rowCount = Reflect.get(result, 'rowCount');
    if (typeof rowCount === 'number') {
      return rowCount;
    }
  }
  return 0;
}

const PG_FOREIGN_KEY_VIOLATION = '23503';

function isPostgresForeignKeyViolation(error: unknown): boolean {
  if (!(error instanceof QueryFailedError)) {
    return false;
  }
  const ownCode = Reflect.get(error, 'code');
  const driver = error.driverError;
  const driverCode =
    typeof driver === 'object' && driver !== null ? Reflect.get(driver, 'code') : undefined;
  return ownCode === PG_FOREIGN_KEY_VIOLATION || driverCode === PG_FOREIGN_KEY_VIOLATION;
}
