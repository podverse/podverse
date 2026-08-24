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
  withMutedExpectedErrorLogs,
} from './helpers/index.js';

const TEST_USER_ID = 1;
const TEST_EMAIL = 'account-notifications-test@example.com';

const {
  accountGetMock,
  accountNotificationCountUnseenMock,
  accountNotificationListPaginatedMock,
  accountNotificationPreferenceGetForAccountMock,
  accountNotificationPreferenceSeedDefaultsMock,
  accountNotificationPreferenceUpsertMock,
  accountUpdateNotificationsLastSeenAtMock,
  categorySetCategoryCacheMock,
  notificationTypeCreateMock,
  resolveProductMembershipCapDefaultsMock,
} = vi.hoisted(() => ({
  accountGetMock: vi.fn(async () => ({
    id: TEST_USER_ID,
    id_text: TEST_USER_ACCOUNT_ID_TEXT,
    account_credentials: { email: TEST_EMAIL },
    account_membership_status: {
      membership_expires_at: new Date(Date.now() + 86400000 * 365),
      account_membership: { id: AccountMembershipEnum.Premium },
      allow_notifications: true,
    },
    notifications_last_seen_at: null,
  })),
  accountNotificationCountUnseenMock: vi.fn(async (_accountId: number, lastSeenAt: Date | null) =>
    lastSeenAt === null ? 25 : 4
  ),
  accountNotificationListPaginatedMock: vi.fn(async () => [
    {
      id: 101,
      account_id: TEST_USER_ID,
      category: 'product-update',
      title: 'New feature',
      body: 'Try the new queue controls.',
      link_path: '/settings',
      payload: null,
      created_at: new Date('2026-08-01T00:00:00.000Z'),
      expires_at: new Date('2026-09-01T00:00:00.000Z'),
    },
  ]),
  accountNotificationPreferenceGetForAccountMock: vi.fn(async () => [
    {
      id: 201,
      account_id: TEST_USER_ID,
      category: 'maintenance',
      in_app_enabled: true,
      push_enabled: false,
    },
    {
      id: 202,
      account_id: TEST_USER_ID,
      category: 'product-update',
      in_app_enabled: true,
      push_enabled: true,
    },
  ]),
  accountNotificationPreferenceSeedDefaultsMock: vi.fn(async () => [
    {
      id: 201,
      account_id: TEST_USER_ID,
      category: 'maintenance',
      in_app_enabled: true,
      push_enabled: false,
    },
  ]),
  accountNotificationPreferenceUpsertMock: vi.fn(
    async (dto: {
      account_id: number;
      category: string;
      in_app_enabled: boolean;
      push_enabled: boolean;
    }) => ({ id: 999, ...dto })
  ),
  accountUpdateNotificationsLastSeenAtMock: vi.fn(
    async (_accountId: number, seenAt: Date) => seenAt
  ),
  categorySetCategoryCacheMock: vi.fn(async () => {}),
  notificationTypeCreateMock: vi.fn(async () => ({ account_id: TEST_USER_ID, type: 'new-item' })),
  resolveProductMembershipCapDefaultsMock: vi.fn(async () => ({
    premiumAllowDirectoryAddByRSS: true,
    premiumMaxAddByRSSFeeds: 1000,
    premiumMaxManualRefreshesPerHour: 1000,
    premiumTrackStats: true,
    premiumAllowNotifications: true,
    trialAllowDirectoryAddByRSS: true,
    trialMaxAddByRSSFeeds: 1000,
    trialMaxManualRefreshesPerHour: 1000,
    trialTrackStats: true,
    trialAllowNotifications: true,
  })),
}));

vi.mock('@podverse/orm', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@podverse/orm')>();

  class MockCategoryService {
    setCategoryCache = categorySetCategoryCacheMock;
  }

  class MockAccountService {
    get = accountGetMock;
    updateNotificationsLastSeenAt = accountUpdateNotificationsLastSeenAtMock;
  }

  class MockBillingPriceCatalogService {
    resolveProductMembershipCapDefaults = resolveProductMembershipCapDefaultsMock;
  }

  class MockAccountNotificationService {
    countUnseen = accountNotificationCountUnseenMock;
    listPaginatedForAccount = accountNotificationListPaginatedMock;
  }

  class MockAccountNotificationPreferenceService {
    getForAccount = accountNotificationPreferenceGetForAccountMock;
    seedDefaultsForAccount = accountNotificationPreferenceSeedDefaultsMock;
    upsert = accountNotificationPreferenceUpsertMock;
  }

  class MockAccountSettingsNotificationTypeService {
    create = notificationTypeCreateMock;
  }

  return {
    ...actual,
    AccountNotificationPreferenceService: MockAccountNotificationPreferenceService,
    AccountNotificationService: MockAccountNotificationService,
    AccountService: MockAccountService,
    AccountSettingsNotificationTypeService: MockAccountSettingsNotificationTypeService,
    BillingPriceCatalogService: MockBillingPriceCatalogService,
    CategoryService: MockCategoryService,
  };
});

describe('account notifications routes', () => {
  let app: import('express').Express;
  let ormContext: ORMContext | undefined;
  let server: Server | undefined;
  let accountBase = '';
  let accountSettingsBase = '';

  beforeAll(async () => {
    const result = await startTestApp();
    app = result.app;
    server = result.server;
    ormContext = result.ormContext;
    const baseApiUrl = await getBaseApiUrl();
    accountBase = `${baseApiUrl}/account`;
    accountSettingsBase = `${baseApiUrl}/account-settings`;
  }, 30000);

  afterAll(async () => {
    await stopTestApp(server, ormContext);
  });

  it('GET /account/notifications returns paginated feed payload', async () => {
    const response = await request(app)
      .get(`${accountBase}/notifications?page=1&limit=20`)
      .set(authHeaders(TEST_USER_ID));

    expect(response.status).toBe(200);
    expect(accountNotificationListPaginatedMock).toHaveBeenCalledWith(TEST_USER_ID, {
      limit: 20,
      offset: 0,
    });
    expect(response.body.data.pagination).toEqual({
      page: 1,
      total_count: 25,
      total_pages: 2,
    });
    expect(response.body.data.sections).toEqual({ new_count: 25 });
    expect(response.body.data.items[0].is_new).toBe(true);
  });

  it('GET /account/notifications applies page offset', async () => {
    const response = await request(app)
      .get(`${accountBase}/notifications?page=2&limit=10`)
      .set(authHeaders(TEST_USER_ID));

    expect(response.status).toBe(200);
    expect(accountNotificationListPaginatedMock).toHaveBeenCalledWith(TEST_USER_ID, {
      limit: 10,
      offset: 10,
    });
  });

  it('GET /account/notifications/unseen-count returns unseen count', async () => {
    accountGetMock.mockResolvedValueOnce({
      id: TEST_USER_ID,
      id_text: TEST_USER_ACCOUNT_ID_TEXT,
      account_credentials: { email: TEST_EMAIL },
      account_membership_status: {
        membership_expires_at: new Date(Date.now() + 86400000 * 365),
        account_membership: { id: AccountMembershipEnum.Premium },
        allow_notifications: true,
      },
      notifications_last_seen_at: new Date('2026-08-01T00:00:00.000Z'),
    });

    const response = await request(app)
      .get(`${accountBase}/notifications/unseen-count`)
      .set(authHeaders(TEST_USER_ID));

    expect(response.status).toBe(200);
    expect(response.body.data.unseen_count).toBe(4);
  });

  it('POST /account/notifications/mark-seen updates seen timestamp', async () => {
    const response = await request(app)
      .post(`${accountBase}/notifications/mark-seen`)
      .set(authHeaders(TEST_USER_ID))
      .send({});

    expect(response.status).toBe(200);
    expect(accountUpdateNotificationsLastSeenAtMock).toHaveBeenCalledTimes(1);
    expect(typeof response.body.data.last_seen_at).toBe('string');
  });

  it('GET /account/notification-preferences returns seeded preference rows', async () => {
    const response = await request(app)
      .get(`${accountBase}/notification-preferences`)
      .set(authHeaders(TEST_USER_ID));

    expect(response.status).toBe(200);
    expect(accountNotificationPreferenceSeedDefaultsMock).toHaveBeenCalledWith(TEST_USER_ID);
    expect(response.body.data).toEqual([
      {
        id: 201,
        account_id: TEST_USER_ID,
        category: 'maintenance',
        in_app_enabled: true,
        push_enabled: false,
      },
    ]);
  });

  it('PUT /account/notification-preferences enforces in-app true for maintenance', async () => {
    const response = await request(app)
      .put(`${accountBase}/notification-preferences`)
      .set(authHeaders(TEST_USER_ID))
      .send({
        preferences: [
          {
            category: 'maintenance',
            in_app_enabled: false,
            push_enabled: false,
          },
        ],
      });

    expect(response.status).toBe(200);
    expect(accountNotificationPreferenceUpsertMock).toHaveBeenCalledWith({
      account_id: TEST_USER_ID,
      category: 'maintenance',
      in_app_enabled: true,
      push_enabled: false,
    });
  });

  it('PUT /account/notification-preferences returns 403 when enabling push without entitlement', async () => {
    accountGetMock.mockResolvedValueOnce({
      id: TEST_USER_ID,
      id_text: TEST_USER_ACCOUNT_ID_TEXT,
      account_credentials: { email: TEST_EMAIL },
      account_membership_status: {
        membership_expires_at: new Date(Date.now() + 86400000 * 365),
        account_membership: { id: AccountMembershipEnum.Premium },
        allow_notifications: false,
      },
      notifications_last_seen_at: null,
    });

    const response = await withMutedExpectedErrorLogs(async () =>
      request(app)
        .put(`${accountBase}/notification-preferences`)
        .set(authHeaders(TEST_USER_ID))
        .send({
          preferences: [
            {
              category: 'product-update',
              in_app_enabled: true,
              push_enabled: true,
            },
          ],
        })
    );

    expect(response.status).toBe(403);
    expect(response.body.code).toBe('feature_not_available_for_account_type');
  });

  it('POST /account-settings/notification-type still supports legacy notification-type route', async () => {
    const response = await request(app)
      .post(`${accountSettingsBase}/notification-type`)
      .set(authHeaders(TEST_USER_ID))
      .send({ type: 'new-item' });

    expect(response.status).toBe(200);
    expect(notificationTypeCreateMock).toHaveBeenCalledWith({
      account_id: TEST_USER_ID,
      type: 'new-item',
    });
  });
});
