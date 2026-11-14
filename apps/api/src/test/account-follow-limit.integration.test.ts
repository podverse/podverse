import { randomUUID } from 'node:crypto';

import type { Server } from 'http';
import request from 'supertest';
import type { EntityManager } from 'typeorm';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import {
  AccountMembershipEnum,
  followLimitRefusal,
  MediumEnum,
  SharableStatusEnum,
} from '@podverse/helpers';
import type { ORMContext } from '@podverse/orm';

import {
  authHeaders,
  getBaseApiUrl,
  startTestApp,
  stopTestApp,
  withMutedExpectedErrorLogs,
} from './helpers/index.js';

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

type AccountFixture = { id: number; idText: string };

type SeededShow = { channelId: number; idText: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function recordsFrom(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter(isRecord);
}

function requiredInt(row: Record<string, unknown> | undefined, key: string): number {
  const value = row?.[key];
  if (typeof value === 'number' && Number.isInteger(value)) {
    return value;
  }
  if (typeof value === 'string' && /^-?\d+$/.test(value)) {
    return Number.parseInt(value, 10);
  }
  throw new Error(`expected integer ${key}`);
}

function requiredText(row: Record<string, unknown>, key: string): string {
  const value = row[key];
  if (typeof value !== 'string' || value === '') {
    throw new Error(`expected text ${key}`);
  }
  return value;
}

describe('Directory follow tier', () => {
  let server: Server | undefined;
  let ormContext: ORMContext | undefined;
  let app: import('express').Express | undefined;
  let accountBase = '';

  function requireApp(): import('express').Express {
    if (!app) {
      throw new Error('test app required');
    }
    return app;
  }

  function requireManager(): EntityManager {
    if (!ormContext) {
      throw new Error('ORM context required');
    }
    return ormContext.dataSourceReadWrite.manager;
  }

  async function createAccount(): Promise<AccountFixture> {
    const { AccountService } = await import('@podverse/orm');
    const email = `follow-limit-${randomUUID()}@example.com`;
    const accountService = new AccountService();
    await accountService.create({
      email,
      password: 'IntegrationTest1!',
      locale: 'en-US',
      terms_version: '2026-10-15',
    });
    const account = await accountService.getByEmail(email);
    if (!account) {
      throw new Error('expected the seeded account');
    }
    return { id: account.id, idText: account.id_text };
  }

  async function grantPremium(accountId: number): Promise<void> {
    await requireManager().query(
      `UPDATE account_membership_status
       SET account_membership_id = $2,
           membership_expires_at = now() + interval '30 days'
       WHERE account_id = $1`,
      [accountId, AccountMembershipEnum.Premium]
    );
    await requireManager().query(
      `INSERT INTO billing_membership_grant (account_id, source, starts_at, ends_at)
       VALUES ($1, 'admin', now(), now() + interval '30 days')`,
      [accountId]
    );
  }

  async function setFollowCap(accountId: number, cap: number | null): Promise<void> {
    await requireManager().query(
      `UPDATE account_membership_status SET max_follows = $2 WHERE account_id = $1`,
      [accountId, cap]
    );
  }

  async function seedShows(count: number): Promise<SeededShow[]> {
    const token = randomUUID();
    const base = 1_400_000_000 + (Number.parseInt(token.slice(0, 6), 16) % 500_000_000);
    const rows = recordsFrom(
      await requireManager().query(
        `WITH series AS (
           SELECT generate_series(1, $1::int) AS n
         ),
         feeds AS (
           INSERT INTO feed (url, podcast_index_id, created_at, updated_at)
           SELECT
             'https://follow-limit.example/' || $2 || '/' || n::text,
             $3::int + n,
             now(),
             now()
           FROM series
           RETURNING id, podcast_index_id
         )
         INSERT INTO channel (id_text, feed_id, medium_id, title)
         SELECT
           substr(md5($2 || ':' || (podcast_index_id - $3)::text), 1, 10),
           id,
           $4,
           'Follow limit'
         FROM feeds
         RETURNING id, id_text`,
        [count, token, base, MediumEnum.Podcast]
      )
    );
    return rows.map((row) => ({
      channelId: requiredInt(row, 'id'),
      idText: requiredText(row, 'id_text'),
    }));
  }

  async function followSeeded(accountId: number, channelIds: number[]): Promise<void> {
    if (channelIds.length === 0) {
      return;
    }
    await requireManager().query(
      `INSERT INTO account_following_channel (account_id, channel_id)
       SELECT $1, channel_id
       FROM unnest($2::int[]) AS channel_id`,
      [accountId, channelIds]
    );
  }

  async function insertPlaylist(accountId: number): Promise<string> {
    const idText = randomUUID().replace(/-/g, '').slice(0, 10);
    await requireManager().query(
      `INSERT INTO playlist (id_text, account_id, sharable_status_id, title, medium_id)
       VALUES ($1, $2, $3, $4, $5)`,
      [idText, accountId, SharableStatusEnum.Private, 'Follow limit', MediumEnum.Podcast]
    );
    return idText;
  }

  function postChannel(account: AccountFixture, channelIdText: string): Promise<request.Response> {
    return request(requireApp())
      .post(`${accountBase}/follow/channel`)
      .set(authHeaders(account.id, account.idText))
      .send({ channel_id_text: channelIdText });
  }

  beforeAll(async () => {
    const started = await startTestApp();
    app = started.app;
    server = started.server;
    ormContext = started.ormContext;
    accountBase = `${await getBaseApiUrl()}/account`;
  }, 120000);

  afterAll(async () => {
    await stopTestApp(server, ormContext);
  });

  it('refuses a new follow at the default of 500, still updates a follow, and allows one after an unfollow', async () => {
    const account = await createAccount();
    const other = await createAccount();
    await grantPremium(account.id);
    await setFollowCap(account.id, null);
    const shows = await seedShows(501);
    const spare = shows[shows.length - 1];
    const kept = shows[0];
    if (spare === undefined || kept === undefined) {
      throw new Error('expected seeded shows');
    }
    await followSeeded(
      account.id,
      shows.slice(0, 500).map((show) => show.channelId)
    );

    const refused = await withMutedExpectedErrorLogs(() => postChannel(account, spare.idText));
    expect(refused.status).toBe(403);
    expect(refused.body).toEqual(followLimitRefusal(500));
    expect(refused.body).not.toHaveProperty('renewPath');

    const already = await postChannel(account, kept.idText);
    expect(already.status).toBe(201);
    expect(already.body).toEqual({ message: 'Successfully followed channel' });

    const removed = await request(requireApp())
      .post(`${accountBase}/unfollow/channel`)
      .set(authHeaders(account.id, account.idText))
      .send({ channel_id_text: kept.idText });
    expect(removed.status).toBe(204);

    const replaced = await postChannel(account, spare.idText);
    expect(replaced.status).toBe(201);

    const playlistIdText = await insertPlaylist(account.id);
    const playlistRefused = await withMutedExpectedErrorLogs(() =>
      request(requireApp())
        .post(`${accountBase}/follow/playlist`)
        .set(authHeaders(account.id, account.idText))
        .send({ playlist_id_text: playlistIdText })
    );
    expect(playlistRefused.status).toBe(403);
    expect(playlistRefused.body).toEqual(followLimitRefusal(500));

    const accountRefused = await withMutedExpectedErrorLogs(() =>
      request(requireApp())
        .post(`${accountBase}/follow/account`)
        .set(authHeaders(account.id, account.idText))
        .send({ following_account_id_text: other.idText })
    );
    expect(accountRefused.status).toBe(403);
    expect(accountRefused.body).toEqual(followLimitRefusal(500));
  });

  it('does not refuse a new follow when the stored tier is unlimited', async () => {
    const account = await createAccount();
    await grantPremium(account.id);
    const shows = await seedShows(501);
    const spare = shows[shows.length - 1];
    if (spare === undefined) {
      throw new Error('expected a spare show');
    }
    await followSeeded(
      account.id,
      shows.slice(0, 500).map((show) => show.channelId)
    );
    await setFollowCap(account.id, -1);

    const followed = await postChannel(account, spare.idText);
    expect(followed.status).toBe(201);
  });

  it('refuses at a stored tier of 1000', async () => {
    const account = await createAccount();
    await grantPremium(account.id);
    const shows = await seedShows(1001);
    const spare = shows[shows.length - 1];
    if (spare === undefined) {
      throw new Error('expected a spare show');
    }
    await followSeeded(
      account.id,
      shows.slice(0, 1000).map((show) => show.channelId)
    );
    await setFollowCap(account.id, 1000);

    const refused = await withMutedExpectedErrorLogs(() => postChannel(account, spare.idText));
    expect(refused.status).toBe(403);
    expect(refused.body).toEqual(followLimitRefusal(1000));
  });

  it('follows the channels that fit and reports the rest at the default tier', async () => {
    const account = await createAccount();
    await grantPremium(account.id);
    await setFollowCap(account.id, null);
    const shows = await seedShows(502);
    const room = shows.slice(0, 499);
    const requested = shows.slice(499);
    await followSeeded(
      account.id,
      room.map((show) => show.channelId)
    );

    const bulk = await request(requireApp())
      .post(`${accountBase}/follow/channel/bulk`)
      .set(authHeaders(account.id, account.idText))
      .send({ channel_id_texts: requested.map((show) => show.idText) });

    expect(bulk.status).toBe(200);
    expect(bulk.body.totals).toMatchObject({ followed: 1, follow_limit: 2 });
    expect(bulk.body.follow_limit).toEqual(followLimitRefusal(500));
    expect(bulk.body.results).toEqual([
      { channel_id_text: requested[0]?.idText, outcome: 'followed' },
      { channel_id_text: requested[1]?.idText, outcome: 'follow_limit', limit: 500 },
      { channel_id_text: requested[2]?.idText, outcome: 'follow_limit', limit: 500 },
    ]);
  });
});
