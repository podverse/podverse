import { DTOAccount } from '../account/account';
import { DTOMedium } from '../medium';
import { DTOPlaylistResource, DTOPlaylistResourceIdsOnly } from './playlistResource';

export interface DTOPlaylist {
  id: number;
  id_text: string;
  account?: DTOAccount;
  sharable_status_id: number;
  title?: string | null;
  description?: string | null;
  is_default_favorites: boolean;
  item_count: number;
  medium_id: number;
  last_updated: string;
  playlist_resources?: DTOPlaylistResource[];
}

export interface DTOPlaylistFavorites {
  id: number;
  id_text: number;
  medium: DTOMedium;
  playlist_resources?: DTOPlaylistResourceIdsOnly[];
}

export interface PlaylistFavoritesIndexRows {
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

export interface PlaylistFavoritesIndex {
  [medium_id: number]: PlaylistFavoritesIndexRows;
}

export const generatePlaylistFavoritesIndex = (
  playlists: DTOPlaylistFavorites[]
): PlaylistFavoritesIndex => {
  const index: PlaylistFavoritesIndex = {};

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
