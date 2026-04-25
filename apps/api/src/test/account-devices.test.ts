import type { Server } from 'http';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import type { ORMContext } from '@podverse/orm';

import { authHeaders, getBaseApiUrl, startTestApp, stopTestApp } from './helpers/index.js';

const TEST_EMAIL = 'devices-test@example.com';
const TEST_USER_ID = 1;

const {
  fcmCreateMock,
  fcmUpdateMock,
  fcmDeleteMock,
  fcmGetAllForAccountMock,
  fcmUpdateLocaleMock,
  webpushCreateMock,
  webpushUpdateMock,
  webpushDeleteMock,
  webpushGetAllForAccountMock,
  webpushUpdateLocaleMock,
  upCreateMock,
  upUpdateMock,
  upDeleteMock,
  upGetForAccountMock,
  upUpdateLocaleMock,
  upDeleteAllMock,
} = vi.hoisted(() => ({
  fcmCreateMock: vi.fn(async () => ({ id: 1, fcm_token: 'token-1' })),
  fcmUpdateMock: vi.fn(async () => ({ id: 1, fcm_token: 'new-token' })),
  fcmDeleteMock: vi.fn(async () => {}),
  fcmGetAllForAccountMock: vi.fn(async () => [{ id: 1, fcm_token: 'token-1' }]),
  fcmUpdateLocaleMock: vi.fn(async () => {}),
  webpushCreateMock: vi.fn(async () => ({ id: 1, endpoint: 'https://push.example.com' })),
  webpushUpdateMock: vi.fn(async () => ({ id: 1, endpoint: 'https://push.example.com' })),
  webpushDeleteMock: vi.fn(async () => {}),
  webpushGetAllForAccountMock: vi.fn(async () => [{ id: 1, endpoint: 'https://push.example.com' }]),
  webpushUpdateLocaleMock: vi.fn(async () => {}),
  upCreateMock: vi.fn(async () => ({ id: 1, up_endpoint: 'https://up.example.com' })),
  upUpdateMock: vi.fn(async () => ({ id: 1, up_endpoint: 'https://up.example.com' })),
  upDeleteMock: vi.fn(async () => {}),
  upGetForAccountMock: vi.fn(async () => ({ id: 1, up_endpoint: 'https://up.example.com' })),
  upUpdateLocaleMock: vi.fn(async () => {}),
  upDeleteAllMock: vi.fn(async () => {}),
}));

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

  class MockAccountFCMDeviceService {
    create = fcmCreateMock;
    update = fcmUpdateMock;
    delete = fcmDeleteMock;
    getAllForAccount = fcmGetAllForAccountMock;
    updateLocaleForAccount = fcmUpdateLocaleMock;
  }

  class MockAccountWebPushDeviceService {
    create = webpushCreateMock;
    update = webpushUpdateMock;
    delete = webpushDeleteMock;
    getAllForAccount = webpushGetAllForAccountMock;
    updateLocaleForAccount = webpushUpdateLocaleMock;
  }

  class MockAccountUPDeviceService {
    create = upCreateMock;
    update = upUpdateMock;
    delete = upDeleteMock;
    getForAccount = upGetForAccountMock;
    updateLocaleForAccount = upUpdateLocaleMock;
    deleteAllForAccount = upDeleteAllMock;
  }

  return {
    ...actual,
    CategoryService: MockCategoryService,
    AccountService: MockAccountService,
    AccountFCMDeviceService: MockAccountFCMDeviceService,
    AccountWebPushDeviceService: MockAccountWebPushDeviceService,
    AccountUPDeviceService: MockAccountUPDeviceService,
  };
});

let accountBase: string;

describe('account device routes', () => {
  let server: Server | undefined;
  let ormContext: ORMContext | undefined;
  let app: import('express').Express;

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

  describe('FCM devices', () => {
    it('POST /fcm-device/create returns 200 with valid data', async () => {
      fcmCreateMock.mockResolvedValueOnce({ id: 1, fcm_token: 'fcm-token-abc' });

      const res = await request(app)
        .post(`${accountBase}/fcm-device/create`)
        .set(authHeaders(TEST_USER_ID))
        .send({ fcm_token: 'fcm-token-abc', installation_id: 'inst-1', platform: 'android' });

      expect(res.status).toBe(200);
      expect(fcmCreateMock).toHaveBeenCalledWith(TEST_USER_ID, {
        fcm_token: 'fcm-token-abc',
        installation_id: 'inst-1',
        platform: 'android',
      });
    });

    it('POST /fcm-device/create returns 401 without auth', async () => {
      const res = await request(app)
        .post(`${accountBase}/fcm-device/create`)
        .send({ fcm_token: 'token', installation_id: 'inst', platform: 'web' });

      expect(res.status).toBe(401);
    });

    it('PUT /fcm-device/update returns 200 with valid data', async () => {
      fcmUpdateMock.mockResolvedValueOnce({ id: 1, fcm_token: 'new-token' });

      const res = await request(app)
        .put(`${accountBase}/fcm-device/update`)
        .set(authHeaders(TEST_USER_ID))
        .send({
          new_fcm_token: 'new-token',
          installation_id: 'inst-1',
          previous_fcm_token: null,
          platform: 'android',
        });

      expect(res.status).toBe(200);
      expect(fcmUpdateMock).toHaveBeenCalledWith(TEST_USER_ID, {
        new_fcm_token: 'new-token',
        installation_id: 'inst-1',
        previous_fcm_token: null,
        platform: 'android',
      });
    });

    it('DELETE /fcm-device/delete returns 200 with valid data', async () => {
      fcmDeleteMock.mockResolvedValueOnce({});

      const res = await request(app)
        .delete(`${accountBase}/fcm-device/delete`)
        .set(authHeaders(TEST_USER_ID))
        .send({ fcm_token: 'fcm-token-abc', installation_id: 'inst-1' });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('FCM device deleted successfully');
    });

    it('GET /fcm-device/all-for-account returns 200 with device list', async () => {
      fcmGetAllForAccountMock.mockResolvedValueOnce([{ id: 1 }, { id: 2 }]);

      const res = await request(app)
        .get(`${accountBase}/fcm-device/all-for-account`)
        .set(authHeaders(TEST_USER_ID));

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('PUT /fcm-device/update-locale returns 200', async () => {
      fcmUpdateLocaleMock.mockResolvedValueOnce({});

      const res = await request(app)
        .put(`${accountBase}/fcm-device/update-locale`)
        .set(authHeaders(TEST_USER_ID))
        .send({ locale: 'es' });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Locale updated for account devices');
    });
  });

  describe('WebPush devices', () => {
    it('POST /webpush-device/create returns 200 with valid data', async () => {
      webpushCreateMock.mockResolvedValueOnce({ id: 1, endpoint: 'https://push.example.com' });

      const res = await request(app)
        .post(`${accountBase}/webpush-device/create`)
        .set(authHeaders(TEST_USER_ID))
        .send({
          endpoint: 'https://push.example.com/subscribe',
          p256dh: 'p256dh-key',
          auth: 'auth-key',
        });

      expect(res.status).toBe(200);
      expect(webpushCreateMock).toHaveBeenCalledWith(TEST_USER_ID, {
        endpoint: 'https://push.example.com/subscribe',
        p256dh: 'p256dh-key',
        auth: 'auth-key',
      });
    });

    it('POST /webpush-device/create returns 401 without auth', async () => {
      const res = await request(app)
        .post(`${accountBase}/webpush-device/create`)
        .send({ endpoint: 'https://push.example.com', p256dh: 'key', auth: 'key' });

      expect(res.status).toBe(401);
    });

    it('PUT /webpush-device/update returns 200 with valid data', async () => {
      webpushUpdateMock.mockResolvedValueOnce({ id: 1 });

      const res = await request(app)
        .put(`${accountBase}/webpush-device/update`)
        .set(authHeaders(TEST_USER_ID))
        .send({
          endpoint: 'https://push.example.com/subscribe',
          p256dh: 'new-p256dh',
          auth: 'new-auth',
        });

      expect(res.status).toBe(200);
    });

    it('DELETE /webpush-device/delete returns 200', async () => {
      webpushDeleteMock.mockResolvedValueOnce({});

      const res = await request(app)
        .delete(`${accountBase}/webpush-device/delete`)
        .set(authHeaders(TEST_USER_ID))
        .send({ endpoint: 'https://push.example.com/subscribe' });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('WebPush device deleted successfully');
    });

    it('GET /webpush-device/all-for-account returns 200', async () => {
      webpushGetAllForAccountMock.mockResolvedValueOnce([]);

      const res = await request(app)
        .get(`${accountBase}/webpush-device/all-for-account`)
        .set(authHeaders(TEST_USER_ID));

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('PUT /webpush-device/update-locale returns 200', async () => {
      webpushUpdateLocaleMock.mockResolvedValueOnce({});

      const res = await request(app)
        .put(`${accountBase}/webpush-device/update-locale`)
        .set(authHeaders(TEST_USER_ID))
        .send({ locale: 'fr' });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Locale updated for account devices');
    });
  });

  describe('UP devices', () => {
    it('POST /up-device/create returns 200 with valid data', async () => {
      upCreateMock.mockResolvedValueOnce({ id: 1, up_endpoint: 'https://up.example.com' });

      const res = await request(app)
        .post(`${accountBase}/up-device/create`)
        .set(authHeaders(TEST_USER_ID))
        .send({ up_endpoint: 'https://up.example.com', up_auth_key: 'auth-key' });

      expect(res.status).toBe(200);
      expect(upCreateMock).toHaveBeenCalledWith(TEST_USER_ID, {
        up_endpoint: 'https://up.example.com',
        up_auth_key: 'auth-key',
      });
    });

    it('POST /up-device/create returns 401 without auth', async () => {
      const res = await request(app)
        .post(`${accountBase}/up-device/create`)
        .send({ up_endpoint: 'https://up.example.com', up_auth_key: null });

      expect(res.status).toBe(401);
    });

    it('PUT /up-device/update returns 200 with valid data', async () => {
      upUpdateMock.mockResolvedValueOnce({ id: 1 });

      const res = await request(app)
        .put(`${accountBase}/up-device/update`)
        .set(authHeaders(TEST_USER_ID))
        .send({ up_endpoint: 'https://up.example.com/new', up_auth_key: null });

      expect(res.status).toBe(200);
    });

    it('DELETE /up-device/delete returns 200', async () => {
      upDeleteMock.mockResolvedValueOnce({});

      const res = await request(app)
        .delete(`${accountBase}/up-device/delete`)
        .set(authHeaders(TEST_USER_ID));

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('UP device deleted successfully');
    });

    it('GET /up-device/for-account returns 200', async () => {
      upGetForAccountMock.mockResolvedValueOnce({ id: 1, up_endpoint: 'https://up.example.com' });

      const res = await request(app)
        .get(`${accountBase}/up-device/for-account`)
        .set(authHeaders(TEST_USER_ID));

      expect(res.status).toBe(200);
    });

    it('PUT /up-device/update-locale returns 200', async () => {
      upUpdateLocaleMock.mockResolvedValueOnce({});

      const res = await request(app)
        .put(`${accountBase}/up-device/update-locale`)
        .set(authHeaders(TEST_USER_ID))
        .send({ locale: 'de' });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Locale updated for account devices');
    });

    it('DELETE /up-device/delete-all returns 200', async () => {
      upDeleteAllMock.mockResolvedValueOnce({});

      const res = await request(app)
        .delete(`${accountBase}/up-device/delete-all`)
        .set(authHeaders(TEST_USER_ID));

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('All UP devices deleted successfully');
    });

    it('DELETE /up-device/delete-all returns 401 without auth', async () => {
      const res = await request(app).delete(`${accountBase}/up-device/delete-all`);

      expect(res.status).toBe(401);
    });
  });
});
