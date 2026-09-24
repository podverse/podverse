import type { Channel } from '@orm/entities/channel/channel.js';
import type { ChannelRemoteItem } from '@orm/entities/channel/channelRemoteItem.js';
import type { Item } from '@orm/entities/item/item.js';

import { ChannelService } from './channel/channel.js';
import { FeedService } from './feed/feed.js';
import { ItemService } from './item/item.js';
import {
  feedUrlsForPublisherAlbumUrlLookup,
  isPublisherAlbumRemoteRef,
} from './publisherFeed.helpers.js';

export class PublisherFeedService {
  async getPublisherFeedChannels(channel_remote_items: ChannelRemoteItem[]): Promise<Channel[]> {
    const channelService = new ChannelService();

    const feed_guids: string[] = [];

    for (const remoteItem of channel_remote_items) {
      if (remoteItem.feed_guid && !remoteItem.item_guid) {
        feed_guids.push(remoteItem.feed_guid);
      }
    }

    const publisherChannels = await channelService.getAllByPodcastGuids(
      {
        relations: { channel_images: true },
      },
      feed_guids
    );

    return publisherChannels;
  }

  async getPublisherFeedItems(channel_remote_items: ChannelRemoteItem[]) {
    const itemService = new ItemService();

    const params: { podcast_guid: string; item_guid: string }[] = [];
    for (const remoteItem of channel_remote_items) {
      if (remoteItem.feed_guid && remoteItem.item_guid) {
        params.push({ podcast_guid: remoteItem.feed_guid, item_guid: remoteItem.item_guid });
      }
    }

    const publisherItems = await itemService.getManyByPodcastGuidAndItemGuid(params, {
      relations: {
        channel: { channel_images: true },
        item_images: true,
      },
    });

    return publisherItems;
  }

  /**
   * When a remote album ref did not match by podcast_guid, try the stored feed_url
   * against a local feed. Only parsed-ready channels (with channel_about) join added.
   */
  private async promoteUnmatchedAlbumsByFeedUrl(
    unmatchedAlbumRefs: ChannelRemoteItem[],
    publisherChannelsAdded: Channel[]
  ): Promise<ChannelRemoteItem[]> {
    const feedUrls = feedUrlsForPublisherAlbumUrlLookup(unmatchedAlbumRefs);
    if (feedUrls.length === 0) {
      return unmatchedAlbumRefs;
    }

    const feedService = new FeedService();
    const channelService = new ChannelService();
    const channelByFeedUrl = new Map<string, Channel>();

    for (const feedUrl of feedUrls) {
      const feed = await feedService.getByUrl({ url: feedUrl });
      const channelId = feed?.channel?.id;
      if (channelId === undefined || channelId === null) {
        continue;
      }
      const channel = await channelService.get(channelId, {
        channel_about: true,
        channel_images: true,
      });
      if (channel?.channel_about) {
        channelByFeedUrl.set(feedUrl, channel);
      }
    }

    if (channelByFeedUrl.size === 0) {
      return unmatchedAlbumRefs;
    }

    const remainingUnadded: ChannelRemoteItem[] = [];
    for (const rItem of unmatchedAlbumRefs) {
      const feedUrl = typeof rItem.feed_url === 'string' ? rItem.feed_url.trim() : '';
      const matched = feedUrl.length > 0 ? channelByFeedUrl.get(feedUrl) : undefined;
      if (matched) {
        if (!publisherChannelsAdded.find((pc) => pc.id === matched.id)) {
          publisherChannelsAdded.push(matched);
        }
      } else {
        remainingUnadded.push(rItem);
      }
    }
    return remainingUnadded;
  }

  async getPublisherFeedRemoteItemsForChannel(idOrIdText: string) {
    const channelService = new ChannelService();

    const channel = await channelService.getByIdOrIdText(idOrIdText, {
      channel_description: true,
      channel_images: true,
      channel_remote_items: true,
    });

    if (!channel) {
      return {
        channel: null,
        publisherChannelsAdded: [],
        publisherChannelsUnadded: [],
        publisherItemsAdded: [],
        publisherItemsUnadded: [],
      };
    }

    const channel_remote_items = channel.channel_remote_items || [];

    if (!channel_remote_items || channel_remote_items.length === 0) {
      return {
        channel,
        publisherChannelsAdded: [],
        publisherChannelsUnadded: [],
        publisherItemsAdded: [],
        publisherItemsUnadded: [],
      };
    }

    const channelFeedGuids: string[] = [];
    const itemParams: { podcast_guid: string; item_guid: string }[] = [];

    for (const rItem of channel_remote_items) {
      if (rItem.feed_guid && !rItem.item_guid) {
        channelFeedGuids.push(rItem.feed_guid);
      }

      if (rItem.feed_guid && rItem.item_guid) {
        itemParams.push({ podcast_guid: rItem.feed_guid, item_guid: rItem.item_guid });
      }
    }

    const publisherChannels = channelFeedGuids.length
      ? await this.getPublisherFeedChannels(channel_remote_items)
      : [];
    const publisherItems = itemParams.length
      ? await this.getPublisherFeedItems(channel_remote_items)
      : [];

    const foundChannelGuids = new Set<string>(
      publisherChannels.map((c) => c.podcast_guid).filter((g): g is string => !!g)
    );

    const foundItemKey = new Set<string>(
      publisherItems
        .filter((i) => !!i.channel?.podcast_guid && !!i.guid)
        .map((i) => `${i.channel?.podcast_guid}||${i.guid}`)
    );

    const publisherChannelsAdded: Channel[] = [];
    const publisherChannelsUnadded: ChannelRemoteItem[] = [];

    for (const rItem of channel_remote_items) {
      if (!isPublisherAlbumRemoteRef(rItem)) {
        continue;
      }
      if (rItem.feed_guid && foundChannelGuids.has(rItem.feed_guid)) {
        const ch = publisherChannels.find((c) => c.podcast_guid === rItem.feed_guid);
        if (ch && !publisherChannelsAdded.find((pc) => pc.id === ch.id)) {
          publisherChannelsAdded.push(ch);
        }
      } else {
        publisherChannelsUnadded.push(rItem);
      }
    }

    const publisherChannelsUnaddedAfterUrl = await this.promoteUnmatchedAlbumsByFeedUrl(
      publisherChannelsUnadded,
      publisherChannelsAdded
    );

    const publisherItemsAdded: Item[] = [];
    const publisherItemsUnadded: ChannelRemoteItem[] = [];

    for (const rItem of channel_remote_items) {
      if (rItem.feed_guid && rItem.item_guid) {
        const key = `${rItem.feed_guid}||${rItem.item_guid}`;
        if (foundItemKey.has(key)) {
          const it = publisherItems.find(
            (i) => i.guid === rItem.item_guid && i.channel?.podcast_guid === rItem.feed_guid
          );
          if (it && !publisherItemsAdded.find((pi) => pi.id === it.id)) {
            publisherItemsAdded.push(it);
          }
        } else {
          publisherItemsUnadded.push(rItem);
        }
      }
    }

    return {
      channel,
      publisherChannelsAdded,
      publisherChannelsUnadded: publisherChannelsUnaddedAfterUrl,
      publisherItemsAdded,
      publisherItemsUnadded,
    };
  }
}
