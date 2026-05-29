import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ORMContext } from '@podverse/orm';

import { getBaseApiUrl, startTestApp, stopTestApp } from './helpers/index.js';

const VALID_TERMS_VERSION = '2026-01-01';

const validAccountCreateBody = {
  email: 'new@example.com',
  password: 'valid-password-123',
  locale: 'en-US',
  terms_version: VALID_TERMS_VERSION,
};

const { createMock } = vi.hoisted(() => ({
  createMock: vi.fn(async () => ({})),
}));

vi.mock('@podverse/orm', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@podverse/orm')>();

  class MockCategoryService {
    async setCategoryCache(): Promise<void> {}
  }

  class MockAccountService {
    create = createMock;
  }

  return {
    ...actual,
    CategoryService: MockCategoryService,
    AccountService: MockAccountService,
  };
});

describe('POST /account (create) terms_version validation', () => {
  let server: import('http').Server | undefined;
  let ormContext: ORMContext | undefined;
  let app: import('express').Express;
  let accountBase: string;

  beforeAll(async () => {
    const result = await startTestApp();
    app = result.app;
    server = result.server;
    ormContext = result.ormContext;
    accountBase = (await getBaseApiUrl()) + '/account';
  }, 30000);

  afterAll(async () => {
    await stopTestApp(server, ormContext);
  });

  beforeEach(() => {
    createMock.mockClear();
  });

  it('returns 400 without terms_version', async () => {
    const res = await request(app).post(`${accountBase}/`).send({
      email: 'missing-terms@example.com',
      password: 'valid-password-123',
      locale: 'en-US',
    });

    expect(res.status).toBe(400);
    expect(createMock).not.toHaveBeenCalled();
  });

  it('returns 400 with wrong terms_version', async () => {
    const res = await request(app)
      .post(`${accountBase}/`)
      .send({
        ...validAccountCreateBody,
        email: 'wrong-terms@example.com',
        terms_version: '1999-01-01',
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Invalid terms version');
    expect(createMock).not.toHaveBeenCalled();
  });
});
