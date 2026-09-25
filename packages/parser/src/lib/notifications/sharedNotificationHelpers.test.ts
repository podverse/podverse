import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  AccountNotificationTypeEnum,
  buildEpisodePath,
  NotificationCategoryEnum,
} from '@podverse/helpers';
import type {
  NotificationPlatform,
  UPSubscription,
  WebPushSubscription,
} from '@podverse/notifications';

const {
  accountNotificationCreateManyMock,
  getAllByChannelIdTextMock,
  getAllFcmDevicesMock,
  getAllUpDevicesMock,
  getAllWebPushDevicesMock,
  getForAccountsAndCategoryMock,
  logErrorMock,
  loggerInfoMock,
  notificationOrchestratorMock,
} = vi.hoisted(() => ({
  accountNotificationCreateManyMock: vi.fn(),
  getAllByChannelIdTextMock: vi.fn(),
  getAllFcmDevicesMock: vi.fn(),
  getAllUpDevicesMock: vi.fn(),
  getAllWebPushDevicesMock: vi.fn(),
  getForAccountsAndCategoryMock: vi.fn(),
  logErrorMock: vi.fn(),
  loggerInfoMock: vi.fn(),
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
    info: loggerInfoMock,
    logError: logErrorMock,
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
    getForAccountsAndCategory = getForAccountsAndCategoryMock;
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
  sendItemNotifications,
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
    getForAccountsAndCategoryMock.mockImplementation(async (accountIds: number[]) =>
      accountIds.flatMap((accountId) => {
        if (accountId === 1) {
          return [
            {
              account_id: accountId,
              category: NotificationCategoryEnum.NewContent,
              in_app_enabled: true,
              push_enabled: true,
            },
          ];
        }
        if (accountId === 3) {
          return [
            {
              account_id: accountId,
              category: NotificationCategoryEnum.NewContent,
              in_app_enabled: true,
              push_enabled: false,
            },
          ];
        }
        return [];
      })
    );
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
    expect(getForAccountsAndCategoryMock).toHaveBeenCalledTimes(1);
    expect(getForAccountsAndCategoryMock).toHaveBeenCalledWith(
      [1, 3],
      NotificationCategoryEnum.NewContent
    );
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
    getForAccountsAndCategoryMock.mockResolvedValue([
      {
        account_id: 7,
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

  it('includes Trial accounts with a valid membership and no notifications override', async () => {
    getAllByChannelIdTextMock.mockResolvedValue([
      {
        account_id: 11,
        account_notification_channel_types: [{ type: AccountNotificationTypeEnum.NewItem }],
        account: {
          account_membership_status: {
            membership_expires_at: new Date('2099-01-01T00:00:00.000Z'),
            allow_notifications: null,
          },
          account_settings: { account_settings_locale: { locale: 'en-US' } },
        },
      },
      {
        account_id: 12,
        account_notification_channel_types: [{ type: AccountNotificationTypeEnum.NewItem }],
        account: {
          account_membership_status: {
            membership_expires_at: new Date('2000-01-01T00:00:00.000Z'),
            allow_notifications: null,
          },
          account_settings: { account_settings_locale: { locale: 'en-US' } },
        },
      },
    ]);
    getForAccountsAndCategoryMock.mockResolvedValue([
      {
        account_id: 11,
        category: NotificationCategoryEnum.NewContent,
        in_app_enabled: true,
        push_enabled: true,
      },
    ]);
    getAllFcmDevicesMock.mockResolvedValue([
      { account_id: 11, fcm_token: 'token-11', platform: 'ios', locale: 'en-US' },
    ]);

    const recipients = await getDevicesForNotificationType(
      'channel-1',
      AccountNotificationTypeEnum.NewItem,
      NotificationCategoryEnum.NewContent
    );

    expect(recipients).not.toBeNull();
    expect(recipients?.inAppEnabledAccountIds).toEqual([11]);
    expect(recipients?.pushEnabledAccountIds).toEqual([11]);
    expect(getAllFcmDevicesMock).toHaveBeenCalledWith([11]);
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
    getForAccountsAndCategoryMock.mockResolvedValue([
      {
        account_id: 10,
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

  it('uses category defaults when the batched read has no row for an account', async () => {
    getAllByChannelIdTextMock.mockResolvedValue([
      {
        account_id: 4,
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
    getForAccountsAndCategoryMock.mockResolvedValue([]);

    const recipients = await getDevicesForNotificationType(
      'channel-1',
      AccountNotificationTypeEnum.NewItem,
      NotificationCategoryEnum.ProductUpdate
    );

    expect(getForAccountsAndCategoryMock).toHaveBeenCalledTimes(1);
    expect(getForAccountsAndCategoryMock).toHaveBeenCalledWith(
      [4],
      NotificationCategoryEnum.ProductUpdate
    );
    expect(recipients?.inAppEnabledAccountIds).toEqual([4]);
    expect(recipients?.pushEnabledAccountIds).toEqual([]);
    expect(getAllFcmDevicesMock).not.toHaveBeenCalled();
  });
});

const webSubscription: WebPushSubscription = {
  endpoint: 'https://push.example/web',
  keys: { p256dh: 'p256', auth: 'auth' },
};

const upSubscription: UPSubscription = {
  up_endpoint: 'https://up.example/push',
  up_auth_key: null,
};

const liveItem = {
  itemTitle: 'Show title',
  channelTitle: 'Channel',
  imageUrl: 'https://img.example/art.jpg',
  itemIdText: 'item-1',
  channelIdText: 'channel-1',
  messageType: 'livestream-started' as const,
  mediumId: 1,
};

const liveItemData = {
  itemIdText: liveItem.itemIdText,
  channelIdText: liveItem.channelIdText,
  mediumId: liveItem.mediumId,
  type: liveItem.messageType,
};

const groupedDevices = new Map<string, Map<NotificationPlatform, string[]>>([
  [
    'en-US',
    new Map<NotificationPlatform, string[]>([
      ['ios', ['ios-token']],
      ['android', []],
    ]),
  ],
  ['es', new Map<NotificationPlatform, string[]>([['ios', ['es-token']]])],
]);

const webPushSubscriptions = new Map<string, WebPushSubscription[]>([
  ['en-US', [webSubscription]],
  ['es', []],
]);

const upSubscriptions = new Map<string, UPSubscription[]>([
  ['en-US', [upSubscription]],
  ['fr', []],
]);

const isWebPushParams = (params: unknown): boolean => {
  return (
    typeof params === 'object' &&
    params !== null &&
    'service' in params &&
    params.service === 'webpush'
  );
};

describe('sendItemNotifications fanout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    notificationOrchestratorMock.mockReset();
    notificationOrchestratorMock.mockResolvedValue(undefined);
  });

  it('sends each locale, platform, and service once and overlaps those legs', async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    notificationOrchestratorMock.mockImplementation(async () => {
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await Promise.resolve();
      inFlight -= 1;
    });

    await sendItemNotifications([liveItem], groupedDevices, webPushSubscriptions, upSubscriptions);

    const shared = {
      messageText: liveItem.itemTitle,
      messageType: liveItem.messageType,
      body: liveItem.channelTitle,
      image: liveItem.imageUrl,
      channelIdText: liveItem.channelIdText,
      linkIdText: liveItem.itemIdText,
      mediumId: liveItem.mediumId,
      data: liveItemData,
    };

    expect(notificationOrchestratorMock).toHaveBeenCalledTimes(5);
    expect(maxInFlight).toBeGreaterThan(1);
    expect(notificationOrchestratorMock).toHaveBeenNthCalledWith(
      1,
      {},
      {
        service: 'firebase',
        firebaseCtx: {},
        tokens: ['ios-token'],
        locale: 'en-US',
        platform: 'ios',
        ...shared,
      }
    );
    expect(notificationOrchestratorMock).toHaveBeenNthCalledWith(
      2,
      {},
      {
        service: 'firebase',
        firebaseCtx: {},
        tokens: [],
        locale: 'en-US',
        platform: 'android',
        ...shared,
      }
    );
    expect(notificationOrchestratorMock).toHaveBeenNthCalledWith(
      3,
      {},
      {
        service: 'firebase',
        firebaseCtx: {},
        tokens: ['es-token'],
        locale: 'es',
        platform: 'ios',
        ...shared,
      }
    );
    expect(notificationOrchestratorMock).toHaveBeenNthCalledWith(
      4,
      {},
      {
        service: 'webpush',
        subscriptions: [webSubscription],
        locale: 'en-US',
        ...shared,
      }
    );
    expect(notificationOrchestratorMock).toHaveBeenNthCalledWith(
      5,
      {},
      {
        service: 'unifiedpush',
        subscriptions: [upSubscription],
        locale: 'en-US',
        ...shared,
      }
    );
    expect(logErrorMock).not.toHaveBeenCalled();
    expect(loggerInfoMock).toHaveBeenCalledTimes(5);
  });

  it('finishes the other send legs when one service rejects', async () => {
    const webPushFailure = new Error('web push down');
    notificationOrchestratorMock.mockImplementation(async (_ctx: unknown, params: unknown) => {
      if (isWebPushParams(params)) {
        throw webPushFailure;
      }
    });

    const itemWithoutImage = { ...liveItem, imageUrl: null };

    await expect(
      sendItemNotifications(
        [itemWithoutImage],
        groupedDevices,
        webPushSubscriptions,
        upSubscriptions
      )
    ).resolves.toBeUndefined();

    expect(notificationOrchestratorMock).toHaveBeenCalledTimes(5);
    expect(logErrorMock).toHaveBeenCalledTimes(1);
    expect(logErrorMock).toHaveBeenCalledWith(
      'Failed to send Web Push notification for item item-1 to 1 subscription(s) (en-US)',
      webPushFailure
    );
    expect(loggerInfoMock).toHaveBeenCalledTimes(4);

    for (const call of notificationOrchestratorMock.mock.calls) {
      const params = call[1];
      if (typeof params === 'object' && params !== null) {
        expect(params).not.toHaveProperty('image');
      }
    }
  });
});
