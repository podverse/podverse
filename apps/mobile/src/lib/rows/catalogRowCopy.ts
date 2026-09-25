import type { DTOAccount, DTOPlaylist } from '@podverse/helpers';

/** Matches web `ListPlaylistRow`: item count, then an en dash and the description. */
const PLAYLIST_DESCRIPTION_SEPARATOR = ' – ';

export type CatalogRowTranslate = (key: string, options?: { count: number }) => string;

const trimmed = (value: string | null | undefined): string => {
  return value?.trim() ?? '';
};

export const formatPlaylistRowSubtitle = (
  playlist: DTOPlaylist,
  t: CatalogRowTranslate
): string => {
  const itemCountLabel = t('features.playlist.item_count', { count: playlist.item_count });
  const description = trimmed(playlist.description);
  if (description.length === 0) {
    return itemCountLabel;
  }
  return `${itemCountLabel}${PLAYLIST_DESCRIPTION_SEPARATOR}${description}`;
};

export const playlistCreatorLabel = (playlist: DTOPlaylist, t: CatalogRowTranslate): string => {
  const displayName = trimmed(playlist.account?.account_profile?.display_name);
  if (displayName.length === 0) {
    return t('misc.anonymous');
  }
  return displayName;
};

export const profileDisplayName = (account: DTOAccount, t: CatalogRowTranslate): string => {
  const displayName = trimmed(account.account_profile?.display_name);
  if (displayName.length === 0) {
    return t('misc.anonymous');
  }
  return displayName;
};

export const profileBio = (account: DTOAccount): string | null => {
  const bio = trimmed(account.account_profile?.bio);
  return bio.length === 0 ? null : bio;
};
