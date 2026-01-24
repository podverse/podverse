import { AccountFollowingAccountService } from './accountFollowingAccount';
import { AccountFollowingChannelService } from './accountFollowingChannel';
import { AccountFollowingPlaylistService } from './accountFollowingPlaylist';
import { AccountFollowingAddByRSSChannelService } from './accountFollowingAddByRSSChannel';
import { PlaylistService } from '../playlist/playlist';
import { PlaylistResourceService } from '../playlist/playlistResource';
import { ClipService } from '../clip';
import { QueueService } from '../queue/queue';
import { QueueResourceService, listResourceRelations } from '../queue/queueResource';
import { AccountService } from './account';
import { Item } from '@orm/entities/item/item';
import { Clip } from '@orm/entities/clip';
import { PlaylistResource } from '@orm/entities/playlist/playlistResource';
import { QueueResource } from '@orm/entities/queue/queueResource';

export class AccountDataExportService {
  private accountService: AccountService;

  constructor() {
    this.accountService = new AccountService();
  }

  async exportUserData(account_id: number): Promise<{
    export_date: string;
    account: {
      id: number;
      id_text: string;
      verified: boolean;
      sharable_status_id: number | null;
      account_profile?: {
        display_name: string | null;
        bio: string | null;
      } | null;
    };
    following: {
      accounts: Array<{ id_text: string; verified: boolean }>;
      channels: Array<{ id_text: string; title: string | null; feed: { url: string } | null }>;
      playlists: Array<{ id_text: string; title: string | null; account: { id_text: string } | null }>;
      add_by_rss_channels: Array<{ feed_url: string; title: string | null; image_url: string | null }>;
    };
    playlists: Array<unknown>;
    clips: Array<unknown>;
    queues: Array<unknown>;
  }> {
    const account = await this.accountService.get(account_id, {
      relations: [
        'account_profile',
      ],
    });

    if (!account) {
      throw new Error('Account not found');
    }

    const accountData = {
      id: account.id,
      id_text: account.id_text,
      verified: account.verified,
      sharable_status_id: account.sharable_status?.id ?? null,
      account_profile: account.account_profile ? {
        display_name: account.account_profile.display_name ?? null,
        bio: account.account_profile.bio ?? null,
      } : null,
    };

    // Get following relationships
    const accountFollowingAccountService = new AccountFollowingAccountService();
    const accountFollowingChannelService = new AccountFollowingChannelService();
    const accountFollowingPlaylistService = new AccountFollowingPlaylistService();
    const accountFollowingAddByRSSChannelService = new AccountFollowingAddByRSSChannelService();

    const followingAccounts = await accountFollowingAccountService.getFollowedAccountsPrivate(account_id, {
      relations: ['following_account'],
    });
    const followingChannels = await accountFollowingChannelService.getFollowedChannels(account_id, null, {
      relations: ['channel', 'channel.feed'],
    });
    const followingPlaylists = await accountFollowingPlaylistService.getFollowedPlaylistsPrivate(account_id, {
      relations: ['playlist', 'playlist.account'],
    });
    const followingAddByRSSChannels = await accountFollowingAddByRSSChannelService.getFollowedAddByRSSChannels(account_id);

    // Get user's playlists
    const playlistService = new PlaylistService();
    const playlistResourceService = new PlaylistResourceService();
    const [playlists] = await playlistService.getManyPrivate(account_id, null, {
      relations: ['playlist_resources'],
    });

    // Get user's clips
    const clipService = new ClipService();
    const clips = await clipService.getManyByAccount(account_id);

    // Get user's queues
    const queueService = new QueueService();
    const queueResourceService = new QueueResourceService();
    const queues = await queueService.getAllPrivate(account_id);

    // Helper function to extract minimal item info
    type ItemWithRelations = Item & {
      channel?: {
        id_text: string;
        title: string | null;
        feed?: {
          url: string;
        };
      } | null;
    };

    const getMinimalItemInfo = (item: ItemWithRelations | null) => {
      if (!item) {return null;}
      return {
        id_text: item.id_text,
        title: item.title ?? null,
        pub_date: item.pub_date ? item.pub_date.toISOString() : null,
        channel: item.channel ? {
          id_text: item.channel.id_text,
          title: item.channel.title,
          feed: item.channel.feed ? {
            url: item.channel.feed.url,
          } : null,
        } : null,
      };
    };

    // Helper function to extract minimal clip info
    type ClipWithRelations = Clip & {
      item?: ItemWithRelations | null;
    };

    const getMinimalClipInfo = (clip: ClipWithRelations | null) => {
      if (!clip) {return null;}
      return {
        id_text: clip.id_text,
        title: clip.title ?? null,
        start_time: clip.start_time,
        end_time: clip.end_time ?? null,
        created_at: clip.created_at.toISOString(),
        item: getMinimalItemInfo(clip.item ?? null),
      };
    };

    // Process playlists with resources
    const playlistsData = await Promise.all(playlists.map(async (playlist) => {
      const resources = await playlistResourceService.getManyByPlaylistIdText(playlist.id_text, account_id, {
        relations: [
          'item', 'item.channel', 'item.channel.feed',
          'clip', 'clip.item', 'clip.item.channel', 'clip.item.channel.feed',
          'item_soundbite', 'item_soundbite.item', 'item_soundbite.item.channel', 'item_soundbite.item.channel.feed',
        ],
      });

      type PlaylistResourceWithRelations = PlaylistResource & {
        item?: ItemWithRelations | null;
        clip?: ClipWithRelations | null;
        item_soundbite?: {
          id: number;
          item?: ItemWithRelations | null;
        } | null;
      };

      const playlistResourcesData = resources.map((resource: PlaylistResourceWithRelations) => {
        const resourceData: {
          list_position: string;
          item?: ReturnType<typeof getMinimalItemInfo> | null;
          clip?: ReturnType<typeof getMinimalClipInfo> | null;
          item_soundbite?: { id: number; item: ReturnType<typeof getMinimalItemInfo> | null } | null;
          add_by_rss_hash_id?: string | null;
          add_by_rss_resource_data?: object | null;
        } = {
          list_position: resource.list_position,
        };

        if (resource.item) {
          resourceData.item = getMinimalItemInfo(resource.item);
        }
        if (resource.clip) {
          resourceData.clip = getMinimalClipInfo(resource.clip);
        }
        if (resource.item_soundbite) {
          resourceData.item_soundbite = {
            id: resource.item_soundbite.id,
            item: getMinimalItemInfo(resource.item_soundbite.item),
          };
        }
        if (resource.add_by_rss_hash_id) {
          resourceData.add_by_rss_hash_id = resource.add_by_rss_hash_id;
        }
        if (resource.add_by_rss_resource_data) {
          resourceData.add_by_rss_resource_data = resource.add_by_rss_resource_data;
        }

        return resourceData;
      });

      return {
        id_text: playlist.id_text,
        title: playlist.title,
        description: playlist.description,
        is_default_favorites: playlist.is_default_favorites,
        item_count: playlist.item_count,
        last_updated: playlist.last_updated,
        medium_id: playlist.medium_id,
        sharable_status_id: playlist.sharable_status_id,
        playlist_resources: playlistResourcesData,
      };
    }));

    // Process clips
    const clipsData = await Promise.all(clips.map(async (clip) => {
      // Need to load item with channel and feed
      const clipWithRelations = await clipService.getByIdText(clip.id_text, {
        relations: ['item', 'item.channel', 'item.channel.feed'],
      });

      return {
        id_text: clip.id_text,
        title: clip.title,
        description: clip.description,
        start_time: clip.start_time,
        end_time: clip.end_time,
        created_at: clip.created_at,
        sharable_status_id: clip.sharable_status_id,
        item: clipWithRelations?.item ? getMinimalItemInfo(clipWithRelations.item) : null,
      };
    }));

    // Process queues with resources
    const queuesData = await Promise.all(queues.map(async (queue) => {
      // Get all queue resources for this queue (both history and upcoming)
      const [historyResources] = await queueResourceService.getHistoryResourcesByQueueIdText(queue.id_text, {
        relations: listResourceRelations,
      });
      const upcomingResources = await queueResourceService.getAllUpcomingByQueueIdText(queue.id_text);
      
      // Combine all resources, sorted by list_position
      const allQueueResources = [...historyResources, ...upcomingResources].sort((a, b) => 
        parseFloat(a.list_position) - parseFloat(b.list_position),
      );

      type QueueResourceWithRelations = QueueResource & {
        item?: ItemWithRelations | null;
        clip?: ClipWithRelations | null;
        item_soundbite?: {
          id: number;
          item?: ItemWithRelations | null;
        } | null;
      };

      const queueResourcesData = allQueueResources.map((resource: QueueResourceWithRelations) => {
        const resourceData: {
          list_position: string;
          playback_position: string;
          media_file_duration: string;
          completed: boolean;
          item?: ReturnType<typeof getMinimalItemInfo> | null;
          clip?: ReturnType<typeof getMinimalClipInfo> | null;
          item_soundbite?: { id: number; item: ReturnType<typeof getMinimalItemInfo> | null } | null;
          add_by_rss_hash_id?: string | null;
          add_by_rss_resource_data?: object | null;
        } = {
          list_position: resource.list_position,
          playback_position: resource.playback_position,
          media_file_duration: resource.media_file_duration,
          completed: resource.completed,
        };

        if (resource.item) {
          resourceData.item = getMinimalItemInfo(resource.item);
        }
        if (resource.clip) {
          resourceData.clip = getMinimalClipInfo(resource.clip);
        }
        if (resource.item_soundbite) {
          resourceData.item_soundbite = {
            id: resource.item_soundbite.id,
            item: getMinimalItemInfo(resource.item_soundbite.item),
          };
        }
        if (resource.add_by_rss_hash_id) {
          resourceData.add_by_rss_hash_id = resource.add_by_rss_hash_id;
        }
        if (resource.add_by_rss_resource_data) {
          resourceData.add_by_rss_resource_data = resource.add_by_rss_resource_data;
        }

        return resourceData;
      });

      return {
        id_text: queue.id_text,
        medium_id: queue.medium_id,
        is_active_queue: queue.is_active_queue,
        queue_resources: queueResourcesData,
      };
    }));

    // Build export data
    const exportData = {
      export_date: new Date().toISOString(),
      account: accountData,
      following: {
        accounts: followingAccounts.map(fa => ({
          id_text: fa.following_account.id_text,
          verified: fa.following_account.verified,
        })),
        channels: followingChannels.map(fc => ({
          id_text: fc.channel.id_text,
          title: fc.channel.title,
          feed: fc.channel.feed ? {
            url: fc.channel.feed.url,
          } : null,
        })),
        playlists: followingPlaylists.map(fp => ({
          id_text: fp.playlist.id_text,
          title: fp.playlist.title ?? null,
          account: fp.playlist.account ? {
            id_text: fp.playlist.account.id_text,
          } : null,
        })),
        add_by_rss_channels: followingAddByRSSChannels.map(fr => ({
          feed_url: fr.feed_url,
          title: fr.title,
          image_url: fr.image_url,
        })),
      },
      playlists: playlistsData,
      clips: clipsData,
      queues: queuesData,
    };

    return exportData;
  }
}
