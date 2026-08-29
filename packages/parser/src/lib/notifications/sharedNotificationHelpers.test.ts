import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  AccountNotificationTypeEnum,
  buildEpisodePath,
  NotificationCategoryEnum,
} from '@podverse/helpers';

const {
  accountNotificationCreateManyMock,
  getAllByChannelIdTextMock,
  getAllFcmDevicesMock,
  getAllUpDevicesMock,
  getAllWebPushDevicesMock,
  getForAccountPreferenceMock,
  notificationOrchestratorMock,
} = vi.hoisted(() => ({
  accountNotificationCreateManyMock: vi.fn(),
  getAllByChannelIdTextMock: vi.fn(),
  getAllFcmDevicesMock: vi.fn(),
  getAllUpDevicesMock: vi.fn(),
  getAllWebPushDevicesMock: vi.fn(),
  getForAccountPreferenceMock: vi.fn(),
  notificationOrchestratorMock: vi.fn(),
}));

vi.mock('@parser/config/index.js', () => ({
  config: {
    defaults: {
      account: {
        settings: {
          locale: 'en-US',
        },
      },
    },
  },
}));

vi.mock('@parser/context.js', () => ({
  getFirebaseContext: vi.fn(() => ({})),
  getNotificationsContext: vi.fn(() => ({})),
}));

vi.mock('@parser/factories/loggerService.js', () => ({
  loggerService: {
    info: vi.fn(),
    logError: vi.fn(),
  },
}));

vi.mock('@podverse/notifications', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@podverse/notifications')>();
  return {
    ...actual,
    notificationOrchestrator: notificationOrchestratorMock,
  };
});

vi.mock('@podverse/orm', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@podverse/orm')>();

  class MockAccountFCMDeviceService {
    getAllForAccountIds = getAllFcmDevicesMock;
  }

  class MockAccountNotificationChannelService {
    getAllByChannelIdText = getAllByChannelIdTextMock;
  }

  class MockAccountNotificationPreferenceService {
    getForAccount = getForAccountPreferenceMock;
  }

  class MockAccountNotificationService {
    createMany = accountNotificationCreateManyMock;
  }

  class MockAccountUPDeviceService {
    getAllForAccountIds = getAllUpDevicesMock;
  }

  class MockAccountWebPushDeviceService {
    getAllForAccountIds = getAllWebPushDevicesMock;
  }

  return {
    ...actual,
    AccountFCMDeviceService: MockAccountFCMDeviceService,
    AccountNotificationChannelService: MockAccountNotificationChannelService,
    AccountNotificationPreferenceService: MockAccountNotificationPreferenceService,
    AccountNotificationService: MockAccountNotificationService,
    AccountUPDeviceService: MockAccountUPDeviceService,
    AccountWebPushDeviceService: MockAccountWebPushDeviceService,
  };
});

import {
  createInAppNotificationsForAccounts,
  getDevicesForNotificationType,
} from './sharedNotificationHelpers.js';

describe('sharedNotificationHelpers recipient gating', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getAllFcmDevicesMock.mockResolvedValue([]);
    getAllWebPushDevicesMock.mockResolvedValue([]);
    getAllUpDevicesMock.mockResolvedValue([]);
    accountNotificationCreateManyMock.mockImplementation(async (rows: unknown[]) => rows);
  });

  it('keeps two in-app recipients when one of three subscribers lacks membership', async () => {
    getAllByChannelIdTextMock.mockResolvedValue([
      {
        account_id: 1,
        account_notification_channel_types: [{ type: AccountNotificationTypeEnum.NewItem }],
        account: {
          account_membership_status: {
            membership_expires_at: new Date('2099-01-01T00:00:00.000Z'),
            allow_notifications: true,
          },
          account_settings: { account_settings_locale: { locale: 'en-US' } },
        },
      },
      {
        account_id: 2,
        account_notification_channel_types: [{ type: AccountNotificationTypeEnum.NewItem }],
        account: {
          account_membership_status: {
            membership_expires_at: new Date('2000-01-01T00:00:00.000Z'),
            allow_notifications: true,
          },
          account_settings: { account_settings_locale: { locale: 'en-US' } },
        },
      },
      {
        account_id: 3,
        account_notification_channel_types: [{ type: AccountNotificationTypeEnum.NewItem }],
        account: {
          account_membership_status: {
            membership_expires_at: new Date('2099-01-01T00:00:00.000Z'),
            allow_notifications: true,
          },
          account_settings: { account_settings_locale: { locale: 'es' } },
        },
      },
    ]);
    getForAccountPreferenceMock.mockImplementation(async (accountId: number) => {
      if (accountId === 1) {
        return [
          {
            category: NotificationCategoryEnum.NewContent,
            in_app_enabled: true,
            push_enabled: true,
          },
        ];
      }
      if (accountId === 3) {
        return [
          {
            category: NotificationCategoryEnum.NewContent,
            in_app_enabled: true,
            push_enabled: false,
          },
        ];
      }
      return [];
    });
    getAllFcmDevicesMock.mockResolvedValue([
      {
        account_id: 1,
        fcm_token: 'token-1',
        platform: 'ios',
        locale: 'en-US',
      },
    ]);

    const recipients = await getDevicesForNotificationType(
      'channel-1',
      AccountNotificationTypeEnum.NewItem,
      NotificationCategoryEnum.NewContent
    );

    expect(recipients).not.toBeNull();
    expect(recipients?.inAppEnabledAccountIds).toEqual([1, 3]);
    expect(recipients?.pushEnabledAccountIds).toEqual([1]);
    expect(getAllFcmDevicesMock).toHaveBeenCalledWith([1]);

    const insertedCount = await createInAppNotificationsForAccounts({
      accountIds: recipients?.inAppEnabledAccountIds ?? [],
      body: 'Channel title',
      category: NotificationCategoryEnum.NewContent,
      linkPath: buildEpisodePath('item-1'),
      payload: { itemIdText: 'item-1' },
      title: 'New episode',
    });

    expect(insertedCount).toBe(2);
    expect(accountNotificationCreateManyMock).toHaveBeenCalledWith([
      expect.objectContaining({ account_id: 1, category: NotificationCategoryEnum.NewContent }),
      expect.objectContaining({ account_id: 3, category: NotificationCategoryEnum.NewContent }),
    ]);
  });

  it('respects in-app disabled preference for row insertion while allowing push', async () => {
    getAllByChannelIdTextMock.mockResolvedValue([
      {
        account_id: 7,
        account_notification_channel_types: [{ type: AccountNotificationTypeEnum.NewItem }],
        account: {
          account_membership_status: {
            membership_expires_at: new Date('2099-01-01T00:00:00.000Z'),
            allow_notifications: true,
          },
          account_settings: { account_settings_locale: { locale: 'en-US' } },
        },
      },
    ]);
    getForAccountPreferenceMock.mockResolvedValue([
      {
        category: NotificationCategoryEnum.NewContent,
        in_app_enabled: false,
        push_enabled: true,
      },
    ]);
    getAllFcmDevicesMock.mockResolvedValue([
      { account_id: 7, fcm_token: 'token-7', platform: 'ios', locale: 'en-US' },
    ]);

    const recipients = await getDevicesForNotificationType(
      'channel-1',
      AccountNotificationTypeEnum.NewItem,
      NotificationCategoryEnum.NewContent
    );

    expect(recipients).not.toBeNull();
    expect(recipients?.inAppEnabledAccountIds).toEqual([]);
    expect(recipients?.pushEnabledAccountIds).toEqual([7]);

    const insertedCount = await createInAppNotificationsForAccounts({
      accountIds: recipients?.inAppEnabledAccountIds ?? [],
      body: 'Channel title',
      category: NotificationCategoryEnum.NewContent,
      linkPath: buildEpisodePath('item-7'),
      payload: { itemIdText: 'item-7' },
      title: 'New episode',
    });

    expect(insertedCount).toBe(0);
    expect(accountNotificationCreateManyMock).not.toHaveBeenCalled();
  });

  it('excludes accounts with allow_notifications=false from push recipients', async () => {
    getAllByChannelIdTextMock.mockResolvedValue([
      {
        account_id: 9,
        account_notification_channel_types: [{ type: AccountNotificationTypeEnum.NewItem }],
        account: {
          account_membership_status: {
            membership_expires_at: new Date('2099-01-01T00:00:00.000Z'),
            allow_notifications: false,
          },
          account_settings: { account_settings_locale: { locale: 'en-US' } },
        },
      },
      {
        account_id: 10,
        account_notification_channel_types: [{ type: AccountNotificationTypeEnum.NewItem }],
        account: {
          account_membership_status: {
            membership_expires_at: new Date('2099-01-01T00:00:00.000Z'),
            allow_notifications: true,
          },
          account_settings: { account_settings_locale: { locale: 'en-US' } },
        },
      },
    ]);
    getForAccountPreferenceMock.mockResolvedValue([
      {
        category: NotificationCategoryEnum.NewContent,
        in_app_enabled: true,
        push_enabled: true,
      },
    ]);
    getAllFcmDevicesMock.mockResolvedValue([
      { account_id: 10, fcm_token: 'token-10', platform: 'ios', locale: 'en-US' },
    ]);

    const recipients = await getDevicesForNotificationType(
      'channel-1',
      AccountNotificationTypeEnum.NewItem,
      NotificationCategoryEnum.NewContent
    );

    expect(recipients).not.toBeNull();
    expect(recipients?.inAppEnabledAccountIds).toEqual([10]);
    expect(recipients?.pushEnabledAccountIds).toEqual([10]);
    expect(getAllFcmDevicesMock).toHaveBeenCalledWith([10]);
  });
});
