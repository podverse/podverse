import { randomUUID } from 'node:crypto';

import { config } from '@api/config/index.js';
import type { Server } from 'http';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { MediumEnum } from '@podverse/helpers';
import type { ORMContext } from '@podverse/orm';

import { authHeaders, getBaseApiUrl, startTestApp, stopTestApp } from './helpers/index.js';

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

type ListeningRowCounts = {
  listener: number;
  taste: number;
  hidden: number;
  listens: number;
  opens: number;
  recommendations: number;
  recommendationHidden: number;
  recommendationState: number;
};

type OptOutDayCarryRow = {
  day: string | null;
  storedCount: number;
  firstStoredAt: Date | null;
};

const OLDER_AGREEMENT_VERSION = 'opt-out-test-older-version';
const DAILY_LISTENER_COUNT = 2;

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

function asNumber(value: unknown): number {
  if (typeof value === 'number') {
    return value;
  }
  throw new Error('expected a number');
}

function asText(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }
  throw new Error('expected a text value');
}

function asDateOrNull(value: unknown): Date | null {
  if (value === null || value instanceof Date) {
    return value;
  }
  throw new Error('expected a timestamp or null');
}

function asTextOrNull(value: unknown): string | null {
  return value === null ? null : asText(value);
}

describe('Taste Profile consent opt-out deletes listening data (real database)', () => {
  let server: Server | undefined;
  let ormContext: ORMContext | undefined;
  let app: import('express').Express;
  let manager: EntityManager;
  let settingsBase: string;
  const runId = Date.now();
  const createdAccountIds: number[] = [];
  const createdFeedIds: number[] = [];

  let owner: SeededAccount;
  let channelId: number;
  let itemId: number;

  const query = async (sql: string, params: unknown[] = []): Promise<unknown> =>
    manager.query(sql, params);

  const seedAccount = async (
    label: string,
    accepted: boolean | null,
    agreementVersion: string | null
  ): Promise<SeededAccount> => {
    const { AccountService } = await import('@podverse/orm');
    const accountService = new AccountService();
    const email = `taste-consent-opt-out-${label}-${runId}@example.com`;
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
    if (accepted !== null) {
      await query(
        `UPDATE account_settings
            SET listen_stats_accepted = $2, allow_listen_stats = $2,
                listen_stats_agreement_version = $3, listen_stats_decided_at = now()
          WHERE account_id = $1`,
        [account.id, accepted, agreementVersion]
      );
    }
    return { id: account.id, idText: account.id_text };
  };

  const seedListeningData = async (accountId: number): Promise<string> => {
    const listenerId = asText(
      firstRow(
        await query(
          'INSERT INTO listener_identity.stats_listener (account_id) VALUES ($1) RETURNING listener_id::text AS listener_id',
          [accountId]
        )
      ).listener_id
    );
    await query(
      `INSERT INTO stats_taste_profile
         (listener_id, channel_id, listen_count, completion_count, first_listened_at,
          last_listened_at, recent_score, long_term_score, scores_updated_at)
       VALUES ($1::uuid, $2, 1, 0, now(), now(), 1, 1, now())`,
      [listenerId, channelId]
    );
    await query(
      'INSERT INTO stats_taste_profile_hidden (listener_id, channel_id) VALUES ($1::uuid, $2)',
      [listenerId, channelId]
    );
    await query(
      `INSERT INTO stats_listen_event (listener_id, channel_id, item_id, client_listen_id, seconds_heard)
       VALUES ($1::uuid, $2, $3, $4::uuid, 75)`,
      [listenerId, channelId, itemId, randomUUID()]
    );
    await query('INSERT INTO stats_open_event (listener_id, account_id) VALUES ($1::uuid, $2)', [
      listenerId,
      owner.id,
    ]);
    await query(
      `INSERT INTO stats_recommendation (listener_id, channel_id, score, strength, computed_at)
       VALUES ($1::uuid, $2, 1, 1, now())`,
      [listenerId, channelId]
    );
    await query(
      'INSERT INTO stats_channel_hidden (listener_id, channel_id) VALUES ($1::uuid, $2)',
      [listenerId, channelId]
    );
    await query(
      `INSERT INTO stats_recommendation_state (listener_id, computed_at) VALUES ($1::uuid, now())`,
      [listenerId]
    );
    return listenerId;
  };

  const countFor = async (sql: string, accountId: number): Promise<number> =>
    asNumber(firstRow(await query(sql, [accountId])).total);

  const listeningRowCounts = async (accountId: number): Promise<ListeningRowCounts> => ({
    listener: await countFor(
      'SELECT count(*)::int AS total FROM listener_identity.stats_listener WHERE account_id = $1',
      accountId
    ),
    taste: await countFor(
      `SELECT count(*)::int AS total FROM stats_taste_profile t
         JOIN listener_identity.stats_listener l ON l.listener_id = t.listener_id
        WHERE l.account_id = $1`,
      accountId
    ),
    hidden: await countFor(
      `SELECT count(*)::int AS total FROM stats_taste_profile_hidden h
         JOIN listener_identity.stats_listener l ON l.listener_id = h.listener_id
        WHERE l.account_id = $1`,
      accountId
    ),
    listens: await countFor(
      `SELECT count(*)::int AS total FROM stats_listen_event e
         JOIN listener_identity.stats_listener l ON l.listener_id = e.listener_id
        WHERE l.account_id = $1`,
      accountId
    ),
    opens: await countFor(
      `SELECT count(*)::int AS total FROM stats_open_event o
         JOIN listener_identity.stats_listener l ON l.listener_id = o.listener_id
        WHERE l.account_id = $1`,
      accountId
    ),
    recommendations: await countFor(
      `SELECT count(*)::int AS total FROM stats_recommendation r
         JOIN listener_identity.stats_listener l ON l.listener_id = r.listener_id
        WHERE l.account_id = $1`,
      accountId
    ),
    recommendationHidden: await countFor(
      `SELECT count(*)::int AS total FROM stats_channel_hidden h
         JOIN listener_identity.stats_listener l ON l.listener_id = h.listener_id
        WHERE l.account_id = $1`,
      accountId
    ),
    recommendationState: await countFor(
      `SELECT count(*)::int AS total FROM stats_recommendation_state s
         JOIN listener_identity.stats_listener l ON l.listener_id = s.listener_id
        WHERE l.account_id = $1`,
      accountId
    ),
  });

  const rowsForListenerId = async (listenerId: string): Promise<number> =>
    asNumber(
      firstRow(
        await query(
          `SELECT ((SELECT count(*) FROM stats_taste_profile WHERE listener_id = $1::uuid)
                + (SELECT count(*) FROM stats_taste_profile_hidden WHERE listener_id = $1::uuid)
                + (SELECT count(*) FROM stats_listen_event WHERE listener_id = $1::uuid)
                + (SELECT count(*) FROM stats_open_event WHERE listener_id = $1::uuid)
                + (SELECT count(*) FROM stats_recommendation WHERE listener_id = $1::uuid)
                + (SELECT count(*) FROM stats_channel_hidden WHERE listener_id = $1::uuid)
                + (SELECT count(*) FROM stats_recommendation_state WHERE listener_id = $1::uuid))::int AS total`,
          [listenerId]
        )
      ).total
    );

  const listenerIdOf = async (accountId: number): Promise<string | null> => {
    const result = await query(
      'SELECT listener_id::text AS listener_id FROM listener_identity.stats_listener WHERE account_id = $1',
      [accountId]
    );
    const row = Array.isArray(result) ? result.filter(isRecord)[0] : undefined;
    return row === undefined ? null : asText(row.listener_id);
  };

  const optedOutAt = async (accountId: number): Promise<Date | null> =>
    asDateOrNull(
      firstRow(
        await query(
          'SELECT listen_stats_opted_out_at FROM account_settings WHERE account_id = $1',
          [accountId]
        )
      ).listen_stats_opted_out_at
    );

  const optOutDayCarry = async (listenerId: string): Promise<OptOutDayCarryRow> => {
    const row = firstRow(
      await query(
        `SELECT opt_out_day::text AS opt_out_day, opt_out_day_stored_count, opt_out_day_first_stored_at
           FROM listener_identity.stats_listener
          WHERE listener_id = $1::uuid`,
        [listenerId]
      )
    );
    return {
      day: asTextOrNull(row.opt_out_day),
      storedCount: asNumber(row.opt_out_day_stored_count),
      firstStoredAt: asDateOrNull(row.opt_out_day_first_stored_at),
    };
  };

  const dailyListenerCounts = async (): Promise<{ channel: number; item: number }> => ({
    channel: asNumber(
      firstRow(
        await query(
          'SELECT listener_count FROM stats_daily_channel WHERE channel_id = $1 AND day = current_date',
          [channelId]
        )
      ).listener_count
    ),
    item: asNumber(
      firstRow(
        await query(
          'SELECT listener_count FROM stats_daily_item WHERE item_id = $1 AND day = current_date',
          [itemId]
        )
      ).listener_count
    ),
  });

  const answer = async (account: SeededAccount, accepted: boolean) =>
    request(app)
      .patch(`${settingsBase}/listen-stats`)
      .set(authHeaders(account.id, account.idText))
      .send({ accepted });

  beforeAll(async () => {
    const started = await startTestApp();
    app = started.app;
    server = started.server;
    ormContext = started.ormContext;
    if (!ormContext) {
      throw new Error(
        'ORM context required for the Taste Profile consent opt-out integration test'
      );
    }
    manager = ormContext.dataSourceReadWrite.manager;
    settingsBase = `${await getBaseApiUrl()}/account-settings`;

    owner = await seedAccount('owner', null, null);

    const { Channel, Feed, Item } = await import('@podverse/orm');
    const feedRepo = manager.getRepository(Feed);
    const feed = await feedRepo.save(
      feedRepo.create({
        url: `https://popularity-opt-out-${runId}.example.com/feed.xml`,
        podcast_index_id: 1_500_000_000 + (runId % 100_000_000),
      })
    );
    createdFeedIds.push(feed.id);
    const channelRepo = manager.getRepository(Channel);
    const channel = await channelRepo.save(
      channelRepo.create({
        feed_id: feed.id,
        medium_id: MediumEnum.Podcast,
        title: `Popularity opt-out ${runId}`,
      })
    );
    channelId = channel.id;
    const itemRepo = manager.getRepository(Item);
    const item = await itemRepo.save(
      itemRepo.create({
        channel_id: String(channelId),
        title: `Popularity opt-out episode ${runId}`,
        item_flag_status: { id: 1 },
        guid: `https://popularity-opt-out.example.com/${runId}/episode`,
      })
    );
    itemId = item.id;

    await query(
      `INSERT INTO stats_daily_channel (channel_id, day, listener_count, completion_count)
       VALUES ($1, current_date, $2, 0)`,
      [channelId, DAILY_LISTENER_COUNT]
    );
    await query(
      `INSERT INTO stats_daily_item (item_id, day, listener_count, completion_count)
       VALUES ($1, current_date, $2, 0)`,
      [itemId, DAILY_LISTENER_COUNT]
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

  it('keeps the listener id and deletes every linked row on a No, and leaves other listeners and daily totals alone', async () => {
    const version = config.tasteProfileAgreement.version;
    const listenerA = await seedAccount('a', true, version);
    const listenerB = await seedAccount('b', true, version);
    const listenerIdA = await seedListeningData(listenerA.id);
    await seedListeningData(listenerB.id);
    const countsBBefore = await listeningRowCounts(listenerB.id);

    const res = await answer(listenerA, false);

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      listen_stats_accepted: false,
      allow_listen_stats: false,
      listen_stats_agreement_version: version,
    });
    expect(await listenerIdOf(listenerA.id)).toBe(listenerIdA);
    expect(await rowsForListenerId(listenerIdA)).toBe(0);
    expect(await listeningRowCounts(listenerA.id)).toEqual({
      listener: 1,
      taste: 0,
      hidden: 0,
      listens: 0,
      opens: 0,
      recommendations: 0,
      recommendationHidden: 0,
      recommendationState: 0,
    });
    expect(await optedOutAt(listenerA.id)).not.toBeNull();
    expect(await listeningRowCounts(listenerB.id)).toEqual(countsBBefore);
    expect(countsBBefore).toEqual({
      listener: 1,
      taste: 1,
      hidden: 1,
      listens: 1,
      opens: 1,
      recommendations: 1,
      recommendationHidden: 1,
      recommendationState: 1,
    });
    expect(await dailyListenerCounts()).toEqual({
      channel: DAILY_LISTENER_COUNT,
      item: DAILY_LISTENER_COUNT,
    });
  });

  it('records a No from an account with no listener id and changes nothing else', async () => {
    const version = config.tasteProfileAgreement.version;
    const newcomer = await seedAccount('no-listener', null, null);
    const dailyBefore = await dailyListenerCounts();

    const res = await answer(newcomer, false);

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      listen_stats_accepted: false,
      listen_stats_agreement_version: version,
    });
    expect(await listeningRowCounts(newcomer.id)).toEqual({
      listener: 0,
      taste: 0,
      hidden: 0,
      listens: 0,
      opens: 0,
      recommendations: 0,
      recommendationHidden: 0,
      recommendationState: 0,
    });
    expect(await optedOutAt(newcomer.id)).toBeNull();
    expect(await dailyListenerCounts()).toEqual(dailyBefore);
  });

  it('records the opt-out time only for a No that follows a Yes, and a later Yes keeps it', async () => {
    const account = await seedAccount('opt-out-time', true, config.tasteProfileAgreement.version);

    expect((await answer(account, false)).status).toBe(200);
    const firstOptOut = await optedOutAt(account.id);
    expect(firstOptOut).not.toBeNull();

    expect((await answer(account, false)).status).toBe(200);
    expect(await optedOutAt(account.id)).toEqual(firstOptOut);

    expect((await answer(account, true)).status).toBe(200);
    expect(await optedOutAt(account.id)).toEqual(firstOptOut);
  });

  it("carries today's stored listens onto the kept listener row", async () => {
    const account = await seedAccount('carry', true, config.tasteProfileAgreement.version);
    const listenerId = await seedListeningData(account.id);
    await query(
      `INSERT INTO stats_listen_event (listener_id, channel_id, item_id, client_listen_id, seconds_heard)
       VALUES ($1::uuid, $2, $3, $4::uuid, 75)`,
      [listenerId, channelId, itemId, randomUUID()]
    );
    const now = new Date();
    const todayStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
    );
    const storedToday = firstRow(
      await query(
        `SELECT count(*)::int AS stored_count, min(created_at) AS first_stored_at
           FROM stats_listen_event
          WHERE listener_id = $1::uuid AND created_at >= $2`,
        [listenerId, todayStart]
      )
    );
    expect(asNumber(storedToday.stored_count)).toBe(2);

    expect((await answer(account, false)).status).toBe(200);

    expect(await optOutDayCarry(listenerId)).toEqual({
      day: todayStart.toISOString().slice(0, 10),
      storedCount: 2,
      firstStoredAt: asDateOrNull(storedToday.first_stored_at),
    });
  });

  it('deleting the account removes the kept listener row', async () => {
    const account = await seedAccount('delete', true, config.tasteProfileAgreement.version);
    await seedListeningData(account.id);
    expect((await answer(account, false)).status).toBe(200);
    expect(await listenerIdOf(account.id)).not.toBeNull();

    const { AccountService } = await import('@podverse/orm');
    await new AccountService().delete(account.id);
    createdAccountIds.splice(createdAccountIds.indexOf(account.id), 1);

    expect(await listenerIdOf(account.id)).toBeNull();
  });

  it('keeps the same listener id and stored rows when a stale acceptance says Yes again', async () => {
    const paused = await seedAccount('stale', true, OLDER_AGREEMENT_VERSION);
    const listenerId = await seedListeningData(paused.id);
    const countsBefore = await listeningRowCounts(paused.id);

    const res = await answer(paused, true);

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      listen_stats_accepted: true,
      allow_listen_stats: true,
      listen_stats_agreement_version: config.tasteProfileAgreement.version,
    });
    expect(await listenerIdOf(paused.id)).toBe(listenerId);
    expect(await listeningRowCounts(paused.id)).toEqual(countsBefore);
  });

  it('deletes nothing when an allowed account says Yes again', async () => {
    const allowed = await seedAccount('allowed', true, config.tasteProfileAgreement.version);
    const listenerId = await seedListeningData(allowed.id);
    const countsBefore = await listeningRowCounts(allowed.id);

    const res = await answer(allowed, true);

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ listen_stats_accepted: true });
    expect(await listenerIdOf(allowed.id)).toBe(listenerId);
    expect(await listeningRowCounts(allowed.id)).toEqual(countsBefore);
  });
});
