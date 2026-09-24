import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MediumEnum } from '@podverse/helpers';
import type { Channel } from '@podverse/orm';

const {
  getDevicesMock,
  getManyByGuidEnclosureUrlMock,
  getManyByGuidMock,
  sendItemNotificationsMock,
} = vi.hoisted(() => ({
    getDevicesMock: vi.fn(),
    getManyByGuidEnclosureUrlMock: vi.fn(),
    getManyByGuidMock: vi.fn(),
    sendItemNotificationsMock: vi.fn(),
  }));

vi.mock('@parser/factories/loggerService.js', () => ({
  loggerService: {
    info: vi.fn(),
    logError: vi.fn(),
  },
}));

vi.mock('@podverse/orm', () => ({
  ItemService: class {
    getManyByGuid = getManyByGuidMock;
    getManyByGuidEnclosureUrl = getManyByGuidEnclosureUrlMock;
  },
}));

vi.mock('./sharedNotificationHelpers.js', () => ({
  createInAppNotificationsForAccounts: vi.fn(),
  getBestImageUrl: vi.fn(() => null),
  getDevicesForNotificationType: getDevicesMock,
  getInAppNotificationLinkPath: vi.fn(() => '/episode/item'),
  getInAppNotificationTitle: vi.fn((_messageType: string, title: string) => title),
  groupDevicesByLocaleAndPlatform: vi.fn(() => new Map()),
  loadChannelImages: vi.fn(async () => []),
  sendItemNotifications: sendItemNotificationsMock,
}));

import { handleNewItemNotifications } from './handleNewItemNotifications.js';
import { handleNewLiveItemNotifications } from './handleNewLiveItemNotifications.js';

/** Notification senders read id_text, title, and medium_id. */
function channel(): Channel {
  return {
    id_text: 'ch-1',
    medium_id: MediumEnum.Podcast,
    title: 'Show',
  } as Channel;
}

const recipients = {
  devices: [],
  inAppEnabledAccountIds: [1],
  upSubscriptions: new Map(),
  webPushSubscriptions: new Map(),
};

function datedItem(idText: string, isoDate: string, startTime?: string) {
  return {
    id_text: idText,
    live_item: startTime === undefined ? null : { start_time: startTime },
    pub_date: isoDate,
    title: idText,
  };
}

describe('per-parse notification cap', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getDevicesMock.mockResolvedValue(recipients);
    getManyByGuidEnclosureUrlMock.mockResolvedValue([]);
  });

  it('announces the newest item once when a parse inserts many items', async () => {
    getManyByGuidMock.mockResolvedValue(
      Array.from({ length: 100 }, (_, index) =>
        datedItem(`item-${index}`, new Date(Date.UTC(2020, 0, index + 1)).toISOString())
      )
    );

    await handleNewItemNotifications(channel(), {
      newItemGuidEnclosureUrls: [],
      newItemGuids: Array.from({ length: 100 }, (_, index) => `guid-${index}`),
    });

    expect(sendItemNotificationsMock).toHaveBeenCalledTimes(1);
    expect(sendItemNotificationsMock.mock.calls[0]?.[0]).toEqual([
      expect.objectContaining({
        itemIdText: 'item-99',
        messageType: 'new-episode',
      }),
    ]);
  });

  it('can send one scheduled and one started notification from the same parse', async () => {
    const pending = Array.from({ length: 100 }, (_, index) =>
      datedItem(
        `pending-${index}`,
        '2020-01-01T00:00:00.000Z',
        new Date(Date.UTC(2024, 0, index + 1)).toISOString()
      )
    );
    const started = Array.from({ length: 100 }, (_, index) =>
      datedItem(
        `live-${index}`,
        '2020-01-01T00:00:00.000Z',
        new Date(Date.UTC(2025, 0, index + 1)).toISOString()
      )
    );
    getManyByGuidMock.mockResolvedValueOnce(pending).mockResolvedValueOnce(started);

    await handleNewLiveItemNotifications(channel(), {
      liveItemGuids: started.map((item) => item.id_text),
      pendingItemGuids: pending.map((item) => item.id_text),
    });

    expect(sendItemNotificationsMock).toHaveBeenCalledTimes(2);
    expect(sendItemNotificationsMock.mock.calls[0]?.[0]).toEqual([
      expect.objectContaining({
        itemIdText: 'pending-99',
        messageType: 'livestream-scheduled',
      }),
    ]);
    expect(sendItemNotificationsMock.mock.calls[1]?.[0]).toEqual([
      expect.objectContaining({
        itemIdText: 'live-99',
        messageType: 'livestream-started',
      }),
    ]);
  });
});
