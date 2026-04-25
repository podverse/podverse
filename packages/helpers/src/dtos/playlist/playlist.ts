import type { DTOAccount } from '../account/account.js';
import type { DTOMedium } from '../medium.js';
import type { DTOPlaylistResource, DTOPlaylistResourceIdsOnly } from './playlistResource.js';

export interface DTOPlaylist {
  id: number;
  id_text: string;
  account?: DTOAccount;
  sharable_status_id: number;
  title?: string | null;
  description?: string | null;
  is_default_likes: boolean;
  item_count: number;
  medium_id: number;
  last_updated: string;
  playlist_resources?: DTOPlaylistResource[];
}

export interface DTOPlaylistLikes {
  id: number;
  id_text: number;
  medium: DTOMedium;
  playlist_resources?: DTOPlaylistResourceIdsOnly[];
}

export interface PlaylistLikesIndexRows {
  item_ids: {
    [item_id: number]: boolean;
  };
  clip_ids: {
    [clip_id: number]: boolean;
  };
  item_soundbite_ids: {
    [item_soundbite_id: number]: boolean;
  };
  add_by_rss_hash_ids: {
    [add_by_rss_hash_id: string]: boolean;
  };
}

export interface PlaylistLikesIndex {
  [medium_id: number]: PlaylistLikesIndexRows;
}

export const generatePlaylistLikesIndex = (playlists: DTOPlaylistLikes[]): PlaylistLikesIndex => {
  const index: PlaylistLikesIndex = {};

  for (const playlist of playlists) {
    const mediumId = playlist.medium.id;
    if (!index[mediumId]) {
      index[mediumId] = {
        item_ids: {},
        clip_ids: {},
        item_soundbite_ids: {},
        add_by_rss_hash_ids: {},
      };
    }

    for (const resource of playlist.playlist_resources || []) {
      if (resource.item_id) {
        index[mediumId].item_ids[resource.item_id] = true;
      }
      if (resource.clip_id) {
        index[mediumId].clip_ids[resource.clip_id] = true;
      }
      if (resource.item_soundbite_id) {
        index[mediumId].item_soundbite_ids[resource.item_soundbite_id] = true;
      }
      if (resource.add_by_rss_hash_id) {
        index[mediumId].add_by_rss_hash_ids[resource.add_by_rss_hash_id] = true;
      }
    }
  }

  return index;
};
