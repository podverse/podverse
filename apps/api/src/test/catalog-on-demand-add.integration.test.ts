import { randomUUID } from 'node:crypto';

import { config } from '@api/config/index.js';
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

describe('on-demand add under the catalog allowlist', () => {
  let app: import('express').Express | undefined;
  let server: Server | undefined;
  let ormContext: ORMContext | undefined;
  let apiBase = '';

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
    const email = `catalog-on-demand-${randomUUID()}@example.com`;
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

  beforeAll(async () => {
    const started = await startTestApp();
    app = started.app;
    server = started.server;
    ormContext = started.ormContext;
    apiBase = await getBaseApiUrl();
  }, 120000);

  afterAll(async () => {
    await stopTestApp(server, ormContext);
  });

  it('refuses the on-demand add with catalog_add_disabled and does not enqueue', async () => {
    mqRSSAddMock.mockClear();
    const original = config.catalog;
    config.catalog = { ...original, podcastIndexIdAllowlist: [920666] };
    try {
      const account = await createPremiumAccount();
      const headers = authHeaders(account.id, account.idText);
      const onDemand = await request(requireApp())
        .post(`${apiBase}/mq/rss/add/on-demand`)
        .set(headers)
        .send({
          url: 'https://catalog-on-demand.example.com/feed.xml',
          podcast_index_id: 920666,
        });
      expect(onDemand.status).toBe(403);
      expect(onDemand.body).toMatchObject({
        message: 'This instance does not add feeds on request.',
        code: 'catalog_add_disabled',
      });
      expect(mqRSSAddMock).not.toHaveBeenCalled();
    } finally {
      config.catalog = original;
    }
  });

  it('keeps the on-demand refresh open under the allowlist', async () => {
    mqRSSAddMock.mockClear();
    const original = config.catalog;
    config.catalog = { ...original, podcastIndexIdAllowlist: [920666] };
    try {
      const account = await createPremiumAccount();
      const headers = authHeaders(account.id, account.idText);
      const refresh = await request(requireApp())
        .post(`${apiBase}/mq/rss/refresh/on-demand`)
        .set(headers)
        .send({
          url: `https://catalog-on-demand-${randomUUID()}.example.com/feed.xml`,
          podcast_index_id: nextPodcastIndexId(),
        });
      expect(refresh.status).toBe(201);
      expect(mqRSSAddMock).toHaveBeenCalledTimes(1);
    } finally {
      config.catalog = original;
    }
  });

  it('accepts the on-demand add in open mode with Add by RSS off', async () => {
    mqRSSAddMock.mockClear();
    const original = config.catalog;
    config.catalog = { ...original, podcastIndexIdAllowlist: null, addByRSSEnabled: false };
    try {
      const account = await createPremiumAccount();
      const headers = authHeaders(account.id, account.idText);
      const onDemand = await request(requireApp())
        .post(`${apiBase}/mq/rss/add/on-demand`)
        .set(headers)
        .send({
          url: `https://catalog-on-demand-${randomUUID()}.example.com/feed.xml`,
          podcast_index_id: nextPodcastIndexId(),
        });
      expect(onDemand.status).toBe(201);
      expect(mqRSSAddMock).toHaveBeenCalledTimes(1);
    } finally {
      config.catalog = original;
    }
  });
});
