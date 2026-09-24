import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MediumEnum } from '@podverse/helpers';
import type { RemoteItemDto } from '@podverse/helpers';
import type { Channel } from '@podverse/orm';

const {
  channelGetMock,
  createInAppMock,
  getAllByPodcastGuidsMock,
  getByUrlMock,
  getDevicesMock,
  podcastGetByGuidMock,
  sendItemNotificationsMock,
} = vi.hoisted(() => ({
  channelGetMock: vi.fn(),
  createInAppMock: vi.fn(),
  getAllByPodcastGuidsMock: vi.fn(),
  getByUrlMock: vi.fn(),
  getDevicesMock: vi.fn(),
  podcastGetByGuidMock: vi.fn(),
  sendItemNotificationsMock: vi.fn(),
}));

vi.mock('@parser/config/index.js', () => ({
  config: { podcastIndex: { rateLimitDelay: 0 } },
}));

vi.mock('@parser/context.js', () => ({
  getPodcastIndexService: () => ({
    podcastGetByGuid: podcastGetByGuidMock,
  }),
}));

vi.mock('@parser/factories/loggerService.js', () => ({
  loggerService: {
    info: vi.fn(),
    logError: vi.fn(),
  },
}));

vi.mock('@podverse/orm', () => ({
  ChannelService: class {
    get = channelGetMock;
    getAllByPodcastGuids = getAllByPodcastGuidsMock;
  },
  FeedService: class {
    getByUrl = getByUrlMock;
  },
}));

vi.mock('./sharedNotificationHelpers.js', () => ({
  createInAppNotificationsForAccounts: createInAppMock,
  getDevicesForNotificationType: getDevicesMock,
  getInAppNotificationLinkPath: vi.fn(() => '/album/album-local'),
  getInAppNotificationTitle: vi.fn((_messageType: string, title: string) => title),
  groupDevicesByLocaleAndPlatform: vi.fn(() => new Map()),
  loadChannelImages: vi.fn(async () => []),
  selectBestImage: vi.fn(() => null),
  sendItemNotifications: sendItemNotificationsMock,
}));

import { handleNewRemoteItemNotifications } from './handleNewRemoteItemNotifications.js';

const FEED_A = '11111111-1111-4111-8111-111111111111';
const FEED_B = '22222222-2222-4222-8222-222222222222';
const FEED_C = '33333333-3333-4333-8333-333333333333';

/** The sender reads id_text, title, and medium_id. */
function channelWithMedium(mediumId: number): Channel {
  return {
    id_text: 'artist-1',
    medium_id: mediumId,
    title: 'Artist',
  } as Channel;
}

function albumRef(feedGuid: string, title: string): RemoteItemDto {
  return {
    feed_guid: feedGuid,
    feed_url: null,
    item_guid: null,
    medium_id: null,
    title,
  };
}

const recipients = {
  devices: [],
  inAppEnabledAccountIds: [1],
  upSubscriptions: new Map(),
  webPushSubscriptions: new Map(),
};

describe('handleNewRemoteItemNotifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getDevicesMock.mockResolvedValue(recipients);
    getAllByPodcastGuidsMock.mockResolvedValue([]);
    getByUrlMock.mockResolvedValue(null);
    channelGetMock.mockResolvedValue(null);
    podcastGetByGuidMock.mockResolvedValue(null);
  });

  it('does not notify for a non-artist channel', async () => {
    await handleNewRemoteItemNotifications(channelWithMedium(MediumEnum.Podcast), [
      albumRef(FEED_A, 'A'),
    ]);
    expect(getDevicesMock).not.toHaveBeenCalled();
    expect(sendItemNotificationsMock).not.toHaveBeenCalled();
  });

  it('does not look up albums when nobody will receive the notification', async () => {
    getDevicesMock.mockResolvedValue(null);
    await handleNewRemoteItemNotifications(channelWithMedium(MediumEnum.PublisherMusic), [
      albumRef(FEED_A, 'A'),
    ]);
    expect(getAllByPodcastGuidsMock).not.toHaveBeenCalled();
    expect(podcastGetByGuidMock).not.toHaveBeenCalled();
    expect(sendItemNotificationsMock).not.toHaveBeenCalled();
  });

  it('sends nothing when no referenced album can be resolved', async () => {
    podcastGetByGuidMock.mockResolvedValue({ feed: { id: 0, title: 'Missing' } });
    await handleNewRemoteItemNotifications(channelWithMedium(MediumEnum.PublisherMusic), [
      albumRef(FEED_A, 'A'),
      albumRef(FEED_B, 'B'),
    ]);
    expect(podcastGetByGuidMock).toHaveBeenCalledTimes(2);
    expect(sendItemNotificationsMock).not.toHaveBeenCalled();
    expect(createInAppMock).not.toHaveBeenCalled();
  });

  it('announces one local album when a parse adds many album refs', async () => {
    getAllByPodcastGuidsMock.mockImplementation(async (_config: unknown, guids: string[]) => {
      if (guids[0] === FEED_A) {
        return [
          {
            channel_about: { id: 1 },
            channel_images: [],
            id_text: 'album-local',
            title: 'Local album',
          },
        ];
      }
      return [];
    });

    const refs = Array.from({ length: 100 }, (_, index) =>
      albumRef(index === 0 ? FEED_A : `feed-${index}`, `Album ${index}`)
    );

    await handleNewRemoteItemNotifications(channelWithMedium(MediumEnum.PublisherMusic), refs);

    expect(getAllByPodcastGuidsMock).toHaveBeenCalledTimes(1);
    expect(podcastGetByGuidMock).not.toHaveBeenCalled();
    expect(sendItemNotificationsMock).toHaveBeenCalledTimes(1);
    expect(sendItemNotificationsMock.mock.calls[0]?.[0]).toEqual([
      expect.objectContaining({
        channelIdText: 'artist-1',
        channelTitle: 'Artist',
        itemIdText: 'album-local',
        itemTitle: 'Local album',
        messageType: 'new-album',
      }),
    ]);
  });

  it('walks unresolved feed guids until one Podcast Index feed resolves', async () => {
    podcastGetByGuidMock.mockImplementation(async (guid: string) => {
      if (guid === FEED_B) {
        return { feed: { id: 77, title: 'Preview album' } };
      }
      return { feed: { id: 0 } };
    });

    await handleNewRemoteItemNotifications(channelWithMedium(MediumEnum.PublisherMusic), [
      albumRef(FEED_A, 'Skip'),
      albumRef(FEED_B, 'Keep'),
      albumRef(FEED_C, 'Never'),
    ]);

    expect(podcastGetByGuidMock.mock.calls.map((call) => call[0])).toEqual([FEED_A, FEED_B]);
    expect(sendItemNotificationsMock.mock.calls[0]?.[0]).toEqual([
      expect.objectContaining({
        itemIdText: '77',
        itemTitle: 'Preview album',
        messageType: 'podcast-index-feed',
      }),
    ]);
    expect(createInAppMock).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({
          podcastIndexId: '77',
          type: 'podcast-index-feed',
        }),
      })
    );
  });
});
