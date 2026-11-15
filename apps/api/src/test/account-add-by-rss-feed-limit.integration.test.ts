import { randomUUID } from 'node:crypto';

import { config } from '@api/config/index.js';
import type { Server } from 'http';
import request from 'supertest';
import type { EntityManager } from 'typeorm';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import {
  AccountMembershipEnum,
  ADD_BY_RSS_FEED_LIMIT_UNLIMITED,
  addByRssFeedLimitReachedMessage,
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

describe('Add by RSS feed tier', () => {
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
    const email = `abr-limit-${randomUUID()}@example.com`;
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

  async function setCap(accountId: number, cap: number | null): Promise<void> {
    await requireManager().query(
      `UPDATE account_membership_status
       SET membership_expires_at = now() + interval '30 days',
           max_add_by_rss_feeds = $2
       WHERE account_id = $1`,
      [accountId, cap]
    );
  }

  function feedUrl(accountId: number, label: string): string {
    return `https://abr-limit-${accountId}-${label}.example.com/feed.xml`;
  }

  async function seedFeeds(accountId: number, from: number, to: number): Promise<void> {
    if (from > to) {
      return;
    }
    await requireManager().query(
      `INSERT INTO account_following_add_by_rss_channel (account_id, feed_url)
       SELECT $1, $2 || n::text || '.example.com/feed.xml'
       FROM generate_series($3::int, $4::int) AS n`,
      [accountId, `https://abr-limit-${accountId}-`, from, to]
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

  async function withLimitEnforced<T>(run: () => Promise<T>): Promise<T> {
    const previous = config.e2e.fixturesEnabled;
    config.e2e.fixturesEnabled = false;
    try {
      return await run();
    } finally {
      config.e2e.fixturesEnabled = previous;
    }
  }

  async function postFeed(
    account: AccountFixture,
    url: string,
    title?: string
  ): Promise<request.Response> {
    return request(requireApp())
      .post(`${accountBase}/follow/add-by-rss-channel`)
      .set(authHeaders(account.id, account.idText))
      .send(title === undefined ? { feed_url: url } : { feed_url: url, title });
  }

  function expectLimitRefusal(res: request.Response, limit: number): void {
    expect(res.status).toBe(403);
    expect(res.body).toEqual({
      message: addByRssFeedLimitReachedMessage(limit, config.terms.contactEmail),
      code: 'add_by_rss_feed_limit_reached',
      i18nKey: 'membership.add_by_rss_feed_limit_reached',
      limit,
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

  it('refuses a Trial account at the shared default of 100, still updates, and allows a feed after one is removed', async () => {
    const account = await createAccount();
    await setCap(account.id, null);
    await seedFeeds(account.id, 1, 100);

    await withLimitEnforced(async () => {
      const refused = await withMutedExpectedErrorLogs(() =>
        postFeed(account, feedUrl(account.id, 'new'))
      );
      expectLimitRefusal(refused, 100);
      expect(await followCount(account.id)).toBe(100);

      const updated = await postFeed(account, feedUrl(account.id, '1'), 'Kept');
      expect(updated.status).toBe(201);
      expect(updated.body).toEqual({
        message: 'RSS channel added/updated successfully',
        directory_channel: null,
      });
      expect(await followCount(account.id)).toBe(100);

      const removed = await request(requireApp())
        .post(`${accountBase}/unfollow/add-by-rss-channel`)
        .set(authHeaders(account.id, account.idText))
        .send({ feed_url: feedUrl(account.id, '2') });
      expect(removed.status).toBe(204);
      expect(await followCount(account.id)).toBe(99);

      const added = await postFeed(account, feedUrl(account.id, 'new'));
      expect(added.status).toBe(201);
      expect(await followCount(account.id)).toBe(100);
    });
  });

  it('refuses a Premium account at the shared default of 100 with the same sentence and no renew path', async () => {
    const account = await createAccount();
    await grantPremium(account.id);
    await setCap(account.id, null);
    await seedFeeds(account.id, 1, 100);

    await withLimitEnforced(async () => {
      const refused = await withMutedExpectedErrorLogs(() =>
        postFeed(account, feedUrl(account.id, 'new'))
      );
      expectLimitRefusal(refused, 100);
      expect(await followCount(account.id)).toBe(100);
    });
  });

  it('allows the 101st feed at tier 200 and refuses the 201st', async () => {
    const account = await createAccount();
    await grantPremium(account.id);
    await setCap(account.id, 200);
    await seedFeeds(account.id, 1, 100);

    await withLimitEnforced(async () => {
      const allowed = await postFeed(account, feedUrl(account.id, 'new'));
      expect(allowed.status).toBe(201);
      expect(await followCount(account.id)).toBe(101);

      await seedFeeds(account.id, 102, 200);
      expect(await followCount(account.id)).toBe(200);

      const refused = await withMutedExpectedErrorLogs(() =>
        postFeed(account, feedUrl(account.id, 'over'))
      );
      expectLimitRefusal(refused, 200);

      const updated = await postFeed(account, feedUrl(account.id, '1'), 'Still followed');
      expect(updated.status).toBe(201);
      expect(await followCount(account.id)).toBe(200);
    });
  });

  it('does not refuse a new feed when the stored tier is unlimited', async () => {
    const account = await createAccount();
    await grantPremium(account.id);
    await setCap(account.id, ADD_BY_RSS_FEED_LIMIT_UNLIMITED);
    await seedFeeds(account.id, 1, 100);

    await withLimitEnforced(async () => {
      const added = await postFeed(account, feedUrl(account.id, 'new'));
      expect(added.status).toBe(201);
      expect(await followCount(account.id)).toBe(101);
    });
  });
});
