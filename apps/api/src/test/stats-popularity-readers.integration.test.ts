import type { Server } from 'http';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { getQueueMediumIdFromType, MediumEnum, SharableStatusEnum } from '@podverse/helpers';
import type { ORMContext } from '@podverse/orm';

import { startTestApp, stopTestApp } from './helpers/index.js';

vi.mock('@podverse/orm', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@podverse/orm')>();

  class MockCategoryService {
    async setCategoryCache(): Promise<void> {}
  }

  return {
    ...actual,
    CategoryService: MockCategoryService,
  };
});

type EntityManager = ORMContext['dataSourceReadWrite']['manager'];

type SeededChannel = {
  feedId: number;
  channelId: number;
};

function ascending(ids: number[]): number[] {
  return [...ids].sort((left, right) => left - right);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function firstRow(value: unknown): Record<string, unknown> {
  const row = Array.isArray(value) ? value.filter(isRecord)[0] : undefined;
  if (row === undefined) {
    throw new Error('expected a row');
  }
  return row;
}

function asId(value: unknown): number {
  if (typeof value === 'number' && Number.isInteger(value)) {
    return value;
  }
  if (typeof value === 'string' && /^[0-9]+$/.test(value)) {
    return Number(value);
  }
  throw new Error('expected an id');
}

describe('public popularity readers (real database)', () => {
  let server: Server | undefined;
  let ormContext: ORMContext | undefined;
  let manager: EntityManager | undefined;
  const runId = Date.now();
  const idSuffix = String(runId % 100_000_000).padStart(8, '0');
  const feedIds: number[] = [];
  const channelIds: number[] = [];
  const itemIds: number[] = [];
  const accountIds: number[] = [];
  const clipIds: number[] = [];
  const playlistIds: number[] = [];

  const highName = `Reader High ${runId}`;
  const lowName = `Reader Low ${runId}`;

  let tiedLowId = 0;
  let tiedHighId = 0;
  let zeroCountId = 0;
  let noAboutId = 0;
  let itemChannelId = 0;
  let itemId = 0;
  let profileHighId = 0;
  let profileLowId = 0;
  let rankedClipId = 0;
  let zeroDayClipId = 0;
  let rankedPlaylistId = 0;
  let zeroWeekPlaylistId = 0;

  const query = async (sql: string, params: unknown[] = []): Promise<unknown> => {
    if (!manager) {
      throw new Error('ORM manager required');
    }
    return manager.query(sql, params);
  };

  const insertReturningId = async (sql: string, params: unknown[]): Promise<number> => {
    return asId(firstRow(await query(sql, params)).id);
  };

  const seedChannel = async (slot: number, withAbout: boolean): Promise<SeededChannel> => {
    if (!manager) {
      throw new Error('ORM manager required');
    }
    const { Channel, Feed } = await import('@podverse/orm');
    const feedRepo = manager.getRepository(Feed);
    const feed = await feedRepo.save(
      feedRepo.create({
        url: `https://stats-popularity-readers-${runId}-${slot}.example.com/feed.xml`,
        podcast_index_id: 1_600_000_000 + (runId % 100_000_000) + slot,
      })
    );
    feedIds.push(feed.id);
    const channelRepo = manager.getRepository(Channel);
    const channel = await channelRepo.save(
      channelRepo.create({
        feed_id: feed.id,
        medium_id: MediumEnum.Podcast,
        title: `Popularity readers ${runId} ${slot}`,
      })
    );
    channelIds.push(channel.id);
    await query(`INSERT INTO feed_policy (feed_id, public_visible) VALUES ($1, true)`, [feed.id]);
    if (withAbout) {
      await query(`INSERT INTO channel_about (channel_id) VALUES ($1)`, [channel.id]);
    }
    return { feedId: feed.id, channelId: channel.id };
  };

  const insertChannelPopularity = async (channelId: number, weekCount: number): Promise<void> => {
    await query(
      `INSERT INTO stats_popularity_channel
         (channel_id, day_count, week_count, month_count, all_time_count)
       VALUES ($1, 0, $2, 0, 0)`,
      [channelId, weekCount]
    );
  };

  const seedPublicAccount = async (label: string, displayName: string): Promise<number> => {
    if (!manager) {
      throw new Error('ORM manager required');
    }
    const { AccountService } = await import('@podverse/orm');
    const email = `stats-popularity-readers-${label}-${runId}@example.com`;
    const accountService = new AccountService();
    await accountService.create({
      email,
      password: 'IntegrationTest1!',
      locale: 'en-US',
      terms_version: '2026-10-15',
    });
    const account = await accountService.getByEmail(email);
    if (!account) {
      throw new Error(`Failed to load account ${label}`);
    }
    accountIds.push(account.id);
    await query(`UPDATE account SET sharable_status_id = $2 WHERE id = $1`, [
      account.id,
      SharableStatusEnum.Public,
    ]);
    await query(`UPDATE account_profile SET display_name = $2 WHERE account_id = $1`, [
      account.id,
      displayName,
    ]);
    return account.id;
  };

  beforeAll(async () => {
    const started = await startTestApp();
    server = started.server;
    ormContext = started.ormContext;
    if (!ormContext) {
      throw new Error('ORM context required for the popularity readers integration test');
    }
    manager = ormContext.dataSourceReadWrite.manager;

    const first = await seedChannel(1, true);
    const second = await seedChannel(2, true);
    const zero = await seedChannel(3, true);
    const hidden = await seedChannel(4, false);
    tiedLowId = Math.min(first.channelId, second.channelId);
    tiedHighId = Math.max(first.channelId, second.channelId);
    zeroCountId = zero.channelId;
    noAboutId = hidden.channelId;
    itemChannelId = first.channelId;

    await insertChannelPopularity(tiedLowId, 5);
    await insertChannelPopularity(tiedHighId, 5);
    await insertChannelPopularity(zeroCountId, 0);
    await insertChannelPopularity(noAboutId, 9);

    const { Item } = await import('@podverse/orm');
    const itemRepo = manager.getRepository(Item);
    const item = await itemRepo.save(
      itemRepo.create({
        channel_id: String(itemChannelId),
        title: `Popularity readers item ${runId}`,
        item_flag_status: { id: 1 },
        guid: `https://stats-popularity-readers-${runId}.example.com/item`,
      })
    );
    itemId = item.id;
    itemIds.push(item.id);
    await query(
      `INSERT INTO stats_popularity_item
         (item_id, day_count, week_count, month_count, all_time_count)
       VALUES ($1, 0, 0, 0, 1)`,
      [item.id]
    );

    profileHighId = await seedPublicAccount('high', highName);
    profileLowId = await seedPublicAccount('low', lowName);
    await query(
      `INSERT INTO stats_popularity_account
         (account_id, day_count, week_count, month_count, all_time_count)
       VALUES ($1, 0, 0, 0, $2)`,
      [profileHighId, 11]
    );
    await query(
      `INSERT INTO stats_popularity_account
         (account_id, day_count, week_count, month_count, all_time_count)
       VALUES ($1, 0, 0, 0, $2)`,
      [profileLowId, 2]
    );

    const avMediumId = getQueueMediumIdFromType('av');
    if (avMediumId === null) {
      throw new Error('AV queue medium id is required to seed public playlists');
    }

    rankedClipId = await insertReturningId(
      `INSERT INTO clip
         (id_text, account_id, item_id, start_time, end_time, created_at, sharable_status_id)
       VALUES ($1, $2, $3, 10, 70, now(), $4)
       RETURNING id`,
      [`rdclpa${idSuffix}`, profileHighId, itemId, SharableStatusEnum.Public]
    );
    clipIds.push(rankedClipId);
    zeroDayClipId = await insertReturningId(
      `INSERT INTO clip
         (id_text, account_id, item_id, start_time, end_time, created_at, sharable_status_id)
       VALUES ($1, $2, $3, 10, 70, now(), $4)
       RETURNING id`,
      [`rdclpb${idSuffix}`, profileHighId, itemId, SharableStatusEnum.Public]
    );
    clipIds.push(zeroDayClipId);
    await query(
      `INSERT INTO stats_popularity_clip
         (clip_id, day_count, week_count, month_count, all_time_count)
       VALUES ($1, 3, 3, 3, 3)`,
      [rankedClipId]
    );
    await query(
      `INSERT INTO stats_popularity_clip
         (clip_id, day_count, week_count, month_count, all_time_count)
       VALUES ($1, 0, 0, 4, 4)`,
      [zeroDayClipId]
    );

    rankedPlaylistId = await insertReturningId(
      `INSERT INTO playlist
         (id_text, account_id, sharable_status_id, medium_id, title, last_updated)
       VALUES ($1, $2, $3, $4, $5, now())
       RETURNING id`,
      [
        `rdplpa${idSuffix}`,
        profileHighId,
        SharableStatusEnum.Public,
        avMediumId,
        `Readers ranked ${runId}`,
      ]
    );
    playlistIds.push(rankedPlaylistId);
    zeroWeekPlaylistId = await insertReturningId(
      `INSERT INTO playlist
         (id_text, account_id, sharable_status_id, medium_id, title, last_updated)
       VALUES ($1, $2, $3, $4, $5, now())
       RETURNING id`,
      [
        `rdplpb${idSuffix}`,
        profileHighId,
        SharableStatusEnum.Public,
        avMediumId,
        `Readers zero week ${runId}`,
      ]
    );
    playlistIds.push(zeroWeekPlaylistId);
    await query(
      `INSERT INTO stats_popularity_playlist
         (playlist_id, day_count, week_count, month_count, all_time_count)
       VALUES ($1, 0, 2, 2, 2)`,
      [rankedPlaylistId]
    );
    await query(
      `INSERT INTO stats_popularity_playlist
         (playlist_id, day_count, week_count, month_count, all_time_count)
       VALUES ($1, 0, 0, 0, 5)`,
      [zeroWeekPlaylistId]
    );
  }, 120000);

  afterAll(async () => {
    try {
      if (manager) {
        if (channelIds.length > 0) {
          await manager.query(
            `DELETE FROM stats_popularity_channel WHERE channel_id = ANY($1::int[])`,
            [channelIds]
          );
        }
        if (itemIds.length > 0) {
          await manager.query(`DELETE FROM stats_popularity_item WHERE item_id = ANY($1::int[])`, [
            itemIds,
          ]);
        }
        if (accountIds.length > 0) {
          await manager.query(
            `DELETE FROM stats_popularity_account WHERE account_id = ANY($1::int[])`,
            [accountIds]
          );
        }
        if (clipIds.length > 0) {
          await manager.query(`DELETE FROM stats_popularity_clip WHERE clip_id = ANY($1::int[])`, [
            clipIds,
          ]);
          await manager.query(`DELETE FROM clip WHERE id = ANY($1::int[])`, [clipIds]);
        }
        if (playlistIds.length > 0) {
          await manager.query(
            `DELETE FROM stats_popularity_playlist WHERE playlist_id = ANY($1::int[])`,
            [playlistIds]
          );
          await manager.query(`DELETE FROM playlist WHERE id = ANY($1::int[])`, [playlistIds]);
        }
        if (feedIds.length > 0) {
          await manager.query(`DELETE FROM feed WHERE id = ANY($1::int[])`, [feedIds]);
        }
        const { AccountService } = await import('@podverse/orm');
        const accountService = new AccountService();
        for (const accountId of accountIds) {
          await accountService.delete(accountId);
        }
      }
    } finally {
      await stopTestApp(server, ormContext);
    }
  });

  it('returns the non-zero channels in channel id order and ranks both', async () => {
    const { StatsPopularityChannelService } = await import('@podverse/orm');
    const service = new StatsPopularityChannelService();
    const scopedIds = [tiedLowId, tiedHighId, zeroCountId];

    const rows = await service.getMany(
      { order: { week_count: 'DESC', channel_id: 'ASC' } },
      null,
      null,
      { channelIds: scopedIds, minCountField: 'week_count' }
    );
    expect(rows.map((row) => row.channel_id)).toEqual(ascending([tiedLowId, tiedHighId]));

    const count = await service.countRanked(null, null, 'week_count', scopedIds);
    expect(count).toBe(2);

    const rankedIds = await service.getRankedChannelIds(null, null, 'week_count', 10, scopedIds);
    expect(rankedIds).toHaveLength(2);
    expect(rankedIds).toEqual(expect.arrayContaining([tiedLowId, tiedHighId]));
  });

  it('leaves out a channel that has a popularity row and no channel about row', async () => {
    const { StatsPopularityChannelService } = await import('@podverse/orm');
    const service = new StatsPopularityChannelService();
    const rows = await service.getMany(
      { order: { week_count: 'DESC', channel_id: 'ASC' } },
      null,
      null,
      { channelIds: [noAboutId, tiedLowId], minCountField: 'week_count' }
    );
    expect(rows.map((row) => row.channel_id)).toEqual([tiedLowId]);
  });

  it('returns a normal item on a seeded channel with its item relation loaded', async () => {
    const { StatsPopularityItemService } = await import('@podverse/orm');
    const service = new StatsPopularityItemService();
    const rows = await service.getMany({ relations: { item: true } }, null, null, 'normal', null, {
      channelIds: [itemChannelId],
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.item_id).toBe(itemId);
    expect(rows[0]?.item.id).toBe(itemId);
  });

  it('returns public profiles ordered by all-time count with the profile loaded', async () => {
    const { StatsPopularityAccountService } = await import('@podverse/orm');
    const service = new StatsPopularityAccountService();
    const [rows, count] = await service.getManyByAccountsAndCount(
      [profileLowId, profileHighId],
      {
        order: { all_time_count: 'DESC', account_id: 'ASC' },
        relations: { account: { account_profile: true } },
      },
      'global'
    );
    expect(count).toBe(2);
    expect(rows.map((row) => row.account_id)).toEqual([profileHighId, profileLowId]);
    expect(rows[0]?.account.account_profile.display_name).toBe(highName);
    expect(rows[1]?.account.account_profile.display_name).toBe(lowName);
  });

  it('leaves out a public clip whose count for the range is zero', async () => {
    const { StatsPopularityClipService } = await import('@podverse/orm');
    const service = new StatsPopularityClipService();

    const ranked = await service.getManyPublic(
      { where: { clip_id: rankedClipId } },
      null,
      null,
      'day_count'
    );
    expect(ranked.map((row) => row.clip_id)).toEqual([rankedClipId]);

    const zeroDay = await service.getManyPublic(
      { where: { clip_id: zeroDayClipId } },
      null,
      null,
      'day_count'
    );
    expect(zeroDay).toEqual([]);

    const zeroDayMonth = await service.getManyPublic(
      { where: { clip_id: zeroDayClipId } },
      null,
      null,
      'month_count'
    );
    expect(zeroDayMonth.map((row) => row.clip_id)).toEqual([zeroDayClipId]);
  });

  it('counts only public clips whose count for the range is above zero', async () => {
    const { StatsPopularityClipService } = await import('@podverse/orm');
    const service = new StatsPopularityClipService();
    const result = await service.getManyAndCountPublic(
      { where: { clip_id: zeroDayClipId } },
      null,
      null,
      'day_count'
    );
    expect(result).toEqual([[], 0]);
  });

  it('leaves out a public playlist whose count for the range is zero', async () => {
    const { StatsPopularityPlaylistService } = await import('@podverse/orm');
    const service = new StatsPopularityPlaylistService();

    const ranked = await service.getManyPublic(
      { where: { playlist_id: rankedPlaylistId } },
      'all',
      'week_count'
    );
    expect(ranked.map((row) => row.playlist_id)).toEqual([rankedPlaylistId]);

    const zeroWeek = await service.getManyPublic(
      { where: { playlist_id: zeroWeekPlaylistId } },
      'all',
      'week_count'
    );
    expect(zeroWeek).toEqual([]);

    const zeroWeekAllTime = await service.getManyPublic(
      { where: { playlist_id: zeroWeekPlaylistId } },
      'all',
      'all_time_count'
    );
    expect(zeroWeekAllTime.map((row) => row.playlist_id)).toEqual([zeroWeekPlaylistId]);
  });

  it('leaves out a public profile whose count for the range is zero', async () => {
    const { StatsPopularityAccountService } = await import('@podverse/orm');
    const service = new StatsPopularityAccountService();

    const zeroWeek = await service.getMany(
      { where: { account_id: profileHighId } },
      'global',
      'week_count'
    );
    expect(zeroWeek).toEqual([]);

    const allTime = await service.getMany(
      { where: { account_id: profileHighId } },
      'global',
      'all_time_count'
    );
    expect(allTime.map((row) => row.account_id)).toEqual([profileHighId]);
  });

  it('keeps a subscribed profile whose count for the range is zero', async () => {
    const { StatsPopularityAccountService } = await import('@podverse/orm');
    const service = new StatsPopularityAccountService();
    const [, count] = await service.getManyByAccountsAndCount(
      [profileHighId, profileLowId],
      { order: { week_count: 'DESC', account_id: 'ASC' } },
      'subscribed'
    );
    expect(count).toBe(2);
  });
});
