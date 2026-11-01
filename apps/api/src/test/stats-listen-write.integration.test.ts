import { randomUUID } from 'node:crypto';

import type { Server } from 'http';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import type { PopularityListenResult, PopularityOpenResult } from '@podverse/helpers';
import { fadeTasteScore, MediumEnum, POPULARITY_TASTE_HALF_LIFE_DAYS } from '@podverse/helpers';
import type { ORMContext, StatsListenTarget, StatsOpenTarget } from '@podverse/orm';

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

type SeededAccount = { id: number; idText: string };

type SeededEntity = { id: number; idText: string };

type DailyCounts = { listener_count: number; completion_count: number };

type TasteRow = {
  listen_count: number;
  completion_count: number;
  recent_score: number;
  long_term_score: number;
  first_listened_at: Date;
  last_listened_at: Date;
  scores_updated_at: Date;
};

type ListenInput = {
  accountId: number;
  target: StatsListenTarget;
  clientListenId: string;
  secondsHeard: number;
  mediaDurationSeconds?: number | null;
  completed?: boolean;
  storedDailyCap?: number;
  popularityDailyCap?: number;
  minIntervalSeconds?: number;
  allTimeRecountDays?: number;
  flagTooSoonMinutes?: number;
  flagStoredCapWithinHours?: number;
  countsTowardPopularity?: boolean;
};

const AGREEMENT_VERSION = 'stats-listen-write-test';
const STORED_DAILY_CAP = 300;
const POPULARITY_DAILY_CAP = 100;
const OPEN_DAILY_CAP = 10;
const ALL_TIME_RECOUNT_DAYS = 90;
const ITEM_DURATION_SECONDS = 200;
const DAY_MS = 86_400_000;

const DAILY_TABLES = {
  item: { table: 'stats_daily_item', column: 'item_id' },
  channel: { table: 'stats_daily_channel', column: 'channel_id' },
  clip: { table: 'stats_daily_clip', column: 'clip_id' },
} as const;

const OPEN_DAILY_TABLES = {
  account: { table: 'stats_daily_account', column: 'account_id' },
  playlist: { table: 'stats_daily_playlist', column: 'playlist_id' },
} as const;

const ALL_TIME_DAILY_TABLES = { ...DAILY_TABLES, ...OPEN_DAILY_TABLES } as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function rowsOf(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

function firstRow(value: unknown): Record<string, unknown> {
  const row = rowsOf(value)[0];
  if (row === undefined) {
    throw new Error('expected a row');
  }
  return row;
}

function asText(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number' || typeof value === 'bigint') {
    return String(value);
  }
  throw new Error('expected a text or numeric value');
}

function asNumber(value: unknown): number {
  if (typeof value === 'number') {
    return value;
  }
  throw new Error('expected a number');
}

function asDate(value: unknown): Date {
  if (value instanceof Date) {
    return value;
  }
  throw new Error('expected a timestamp');
}

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

function itemTarget(item: SeededEntity): StatsListenTarget {
  return { kind: 'item', id_text: item.idText };
}

describe('Popularity listen and open write services (real database)', () => {
  let server: Server | undefined;
  let ormContext: ORMContext | undefined;
  let manager: EntityManager;
  const runId = Date.now();
  const suffix = String(runId).slice(-8);
  const createdAccountIds: number[] = [];
  const createdFeedIds: number[] = [];

  let listener: SeededAccount;
  let owner: SeededAccount;
  let ownerPlaylist: SeededEntity;
  let podcastChannelId: number;
  let podcastItem: SeededEntity;
  let hiddenShowItem: SeededEntity;
  let concurrencyItem: SeededEntity;
  let minIntervalItem: SeededEntity;
  let albumChannelId: number;
  let artistChannelId: number;
  let track: SeededEntity;
  let clip: SeededEntity;
  let removedClip: SeededEntity;
  const secondSession = randomUUID();

  const query = async (sql: string, params: unknown[] = []): Promise<unknown> =>
    manager.query(sql, params);

  const seedAccount = async (label: string, consent: boolean | null): Promise<SeededAccount> => {
    const { AccountService, AccountSettingsListenStatsService } = await import('@podverse/orm');
    const accountService = new AccountService();
    const email = `stats-listen-write-${label}-${runId}@example.com`;
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
    createdAccountIds.push(account.id);
    if (consent !== null) {
      await new AccountSettingsListenStatsService().update({
        account_id: account.id,
        accepted: consent,
        agreement_version: AGREEMENT_VERSION,
      });
    }
    return { id: account.id, idText: account.id_text };
  };

  const seedChannel = async (
    label: string,
    mediumId: MediumEnum,
    podcastGuid: string | null = null
  ): Promise<number> => {
    const { Channel, Feed } = await import('@podverse/orm');
    const feedRepo = manager.getRepository(Feed);
    const feed = await feedRepo.save(
      feedRepo.create({
        url: `https://stats-listen-write-${runId}-${label}.example.com/feed.xml`,
        podcast_index_id: 1_400_000_000 + (runId % 100_000_000) * 4 + createdFeedIds.length,
      })
    );
    createdFeedIds.push(feed.id);
    const channelRepo = manager.getRepository(Channel);
    const channel = await channelRepo.save(
      channelRepo.create({
        feed_id: feed.id,
        medium_id: mediumId,
        title: `Stats listen write ${label} ${runId}`,
        podcast_guid: podcastGuid,
      })
    );
    return channel.id;
  };

  const seedItem = async (
    channelId: number,
    label: string,
    durationSeconds: number | null
  ): Promise<SeededEntity> => {
    const { Item } = await import('@podverse/orm');
    const itemRepo = manager.getRepository(Item);
    const item = await itemRepo.save(
      itemRepo.create({
        channel_id: String(channelId),
        title: `Stats listen write ${label}`,
        item_flag_status: { id: 1 },
        guid: `https://stats-listen-write.example.com/${runId}/${label}`,
      })
    );
    if (durationSeconds !== null) {
      await query('INSERT INTO item_about (item_id, duration) VALUES ($1, $2)', [
        item.id,
        durationSeconds,
      ]);
    }
    return { id: item.id, idText: item.id_text };
  };

  const seedClip = async (idText: string, sourceRemoved: boolean): Promise<SeededEntity> => {
    const row = firstRow(
      await query(
        `INSERT INTO clip
           (id_text, account_id, item_id, start_time, end_time, created_at, sharable_status_id,
            source_removed_at)
         VALUES ($1, $2, $3, 10, 70, now(), 1, CASE WHEN $4::boolean THEN now() END)
         RETURNING id`,
        [idText, owner.id, podcastItem.id, sourceRemoved]
      )
    );
    return { id: asNumber(row.id), idText };
  };

  const listen = async (input: ListenInput): Promise<PopularityListenResult> => {
    const { StatsListenWriteService } = await import('@podverse/orm');
    return new StatsListenWriteService().recordListen({
      account_id: input.accountId,
      agreement_version: AGREEMENT_VERSION,
      stored_daily_cap: input.storedDailyCap ?? STORED_DAILY_CAP,
      popularity_daily_cap: input.popularityDailyCap ?? POPULARITY_DAILY_CAP,
      min_interval_seconds: input.minIntervalSeconds ?? 0,
      all_time_recount_days: input.allTimeRecountDays ?? ALL_TIME_RECOUNT_DAYS,
      flag_too_soon_minutes: input.flagTooSoonMinutes ?? 0,
      flag_stored_cap_within_hours: input.flagStoredCapWithinHours ?? 0,
      counts_toward_popularity: input.countsTowardPopularity ?? true,
      target: input.target,
      client_listen_id: input.clientListenId,
      seconds_heard: input.secondsHeard,
      completed: input.completed ?? false,
      media_duration_seconds: input.mediaDurationSeconds ?? null,
    });
  };

  const open = async (
    accountId: number,
    target: StatsOpenTarget,
    dailyCap = OPEN_DAILY_CAP
  ): Promise<PopularityOpenResult> => {
    const { StatsOpenWriteService } = await import('@podverse/orm');
    return new StatsOpenWriteService().recordOpen({
      account_id: accountId,
      agreement_version: AGREEMENT_VERSION,
      daily_cap: dailyCap,
      all_time_recount_days: ALL_TIME_RECOUNT_DAYS,
      target,
    });
  };

  const setOptedOutAt = async (accountId: number, sqlInterval: string): Promise<void> => {
    await query(
      `UPDATE account_settings SET listen_stats_opted_out_at = now() - $2::interval
        WHERE account_id = $1`,
      [accountId, sqlInterval]
    );
  };

  const listenerRowCount = async (accountId: number): Promise<number> =>
    asNumber(
      firstRow(
        await query(
          'SELECT count(*)::int AS total FROM listener_identity.stats_listener WHERE account_id = $1',
          [accountId]
        )
      ).total
    );

  const listenerIdOf = async (accountId: number): Promise<string> =>
    asText(
      firstRow(
        await query(
          'SELECT listener_id FROM listener_identity.stats_listener WHERE account_id = $1',
          [accountId]
        )
      ).listener_id
    );

  const flagRow = async (listenerId: string): Promise<Record<string, unknown> | null> =>
    rowsOf(
      await query(
        `SELECT reason, times_flagged, cleared_at, cleared_by_admin_id
           FROM stats_flagged_listener
          WHERE listener_id = $1::uuid`,
        [listenerId]
      )
    )[0] ?? null;

  const signalRow = async (listenerId: string): Promise<Record<string, unknown> | null> =>
    rowsOf(
      await query(
        `SELECT too_soon_minutes, last_too_soon_minute
           FROM stats_flag_signal
          WHERE listener_id = $1::uuid`,
        [listenerId]
      )
    )[0] ?? null;

  const moveRunBack = async (listenerId: string, minutes: number): Promise<void> => {
    await query(
      `UPDATE stats_flag_signal
          SET last_too_soon_minute = last_too_soon_minute - make_interval(mins => $2)
        WHERE listener_id = $1::uuid`,
      [listenerId, minutes]
    );
  };

  // The too-soon run is keyed by the database clock's UTC minute, so a test that expects several
  // calls in one minute starts only when at least 10 seconds of the current minute remain.
  const waitForFreshMinute = async (): Promise<void> => {
    const secondsIntoMinute = asNumber(
      firstRow(await query(`SELECT extract(second FROM now())::float8 AS seconds`)).seconds
    );
    if (secondsIntoMinute > 50) {
      await new Promise((resolve) => setTimeout(resolve, (60 - secondsIntoMinute) * 1000 + 100));
    }
  };

  const listenEvents = async (accountId: number): Promise<Record<string, unknown>[]> =>
    rowsOf(
      await query(
        `SELECT e.id::text AS id, e.item_id, e.channel_id, e.clip_id, e.seconds_heard, e.completed,
                e.popularity_counted, e.item_all_time_counted, e.channel_all_time_counted,
                e.clip_all_time_counted, e.client_listen_id::text AS client_listen_id
           FROM stats_listen_event e
           JOIN listener_identity.stats_listener l ON l.listener_id = e.listener_id
          WHERE l.account_id = $1
          ORDER BY e.created_at, e.id`,
        [accountId]
      )
    );

  const dailyCounts = async (
    entity: keyof typeof DAILY_TABLES,
    entityId: number,
    day: string
  ): Promise<DailyCounts | null> => {
    const { table, column } = DAILY_TABLES[entity];
    const row = rowsOf(
      await query(
        `SELECT listener_count, completion_count FROM ${table} WHERE ${column} = $1 AND day = $2::date`,
        [entityId, day]
      )
    )[0];
    return row === undefined
      ? null
      : {
          listener_count: asNumber(row.listener_count),
          completion_count: asNumber(row.completion_count),
        };
  };

  const allTimeDailyCount = async (
    entity: keyof typeof ALL_TIME_DAILY_TABLES,
    entityId: number,
    day: string
  ): Promise<number> => {
    const { table, column } = ALL_TIME_DAILY_TABLES[entity];
    const row = rowsOf(
      await query(
        `SELECT all_time_listener_count FROM ${table} WHERE ${column} = $1 AND day = $2::date`,
        [entityId, day]
      )
    )[0];
    return row === undefined ? 0 : asNumber(row.all_time_listener_count);
  };

  const backdateListens = async (
    listenerId: string,
    hours: number,
    clientListenId: string | null = null
  ): Promise<void> => {
    await query(
      `UPDATE stats_listen_event SET created_at = created_at - make_interval(hours => $2)
        WHERE listener_id = $1::uuid AND ($3::uuid IS NULL OR client_listen_id = $3::uuid)`,
      [listenerId, hours, clientListenId]
    );
  };

  const backdateOpens = async (listenerId: string, hours: number): Promise<void> => {
    await query(
      `UPDATE stats_open_event SET created_at = created_at - make_interval(hours => $2)
        WHERE listener_id = $1::uuid`,
      [listenerId, hours]
    );
  };

  const dailyOpenCount = async (
    kind: keyof typeof OPEN_DAILY_TABLES,
    entityId: number,
    day: string
  ): Promise<number> => {
    const { table, column } = OPEN_DAILY_TABLES[kind];
    const row = rowsOf(
      await query(`SELECT listener_count FROM ${table} WHERE ${column} = $1 AND day = $2::date`, [
        entityId,
        day,
      ])
    )[0];
    return row === undefined ? 0 : asNumber(row.listener_count);
  };

  const tasteRow = async (accountId: number, channelId: number): Promise<TasteRow | null> => {
    const row = rowsOf(
      await query(
        `SELECT t.listen_count, t.completion_count, t.recent_score, t.long_term_score,
                t.first_listened_at, t.last_listened_at, t.scores_updated_at
           FROM stats_taste_profile t
           JOIN listener_identity.stats_listener l ON l.listener_id = t.listener_id
          WHERE l.account_id = $1 AND t.channel_id = $2`,
        [accountId, channelId]
      )
    )[0];
    if (row === undefined) {
      return null;
    }
    return {
      listen_count: asNumber(row.listen_count),
      completion_count: asNumber(row.completion_count),
      recent_score: asNumber(row.recent_score),
      long_term_score: asNumber(row.long_term_score),
      first_listened_at: asDate(row.first_listened_at),
      last_listened_at: asDate(row.last_listened_at),
      scores_updated_at: asDate(row.scores_updated_at),
    };
  };

  const requireTasteRow = async (accountId: number, channelId: number): Promise<TasteRow> => {
    const row = await tasteRow(accountId, channelId);
    if (row === null) {
      throw new Error('expected a taste row');
    }
    return row;
  };

  const tasteRowCount = async (accountId: number): Promise<number> =>
    asNumber(
      firstRow(
        await query(
          `SELECT count(*)::int AS total
             FROM stats_taste_profile t
             JOIN listener_identity.stats_listener l ON l.listener_id = t.listener_id
            WHERE l.account_id = $1`,
          [accountId]
        )
      ).total
    );

  const setTasteScores = async (
    accountId: number,
    channelId: number,
    scoresUpdatedAtSql: string
  ): Promise<void> => {
    await query(
      `UPDATE stats_taste_profile t
          SET recent_score = 1, long_term_score = 1, scores_updated_at = ${scoresUpdatedAtSql}
         FROM listener_identity.stats_listener l
        WHERE l.listener_id = t.listener_id AND l.account_id = $1 AND t.channel_id = $2`,
      [accountId, channelId]
    );
  };

  beforeAll(async () => {
    const started = await startTestApp();
    server = started.server;
    ormContext = started.ormContext;
    if (!ormContext) {
      throw new Error('ORM context required for the stats listen write integration test');
    }
    manager = ormContext.dataSourceReadWrite.manager;

    listener = await seedAccount('listener', true);
    owner = await seedAccount('owner', true);
    const { PlaylistService } = await import('@podverse/orm');
    const playlist = await new PlaylistService().getOrCreateDefaultLikesPlaylist(
      owner.id,
      MediumEnum.AV
    );
    ownerPlaylist = { id: playlist.id, idText: playlist.id_text };

    podcastChannelId = await seedChannel('podcast', MediumEnum.Podcast);
    podcastItem = await seedItem(podcastChannelId, 'episode', ITEM_DURATION_SECONDS);
    hiddenShowItem = await seedItem(podcastChannelId, 'hidden-show', ITEM_DURATION_SECONDS);
    concurrencyItem = await seedItem(podcastChannelId, 'concurrency', ITEM_DURATION_SECONDS);
    minIntervalItem = await seedItem(podcastChannelId, 'min-interval', ITEM_DURATION_SECONDS);
    clip = await seedClip(`swcl${suffix}`, false);
    removedClip = await seedClip(`swrm${suffix}`, true);

    const artistGuid = randomUUID();
    artistChannelId = await seedChannel('artist', MediumEnum.PublisherMusic, artistGuid);
    albumChannelId = await seedChannel('album', MediumEnum.Music);
    track = await seedItem(albumChannelId, 'track', null);
    const publisher = firstRow(
      await query('INSERT INTO channel_publisher (channel_id) VALUES ($1) RETURNING id', [
        albumChannelId,
      ])
    );
    await query(
      'INSERT INTO channel_publisher_remote_item (channel_publisher_id, feed_guid) VALUES ($1, $2)',
      [asNumber(publisher.id), artistGuid]
    );
  }, 60000);

  afterAll(async () => {
    if (ormContext) {
      const { AccountService } = await import('@podverse/orm');
      const accountService = new AccountService();
      for (const accountId of createdAccountIds) {
        await accountService.delete(accountId);
      }
      if (createdFeedIds.length > 0) {
        await query('DELETE FROM feed WHERE id = ANY($1::int[])', [createdFeedIds]);
      }
    }
    await stopTestApp(server, ormContext);
  });

  it('stores a counted item listen with one listener id, daily rows, and a new taste row', async () => {
    expect(
      await listen({
        accountId: listener.id,
        target: itemTarget(podcastItem),
        clientListenId: randomUUID(),
        secondsHeard: 100,
      })
    ).toBe('counted');

    expect(await listenerRowCount(listener.id)).toBe(1);
    const events = await listenEvents(listener.id);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      item_id: podcastItem.id,
      channel_id: podcastChannelId,
      clip_id: null,
      seconds_heard: 100,
      completed: false,
    });
    expect(await dailyCounts('item', podcastItem.id, todayUtc())).toEqual({
      listener_count: 1,
      completion_count: 0,
    });
    expect(await dailyCounts('channel', podcastChannelId, todayUtc())).toEqual({
      listener_count: 1,
      completion_count: 0,
    });
    expect(await tasteRow(listener.id, podcastChannelId)).toMatchObject({
      listen_count: 1,
      completion_count: 0,
      recent_score: 1,
      long_term_score: 1,
    });
  });

  it('counts a second session on the same item without a second daily listener', async () => {
    expect(
      await listen({
        accountId: listener.id,
        target: itemTarget(podcastItem),
        clientListenId: secondSession,
        secondsHeard: 100,
      })
    ).toBe('counted');

    expect(await listenEvents(listener.id)).toHaveLength(2);
    expect(await dailyCounts('item', podcastItem.id, todayUtc())).toMatchObject({
      listener_count: 1,
    });
    expect(await dailyCounts('channel', podcastChannelId, todayUtc())).toMatchObject({
      listener_count: 1,
    });
    expect(await tasteRow(listener.id, podcastChannelId)).toMatchObject({ listen_count: 2 });
    expect(await listenerRowCount(listener.id)).toBe(1);
  });

  it('answers a repeated session report with unchanged and a finished one with updated', async () => {
    const tasteBefore = await requireTasteRow(listener.id, podcastChannelId);
    const repeat: ListenInput = {
      accountId: listener.id,
      target: itemTarget(podcastItem),
      clientListenId: secondSession,
      secondsHeard: 100,
    };

    expect(await listen(repeat)).toBe('unchanged');
    expect(await listen({ ...repeat, completed: true })).toBe('updated');

    const events = await listenEvents(listener.id);
    expect(events).toHaveLength(2);
    expect(events.find((event) => event.client_listen_id === secondSession)?.completed).toBe(true);
    expect(await dailyCounts('item', podcastItem.id, todayUtc())).toEqual({
      listener_count: 1,
      completion_count: 1,
    });
    expect(await dailyCounts('channel', podcastChannelId, todayUtc())).toEqual({
      listener_count: 1,
      completion_count: 1,
    });
    const tasteAfter = await requireTasteRow(listener.id, podcastChannelId);
    expect(tasteAfter.listen_count).toBe(tasteBefore.listen_count);
    expect(tasteAfter.completion_count).toBe(tasteBefore.completion_count + 1);
    expect(tasteAfter.recent_score).toBeCloseTo(tasteBefore.recent_score + 1, 6);
    expect(tasteAfter.long_term_score).toBeCloseTo(tasteBefore.long_term_score + 1, 6);
  });

  it('stores nothing below the counted-listen rule and creates no listener id for it', async () => {
    const newcomer = await seedAccount('below-threshold', true);
    expect(
      await listen({
        accountId: newcomer.id,
        target: itemTarget(podcastItem),
        clientListenId: randomUUID(),
        secondsHeard: 49,
      })
    ).toBe('below_threshold');
    expect(await listenerRowCount(newcomer.id)).toBe(0);

    const eventsBefore = await listenEvents(listener.id);
    expect(
      await listen({
        accountId: listener.id,
        target: itemTarget(podcastItem),
        clientListenId: randomUUID(),
        secondsHeard: 49,
      })
    ).toBe('below_threshold');
    expect(await listenEvents(listener.id)).toHaveLength(eventsBefore.length);
  });

  it('writes nothing for an account that turned Taste Profile off', async () => {
    const declined = await seedAccount('declined', false);
    expect(
      await listen({
        accountId: declined.id,
        target: itemTarget(podcastItem),
        clientListenId: randomUUID(),
        secondsHeard: 120,
      })
    ).toBe('not_allowed');
    expect(await open(declined.id, { kind: 'account', id_text: owner.idText })).toBe('not_allowed');
    expect(await listenerRowCount(declined.id)).toBe(0);
  });

  it('stops new sessions at the daily cap and still records a finish for a stored session', async () => {
    const capped = await seedAccount('daily-cap', true);
    const firstSession = randomUUID();
    const report = (clientListenId: string, completed = false): ListenInput => ({
      accountId: capped.id,
      target: itemTarget(podcastItem),
      clientListenId,
      secondsHeard: 100,
      completed,
      storedDailyCap: 2,
      popularityDailyCap: 2,
    });

    expect(await listen(report(firstSession))).toBe('counted');
    expect(await listen(report(randomUUID()))).toBe('counted');
    expect(await listen(report(randomUUID()))).toBe('daily_cap_reached');
    expect(await listen(report(firstSession, true))).toBe('updated');
    expect(await listenEvents(capped.id)).toHaveLength(2);
  });

  it('stores a listen that does not count toward popularity for taste only', async () => {
    const tasteOnly = await seedAccount('taste-only', true);
    const freshItem = await seedItem(podcastChannelId, 'taste-only', ITEM_DURATION_SECONDS);
    const channelDailyBefore = await dailyCounts('channel', podcastChannelId, todayUtc());

    expect(
      await listen({
        accountId: tasteOnly.id,
        target: itemTarget(freshItem),
        clientListenId: randomUUID(),
        secondsHeard: 100,
        countsTowardPopularity: false,
      })
    ).toBe('counted');

    const events = await listenEvents(tasteOnly.id);
    expect(events).toHaveLength(1);
    expect(events[0]?.popularity_counted).toBe(false);
    expect(await dailyCounts('item', freshItem.id, todayUtc())).toBeNull();
    expect(await dailyCounts('channel', podcastChannelId, todayUtc())).toEqual(channelDailyBefore);
    expect((await requireTasteRow(tasteOnly.id, podcastChannelId)).listen_count).toBe(1);
  });

  it('stores listens past the popularity cap for taste only and counts none of them daily', async () => {
    const heavy = await seedAccount('popularity-cap', true);
    const freshItem = await seedItem(podcastChannelId, 'popularity-cap', ITEM_DURATION_SECONDS);
    const channelDailyBefore = await dailyCounts('channel', podcastChannelId, todayUtc());
    const report = (
      item: SeededEntity,
      clientListenId: string,
      completed = false
    ): ListenInput => ({
      accountId: heavy.id,
      target: itemTarget(item),
      clientListenId,
      secondsHeard: 100,
      completed,
      storedDailyCap: 3,
      popularityDailyCap: 1,
    });

    expect(await listen(report(podcastItem, randomUUID()))).toBe('counted');
    const channelDailyAfterFirst = await dailyCounts('channel', podcastChannelId, todayUtc());
    expect(channelDailyAfterFirst?.listener_count).toBe(
      (channelDailyBefore?.listener_count ?? 0) + 1
    );

    const overCapSession = randomUUID();
    expect(await listen(report(freshItem, overCapSession))).toBe('counted');
    const events = await listenEvents(heavy.id);
    expect(events.map((event) => event.popularity_counted)).toEqual([true, false]);
    expect(await dailyCounts('item', freshItem.id, todayUtc())).toBeNull();
    expect(await dailyCounts('channel', podcastChannelId, todayUtc())).toEqual(
      channelDailyAfterFirst
    );
    const tasteBefore = await requireTasteRow(heavy.id, podcastChannelId);
    expect(tasteBefore.listen_count).toBe(2);

    expect(await listen(report(freshItem, overCapSession, true))).toBe('updated');
    expect(await dailyCounts('item', freshItem.id, todayUtc())).toBeNull();
    expect(await dailyCounts('channel', podcastChannelId, todayUtc())).toEqual(
      channelDailyAfterFirst
    );
    expect((await requireTasteRow(heavy.id, podcastChannelId)).completion_count).toBe(
      tasteBefore.completion_count + 1
    );

    expect(await listen(report(freshItem, randomUUID()))).toBe('counted');
    expect((await listenEvents(heavy.id)).map((event) => event.popularity_counted)).toEqual([
      true,
      false,
      false,
    ]);
    expect(await listen(report(freshItem, randomUUID()))).toBe('daily_cap_reached');
  });

  it('answers too_soon for a new session inside the minimum interval and still updates the stored session', async () => {
    const quick = await seedAccount('min-interval', true);
    const sessionA: ListenInput = {
      accountId: quick.id,
      target: itemTarget(podcastItem),
      clientListenId: randomUUID(),
      secondsHeard: 100,
      minIntervalSeconds: 20,
    };
    const sessionB: ListenInput = {
      accountId: quick.id,
      target: itemTarget(minIntervalItem),
      clientListenId: randomUUID(),
      secondsHeard: 100,
      minIntervalSeconds: 20,
    };

    expect(await listen(sessionA)).toBe('counted');
    const channelDailyBefore = await dailyCounts('channel', podcastChannelId, todayUtc());

    expect(await listen(sessionB)).toBe('too_soon');
    expect(await listenEvents(quick.id)).toHaveLength(1);
    expect(await dailyCounts('item', minIntervalItem.id, todayUtc())).toBeNull();
    expect(await dailyCounts('channel', podcastChannelId, todayUtc())).toEqual(channelDailyBefore);
    expect(await tasteRow(quick.id, podcastChannelId)).toMatchObject({ listen_count: 1 });

    expect(await listen({ ...sessionA, completed: true })).toBe('updated');

    await query(
      `UPDATE stats_listen_event SET created_at = created_at - interval '21 seconds'
        WHERE listener_id = $1::uuid`,
      [await listenerIdOf(quick.id)]
    );
    expect(await listen(sessionB)).toBe('counted');
    expect(await listenEvents(quick.id)).toHaveLength(2);
    expect(await dailyCounts('item', minIntervalItem.id, todayUtc())).toMatchObject({
      listener_count: 1,
    });
  });

  it('stores listens in the opt-out cooldown for the Taste Profile only and answers counted', async () => {
    const returning = await seedAccount('cooldown', true);
    const coolingItem = await seedItem(podcastChannelId, 'cooldown-a', ITEM_DURATION_SECONDS);
    const recountedItem = await seedItem(podcastChannelId, 'cooldown-b', ITEM_DURATION_SECONDS);

    await setOptedOutAt(returning.id, '1 day');
    expect(
      await listen({
        accountId: returning.id,
        target: itemTarget(coolingItem),
        clientListenId: randomUUID(),
        secondsHeard: 100,
      })
    ).toBe('counted');
    expect((await listenEvents(returning.id)).map((event) => event.popularity_counted)).toEqual([
      false,
    ]);
    expect(await dailyCounts('item', coolingItem.id, todayUtc())).toBeNull();
    expect(await tasteRow(returning.id, podcastChannelId)).toMatchObject({ listen_count: 1 });

    await setOptedOutAt(returning.id, '91 days');
    expect(
      await listen({
        accountId: returning.id,
        target: itemTarget(recountedItem),
        clientListenId: randomUUID(),
        secondsHeard: 100,
      })
    ).toBe('counted');
    expect((await listenEvents(returning.id)).map((event) => event.popularity_counted)).toEqual([
      false,
      true,
    ]);
    expect(await dailyCounts('item', recountedItem.id, todayUtc())).toMatchObject({
      listener_count: 1,
    });
  });

  it('answers too_soon for a new listen inside the minimum interval after an opt-out, without creating a listener id', async () => {
    const returning = await seedAccount('opt-out-too-soon', true);
    const session: ListenInput = {
      accountId: returning.id,
      target: itemTarget(podcastItem),
      clientListenId: randomUUID(),
      secondsHeard: 100,
      minIntervalSeconds: 20,
    };

    await setOptedOutAt(returning.id, '5 seconds');
    expect(await listen(session)).toBe('too_soon');
    expect(await listenerRowCount(returning.id)).toBe(0);

    await setOptedOutAt(returning.id, '21 seconds');
    expect(await listen(session)).toBe('counted');
  });

  it("keeps today's stored listens against the stored cap after an opt-out and a new Yes", async () => {
    const returning = await seedAccount('opt-out-stored-cap', true);
    const report = (): ListenInput => ({
      accountId: returning.id,
      target: itemTarget(podcastItem),
      clientListenId: randomUUID(),
      secondsHeard: 100,
      storedDailyCap: 3,
    });

    expect(await listen(report())).toBe('counted');
    expect(await listen(report())).toBe('counted');
    const listenerId = await listenerIdOf(returning.id);

    const { AccountSettingsListenStatsService } = await import('@podverse/orm');
    const settingsService = new AccountSettingsListenStatsService();
    await settingsService.update({
      account_id: returning.id,
      accepted: false,
      agreement_version: AGREEMENT_VERSION,
    });
    await settingsService.update({
      account_id: returning.id,
      accepted: true,
      agreement_version: AGREEMENT_VERSION,
    });
    expect(await listenerIdOf(returning.id)).toBe(listenerId);

    expect(await listen(report())).toBe('counted');
    expect((await listenEvents(returning.id)).map((event) => event.popularity_counted)).toEqual([
      false,
    ]);
    expect(await listen(report())).toBe('daily_cap_reached');

    await query(
      `UPDATE listener_identity.stats_listener
          SET opt_out_day = opt_out_day - 1,
              opt_out_day_first_stored_at = opt_out_day_first_stored_at - interval '1 day'
        WHERE listener_id = $1::uuid`,
      [listenerId]
    );
    expect(await listen(report())).toBe('counted');
    expect(
      firstRow(
        await query(
          'SELECT opt_out_day FROM listener_identity.stats_listener WHERE listener_id = $1::uuid',
          [listenerId]
        )
      ).opt_out_day
    ).toBeNull();
  });

  it('leaves the taste row of a hidden show alone and still counts the listen daily', async () => {
    const hider = await seedAccount('hidden', true);
    expect(
      await listen({
        accountId: hider.id,
        target: itemTarget(podcastItem),
        clientListenId: randomUUID(),
        secondsHeard: 100,
      })
    ).toBe('counted');
    await query(
      'INSERT INTO stats_taste_profile_hidden (listener_id, channel_id) VALUES ($1::uuid, $2)',
      [await listenerIdOf(hider.id), podcastChannelId]
    );
    const tasteBefore = await tasteRow(hider.id, podcastChannelId);

    expect(
      await listen({
        accountId: hider.id,
        target: itemTarget(hiddenShowItem),
        clientListenId: randomUUID(),
        secondsHeard: 100,
        completed: true,
      })
    ).toBe('counted');

    expect(await dailyCounts('item', hiddenShowItem.id, todayUtc())).toEqual({
      listener_count: 1,
      completion_count: 1,
    });
    expect(await tasteRow(hider.id, podcastChannelId)).toEqual(tasteBefore);
    expect(await tasteRowCount(hider.id)).toBe(1);
  });

  it('adds a track listen to the album and artist taste rows and to track and album daily rows', async () => {
    expect(
      await listen({
        accountId: listener.id,
        target: itemTarget(track),
        clientListenId: randomUUID(),
        secondsHeard: 100,
      })
    ).toBe('counted');

    expect(await tasteRow(listener.id, albumChannelId)).toMatchObject({ listen_count: 1 });
    expect(await tasteRow(listener.id, artistChannelId)).toMatchObject({ listen_count: 1 });
    expect(await dailyCounts('item', track.id, todayUtc())).toEqual({
      listener_count: 1,
      completion_count: 0,
    });
    expect(await dailyCounts('channel', albumChannelId, todayUtc())).toEqual({
      listener_count: 1,
      completion_count: 0,
    });
    expect(
      firstRow(
        await query(
          'SELECT count(*)::int AS total FROM stats_daily_channel WHERE channel_id = $1',
          [artistChannelId]
        )
      ).total
    ).toBe(0);
  });

  it('stores a clip listen with its item and channel and refuses removed or unknown clips', async () => {
    const clipSession = randomUUID();
    expect(
      await listen({
        accountId: listener.id,
        target: { kind: 'clip', id_text: clip.idText },
        clientListenId: clipSession,
        secondsHeard: 500,
      })
    ).toBe('counted');

    const event = (await listenEvents(listener.id)).find(
      (row) => row.client_listen_id === clipSession
    );
    expect(event).toMatchObject({
      clip_id: clip.id,
      item_id: podcastItem.id,
      channel_id: podcastChannelId,
      seconds_heard: 60,
    });
    expect(await dailyCounts('clip', clip.id, todayUtc())).toEqual({
      listener_count: 1,
      completion_count: 0,
    });

    const otherClip = (idText: string): ListenInput => ({
      accountId: listener.id,
      target: { kind: 'clip', id_text: idText },
      clientListenId: randomUUID(),
      secondsHeard: 30,
    });
    expect(await listen(otherClip(removedClip.idText))).toBe('clip_source_removed');
    expect(await listen(otherClip(`swnf${suffix}`))).toBe('not_found');
  });

  it('fades stored scores across the gap before adding a counted listen', async () => {
    await setTasteScores(listener.id, podcastChannelId, `now() - interval '14 days'`);

    expect(
      await listen({
        accountId: listener.id,
        target: itemTarget(podcastItem),
        clientListenId: randomUUID(),
        secondsHeard: 100,
      })
    ).toBe('counted');

    const taste = await requireTasteRow(listener.id, podcastChannelId);
    expect(taste.recent_score).toBeCloseTo(1.5, 4);
    expect(taste.long_term_score).toBeCloseTo(
      fadeTasteScore({
        score: 1,
        from: new Date(0),
        to: new Date(14 * DAY_MS),
        halfLifeDays: POPULARITY_TASTE_HALF_LIFE_DAYS.longTerm,
      }) + 1,
      4
    );
  });

  it('counts a late finish on its event day and fades its weight to the taste row time', async () => {
    const late = await seedAccount('late-finish', true);
    const session = randomUUID();
    const report: ListenInput = {
      accountId: late.id,
      target: itemTarget(podcastItem),
      clientListenId: session,
      secondsHeard: 100,
    };
    expect(await listen(report)).toBe('counted');

    const [event] = await listenEvents(late.id);
    const eventId = asText(event?.id);
    await query(
      `UPDATE stats_listen_event SET created_at = created_at - interval '3 days' WHERE id = $1`,
      [eventId]
    );
    const earlierDay = asText(
      firstRow(
        await query(
          `SELECT (created_at AT TIME ZONE 'UTC')::date::text AS day
             FROM stats_listen_event WHERE id = $1`,
          [eventId]
        )
      ).day
    );
    await query(
      `INSERT INTO stats_daily_item (item_id, day, listener_count, completion_count)
       VALUES ($1, $2::date, 1, 0)`,
      [podcastItem.id, earlierDay]
    );
    await query(
      `INSERT INTO stats_daily_channel (channel_id, day, listener_count, completion_count)
       VALUES ($1, $2::date, 1, 0)`,
      [podcastChannelId, earlierDay]
    );
    await setTasteScores(late.id, podcastChannelId, 'now()');
    const tasteBefore = await requireTasteRow(late.id, podcastChannelId);
    const todayItemBefore = await dailyCounts('item', podcastItem.id, todayUtc());
    const todayChannelBefore = await dailyCounts('channel', podcastChannelId, todayUtc());

    expect(await listen({ ...report, completed: true })).toBe('updated');

    expect(await dailyCounts('item', podcastItem.id, earlierDay)).toEqual({
      listener_count: 1,
      completion_count: 1,
    });
    expect(await dailyCounts('channel', podcastChannelId, earlierDay)).toEqual({
      listener_count: 1,
      completion_count: 1,
    });
    expect(await dailyCounts('item', podcastItem.id, todayUtc())).toEqual(todayItemBefore);
    expect(await dailyCounts('channel', podcastChannelId, todayUtc())).toEqual(todayChannelBefore);
    const tasteAfter = await requireTasteRow(late.id, podcastChannelId);
    expect(tasteAfter.completion_count).toBe(tasteBefore.completion_count + 1);
    expect(tasteAfter.recent_score).toBeCloseTo(
      1 + 0.5 ** (3 / POPULARITY_TASTE_HALF_LIFE_DAYS.recent),
      4
    );
    expect(tasteAfter.long_term_score).toBeCloseTo(
      1 + 0.5 ** (3 / POPULARITY_TASTE_HALF_LIFE_DAYS.longTerm),
      4
    );
    expect(tasteAfter.last_listened_at).toEqual(tasteBefore.last_listened_at);
  });

  it('counts a profile or playlist open once a day, never your own, and never in taste rows', async () => {
    const tasteRowsBefore = await tasteRowCount(listener.id);
    const ownerProfile: StatsOpenTarget = { kind: 'account', id_text: owner.idText };
    const ownerPlaylistTarget: StatsOpenTarget = {
      kind: 'playlist',
      id_text: ownerPlaylist.idText,
    };

    expect(await open(listener.id, ownerProfile)).toBe('counted');
    expect(await open(listener.id, ownerProfile)).toBe('unchanged');
    expect(await dailyOpenCount('account', owner.id, todayUtc())).toBe(1);
    expect(await open(listener.id, { kind: 'account', id_text: listener.idText })).toBe(
      'own_content'
    );

    expect(await open(listener.id, ownerPlaylistTarget)).toBe('counted');
    expect(await dailyOpenCount('playlist', ownerPlaylist.id, todayUtc())).toBe(1);
    expect(await open(owner.id, ownerPlaylistTarget)).toBe('own_content');
    expect(await open(listener.id, { kind: 'playlist', id_text: `swnf${suffix}` })).toBe(
      'not_found'
    );

    expect(await tasteRowCount(listener.id)).toBe(tasteRowsBefore);
  });

  it('stops counting opens at the daily cap, profiles and playlists together, without counting own or repeat opens', async () => {
    const opener = await seedAccount('open-cap-opener', true);
    const ownerA = await seedAccount('open-cap-a', true);
    const ownerB = await seedAccount('open-cap-b', true);
    const { PlaylistService } = await import('@podverse/orm');
    const playlistA = await new PlaylistService().getOrCreateDefaultLikesPlaylist(
      ownerA.id,
      MediumEnum.AV
    );
    await new PlaylistService().getOrCreateDefaultLikesPlaylist(ownerB.id, MediumEnum.AV);

    expect(await open(opener.id, { kind: 'account', id_text: ownerA.idText }, 2)).toBe('counted');
    expect(await open(opener.id, { kind: 'account', id_text: ownerA.idText }, 2)).toBe('unchanged');
    expect(await open(opener.id, { kind: 'account', id_text: opener.idText }, 2)).toBe(
      'own_content'
    );
    expect(await open(opener.id, { kind: 'playlist', id_text: playlistA.id_text }, 2)).toBe(
      'counted'
    );
    expect(await open(opener.id, { kind: 'account', id_text: ownerB.idText }, 2)).toBe(
      'daily_cap_reached'
    );
    expect(await dailyOpenCount('account', ownerB.id, todayUtc())).toBe(0);
    expect(await open(opener.id, { kind: 'account', id_text: ownerA.idText }, 2)).toBe('unchanged');
  });

  it('does not record opens in the opt-out cooldown', async () => {
    const opener = await seedAccount('cooldown-opener', true);
    const profileOwner = await seedAccount('cooldown-owner', true);
    const profile: StatsOpenTarget = { kind: 'account', id_text: profileOwner.idText };
    const openEventCount = async (): Promise<number> =>
      asNumber(
        firstRow(
          await query(
            `SELECT count(*)::int AS total FROM stats_open_event o
               JOIN listener_identity.stats_listener l ON l.listener_id = o.listener_id
              WHERE l.account_id = $1`,
            [opener.id]
          )
        ).total
      );

    await setOptedOutAt(opener.id, '1 day');
    expect(await open(opener.id, profile)).toBe('counted');
    expect(await listenerRowCount(opener.id)).toBe(0);
    expect(await openEventCount()).toBe(0);
    expect(await dailyOpenCount('account', profileOwner.id, todayUtc())).toBe(0);

    await setOptedOutAt(opener.id, '91 days');
    expect(await open(opener.id, profile)).toBe('counted');
    expect(await openEventCount()).toBe(1);
  });

  it('keeps one listener id and one daily listener when five sessions arrive at once', async () => {
    const racer = await seedAccount('concurrency', true);
    const results = await Promise.all(
      Array.from({ length: 5 }, () =>
        listen({
          accountId: racer.id,
          target: itemTarget(concurrencyItem),
          clientListenId: randomUUID(),
          secondsHeard: 100,
        })
      )
    );

    expect(results).toEqual(['counted', 'counted', 'counted', 'counted', 'counted']);
    expect(await listenerRowCount(racer.id)).toBe(1);
    expect(await listenEvents(racer.id)).toHaveLength(5);
    expect(await dailyCounts('item', concurrencyItem.id, todayUtc())).toEqual({
      listener_count: 1,
      completion_count: 0,
    });
  });

  it('stores one event when five new sessions arrive at once inside the minimum interval', async () => {
    const burst = await seedAccount('min-interval-burst', true);
    const results = await Promise.all(
      Array.from({ length: 5 }, () =>
        listen({
          accountId: burst.id,
          target: itemTarget(concurrencyItem),
          clientListenId: randomUUID(),
          secondsHeard: 100,
          minIntervalSeconds: 20,
        })
      )
    );

    expect([...results].sort()).toEqual([
      'counted',
      'too_soon',
      'too_soon',
      'too_soon',
      'too_soon',
    ]);
    expect(await listenEvents(burst.id)).toHaveLength(1);
  });

  describe('all-time recount period', () => {
    const lastEvent = async (accountId: number): Promise<Record<string, unknown>> => {
      const event = (await listenEvents(accountId)).at(-1);
      if (event === undefined) {
        throw new Error('expected a listen event');
      }
      return event;
    };

    const noMarks = {
      item_all_time_counted: false,
      channel_all_time_counted: false,
      clip_all_time_counted: false,
    };

    it('adds a listener to all-time totals once per recount period and again after it', async () => {
      const regular = await seedAccount('recount-period', true);
      const item = await seedItem(podcastChannelId, 'recount-period', ITEM_DURATION_SECONDS);
      const channelAllTimeBefore = await allTimeDailyCount('channel', podcastChannelId, todayUtc());
      const session = (allTimeRecountDays?: number): ListenInput => ({
        accountId: regular.id,
        target: itemTarget(item),
        clientListenId: randomUUID(),
        secondsHeard: 100,
        allTimeRecountDays,
      });

      expect(await listen(session())).toBe('counted');
      expect(await dailyCounts('item', item.id, todayUtc())).toEqual({
        listener_count: 1,
        completion_count: 0,
      });
      expect(await allTimeDailyCount('item', item.id, todayUtc())).toBe(1);
      expect(await allTimeDailyCount('channel', podcastChannelId, todayUtc())).toBe(
        channelAllTimeBefore + 1
      );
      expect(await lastEvent(regular.id)).toMatchObject({
        item_all_time_counted: true,
        channel_all_time_counted: true,
        clip_all_time_counted: false,
      });
      const listenerId = await listenerIdOf(regular.id);

      await backdateListens(listenerId, 48);
      expect(await listen(session())).toBe('counted');
      expect(await dailyCounts('item', item.id, todayUtc())).toEqual({
        listener_count: 2,
        completion_count: 0,
      });
      expect(await allTimeDailyCount('item', item.id, todayUtc())).toBe(1);
      expect(await lastEvent(regular.id)).toMatchObject(noMarks);

      await backdateListens(listenerId, 48);
      expect(await listen(session(3))).toBe('counted');
      expect(await dailyCounts('item', item.id, todayUtc())).toEqual({
        listener_count: 3,
        completion_count: 0,
      });
      expect(await allTimeDailyCount('item', item.id, todayUtc())).toBe(2);
      expect(await lastEvent(regular.id)).toMatchObject({ item_all_time_counted: true });
    });

    it('adds a listener already counted today once the period ends later that day', async () => {
      const returning = await seedAccount('recount-same-day', true);
      const item = await seedItem(podcastChannelId, 'recount-same-day', ITEM_DURATION_SECONDS);
      const session = (clientListenId: string): ListenInput => ({
        accountId: returning.id,
        target: itemTarget(item),
        clientListenId,
        secondsHeard: 100,
        allTimeRecountDays: 3,
      });
      const firstSession = randomUUID();

      expect(await listen(session(firstSession))).toBe('counted');
      expect(await dailyCounts('item', item.id, todayUtc())).toMatchObject({ listener_count: 1 });
      expect(await allTimeDailyCount('item', item.id, todayUtc())).toBe(1);
      const listenerId = await listenerIdOf(returning.id);

      await backdateListens(listenerId, 71);
      expect(await listen(session(randomUUID()))).toBe('counted');
      expect(await dailyCounts('item', item.id, todayUtc())).toMatchObject({ listener_count: 2 });
      expect(await allTimeDailyCount('item', item.id, todayUtc())).toBe(1);

      await backdateListens(listenerId, 2, firstSession);
      expect(await listen(session(randomUUID()))).toBe('counted');
      expect(await dailyCounts('item', item.id, todayUtc())).toMatchObject({ listener_count: 2 });
      expect(await allTimeDailyCount('item', item.id, todayUtc())).toBe(2);
      expect(await lastEvent(returning.id)).toMatchObject({ item_all_time_counted: true });
    });

    it('does not mark listens past the popularity cap, from a flagged listener, or in the opt-out cooldown', async () => {
      const heavy = await seedAccount('recount-cap', true);
      const overCapItem = await seedItem(podcastChannelId, 'recount-cap', ITEM_DURATION_SECONDS);
      const capped = (item: SeededEntity): ListenInput => ({
        accountId: heavy.id,
        target: itemTarget(item),
        clientListenId: randomUUID(),
        secondsHeard: 100,
        storedDailyCap: 3,
        popularityDailyCap: 1,
      });
      expect(await listen(capped(podcastItem))).toBe('counted');
      expect(await listen(capped(overCapItem))).toBe('counted');
      expect(await lastEvent(heavy.id)).toMatchObject({ popularity_counted: false, ...noMarks });
      expect(await allTimeDailyCount('item', overCapItem.id, todayUtc())).toBe(0);

      const fast = await seedAccount('recount-flagged', true);
      const flaggedItem = await seedItem(
        podcastChannelId,
        'recount-flagged',
        ITEM_DURATION_SECONDS
      );
      const toCap = (): ListenInput => ({
        accountId: fast.id,
        target: itemTarget(podcastItem),
        clientListenId: randomUUID(),
        secondsHeard: 100,
        storedDailyCap: 2,
        popularityDailyCap: 2,
        flagStoredCapWithinHours: 3,
      });
      expect(await listen(toCap())).toBe('counted');
      expect(await listen(toCap())).toBe('counted');
      expect(await flagRow(await listenerIdOf(fast.id))).not.toBeNull();
      expect(
        await listen({
          accountId: fast.id,
          target: itemTarget(flaggedItem),
          clientListenId: randomUUID(),
          secondsHeard: 100,
          storedDailyCap: 10,
          popularityDailyCap: 10,
        })
      ).toBe('counted');
      expect(await lastEvent(fast.id)).toMatchObject({ popularity_counted: false, ...noMarks });
      expect(await allTimeDailyCount('item', flaggedItem.id, todayUtc())).toBe(0);

      const cooling = await seedAccount('recount-cooldown', true);
      const coolingItem = await seedItem(
        podcastChannelId,
        'recount-cooldown',
        ITEM_DURATION_SECONDS
      );
      await setOptedOutAt(cooling.id, '1 day');
      expect(
        await listen({
          accountId: cooling.id,
          target: itemTarget(coolingItem),
          clientListenId: randomUUID(),
          secondsHeard: 100,
        })
      ).toBe('counted');
      expect(await lastEvent(cooling.id)).toMatchObject({ popularity_counted: false, ...noMarks });
      expect(await dailyCounts('item', coolingItem.id, todayUtc())).toBeNull();
    });

    it('does not let an opt-out and a new Yes add a listener to an all-time total again inside the period', async () => {
      const returning = await seedAccount('recount-opt-out', true);
      const item = await seedItem(podcastChannelId, 'recount-opt-out', ITEM_DURATION_SECONDS);
      const session = (): ListenInput => ({
        accountId: returning.id,
        target: itemTarget(item),
        clientListenId: randomUUID(),
        secondsHeard: 100,
      });

      expect(await listen(session())).toBe('counted');
      expect(await lastEvent(returning.id)).toMatchObject({ item_all_time_counted: true });
      expect(await dailyCounts('item', item.id, todayUtc())).toMatchObject({ listener_count: 1 });
      expect(await allTimeDailyCount('item', item.id, todayUtc())).toBe(1);

      const { AccountSettingsListenStatsService } = await import('@podverse/orm');
      const settingsService = new AccountSettingsListenStatsService();
      await settingsService.update({
        account_id: returning.id,
        accepted: false,
        agreement_version: AGREEMENT_VERSION,
      });
      await settingsService.update({
        account_id: returning.id,
        accepted: true,
        agreement_version: AGREEMENT_VERSION,
      });
      expect(await listenEvents(returning.id)).toHaveLength(0);

      expect(await listen(session())).toBe('counted');
      expect(await lastEvent(returning.id)).toMatchObject({
        popularity_counted: false,
        ...noMarks,
      });
      expect(await dailyCounts('item', item.id, todayUtc())).toMatchObject({ listener_count: 1 });
      expect(await allTimeDailyCount('item', item.id, todayUtc())).toBe(1);
    });

    it("adds an opener to a profile's all-time total once per recount period", async () => {
      const opener = await seedAccount('recount-opener', true);
      const profileOwner = await seedAccount('recount-owner', true);
      const profile: StatsOpenTarget = { kind: 'account', id_text: profileOwner.idText };
      const openMarks = async (): Promise<unknown[]> =>
        rowsOf(
          await query(
            `SELECT o.all_time_counted FROM stats_open_event o
               JOIN listener_identity.stats_listener l ON l.listener_id = o.listener_id
              WHERE l.account_id = $1
              ORDER BY o.created_at, o.id`,
            [opener.id]
          )
        ).map((row) => row.all_time_counted);

      expect(await open(opener.id, profile)).toBe('counted');
      expect(await allTimeDailyCount('account', profileOwner.id, todayUtc())).toBe(1);
      expect(await openMarks()).toEqual([true]);

      await backdateOpens(await listenerIdOf(opener.id), 48);
      expect(await open(opener.id, profile)).toBe('counted');
      expect(await dailyOpenCount('account', profileOwner.id, todayUtc())).toBe(2);
      expect(await allTimeDailyCount('account', profileOwner.id, todayUtc())).toBe(1);
      expect(await openMarks()).toEqual([true, false]);
    });
  });

  it('uses a player duration inside half to double of the rss duration and ignores one outside it', async () => {
    const inside = await seedAccount('player-duration-inside', true);
    const item = await seedItem(podcastChannelId, 'player-band', ITEM_DURATION_SECONDS);

    expect(
      await listen({
        accountId: inside.id,
        target: itemTarget(item),
        clientListenId: randomUUID(),
        secondsHeard: 149,
        mediaDurationSeconds: 300,
      })
    ).toBe('below_threshold');
    expect(
      await listen({
        accountId: inside.id,
        target: itemTarget(item),
        clientListenId: randomUUID(),
        secondsHeard: 150,
        mediaDurationSeconds: 300,
      })
    ).toBe('counted');

    const outside = await seedAccount('player-duration-outside', true);
    expect(
      await listen({
        accountId: outside.id,
        target: itemTarget(item),
        clientListenId: randomUUID(),
        secondsHeard: 90,
        mediaDurationSeconds: 40,
      })
    ).toBe('below_threshold');
  });

  it('uses a player duration when the rss duration is missing', async () => {
    const account = await seedAccount('player-duration-only', true);
    const item = await seedItem(podcastChannelId, 'no-rss-duration', null);

    expect(
      await listen({
        accountId: account.id,
        target: itemTarget(item),
        clientListenId: randomUUID(),
        secondsHeard: 39,
        mediaDurationSeconds: 80,
      })
    ).toBe('below_threshold');
    expect(
      await listen({
        accountId: account.id,
        target: itemTarget(item),
        clientListenId: randomUUID(),
        secondsHeard: 40,
        mediaDurationSeconds: 80,
      })
    ).toBe('counted');
  });

  describe('flagged listeners', () => {
    const tooSoonSession = (
      accountId: number,
      item: SeededEntity,
      flagTooSoonMinutes?: number
    ): ListenInput => ({
      accountId,
      target: itemTarget(item),
      clientListenId: randomUUID(),
      secondsHeard: 100,
      minIntervalSeconds: 20,
      flagTooSoonMinutes,
    });

    it('flags a listener that reaches the stored cap within the window and leaves its later listens and opens out of daily totals', async () => {
      const fast = await seedAccount('flag-stored-cap', true);
      const report = (): ListenInput => ({
        accountId: fast.id,
        target: itemTarget(podcastItem),
        clientListenId: randomUUID(),
        secondsHeard: 100,
        storedDailyCap: 2,
        popularityDailyCap: 2,
        flagStoredCapWithinHours: 3,
      });

      expect(await listen(report())).toBe('counted');
      const listenerId = await listenerIdOf(fast.id);
      expect(await flagRow(listenerId)).toBeNull();

      expect(await listen(report())).toBe('counted');
      const flag = await flagRow(listenerId);
      expect(flag).toMatchObject({
        reason: 'stored_cap_reached',
        times_flagged: 1,
        cleared_at: null,
      });

      expect(await listen(report())).toBe('daily_cap_reached');
      expect(await flagRow(listenerId)).toEqual(flag);

      const freshItem = await seedItem(podcastChannelId, 'flagged-fresh', ITEM_DURATION_SECONDS);
      const channelDailyBefore = await dailyCounts('channel', podcastChannelId, todayUtc());
      const tasteBefore = await requireTasteRow(fast.id, podcastChannelId);
      expect(
        await listen({
          accountId: fast.id,
          target: itemTarget(freshItem),
          clientListenId: randomUUID(),
          secondsHeard: 100,
          storedDailyCap: 10,
          popularityDailyCap: 10,
        })
      ).toBe('counted');
      const events = await listenEvents(fast.id);
      expect(events.find((event) => event.item_id === freshItem.id)?.popularity_counted).toBe(
        false
      );
      expect(await dailyCounts('item', freshItem.id, todayUtc())).toBeNull();
      expect(await dailyCounts('channel', podcastChannelId, todayUtc())).toEqual(
        channelDailyBefore
      );
      expect((await requireTasteRow(fast.id, podcastChannelId)).listen_count).toBe(
        tasteBefore.listen_count + 1
      );

      const profileOwner = await seedAccount('flag-open-owner', true);
      expect(await open(fast.id, { kind: 'account', id_text: profileOwner.idText })).toBe(
        'counted'
      );
      const openEvent = firstRow(
        await query(
          'SELECT popularity_counted FROM stats_open_event WHERE listener_id = $1::uuid AND account_id = $2',
          [listenerId, profileOwner.id]
        )
      );
      expect(openEvent.popularity_counted).toBe(false);
      expect(await dailyOpenCount('account', profileOwner.id, todayUtc())).toBe(0);
    });

    it('does not flag a listener that reaches the stored cap after the window', async () => {
      const reachCapWithCarry = async (
        label: string,
        carryAgeSql: string
      ): Promise<Record<string, unknown> | null> => {
        const account = await seedAccount(label, true);
        const report = (): ListenInput => ({
          accountId: account.id,
          target: itemTarget(podcastItem),
          clientListenId: randomUUID(),
          secondsHeard: 100,
          storedDailyCap: 3,
          flagStoredCapWithinHours: 1,
        });

        expect(await listen(report())).toBe('counted');
        const listenerId = await listenerIdOf(account.id);
        await query(
          `UPDATE listener_identity.stats_listener
              SET opt_out_day = $2::date,
                  opt_out_day_stored_count = 1,
                  opt_out_day_first_stored_at = now() - $3::interval
            WHERE listener_id = $1::uuid`,
          [listenerId, todayUtc(), carryAgeSql]
        );
        expect(await listen(report())).toBe('counted');
        const flagAtCap = await flagRow(listenerId);
        expect(await listen(report())).toBe('daily_cap_reached');
        expect(await flagRow(listenerId)).toEqual(flagAtCap);
        return flagAtCap;
      };

      expect(await reachCapWithCarry('flag-cap-late', '2 hours')).toBeNull();
      expect(await reachCapWithCarry('flag-cap-early', '30 minutes')).toMatchObject({
        reason: 'stored_cap_reached',
      });
    });

    it('writes no flag at the stored cap when the window is 0', async () => {
      const capped = await seedAccount('flag-cap-off', true);
      const report = (): ListenInput => ({
        accountId: capped.id,
        target: itemTarget(podcastItem),
        clientListenId: randomUUID(),
        secondsHeard: 100,
        storedDailyCap: 1,
      });

      expect(await listen(report())).toBe('counted');
      expect(await listen(report())).toBe('daily_cap_reached');
      expect(await flagRow(await listenerIdOf(capped.id))).toBeNull();
    });

    it('flags a listener after an unbroken run of too-soon minutes', async () => {
      const scripted = await seedAccount('flag-too-soon-run', true);
      await waitForFreshMinute();

      expect(await listen(tooSoonSession(scripted.id, podcastItem, 3))).toBe('counted');
      const listenerId = await listenerIdOf(scripted.id);

      expect(await listen(tooSoonSession(scripted.id, podcastItem, 3))).toBe('too_soon');
      expect((await signalRow(listenerId))?.too_soon_minutes).toBe(1);
      expect(await flagRow(listenerId)).toBeNull();

      expect(await listen(tooSoonSession(scripted.id, podcastItem, 3))).toBe('too_soon');
      expect((await signalRow(listenerId))?.too_soon_minutes).toBe(1);

      await moveRunBack(listenerId, 2);
      expect(await listen(tooSoonSession(scripted.id, podcastItem, 3))).toBe('too_soon');
      expect((await signalRow(listenerId))?.too_soon_minutes).toBe(2);
      expect(await flagRow(listenerId)).toBeNull();

      await moveRunBack(listenerId, 1);
      expect(await listen(tooSoonSession(scripted.id, podcastItem, 3))).toBe('too_soon');
      expect((await signalRow(listenerId))?.too_soon_minutes).toBe(3);
      expect(await flagRow(listenerId)).toMatchObject({ reason: 'too_soon_minutes' });
    }, 20_000);

    it('starts a new run after a gap of more than 2 minutes', async () => {
      const paused = await seedAccount('flag-too-soon-gap', true);

      expect(await listen(tooSoonSession(paused.id, podcastItem, 2))).toBe('counted');
      const listenerId = await listenerIdOf(paused.id);
      expect(await listen(tooSoonSession(paused.id, podcastItem, 2))).toBe('too_soon');
      expect((await signalRow(listenerId))?.too_soon_minutes).toBe(1);

      await moveRunBack(listenerId, 3);
      expect(await listen(tooSoonSession(paused.id, podcastItem, 2))).toBe('too_soon');
      expect((await signalRow(listenerId))?.too_soon_minutes).toBe(1);
      expect(await flagRow(listenerId)).toBeNull();
    });

    it('does not count a too-soon listen whose threshold is shorter than the minimum interval', async () => {
      const shortListener = await seedAccount('flag-too-soon-short', true);
      const shortItem = await seedItem(podcastChannelId, 'short-flag', 30);
      const longItem = await seedItem(podcastChannelId, 'long-flag', ITEM_DURATION_SECONDS);

      expect(await listen(tooSoonSession(shortListener.id, podcastItem, 1))).toBe('counted');
      const listenerId = await listenerIdOf(shortListener.id);

      expect(
        await listen({ ...tooSoonSession(shortListener.id, shortItem, 1), secondsHeard: 30 })
      ).toBe('too_soon');
      expect(await signalRow(listenerId)).toBeNull();
      expect(await flagRow(listenerId)).toBeNull();

      expect(await listen(tooSoonSession(shortListener.id, longItem, 1))).toBe('too_soon');
      expect((await signalRow(listenerId))?.too_soon_minutes).toBe(1);
      expect(await flagRow(listenerId)).not.toBeNull();
    });

    it('counts a too-soon listen of a 50 second item toward the run', async () => {
      const midListener = await seedAccount('flag-too-soon-mid', true);
      const midItem = await seedItem(podcastChannelId, 'mid-flag', 50);

      expect(await listen(tooSoonSession(midListener.id, podcastItem, 1))).toBe('counted');
      const listenerId = await listenerIdOf(midListener.id);

      expect(
        await listen({ ...tooSoonSession(midListener.id, midItem, 1), secondsHeard: 25 })
      ).toBe('too_soon');
      expect((await signalRow(listenerId))?.too_soon_minutes).toBe(1);
    });

    it('does not let a short claimed duration exempt a too-soon listen when rss duration is missing', async () => {
      const claimListener = await seedAccount('flag-too-soon-claim', true);
      const item = await seedItem(podcastChannelId, 'claim-flag', null);

      expect(
        await listen({
          ...tooSoonSession(claimListener.id, item, 1),
          secondsHeard: 40,
          mediaDurationSeconds: 80,
        })
      ).toBe('counted');
      const listenerId = await listenerIdOf(claimListener.id);

      expect(
        await listen({
          ...tooSoonSession(claimListener.id, item, 1),
          secondsHeard: 10,
          mediaDurationSeconds: 10,
        })
      ).toBe('too_soon');
      expect((await signalRow(listenerId))?.too_soon_minutes).toBe(1);
    });

    it('writes no signal when the too-soon minutes threshold is 0', async () => {
      const unwatched = await seedAccount('flag-too-soon-off', true);

      expect(await listen(tooSoonSession(unwatched.id, podcastItem))).toBe('counted');
      expect(await listen(tooSoonSession(unwatched.id, podcastItem))).toBe('too_soon');
      expect(await signalRow(await listenerIdOf(unwatched.id))).toBeNull();
    });

    it('does not add a completion to daily totals for a listen stored before the flag', async () => {
      const finisher = await seedAccount('flag-completion', true);
      const sessionA = tooSoonSession(finisher.id, podcastItem, 1);

      expect(await listen(sessionA)).toBe('counted');
      expect(await listen(tooSoonSession(finisher.id, podcastItem, 1))).toBe('too_soon');
      expect(await flagRow(await listenerIdOf(finisher.id))).not.toBeNull();

      const itemDailyBefore = await dailyCounts('item', podcastItem.id, todayUtc());
      const channelDailyBefore = await dailyCounts('channel', podcastChannelId, todayUtc());
      const tasteBefore = await requireTasteRow(finisher.id, podcastChannelId);

      expect(await listen({ ...sessionA, completed: true })).toBe('updated');
      expect(await dailyCounts('item', podcastItem.id, todayUtc())).toEqual(itemDailyBefore);
      expect(await dailyCounts('channel', podcastChannelId, todayUtc())).toEqual(
        channelDailyBefore
      );
      expect((await requireTasteRow(finisher.id, podcastChannelId)).completion_count).toBe(
        tasteBefore.completion_count + 1
      );
    });

    it('keeps a clear for the rest of its UTC day and flags again on a later day', async () => {
      const repeat = await seedAccount('flag-clear', true);

      expect(await listen(tooSoonSession(repeat.id, podcastItem, 1))).toBe('counted');
      const listenerId = await listenerIdOf(repeat.id);
      expect(await listen(tooSoonSession(repeat.id, podcastItem, 1))).toBe('too_soon');
      expect(await flagRow(listenerId)).not.toBeNull();

      await query(
        `UPDATE stats_flagged_listener SET cleared_at = now(), cleared_by_admin_id = 1
          WHERE listener_id = $1::uuid`,
        [listenerId]
      );
      expect(await listen(tooSoonSession(repeat.id, podcastItem, 1))).toBe('too_soon');
      const clearedToday = await flagRow(listenerId);
      expect(clearedToday?.cleared_at).toBeInstanceOf(Date);
      expect(clearedToday?.cleared_by_admin_id).toBe(1);
      expect(clearedToday?.times_flagged).toBe(1);

      await query(
        `UPDATE stats_flagged_listener SET cleared_at = now() - interval '1 day'
          WHERE listener_id = $1::uuid`,
        [listenerId]
      );
      expect(await listen(tooSoonSession(repeat.id, podcastItem, 1))).toBe('too_soon');
      expect(await flagRow(listenerId)).toMatchObject({
        cleared_at: null,
        cleared_by_admin_id: null,
        times_flagged: 2,
      });
    });

    it('keeps flag and signal rows across a No and a new Yes, and removes them with the account', async () => {
      const returning = await seedAccount('flag-opt-out', true);

      expect(await listen(tooSoonSession(returning.id, podcastItem, 1))).toBe('counted');
      expect(await listen(tooSoonSession(returning.id, podcastItem, 1))).toBe('too_soon');
      const listenerId = await listenerIdOf(returning.id);

      const { AccountService, AccountSettingsListenStatsService } = await import('@podverse/orm');
      const settingsService = new AccountSettingsListenStatsService();
      await settingsService.update({
        account_id: returning.id,
        accepted: false,
        agreement_version: AGREEMENT_VERSION,
      });
      await settingsService.update({
        account_id: returning.id,
        accepted: true,
        agreement_version: AGREEMENT_VERSION,
      });
      expect(await listenerIdOf(returning.id)).toBe(listenerId);
      expect(await flagRow(listenerId)).not.toBeNull();
      expect(await signalRow(listenerId)).not.toBeNull();

      await new AccountService().delete(returning.id);
      createdAccountIds.splice(createdAccountIds.indexOf(returning.id), 1);
      expect(await flagRow(listenerId)).toBeNull();
      expect(await signalRow(listenerId)).toBeNull();
    });

    it('writes one flag when five new sessions arrive at once inside the minimum interval', async () => {
      const burst = await seedAccount('flag-burst', true);
      const results = await Promise.all(
        Array.from({ length: 5 }, () => listen(tooSoonSession(burst.id, concurrencyItem, 1)))
      );

      expect([...results].sort()).toEqual([
        'counted',
        'too_soon',
        'too_soon',
        'too_soon',
        'too_soon',
      ]);
      const flags = rowsOf(
        await query(
          'SELECT times_flagged FROM stats_flagged_listener WHERE listener_id = $1::uuid',
          [await listenerIdOf(burst.id)]
        )
      );
      expect(flags).toEqual([{ times_flagged: 1 }]);
    });
  });

  describe('live recommendation refresh on weight steps', () => {
    const recommendationCount = async (listenerId: string, channelId: number): Promise<number> =>
      asNumber(
        firstRow(
          await query(
            `SELECT count(*)::int AS total FROM stats_recommendation
              WHERE listener_id = $1::uuid AND channel_id = $2`,
            [listenerId, channelId]
          )
        ).total
      );

    const seedFillerRecommendation = async (
      listenerId: string,
      channelId: number
    ): Promise<void> => {
      await query(
        `INSERT INTO stats_recommendation (listener_id, channel_id, score, strength, computed_at)
         VALUES ($1::uuid, $2, 4, 3, now())
         ON CONFLICT (listener_id, channel_id) DO UPDATE
           SET score = EXCLUDED.score, strength = EXCLUDED.strength,
               computed_at = EXCLUDED.computed_at`,
        [listenerId, channelId]
      );
    };

    it('does not rebuild recommendations on listens 2–4 inside the same weight band', async () => {
      const account = await seedAccount('weight-band', true);
      const item = await seedItem(podcastChannelId, 'weight-band', ITEM_DURATION_SECONDS);
      expect(
        await listen({
          accountId: account.id,
          target: itemTarget(item),
          clientListenId: randomUUID(),
          secondsHeard: 100,
        })
      ).toBe('counted');
      const listenerId = await listenerIdOf(account.id);
      expect((await requireTasteRow(account.id, podcastChannelId)).listen_count).toBe(1);
      await seedFillerRecommendation(listenerId, podcastChannelId);

      for (let i = 0; i < 3; i += 1) {
        expect(
          await listen({
            accountId: account.id,
            target: itemTarget(item),
            clientListenId: randomUUID(),
            secondsHeard: 100,
          })
        ).toBe('counted');
      }
      expect((await requireTasteRow(account.id, podcastChannelId)).listen_count).toBe(4);
      expect(await recommendationCount(listenerId, podcastChannelId)).toBe(1);
    });

    it('rebuilds recommendations when listen count steps the 1–5 weight', async () => {
      const account = await seedAccount('weight-step', true);
      const item = await seedItem(podcastChannelId, 'weight-step', ITEM_DURATION_SECONDS);
      for (let i = 0; i < 4; i += 1) {
        expect(
          await listen({
            accountId: account.id,
            target: itemTarget(item),
            clientListenId: randomUUID(),
            secondsHeard: 100,
          })
        ).toBe('counted');
      }
      const listenerId = await listenerIdOf(account.id);
      expect((await requireTasteRow(account.id, podcastChannelId)).listen_count).toBe(4);
      await seedFillerRecommendation(listenerId, podcastChannelId);

      expect(
        await listen({
          accountId: account.id,
          target: itemTarget(item),
          clientListenId: randomUUID(),
          secondsHeard: 100,
        })
      ).toBe('counted');
      expect((await requireTasteRow(account.id, podcastChannelId)).listen_count).toBe(5);
      expect(await recommendationCount(listenerId, podcastChannelId)).toBe(0);
    });
  });
});
