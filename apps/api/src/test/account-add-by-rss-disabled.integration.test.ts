import { randomUUID } from 'node:crypto';

import { config } from '@api/config/index.js';
import type { Server } from 'http';
import request from 'supertest';
import type { EntityManager } from 'typeorm';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { ADD_BY_RSS_DISABLED_CODE, ADD_BY_RSS_DISABLED_MESSAGE } from '@podverse/helpers';
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

type AccountFixture = { id: number; idText: string };

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

describe('Add by RSS turned off', () => {
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
    const email = `abr-off-${randomUUID()}@example.com`;
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

  function feedUrl(accountId: number, label: string): string {
    return `https://abr-off-${accountId}-${label}.example.com/feed.xml`;
  }

  async function seedFollow(accountId: number, url: string): Promise<void> {
    await requireManager().query(
      `INSERT INTO account_following_add_by_rss_channel (account_id, feed_url)
       VALUES ($1, $2)`,
      [accountId, url]
    );
  }

  async function followCount(accountId: number): Promise<number> {
    const rows = recordsFrom(
      await requireManager().query(
        `SELECT COUNT(*)::int AS count
         FROM account_following_add_by_rss_channel
         WHERE account_id = $1`,
        [accountId]
      )
    );
    return requiredInt(rows[0], 'count');
  }

  async function withAddByRSSOff<T>(run: () => Promise<T>): Promise<T> {
    const previous = config.catalog;
    config.catalog = { ...previous, addByRSSEnabled: false };
    try {
      return await run();
    } finally {
      config.catalog = previous;
    }
  }

  function expectDisabled(res: request.Response): void {
    expect(res.status).toBe(403);
    expect(res.body).toEqual({
      message: ADD_BY_RSS_DISABLED_MESSAGE,
      code: ADD_BY_RSS_DISABLED_CODE,
    });
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

  it('refuses a new follow, a parse, and parse-all, and saves nothing', async () => {
    const account = await createAccount();
    const url = feedUrl(account.id, 'new');

    await withAddByRSSOff(async () => {
      const follow = await request(requireApp())
        .post(`${accountBase}/follow/add-by-rss-channel`)
        .set(authHeaders(account.id, account.idText))
        .send({ feed_url: url });
      expectDisabled(follow);
      expect(await followCount(account.id)).toBe(0);

      const parse = await request(requireApp())
        .post(`${accountBase}/add-by-rss/parse`)
        .set(authHeaders(account.id, account.idText))
        .send({ feed_url: url });
      expectDisabled(parse);

      const parseAll = await request(requireApp())
        .post(`${accountBase}/add-by-rss/parse/all`)
        .set(authHeaders(account.id, account.idText))
        .send({});
      expectDisabled(parseAll);
    });
  });

  it('refuses a re-post of a feed the account already follows', async () => {
    const account = await createAccount();
    const url = feedUrl(account.id, 'kept');
    await seedFollow(account.id, url);

    await withAddByRSSOff(async () => {
      const updated = await request(requireApp())
        .post(`${accountBase}/follow/add-by-rss-channel`)
        .set(authHeaders(account.id, account.idText))
        .send({ feed_url: url, title: 'Renamed' });
      expectDisabled(updated);
      expect(await followCount(account.id)).toBe(1);
    });
  });

  it('refuses a signed-out follow with the same 403', async () => {
    await withAddByRSSOff(async () => {
      const follow = await request(requireApp())
        .post(`${accountBase}/follow/add-by-rss-channel`)
        .send({ feed_url: feedUrl(0, 'signed-out') });
      expectDisabled(follow);
    });
  });

  it('keeps the followed list, the feed limit, and unfollow open', async () => {
    const account = await createAccount();
    const url = feedUrl(account.id, 'saved');
    await seedFollow(account.id, url);

    await withAddByRSSOff(async () => {
      const listed = await request(requireApp())
        .get(`${accountBase}/follow/add-by-rss-channel/${account.idText}`)
        .set(authHeaders(account.id, account.idText));
      expect(listed.status).toBe(200);
      expect(listed.body).toEqual(
        expect.arrayContaining([expect.objectContaining({ feed_url: url })])
      );

      const limit = await request(requireApp())
        .get(`${accountBase}/add-by-rss/feed-limit`)
        .set(authHeaders(account.id, account.idText));
      expect(limit.status).toBe(200);

      const removed = await request(requireApp())
        .post(`${accountBase}/unfollow/add-by-rss-channel`)
        .set(authHeaders(account.id, account.idText))
        .send({ feed_url: url });
      expect(removed.status).toBe(204);
      expect(await followCount(account.id)).toBe(0);
    });
  });

  it('accepts a new follow when Add by RSS is on', async () => {
    const account = await createAccount();
    const url = feedUrl(account.id, 'open');
    const added = await request(requireApp())
      .post(`${accountBase}/follow/add-by-rss-channel`)
      .set(authHeaders(account.id, account.idText))
      .send({ feed_url: url });
    expect(added.status).toBe(201);
    expect(await followCount(account.id)).toBe(1);
  });
});
