import { randomUUID } from 'node:crypto';

import type { Server } from 'http';
import request from 'supertest';
import type { EntityManager } from 'typeorm';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { QUEUE_HISTORY_LIMIT_CHANGED_CODE } from '@podverse/helpers';
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

function readNullableInt(value: unknown): number | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === 'number' && Number.isInteger(value)) {
    return value;
  }
  if (typeof value === 'string' && /^-?\d+$/.test(value)) {
    return Number.parseInt(value, 10);
  }
  throw new Error('expected integer');
}

describe('Queue history limit notice', () => {
  let server: Server | undefined;
  let ormContext: ORMContext | undefined;
  let app: import('express').Express | undefined;
  let noticePath = '';

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
    const email = `queue-notice-${randomUUID()}@example.com`;
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

  async function storedAcknowledgement(accountId: number): Promise<number | null> {
    const rows = await requireManager().query(
      `SELECT queue_history_limit_notice_limit
       FROM account_membership_status
       WHERE account_id = $1`,
      [accountId]
    );
    if (!Array.isArray(rows) || !isRecord(rows[0])) {
      throw new Error('expected a membership row');
    }
    return readNullableInt(rows[0].queue_history_limit_notice_limit);
  }

  beforeAll(async () => {
    const started = await startTestApp();
    app = started.app;
    server = started.server;
    ormContext = started.ormContext;
    noticePath = `${await getBaseApiUrl()}/account/queue-history-limit-notice`;
  }, 120000);

  afterAll(async () => {
    await stopTestApp(server, ormContext);
  });

  it('acknowledges the current cap and refuses a stale cap without clearing the previous acknowledgement', async () => {
    const account = await createAccount();
    const headers = authHeaders(account.id, account.idText);

    const hidden = await request(requireApp()).get(noticePath).set(headers);
    expect(hidden.status).toBe(200);
    expect(hidden.body).toEqual({ show: false, limit: 10000, at_limit: false });

    const stale = await request(requireApp()).post(noticePath).set(headers).send({ limit: 20000 });
    expect(stale.status).toBe(409);
    expect(stale.body).toEqual({
      message: 'Queue history limit changed',
      code: QUEUE_HISTORY_LIMIT_CHANGED_CODE,
      limit: 10000,
    });
    expect(await storedAcknowledgement(account.id)).toBeNull();

    const saved = await request(requireApp()).post(noticePath).set(headers).send({ limit: 10000 });
    expect(saved.status).toBe(200);
    expect(saved.body).toEqual({ show: false, limit: 10000, at_limit: false });
    expect(await storedAcknowledgement(account.id)).toBe(10000);

    const stillHidden = await request(requireApp()).get(noticePath).set(headers);
    expect(stillHidden.status).toBe(200);
    expect(stillHidden.body).toEqual({ show: false, limit: 10000, at_limit: false });

    await requireManager().query(
      `UPDATE account_membership_status SET max_queue_resources = $2 WHERE account_id = $1`,
      [account.id, 20000]
    );

    const oldCap = await request(requireApp()).post(noticePath).set(headers).send({ limit: 10000 });
    expect(oldCap.status).toBe(409);
    expect(oldCap.body).toEqual({
      message: 'Queue history limit changed',
      code: QUEUE_HISTORY_LIMIT_CHANGED_CODE,
      limit: 20000,
    });
    expect(await storedAcknowledgement(account.id)).toBe(10000);

    const raised = await request(requireApp()).post(noticePath).set(headers).send({ limit: 20000 });
    expect(raised.status).toBe(200);
    expect(raised.body).toEqual({ show: false, limit: 20000, at_limit: false });
    expect(await storedAcknowledgement(account.id)).toBe(20000);
  });

  it('refuses a signed-out read', async () => {
    const res = await request(requireApp()).get(noticePath);
    expect(res.status).toBe(401);
  });
});
