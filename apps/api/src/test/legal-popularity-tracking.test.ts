import type { Server } from 'http';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { AccountMembershipEnum } from '@podverse/helpers';
import type { ORMContext } from '@podverse/orm';

import {
  authHeaders,
  getBaseApiUrl,
  startTestApp,
  stopTestApp,
  TEST_USER_ACCOUNT_ID_TEXT,
} from './helpers/index.js';

const TEST_EMAIL = 'popularity-tracking-test@example.com';
const TEST_USER_ID = 1;

const { localeGetByAccountIdMock } = vi.hoisted(() => ({
  localeGetByAccountIdMock: vi.fn(async () => ({ locale: 'en-US' })),
}));

vi.mock('@podverse/orm', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@podverse/orm')>();

  class MockCategoryService {
    async setCategoryCache(): Promise<void> {}
  }

  class MockAccountService {
    async get(id: number): Promise<{
      id: number;
      account_credentials: { email: string };
      account_membership_status: { membership_expires_at: Date };
    } | null> {
      if (id !== TEST_USER_ID) {
        return null;
      }

      return {
        id: TEST_USER_ID,
        id_text: TEST_USER_ACCOUNT_ID_TEXT,
        account_credentials: { email: TEST_EMAIL },
        account_membership_status: {
          membership_expires_at: new Date(Date.now() + 86400000 * 365),
          account_membership: { id: AccountMembershipEnum.Premium },
        },
      };
    }
  }

  class MockAccountSettingsLocaleService {
    getByAccountId = localeGetByAccountIdMock;
  }

  return {
    ...actual,
    CategoryService: MockCategoryService,
    AccountService: MockAccountService,
    AccountSettingsLocaleService: MockAccountSettingsLocaleService,
  };
});

describe('GET /legal/popularity-tracking', () => {
  let server: Server | undefined;
  let ormContext: ORMContext | undefined;
  let app: import('express').Express;
  let legalBase: string;

  beforeAll(async () => {
    const result = await startTestApp();
    app = result.app;
    server = result.server;
    ormContext = result.ormContext;
    legalBase = (await getBaseApiUrl()) + '/legal';
  }, 30000);

  afterAll(async () => {
    await stopTestApp(server, ormContext);
  });

  it('returns localized markdown for an authenticated account', async () => {
    const res = await request(app).get(`${legalBase}/popularity-tracking`).set(authHeaders());

    expect(res.status).toBe(200);
    expect(res.body.version).toBe('2026-09-11');
    expect(res.body.agreement_date).toBe('2026-09-11');
    expect(res.body.markdown).toContain('unique-listener rankings');
    expect(res.body.markdown).toContain('pseudonymous listen event');
  });

  it('returns Spanish markdown when the account locale is es', async () => {
    localeGetByAccountIdMock.mockResolvedValueOnce({ locale: 'es' });

    const res = await request(app).get(`${legalBase}/popularity-tracking`).set(authHeaders());

    expect(res.status).toBe(200);
    expect(res.body.markdown).toContain('clasificaciones de oyentes únicos');
    expect(res.body.markdown).toContain('evento de escucha seudónimo');
  });

  it('returns 401 without auth', async () => {
    const res = await request(app).get(`${legalBase}/popularity-tracking`);

    expect(res.status).toBe(401);
  });
});
