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

const TEST_EMAIL = 'settings-test@example.com';
const TEST_USER_ID = 1;

const {
  localeUpdateMock,
  notificationTypeCreateMock,
  notificationTypeDeleteMock,
  notificationUpdateMock,
  playbackUpdateMock,
  listenStatsUpdateMock,
} = vi.hoisted(() => ({
  localeUpdateMock: vi.fn(async () => ({ account_id: TEST_USER_ID, locale: 'en-US' })),
  notificationTypeCreateMock: vi.fn(async () => ({ account_id: TEST_USER_ID, type: 'new-item' })),
  notificationTypeDeleteMock: vi.fn(async () => {}),
  notificationUpdateMock: vi.fn(async () => ({
    id: 1,
    account_settings_id: 1,
    auto_enable_on_subscribe: true,
  })),
  playbackUpdateMock: vi.fn(async () => ({
    id: 1,
    account_settings_id: 1,
    preferred_media_type: 'video',
  })),
  listenStatsUpdateMock: vi.fn(async () => ({
    allow_listen_stats: true,
    listen_stats_accepted: true,
    listen_stats_agreement_version: '2026-09-11',
    listen_stats_decided_at: new Date('2026-09-11T00:00:00.000Z'),
  })),
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
    update = localeUpdateMock;
  }

  class MockAccountSettingsNotificationService {
    update = notificationUpdateMock;
  }

  class MockAccountSettingsNotificationTypeService {
    create = notificationTypeCreateMock;
    delete = notificationTypeDeleteMock;
  }

  class MockAccountSettingsPlaybackService {
    update = playbackUpdateMock;
  }

  class MockAccountSettingsListenStatsService {
    update = listenStatsUpdateMock;
  }

  return {
    ...actual,
    CategoryService: MockCategoryService,
    AccountService: MockAccountService,
    AccountSettingsLocaleService: MockAccountSettingsLocaleService,
    AccountSettingsNotificationService: MockAccountSettingsNotificationService,
    AccountSettingsNotificationTypeService: MockAccountSettingsNotificationTypeService,
    AccountSettingsPlaybackService: MockAccountSettingsPlaybackService,
    AccountSettingsListenStatsService: MockAccountSettingsListenStatsService,
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
        .set(authHeaders(TEST_USER_ID))
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
        .set(authHeaders(TEST_USER_ID))
        .send({});

      expect(res.status).toBe(400);
    });
  });

  describe('PATCH /account-settings/playback', () => {
    it('returns 200 with valid preferred_media_type when authenticated', async () => {
      playbackUpdateMock.mockResolvedValueOnce({
        id: 1,
        account_settings_id: 1,
        preferred_media_type: 'audio',
      });

      const res = await request(app)
        .patch(`${settingsBase}/playback`)
        .set(authHeaders(TEST_USER_ID))
        .send({ preferred_media_type: 'audio' });

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.preferred_media_type).toBe('audio');
      expect(playbackUpdateMock).toHaveBeenCalledWith({
        account_id: TEST_USER_ID,
        preferred_media_type: 'audio',
      });
    });

    it('returns 401 without auth', async () => {
      const res = await request(app)
        .patch(`${settingsBase}/playback`)
        .send({ preferred_media_type: 'video' });

      expect(res.status).toBe(401);
    });

    it('returns 400 with missing preferred_media_type', async () => {
      const res = await request(app)
        .patch(`${settingsBase}/playback`)
        .set(authHeaders(TEST_USER_ID))
        .send({});

      expect(res.status).toBe(400);
    });

    it('returns 400 with an invalid preferred_media_type', async () => {
      const res = await request(app)
        .patch(`${settingsBase}/playback`)
        .set(authHeaders(TEST_USER_ID))
        .send({ preferred_media_type: 'bogus' });

      expect(res.status).toBe(400);
    });
  });

  describe('PATCH /account-settings/notification', () => {
    it('returns 200 and persists the auto-enable-on-subscribe flag when authenticated', async () => {
      notificationUpdateMock.mockResolvedValueOnce({
        id: 1,
        account_settings_id: 1,
        auto_enable_on_subscribe: true,
      });

      const res = await request(app)
        .patch(`${settingsBase}/notification`)
        .set(authHeaders(TEST_USER_ID))
        .send({ auto_enable_on_subscribe: true });

      expect(res.status).toBe(200);
      expect(res.body.data.auto_enable_on_subscribe).toBe(true);
      expect(notificationUpdateMock).toHaveBeenCalledWith({
        account_id: TEST_USER_ID,
        auto_enable_on_subscribe: true,
      });
    });

    it('returns 401 without auth', async () => {
      const res = await request(app)
        .patch(`${settingsBase}/notification`)
        .send({ auto_enable_on_subscribe: true });

      expect(res.status).toBe(401);
    });

    it('returns 400 with a missing auto_enable_on_subscribe', async () => {
      const res = await request(app)
        .patch(`${settingsBase}/notification`)
        .set(authHeaders(TEST_USER_ID))
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
        .set(authHeaders(TEST_USER_ID))
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
        .set(authHeaders(TEST_USER_ID))
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
        .set(authHeaders(TEST_USER_ID))
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
        .set(authHeaders(TEST_USER_ID))
        .send({ type: 'not-a-real-type' });

      expect(res.status).toBe(400);
    });
  });

  describe('PATCH /account-settings/listen-stats', () => {
    it('records accept of the current agreement version', async () => {
      listenStatsUpdateMock.mockResolvedValueOnce({
        allow_listen_stats: true,
        listen_stats_accepted: true,
        listen_stats_agreement_version: '2026-09-11',
        listen_stats_decided_at: new Date('2026-09-11T00:00:00.000Z'),
      });

      const res = await request(app)
        .patch(`${settingsBase}/listen-stats`)
        .set(authHeaders(TEST_USER_ID))
        .send({ accepted: true });

      expect(res.status).toBe(200);
      expect(res.body.data.listen_stats_accepted).toBe(true);
      expect(res.body.data.listen_stats_agreement_version).toBe('2026-09-11');
      expect(listenStatsUpdateMock).toHaveBeenCalledWith({
        account_id: TEST_USER_ID,
        accepted: true,
        agreement_version: '2026-09-11',
      });
    });

    it('records a decline', async () => {
      listenStatsUpdateMock.mockResolvedValueOnce({
        allow_listen_stats: false,
        listen_stats_accepted: false,
        listen_stats_agreement_version: '2026-09-11',
        listen_stats_decided_at: new Date('2026-09-11T00:00:00.000Z'),
      });

      const res = await request(app)
        .patch(`${settingsBase}/listen-stats`)
        .set(authHeaders(TEST_USER_ID))
        .send({ accepted: false });

      expect(res.status).toBe(200);
      expect(res.body.data.listen_stats_accepted).toBe(false);
      expect(listenStatsUpdateMock).toHaveBeenCalledWith({
        account_id: TEST_USER_ID,
        accepted: false,
        agreement_version: '2026-09-11',
      });
    });

    it('returns 401 without auth', async () => {
      const res = await request(app).patch(`${settingsBase}/listen-stats`).send({ accepted: true });

      expect(res.status).toBe(401);
    });
  });
});
