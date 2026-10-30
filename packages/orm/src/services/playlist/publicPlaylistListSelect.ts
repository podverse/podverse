import type { Playlist } from '@orm/entities/playlist/playlist.js';
import type { FindOptionsRelations, FindOptionsSelect } from 'typeorm';

/**
 * Playlist fields a public list may return. The account is limited to its public handle and
 * display name; every other account column stays out of public list responses.
 */
export const PUBLIC_PLAYLIST_LIST_SELECT: FindOptionsSelect<Playlist> = {
  id_text: true,
  title: true,
  description: true,
  is_default_likes: true,
  item_count: true,
  last_updated: true,
  account: {
    id_text: true,
    account_profile: {
      display_name: true,
    },
  },
};

export const PUBLIC_PLAYLIST_LIST_RELATIONS: FindOptionsRelations<Playlist> = {
  account: {
    account_profile: true,
  },
  sharable_status: true,
  medium: true,
};
