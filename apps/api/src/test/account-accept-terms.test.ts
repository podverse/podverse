import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import {
  authHeaders,
  getBaseApiUrl,
  startTestApp,
  stopTestApp,
  TEST_USER_ACCOUNT_ID_TEXT,
} from './helpers/index.js';

const TEST_USER_ID = 1;
const VALID_TERMS_VERSION = '2026-01-01';

const { upsertMock } = vi.hoisted(() => ({
  upsertMock: vi.fn(async () => ({
    account_id: TEST_USER_ID,
    terms_version: VALID_TERMS_VERSION,
    accepted_at: new Date('2026-01-15T10:30:00Z'),
  })),
}));

vi.mock('@podverse/orm', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@podverse/orm')>();

  class MockCategoryService {
    async setCategoryCache(): Promise<void> {}
  }

  class MockAccountService {
    get = vi.fn(async () => ({
      id: TEST_USER_ID,
      id_text: TEST_USER_ACCOUNT_ID_TEXT,
      account_credentials: { email: 'accept-terms-test@example.com' },
      account_membership_status: {
        membership_expires_at: new Date(Date.now() + 86400000 * 365),
      },
    }));
  }

  class MockAccountTermsAcceptanceService {
    upsert = upsertMock;
  }

  return {
    ...actual,
    CategoryService: MockCategoryService,
    AccountService: MockAccountService,
    AccountTermsAcceptanceService: MockAccountTermsAcceptanceService,
  };
});

describe('POST /account/accept-terms', () => {
  let server: import('http').Server | undefined;
  let ormContext: import('@podverse/orm').ORMContext | undefined;
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

  it('returns 401 without auth', async () => {
    const res = await request(app)
      .post(`${accountBase}/accept-terms`)
      .send({ terms_version: VALID_TERMS_VERSION });

    expect(res.status).toBe(401);
  });

  it('returns 400 with wrong terms_version', async () => {
    const res = await request(app)
      .post(`${accountBase}/accept-terms`)
      .set(authHeaders(TEST_USER_ID))
      .send({ terms_version: '1999-01-01' });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Invalid terms version');
    expect(upsertMock).not.toHaveBeenCalled();
  });

  it('returns 201 and records acceptance with valid terms_version', async () => {
    upsertMock.mockClear();

    const res = await request(app)
      .post(`${accountBase}/accept-terms`)
      .set(authHeaders(TEST_USER_ID))
      .send({ terms_version: VALID_TERMS_VERSION });

    expect(res.status).toBe(201);
    expect(upsertMock).toHaveBeenCalledWith(TEST_USER_ID, VALID_TERMS_VERSION);
    expect(res.body.data.terms_version).toBe(VALID_TERMS_VERSION);
    expect(res.body.data.accepted_at).toBe('2026-01-15T10:30:00.000Z');
  });
});
