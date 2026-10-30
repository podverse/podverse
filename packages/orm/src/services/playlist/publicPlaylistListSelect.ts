import type { Playlist } from '@orm/entities/playlist/playlist.js';
import type { FindOptionsRelations, FindOptionsSelect } from 'typeorm';

/**
 * Playlist fields a public list may return. The account is limited to its public handle and
 * display name; every other account column stays out of public list responses.
 * `id` is selected so a paged join can identify rows, then omitted from the result.
 */
export const PUBLIC_PLAYLIST_LIST_SELECT: FindOptionsSelect<Playlist> = {
  id: true,
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

type PlaylistListAccount = {
  account_profile?: { display_name?: string | null } | null;
};

/**
 * Drops columns a public list does not return. The primary key is selected only so a paged join
 * can identify rows. Account and profile classes still define every column, so unlisted keys are
 * removed before the row is returned.
 */
export function omitUnlistedPlaylistListFields(playlist: {
  id?: number;
  account?: PlaylistListAccount | null;
}): void {
  Reflect.deleteProperty(playlist, 'id');
  const account = playlist.account;
  if (account === undefined || account === null) {
    return;
  }
  for (const key of Object.keys(account)) {
    if (key !== 'id_text' && key !== 'account_profile') {
      Reflect.deleteProperty(account, key);
    }
  }
  const profile = account.account_profile;
  if (profile === undefined || profile === null) {
    return;
  }
  for (const key of Object.keys(profile)) {
    if (key !== 'display_name') {
      Reflect.deleteProperty(profile, key);
    }
  }
}

export const PUBLIC_PLAYLIST_LIST_RELATIONS: FindOptionsRelations<Playlist> = {
  account: {
    account_profile: true,
  },
  sharable_status: true,
  medium: true,
};
