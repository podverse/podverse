import { AppDataSourceRead, AppDataSourceReadWrite } from '@orm/db/index.js';
import { Feed } from '@orm/entities/feed/feed.js';
import type { FeedConditionSourceEnum } from '@orm/entities/feed/feedCondition.js';
import type { FeedConditionTypeKeyEnum } from '@orm/entities/feed/feedConditionType.js';
import type { FeedPolicy } from '@orm/entities/feed/feedPolicy.js';
import { applyProperties } from '@orm/lib/applyProperties.js';
import { isPostgresUniqueViolation } from '@orm/lib/postgresUniqueViolation.js';
import type { FindOptionsRelations } from 'typeorm';

import { canonicalHttpOrHttpsUrl } from '@podverse/helpers-validation';

import { computeParsingStaleBefore, deriveHttpsAndHttpUrlsFromInput } from './feed.helpers.js';
import {
  FeedLifecycleStateService,
  type SetFeedLifecycleStateParams,
} from './feedLifecycleState.js';
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
    await AppDataSourceReadWrite.transaction(async (manager) => {
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
    });

    const fed = await this.get(feedId);
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
    options?: { refreshPolicy?: boolean }
  ): Promise<Feed> {
    return this.applyFeedModerationChanges(feedId, {
      lifecycle,
      refreshPolicy: options?.refreshPolicy !== false,
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
}
