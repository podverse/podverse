import { config } from '@parser/config/index.js';
import { getPodcastIndexService } from '@parser/context.js';
import { loggerService } from '@parser/factories/loggerService.js';

import type { RemoteItemDto } from '@podverse/helpers';
import { AccountNotificationTypeEnum, NotificationCategoryEnum } from '@podverse/helpers';
import type { Channel, ChannelImage } from '@podverse/orm';
import { ChannelService, FeedService } from '@podverse/orm';

import type { RemoteAlbumGroup } from './remoteAlbumNotification.js';
import {
  groupNewRemoteItemsByFeed,
  pickFirstResolvedRemoteAlbum,
  remoteAlbumNotificationTitle,
  shouldNotifyForRemoteAlbumRefs,
} from './remoteAlbumNotification.js';
import type { ItemNotificationData } from './sharedNotificationHelpers.js';
import {
  createInAppNotificationsForAccounts,
  getDevicesForNotificationType,
  getInAppNotificationLinkPath,
  getInAppNotificationTitle,
  groupDevicesByLocaleAndPlatform,
  loadChannelImages,
  selectBestImage,
  sendItemNotifications,
} from './sharedNotificationHelpers.js';

type ResolvedRemoteAlbum =
  | {
      imageUrl: string | null;
      kind: 'album';
      albumIdText: string;
      title: string;
    }
  | {
      imageUrl: string | null;
      kind: 'podcast-index';
      podcastIndexId: string;
      title: string;
    };

const isParsedReadyAlbum = (
  channel: Channel | null
): channel is Channel & { id_text: string } => {
  return (
    channel !== null &&
    channel.channel_about !== null &&
    channel.channel_about !== undefined &&
    channel.id_text.length > 0
  );
};

const albumImageUrl = (images: ChannelImage[] | null | undefined): string | null => {
  if (images === null || images === undefined || images.length === 0) {
    return null;
  }
  return selectBestImage(images);
};

const localAlbum = (channel: Channel, group: RemoteAlbumGroup): ResolvedRemoteAlbum => {
  return {
    albumIdText: channel.id_text,
    imageUrl: albumImageUrl(channel.channel_images),
    kind: 'album',
    title: remoteAlbumNotificationTitle(group, channel.title),
  };
};

async function resolveRemoteAlbumGroup(
  group: RemoteAlbumGroup
): Promise<ResolvedRemoteAlbum | null> {
  const channelService = new ChannelService();
  const byGuid = await channelService.getAllByPodcastGuids(
    { relations: { channel_about: true, channel_images: true } },
    [group.feedGuid]
  );
  const parsedByGuid = byGuid.find((channel) => isParsedReadyAlbum(channel));
  if (parsedByGuid !== undefined) {
    return localAlbum(parsedByGuid, group);
  }

  const feedService = new FeedService();
  for (const feedUrl of group.feedUrls) {
    const feed = await feedService.getByUrl({ url: feedUrl });
    const channelId = feed?.channel?.id;
    if (channelId === undefined || channelId === null) {
      continue;
    }
    const channel = await channelService.get(channelId, {
      channel_about: true,
      channel_images: true,
    });
    if (isParsedReadyAlbum(channel)) {
      return localAlbum(channel, group);
    }
  }

  const podcastIndex = getPodcastIndexService();
  const response = await podcastIndex.podcastGetByGuid(
    group.feedGuid,
    config.podcastIndex?.rateLimitDelay ?? 0
  );
  const feedId = response?.feed?.id;
  if (typeof feedId !== 'number' || !Number.isFinite(feedId) || feedId <= 0) {
    return null;
  }

  return {
    imageUrl: null,
    kind: 'podcast-index',
    podcastIndexId: String(feedId),
    title: remoteAlbumNotificationTitle(group, response?.feed?.title ?? null),
  };
}

/**
 * One new-content notification for newly referenced albums on an artist feed.
 * The link is that album, or its Podcast Index preview when the album is not parsed yet.
 */
export async function handleNewRemoteItemNotifications(
  channel: Channel,
  newRemoteItems: RemoteItemDto[]
): Promise<void> {
  try {
    if (!shouldNotifyForRemoteAlbumRefs(channel.medium_id)) {
      return;
    }

    const groups = groupNewRemoteItemsByFeed(newRemoteItems);
    if (groups.length === 0) {
      return;
    }

    const devicesResult = await getDevicesForNotificationType(
      channel.id_text,
      AccountNotificationTypeEnum.NewItem,
      NotificationCategoryEnum.NewContent
    );
    if (!devicesResult) {
      return;
    }

    const resolved = await pickFirstResolvedRemoteAlbum(groups, resolveRemoteAlbumGroup);
    if (resolved === null) {
      return;
    }

    const fallbackImages = resolved.imageUrl === null ? await loadChannelImages(channel) : [];
    const notificationImageUrl = resolved.imageUrl ?? albumImageUrl(fallbackImages);

    const itemNotification: ItemNotificationData =
      resolved.kind === 'album'
        ? {
            channelIdText: channel.id_text,
            channelTitle: channel.title || '',
            imageUrl: notificationImageUrl,
            itemIdText: resolved.albumIdText,
            itemTitle: resolved.title,
            mediumId: channel.medium_id,
            messageType: 'new-album',
          }
        : {
            channelIdText: channel.id_text,
            channelTitle: channel.title || '',
            imageUrl: notificationImageUrl,
            itemIdText: resolved.podcastIndexId,
            itemTitle: resolved.title,
            mediumId: channel.medium_id,
            messageType: 'podcast-index-feed',
          };

    const {
      devices: allDevices,
      inAppEnabledAccountIds,
      upSubscriptions,
      webPushSubscriptions,
    } = devicesResult;

    await createInAppNotificationsForAccounts({
      accountIds: inAppEnabledAccountIds,
      body: itemNotification.channelTitle,
      category: NotificationCategoryEnum.NewContent,
      linkPath: getInAppNotificationLinkPath(itemNotification),
      payload: {
        channelIdText: itemNotification.channelIdText,
        itemIdText: itemNotification.itemIdText,
        mediumId: itemNotification.mediumId,
        ...(resolved.kind === 'podcast-index'
          ? { podcastIndexId: resolved.podcastIndexId }
          : {}),
        type: itemNotification.messageType,
      },
      title: getInAppNotificationTitle(itemNotification.messageType, itemNotification.itemTitle),
    });

    await sendItemNotifications(
      [itemNotification],
      groupDevicesByLocaleAndPlatform(allDevices),
      webPushSubscriptions,
      upSubscriptions
    );
  } catch (error) {
    loggerService.logError('handleNewRemoteItemNotifications', error as Error);
  }
}
