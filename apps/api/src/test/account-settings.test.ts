import type { Server } from 'http';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import type { ORMContext } from '@podverse/orm';

import { authHeaders, getBaseApiUrl, startTestApp, stopTestApp } from './helpers/index.js';

const TEST_EMAIL = 'settings-test@example.com';
const TEST_USER_ID = 1;

const { localeUpdateMock, notificationTypeCreateMock, notificationTypeDeleteMock } = vi.hoisted(
  () => ({
    localeUpdateMock: vi.fn(async () => ({ account_id: TEST_USER_ID, locale: 'en-US' })),
    notificationTypeCreateMock: vi.fn(async () => ({ account_id: TEST_USER_ID, type: 'new-item' })),
    notificationTypeDeleteMock: vi.fn(async () => {}),
  })
);

vi.mock('@podverse/orm', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@podverse/orm')>();

  class MockCategoryService {
    async setCategoryCache(): Promise<void> {}
  }

  class MockAccountService {
    async get(
      id: number,
      _options?: { relations?: string[] }
    ): Promise<{
      id: number;
      account_credentials: { email: string };
      account_membership_status: { membership_expires_at: Date };
    } | null> {
      if (id !== TEST_USER_ID) {
        return null;
      }

      return {
        id: TEST_USER_ID,
        account_credentials: { email: TEST_EMAIL },
        account_membership_status: {
          membership_expires_at: new Date(Date.now() + 86400000 * 365),
        },
      };
    }
  }

  class MockAccountSettingsLocaleService {
    update = localeUpdateMock;
  }

  class MockAccountSettingsNotificationTypeService {
    create = notificationTypeCreateMock;
    delete = notificationTypeDeleteMock;
  }

  return {
    ...actual,
    CategoryService: MockCategoryService,
    AccountService: MockAccountService,
    AccountSettingsLocaleService: MockAccountSettingsLocaleService,
    AccountSettingsNotificationTypeService: MockAccountSettingsNotificationTypeService,
  };
});

let settingsBase: string;

describe('account settings routes', () => {
  let server: Server | undefined;
  let ormContext: ORMContext | undefined;
  let app: import('express').Express;

  beforeAll(async () => {
    const result = await startTestApp();
    app = result.app;
    server = result.server;
    ormContext = result.ormContext;
    settingsBase = (await getBaseApiUrl()) + '/account-settings';
  }, 30000);

  afterAll(async () => {
    await stopTestApp(server, ormContext);
  });

  describe('PATCH /account-settings/locale', () => {
    it('returns 200 with valid locale when authenticated', async () => {
      localeUpdateMock.mockResolvedValueOnce({ account_id: TEST_USER_ID, locale: 'es' });

      const res = await request(app)
        .patch(`${settingsBase}/locale`)
        .set(authHeaders(TEST_USER_ID, TEST_EMAIL))
        .send({ locale: 'es' });

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(localeUpdateMock).toHaveBeenCalledWith({ account_id: TEST_USER_ID, locale: 'es' });
    });

    it('returns 401 without auth', async () => {
      const res = await request(app).patch(`${settingsBase}/locale`).send({ locale: 'en-US' });

      expect(res.status).toBe(401);
    });

    it('returns 400 with missing locale', async () => {
      const res = await request(app)
        .patch(`${settingsBase}/locale`)
        .set(authHeaders(TEST_USER_ID, TEST_EMAIL))
        .send({});

      expect(res.status).toBe(400);
    });
  });

  describe('POST /account-settings/notification-type', () => {
    it('returns 200 with valid data when authenticated with active membership', async () => {
      notificationTypeCreateMock.mockResolvedValueOnce({
        account_id: TEST_USER_ID,
        type: 'new-item',
      });

      const res = await request(app)
        .post(`${settingsBase}/notification-type`)
        .set(authHeaders(TEST_USER_ID, TEST_EMAIL))
        .send({ type: 'new-item' });

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(notificationTypeCreateMock).toHaveBeenCalledWith({
        account_id: TEST_USER_ID,
        type: 'new-item',
      });
    });

    it('returns 401 without auth', async () => {
      const res = await request(app)
        .post(`${settingsBase}/notification-type`)
        .send({ type: 'new-item' });

      expect(res.status).toBe(401);
    });

    it('returns 400 with invalid notification type', async () => {
      const res = await request(app)
        .post(`${settingsBase}/notification-type`)
        .set(authHeaders(TEST_USER_ID, TEST_EMAIL))
        .send({ type: 'invalid-type' });

      expect(res.status).toBe(400);
    });
  });

  describe('DELETE /account-settings/notification-type', () => {
    it('returns 200 with valid data when authenticated', async () => {
      notificationTypeDeleteMock.mockResolvedValueOnce({});

      const res = await request(app)
        .delete(`${settingsBase}/notification-type`)
        .set('Content-Type', 'application/json')
        .set(authHeaders(TEST_USER_ID, TEST_EMAIL))
        .send({ type: 'new-item' });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Deleted');
      expect(notificationTypeDeleteMock).toHaveBeenCalledWith('new-item', TEST_USER_ID);
    });

    it('returns 401 without auth', async () => {
      const res = await request(app)
        .delete(`${settingsBase}/notification-type`)
        .set('Content-Type', 'application/json')
        .send({ type: 'new-item' });

      expect(res.status).toBe(401);
    });

    it('returns 400 with invalid notification type', async () => {
      const res = await request(app)
        .delete(`${settingsBase}/notification-type`)
        .set('Content-Type', 'application/json')
        .set(authHeaders(TEST_USER_ID, TEST_EMAIL))
        .send({ type: 'not-a-real-type' });

      expect(res.status).toBe(400);
    });
  });
});
