import { config } from '@api/config/index.js';
import type { Server } from 'http';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { MediumEnum, recommendationWeightFromListenCount } from '@podverse/helpers';
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

type SeededChannel = { id: number; idText: string };

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

function asText(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }
  throw new Error('expected a text value');
}

function asFiniteNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  throw new Error('expected a number');
}

describe('Subscribe taste seed (real database)', () => {
  let server: Server | undefined;
  let ormContext: ORMContext | undefined;
  let app: import('express').Express;
  let manager: EntityManager;
  let accountBase: string;
  let settingsBase: string;
  const runId = Date.now();
  const createdAccountIds: number[] = [];
  const createdFeedIds: number[] = [];

  let channels: Record<'a' | 'b' | 'c', SeededChannel>;

  const query = async (sql: string, params: unknown[] = []): Promise<unknown> =>
    manager.query(sql, params);

  const seedAccount = async (label: string, accepted: boolean | null): Promise<SeededAccount> => {
    const { AccountService } = await import('@podverse/orm');
    const accountService = new AccountService();
    const email = `subscribe-taste-seed-${label}-${runId}@example.com`;
    await accountService.create({
      email,
      password: 'IntegrationTest1!',
      locale: 'en-US',
      terms_version: config.terms.version,
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
        [account.id, accepted, config.tasteProfileAgreement.version]
      );
    }
    return { id: account.id, idText: account.id_text };
  };

  const seedChannel = async (label: string, index: number): Promise<SeededChannel> => {
    const { Channel, Feed } = await import('@podverse/orm');
    const feedRepo = manager.getRepository(Feed);
    const feed = await feedRepo.save(
      feedRepo.create({
        url: `https://subscribe-taste-seed-${runId}-${label}.example.com/feed.xml`,
        podcast_index_id: 1_800_000_000 + (runId % 40_000_000) + index,
      })
    );
    createdFeedIds.push(feed.id);
    const channelRepo = manager.getRepository(Channel);
    const channel = await channelRepo.save(
      channelRepo.create({
        feed_id: feed.id,
        medium_id: MediumEnum.Podcast,
        title: `Subscribe seed ${label} ${runId}`,
      })
    );
    return { id: channel.id, idText: channel.id_text };
  };

  const authed = (account: SeededAccount) => authHeaders(account.id, account.idText);

  const tasteRow = async (
    accountId: number,
    channelId: number
  ): Promise<{ listen_count: number; weight_override: number | null } | null> => {
    const result = await query(
      `SELECT t.listen_count, t.weight_override
         FROM stats_taste_profile t
         JOIN listener_identity.stats_listener l ON l.listener_id = t.listener_id
        WHERE l.account_id = $1 AND t.channel_id = $2`,
      [accountId, channelId]
    );
    const row = Array.isArray(result) ? result.filter(isRecord)[0] : undefined;
    if (row === undefined) {
      return null;
    }
    const override = row.weight_override;
    return {
      listen_count: asFiniteNumber(row.listen_count),
      weight_override:
        override === null || override === undefined ? null : asFiniteNumber(override),
    };
  };

  const listenEventCount = async (accountId: number, channelId: number): Promise<number> =>
    asFiniteNumber(
      firstRow(
        await query(
          `SELECT count(*)::int AS total
             FROM stats_listen_event e
             JOIN listener_identity.stats_listener l ON l.listener_id = e.listener_id
            WHERE l.account_id = $1 AND e.channel_id = $2`,
          [accountId, channelId]
        )
      ).total
    );

  const listenerCount = async (accountId: number): Promise<number> =>
    asFiniteNumber(
      firstRow(
        await query(
          `SELECT count(*)::int AS total
             FROM listener_identity.stats_listener
            WHERE account_id = $1`,
          [accountId]
        )
      ).total
    );

  beforeAll(async () => {
    const started = await startTestApp();
    app = started.app;
    server = started.server;
    ormContext = started.ormContext;
    if (!ormContext) {
      throw new Error('ORM context required for subscribe taste seed integration test');
    }
    manager = ormContext.dataSourceReadWrite.manager;
    const apiBase = await getBaseApiUrl();
    accountBase = `${apiBase}/account`;
    settingsBase = `${apiBase}/account-settings`;

    channels = {
      a: await seedChannel('a', 0),
      b: await seedChannel('b', 1),
      c: await seedChannel('c', 2),
    };
  }, 90000);

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

  it('follow with consent seeds weight 1 and writes no listen event', async () => {
    const account = await seedAccount('consent-on', true);

    const follow = await request(app)
      .post(`${accountBase}/follow/channel`)
      .set(authed(account))
      .send({ channel_id_text: channels.a.idText });

    expect(follow.status).toBe(201);
    const row = await tasteRow(account.id, channels.a.id);
    expect(row).toEqual({ listen_count: 0, weight_override: null });
    expect(recommendationWeightFromListenCount(0, null)).toBe(1);
    expect(await listenEventCount(account.id, channels.a.id)).toBe(0);
    expect(await listenerCount(account.id)).toBe(1);
  });

  it('follow with consent off inserts nothing and creates no listener', async () => {
    const account = await seedAccount('consent-off', false);

    const follow = await request(app)
      .post(`${accountBase}/follow/channel`)
      .set(authed(account))
      .send({ channel_id_text: channels.a.idText });

    expect(follow.status).toBe(201);
    expect(await tasteRow(account.id, channels.a.id)).toBeNull();
    expect(await listenerCount(account.id)).toBe(0);
  });

  it('does not reset an existing listened show or a hidden show', async () => {
    const account = await seedAccount('existing', true);
    const listenerId = asText(
      firstRow(
        await query(
          `INSERT INTO listener_identity.stats_listener (account_id)
           VALUES ($1)
           RETURNING listener_id::text AS listener_id`,
          [account.id]
        )
      ).listener_id
    );
    await query(
      `INSERT INTO stats_taste_profile
         (listener_id, channel_id, listen_count, completion_count, first_listened_at,
          last_listened_at, recent_score, long_term_score, scores_updated_at)
       VALUES ($1::uuid, $2, 12, 2, now(), now(), 1, 1, now())`,
      [listenerId, channels.a.id]
    );
    await query(
      `INSERT INTO stats_taste_profile_hidden (listener_id, channel_id)
       VALUES ($1::uuid, $2)`,
      [listenerId, channels.b.id]
    );

    const followA = await request(app)
      .post(`${accountBase}/follow/channel`)
      .set(authed(account))
      .send({ channel_id_text: channels.a.idText });
    const followB = await request(app)
      .post(`${accountBase}/follow/channel`)
      .set(authed(account))
      .send({ channel_id_text: channels.b.idText });

    expect(followA.status).toBe(201);
    expect(followB.status).toBe(201);
    expect(await tasteRow(account.id, channels.a.id)).toEqual({
      listen_count: 12,
      weight_override: null,
    });
    expect(await tasteRow(account.id, channels.b.id)).toBeNull();
  });

  it('unfollow drops only a zero-listen, no-override seed', async () => {
    const account = await seedAccount('unfollow', true);

    await request(app)
      .post(`${accountBase}/follow/channel`)
      .set(authed(account))
      .send({ channel_id_text: channels.a.idText });
    await request(app)
      .post(`${accountBase}/follow/channel`)
      .set(authed(account))
      .send({ channel_id_text: channels.b.idText });

    const listenerId = asText(
      firstRow(
        await query(
          `SELECT listener_id::text AS listener_id
             FROM listener_identity.stats_listener
            WHERE account_id = $1`,
          [account.id]
        )
      ).listener_id
    );
    await query(
      `UPDATE stats_taste_profile
          SET listen_count = 6, first_listened_at = now(), last_listened_at = now()
        WHERE listener_id = $1::uuid AND channel_id = $2`,
      [listenerId, channels.b.id]
    );

    const unfollowSeed = await request(app)
      .post(`${accountBase}/unfollow/channel`)
      .set(authed(account))
      .send({ channel_id_text: channels.a.idText });
    const unfollowListened = await request(app)
      .post(`${accountBase}/unfollow/channel`)
      .set(authed(account))
      .send({ channel_id_text: channels.b.idText });

    expect(unfollowSeed.status).toBe(204);
    expect(unfollowListened.status).toBe(204);
    expect(await tasteRow(account.id, channels.a.id)).toBeNull();
    expect(await tasteRow(account.id, channels.b.id)).toEqual({
      listen_count: 6,
      weight_override: null,
    });
  });

  it('bulk follow seeds each newly followed channel once', async () => {
    const account = await seedAccount('bulk', true);

    const bulk = await request(app)
      .post(`${accountBase}/follow/channel/bulk`)
      .set(authed(account))
      .send({
        channel_id_texts: [channels.a.idText, channels.b.idText, channels.c.idText],
      });

    expect(bulk.status).toBe(200);
    expect(bulk.body.totals).toMatchObject({ followed: 3, already_following: 0, not_found: 0 });
    for (const channel of [channels.a, channels.b, channels.c]) {
      expect(await tasteRow(account.id, channel.id)).toEqual({
        listen_count: 0,
        weight_override: null,
      });
      expect(await listenEventCount(account.id, channel.id)).toBe(0);
    }
  });

  it('Taste Profile Yes seeds existing follows', async () => {
    const account = await seedAccount('yes-later', null);
    await query(`INSERT INTO account_following_channel (account_id, channel_id) VALUES ($1, $2)`, [
      account.id,
      channels.a.id,
    ]);
    expect(await tasteRow(account.id, channels.a.id)).toBeNull();

    const yes = await request(app)
      .patch(`${settingsBase}/listen-stats`)
      .set(authed(account))
      .send({ accepted: true });

    expect(yes.status).toBe(200);
    expect(await tasteRow(account.id, channels.a.id)).toEqual({
      listen_count: 0,
      weight_override: null,
    });
  });
});
