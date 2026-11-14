import { randomUUID } from 'node:crypto';

import type { Server } from 'http';
import request from 'supertest';
import type { EntityManager } from 'typeorm';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { AccountMembershipEnum } from '@podverse/helpers';
import type { ORMContext } from '@podverse/orm';

import { authHeaders, getBaseApiUrl, startTestApp, stopTestApp } from './helpers/index.js';

const { mqRSSAddMock } = vi.hoisted(() => ({
  mqRSSAddMock: vi.fn(async () => {}),
}));

vi.mock('@podverse/mq', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@podverse/mq')>();
  return { ...actual, mqRSSAdd: mqRSSAddMock };
});

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

let podcastIndexSlot = 0;

function nextPodcastIndexId(): number {
  podcastIndexSlot += 1;
  const hex = randomUUID().replaceAll('-', '').slice(0, 6);
  const parsed = Number.parseInt(hex, 16) % 200_000_000;
  return 1_930_000_000 + parsed + podcastIndexSlot;
}

function countOf(value: unknown): number {
  if (!Array.isArray(value) || value.length === 0) {
    return 0;
  }
  const row = value[0];
  if (typeof row !== 'object' || row === null || !('n' in row)) {
    return 0;
  }
  const count = row.n;
  if (typeof count === 'number') {
    return count;
  }
  if (typeof count === 'string') {
    return Number(count);
  }
  return 0;
}

describe('blocked feed entry', () => {
  let app: import('express').Express | undefined;
  let server: Server | undefined;
  let ormContext: ORMContext | undefined;
  let apiBase = '';
  const seededFeedIds: number[] = [];

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

  async function createPremiumAccount(): Promise<{ id: number; idText: string }> {
    const { AccountService } = await import('@podverse/orm');
    const email = `feed-blocked-${randomUUID()}@example.com`;
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
    await requireManager().query(
      `UPDATE account_membership_status
       SET account_membership_id = $2,
           membership_expires_at = now() + interval '30 days'
       WHERE account_id = $1`,
      [account.id, AccountMembershipEnum.Premium]
    );
    await requireManager().query(
      `INSERT INTO billing_membership_grant (account_id, source, starts_at, ends_at)
       VALUES ($1, 'admin', now(), now() + interval '30 days')`,
      [account.id]
    );
    return { id: account.id, idText: account.id_text };
  }

  async function seedBlockedFeed(): Promise<{
    feedId: number;
    feedUrl: string;
    podcastIndexId: number;
  }> {
    const manager = requireManager();
    const { Feed } = await import('@podverse/orm');
    const feedUrl = `https://feed-blocked-${randomUUID()}.example.com/feed.xml`;
    const podcastIndexId = nextPodcastIndexId();
    const feedRepo = manager.getRepository(Feed);
    const feed = await feedRepo.save(
      feedRepo.create({
        url: feedUrl,
        podcast_index_id: podcastIndexId,
      })
    );
    seededFeedIds.push(feed.id);
    await manager.query(
      `INSERT INTO feed_policy (feed_id, parse_allowed, public_visible, add_allowed)
       VALUES ($1, false, false, false)`,
      [feed.id]
    );
    return { feedId: feed.id, feedUrl, podcastIndexId };
  }

  beforeAll(async () => {
    const started = await startTestApp();
    app = started.app;
    server = started.server;
    ormContext = started.ormContext;
    apiBase = await getBaseApiUrl();
  }, 120000);

  afterAll(async () => {
    if (ormContext && seededFeedIds.length > 0) {
      await ormContext.dataSourceReadWrite.query(`DELETE FROM feed WHERE id = ANY($1::int[])`, [
        seededFeedIds,
      ]);
    }
    await stopTestApp(server, ormContext);
  });

  it('returns 403 feed_blocked from on-demand add and Add by RSS follow, and does not enqueue', async () => {
    mqRSSAddMock.mockClear();
    const account = await createPremiumAccount();
    const blocked = await seedBlockedFeed();
    const headers = authHeaders(account.id, account.idText);

    const onDemand = await request(requireApp())
      .post(`${apiBase}/mq/rss/add/on-demand`)
      .set(headers)
      .send({ url: blocked.feedUrl, podcast_index_id: blocked.podcastIndexId });
    expect(onDemand.status).toBe(403);
    expect(onDemand.body).toMatchObject({ code: 'feed_blocked' });

    const refresh = await request(requireApp())
      .post(`${apiBase}/mq/rss/refresh/on-demand`)
      .set(headers)
      .send({ url: blocked.feedUrl, podcast_index_id: blocked.podcastIndexId });
    expect(refresh.status).toBe(403);
    expect(refresh.body).toMatchObject({ code: 'feed_blocked' });

    const follow = await request(requireApp())
      .post(`${apiBase}/account/follow/add-by-rss-channel`)
      .set(headers)
      .send({ feed_url: blocked.feedUrl });
    expect(follow.status).toBe(403);
    expect(follow.body).toMatchObject({ code: 'feed_blocked' });

    expect(mqRSSAddMock).not.toHaveBeenCalled();

    const manager = requireManager();
    const addByRssRows = await manager.query(
      `SELECT count(*)::int AS n
       FROM account_following_add_by_rss_channel
       WHERE account_id = $1 AND feed_url = $2`,
      [account.id, blocked.feedUrl]
    );
    const directoryRows = await manager.query(
      `SELECT count(*)::int AS n FROM account_following_channel WHERE account_id = $1`,
      [account.id]
    );
    const pendingRows = await manager.query(
      `SELECT count(*)::int AS n FROM account_pending_following_channel WHERE account_id = $1`,
      [account.id]
    );
    const channelRows = await manager.query(
      `SELECT count(*)::int AS n FROM channel WHERE feed_id = $1`,
      [blocked.feedId]
    );
    expect(countOf(addByRssRows)).toBe(0);
    expect(countOf(directoryRows)).toBe(0);
    expect(countOf(pendingRows)).toBe(0);
    expect(countOf(channelRows)).toBe(0);
  });
});
