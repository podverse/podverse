import { AppDataSourceReadWrite } from '@orm/db/index.js';
import { Channel } from '@orm/entities/channel/channel.js';
import { StatsChannelHidden } from '@orm/entities/stats/statsChannelHidden.js';
import { StatsRecommendation } from '@orm/entities/stats/statsRecommendation.js';
import { StatsTasteProfile } from '@orm/entities/stats/statsTasteProfile.js';
import { StatsTasteProfileHidden } from '@orm/entities/stats/statsTasteProfileHidden.js';
import type { EntityManager } from 'typeorm';

import type {
  DTOAccountRecommendation,
  DTOAccountTasteProfileChannel,
  DTOAccountTasteProfileHiddenRow,
  DTOAccountTasteProfileRow,
  RecommendationChip,
} from '@podverse/helpers';
import {
  RECOMMENDATION_MEDIUM_IDS,
  recommendationWeightChanged,
  recommendationWeightFromListenCount,
} from '@podverse/helpers';

import { refreshRecommendationsForListener } from './recommendationsListenerRefresh.js';
import { StatsListenerService } from './statsListener.js';
import { lockListener, runListenerWrite } from './statsWriteGuard.js';

/**
 * Account-facing Taste Profile reads and edits; every method takes an `account_id` and never
 * returns a listener id.
 */

type TasteProfilePageParams = { limit: number; offset: number };

type ChannelFields = {
  id_text: string;
  slug: string | null;
  title: string | null;
  medium_id: number;
  channel_images: Array<{
    url: string;
    image_width_size: number | null;
    is_resized: boolean;
  }>;
};

export type TasteProfileHideResult =
  { status: 'hidden' } | { status: 'channel_not_found' } | { status: 'not_in_taste_profile' };

export type TasteProfileUnhideResult =
  { status: 'ok'; hidden: boolean; in_taste_profile: boolean } | { status: 'channel_not_found' };

export type TasteProfileWeightResult =
  | { status: 'updated'; weight: number }
  | { status: 'channel_not_found' }
  | { status: 'not_in_taste_profile' };

export type ChannelListHideResult =
  { status: 'hidden' } | { status: 'channel_not_found' } | { status: 'no_listener' };

export type ChannelListUnhideResult =
  { status: 'ok' } | { status: 'channel_not_found' } | { status: 'no_listener' };

function toChannelDto(channel: ChannelFields): DTOAccountTasteProfileChannel {
  return {
    id_text: channel.id_text,
    slug: channel.slug,
    title: channel.title,
    medium_id: channel.medium_id,
    channel_images: channel.channel_images.map((image) => ({
      url: image.url,
      image_width_size: image.image_width_size,
      is_resized: image.is_resized,
    })),
  };
}

function toTasteRow(row: StatsTasteProfile): DTOAccountTasteProfileRow {
  const addedBack = row.listen_count === 0;
  return {
    channel: toChannelDto(row.channel),
    listen_count: row.listen_count,
    completion_count: row.completion_count,
    first_listened_at: addedBack ? null : row.first_listened_at.toISOString(),
    last_listened_at: addedBack ? null : row.last_listened_at.toISOString(),
    recommendation_weight: recommendationWeightFromListenCount(
      row.listen_count,
      row.weight_override
    ),
    recommendation_weight_override: row.weight_override,
  };
}

function toHiddenRow(row: StatsTasteProfileHidden): DTOAccountTasteProfileHiddenRow {
  return {
    channel: toChannelDto(row.channel),
    hidden_at: row.hidden_at.toISOString(),
  };
}

function toChannelHiddenRow(row: StatsChannelHidden): DTOAccountTasteProfileHiddenRow {
  return {
    channel: toChannelDto(row.channel),
    hidden_at: row.hidden_at.toISOString(),
  };
}

export class TasteProfileAccountService {
  private readonly listeners = new StatsListenerService();

  async listForAccount(
    account_id: number,
    params: TasteProfilePageParams
  ): Promise<{ rows: DTOAccountTasteProfileRow[]; total_count: number }> {
    return runListenerWrite(async (manager) => {
      const listener_id = await this.listeners.findListenerId(account_id, manager);
      if (listener_id === null) {
        return { rows: [], total_count: 0 };
      }

      const [entities, total_count] = await manager.getRepository(StatsTasteProfile).findAndCount({
        where: { listener_id },
        relations: { channel: { channel_images: true } },
        order: { last_listened_at: 'DESC', channel_id: 'DESC' },
        skip: params.offset,
        take: params.limit,
      });

      return { rows: entities.map(toTasteRow), total_count };
    });
  }

  async listHiddenForAccount(
    account_id: number,
    params: TasteProfilePageParams
  ): Promise<{ rows: DTOAccountTasteProfileHiddenRow[]; total_count: number }> {
    return runListenerWrite(async (manager) => {
      const listener_id = await this.listeners.findListenerId(account_id, manager);
      if (listener_id === null) {
        return { rows: [], total_count: 0 };
      }

      const [entities, total_count] = await manager
        .getRepository(StatsTasteProfileHidden)
        .findAndCount({
          where: { listener_id },
          relations: { channel: { channel_images: true } },
          order: { hidden_at: 'DESC', channel_id: 'DESC' },
          skip: params.offset,
          take: params.limit,
        });

      return { rows: entities.map(toHiddenRow), total_count };
    });
  }

  async listChannelHiddenForAccount(
    account_id: number,
    params: TasteProfilePageParams
  ): Promise<{ rows: DTOAccountTasteProfileHiddenRow[]; total_count: number }> {
    return runListenerWrite(async (manager) => {
      const listener_id = await this.listeners.findListenerId(account_id, manager);
      if (listener_id === null) {
        return { rows: [], total_count: 0 };
      }

      const [entities, total_count] = await manager.getRepository(StatsChannelHidden).findAndCount({
        where: { listener_id },
        relations: { channel: { channel_images: true } },
        order: { hidden_at: 'DESC', channel_id: 'DESC' },
        skip: params.offset,
        take: params.limit,
      });

      return { rows: entities.map(toChannelHiddenRow), total_count };
    });
  }

  /** Channel ids this account hid from Browse and Recommendations. Empty when there is no listener. */
  async listHiddenChannelIdsForAccount(account_id: number): Promise<number[]> {
    return runListenerWrite(async (manager) => {
      const listener_id = await this.listeners.findListenerId(account_id, manager);
      if (listener_id === null) {
        return [];
      }
      const rows = await manager.getRepository(StatsChannelHidden).find({
        where: { listener_id },
        select: { channel_id: true },
      });
      return rows.map((row) => row.channel_id);
    });
  }

  async hideForAccount(
    account_id: number,
    channel_id_text: string
  ): Promise<TasteProfileHideResult> {
    const channel_id = await this.findChannelId(channel_id_text);
    if (channel_id === null) {
      return { status: 'channel_not_found' };
    }

    let listenerIdToRefresh: string | null = null;
    const result = await runListenerWrite(async (manager) => {
      const outcome = await this.hideLocked(account_id, channel_id, manager);
      if (outcome.status === 'hidden') {
        listenerIdToRefresh = await this.listeners.findListenerId(account_id, manager);
      }
      return outcome;
    });
    if (listenerIdToRefresh !== null) {
      await refreshRecommendationsForListener(listenerIdToRefresh);
    }
    return result;
  }

  async unhideForAccount(
    account_id: number,
    channel_id_text: string,
    add_to_taste_profile: boolean
  ): Promise<TasteProfileUnhideResult> {
    const channel_id = await this.findChannelId(channel_id_text);
    if (channel_id === null) {
      return { status: 'channel_not_found' };
    }

    let listenerIdToRefresh: string | null = null;
    const result = await runListenerWrite(async (manager) => {
      const outcome = await this.unhideLocked(
        account_id,
        channel_id,
        add_to_taste_profile,
        manager
      );
      if (outcome.status === 'ok' && outcome.in_taste_profile && add_to_taste_profile) {
        listenerIdToRefresh = await this.listeners.findListenerId(account_id, manager);
      }
      return outcome;
    });
    if (listenerIdToRefresh !== null) {
      await refreshRecommendationsForListener(listenerIdToRefresh);
    }
    return result;
  }

  async hideChannelFromListsForAccount(
    account_id: number,
    channel_id_text: string
  ): Promise<ChannelListHideResult> {
    const channel_id = await this.findChannelId(channel_id_text);
    if (channel_id === null) {
      return { status: 'channel_not_found' };
    }

    return runListenerWrite(async (manager) => {
      const listener_id = await this.listeners.findListenerId(account_id, manager);
      if (listener_id === null) {
        return { status: 'no_listener' };
      }

      await lockListener(manager, listener_id);
      await manager
        .createQueryBuilder()
        .insert()
        .into(StatsChannelHidden)
        .values({ listener_id, channel_id })
        .orIgnore()
        .execute();
      await manager.getRepository(StatsRecommendation).delete({ listener_id, channel_id });
      return { status: 'hidden' };
    });
  }

  async unhideChannelFromListsForAccount(
    account_id: number,
    channel_id_text: string
  ): Promise<ChannelListUnhideResult> {
    const channel_id = await this.findChannelId(channel_id_text);
    if (channel_id === null) {
      return { status: 'channel_not_found' };
    }

    let listenerIdToRefresh: string | null = null;
    const result = await runListenerWrite(async (manager) => {
      const listener_id = await this.listeners.findListenerId(account_id, manager);
      if (listener_id === null) {
        return { status: 'no_listener' as const };
      }

      await lockListener(manager, listener_id);
      await manager.getRepository(StatsChannelHidden).delete({ listener_id, channel_id });
      listenerIdToRefresh = listener_id;
      return { status: 'ok' as const };
    });
    if (listenerIdToRefresh !== null) {
      await refreshRecommendationsForListener(listenerIdToRefresh);
    }
    return result;
  }

  async listRecommendationsForAccount(
    account_id: number,
    chip: RecommendationChip
  ): Promise<DTOAccountRecommendation[]> {
    return runListenerWrite(async (manager) => {
      const listener_id = await this.listeners.findListenerId(account_id, manager);
      if (listener_id === null) {
        return [];
      }

      const mediumIds = [...RECOMMENDATION_MEDIUM_IDS[chip]];
      const rows = await manager
        .getRepository(StatsRecommendation)
        .createQueryBuilder('recommendation')
        .innerJoinAndSelect('recommendation.channel', 'channel')
        .leftJoinAndSelect('channel.channel_images', 'channel_images')
        .where('recommendation.listener_id = :listener_id', { listener_id })
        .andWhere('channel.medium_id IN (:...mediumIds)', { mediumIds })
        .andWhere(
          `NOT EXISTS (
             SELECT 1 FROM account_following_channel follow
             WHERE follow.account_id = :account_id
               AND follow.channel_id = recommendation.channel_id
           )`,
          { account_id }
        )
        .orderBy('recommendation.score', 'DESC')
        .addOrderBy('recommendation.channel_id', 'ASC')
        .getMany();

      return rows.map((row) => ({
        channel: toChannelDto(row.channel),
        strength: row.strength,
      }));
    });
  }

  async setWeightForAccount(
    account_id: number,
    channel_id_text: string,
    weight: number
  ): Promise<TasteProfileWeightResult> {
    const channel_id = await this.findChannelId(channel_id_text);
    if (channel_id === null) {
      return { status: 'channel_not_found' };
    }

    let listenerIdToRefresh: string | null = null;
    const result = await runListenerWrite(async (manager) => {
      const listener_id = await this.listeners.findListenerId(account_id, manager);
      if (listener_id === null) {
        return { status: 'not_in_taste_profile' as const };
      }

      await lockListener(manager, listener_id);
      const existing = await manager.getRepository(StatsTasteProfile).findOne({
        where: { listener_id, channel_id },
      });
      if (existing === null) {
        return { status: 'not_in_taste_profile' as const };
      }

      const changed = recommendationWeightChanged({
        previousListenCount: existing.listen_count,
        previousWeightOverride: existing.weight_override,
        nextListenCount: existing.listen_count,
        nextWeightOverride: weight,
      });
      const updated = await manager
        .getRepository(StatsTasteProfile)
        .update(
          { listener_id, channel_id },
          { weight_override: weight, weight_override_at: new Date() }
        );
      if ((updated.affected ?? 0) === 0) {
        return { status: 'not_in_taste_profile' as const };
      }
      if (changed) {
        listenerIdToRefresh = listener_id;
      }
      return { status: 'updated' as const, weight };
    });
    if (listenerIdToRefresh !== null) {
      await refreshRecommendationsForListener(listenerIdToRefresh);
    }
    return result;
  }

  private async findChannelId(channel_id_text: string): Promise<number | null> {
    const channel = await AppDataSourceReadWrite.getRepository(Channel).findOne({
      where: { id_text: channel_id_text },
      select: { id: true },
    });
    return channel === null ? null : channel.id;
  }

  private async hideLocked(
    account_id: number,
    channel_id: number,
    manager: EntityManager
  ): Promise<TasteProfileHideResult> {
    const listener_id = await this.listeners.findListenerId(account_id, manager);
    if (listener_id === null) {
      return { status: 'not_in_taste_profile' };
    }

    await lockListener(manager, listener_id);

    const deleted = await manager.getRepository(StatsTasteProfile).delete({
      listener_id,
      channel_id,
    });
    if ((deleted.affected ?? 0) === 0) {
      const hidden = await manager.getRepository(StatsTasteProfileHidden).findOne({
        where: { listener_id, channel_id },
      });
      if (hidden === null) {
        return { status: 'not_in_taste_profile' };
      }
      return { status: 'hidden' };
    }

    await manager
      .createQueryBuilder()
      .insert()
      .into(StatsTasteProfileHidden)
      .values({ listener_id, channel_id })
      .orIgnore()
      .execute();

    return { status: 'hidden' };
  }

  private async unhideLocked(
    account_id: number,
    channel_id: number,
    add_to_taste_profile: boolean,
    manager: EntityManager
  ): Promise<TasteProfileUnhideResult> {
    const listener_id = await this.listeners.findListenerId(account_id, manager);
    if (listener_id === null) {
      return { status: 'ok', hidden: false, in_taste_profile: false };
    }

    await lockListener(manager, listener_id);

    const deleted = await manager.getRepository(StatsTasteProfileHidden).delete({
      listener_id,
      channel_id,
    });
    if ((deleted.affected ?? 0) > 0 && add_to_taste_profile) {
      const addedAt = new Date();
      await manager
        .createQueryBuilder()
        .insert()
        .into(StatsTasteProfile)
        .values({
          listener_id,
          channel_id,
          listen_count: 0,
          completion_count: 0,
          recent_score: 0,
          long_term_score: 0,
          first_listened_at: addedAt,
          last_listened_at: addedAt,
          scores_updated_at: addedAt,
        })
        .orIgnore()
        .execute();
    }

    const taste = await manager.getRepository(StatsTasteProfile).findOne({
      where: { listener_id, channel_id },
    });

    return {
      status: 'ok',
      hidden: false,
      in_taste_profile: taste !== null,
    };
  }
}
