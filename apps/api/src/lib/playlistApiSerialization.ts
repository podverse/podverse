import type { Playlist } from '@podverse/orm';

import { accountToJson } from './accountApiSerialization.js';
import { resolveSharableStatusId } from './resolveSharableStatusId.js';

type PlaylistWireInput = {
  sharable_status_id?: number | null;
  sharable_status?: unknown;
  account?: Parameters<typeof accountToJson>[0];
  tags?: string[];
};

/** API wire shape for playlist responses (entity fields minus relation object). */
export type PlaylistApiJson = Omit<Playlist, 'sharable_status'>;

/**
 * Serializes playlist entities for API responses: canonical `sharable_status_id` only,
 * never nested `sharable_status` relation objects.
 */
export function playlistToJson<T extends PlaylistWireInput>(
  playlist: T
): Omit<T, 'sharable_status'> {
  const { sharable_status: _sharableStatus, account, tags, ...rest } = playlist;
  const sharableStatusId = resolveSharableStatusId(playlist);

  const result = { ...rest } as Omit<T, 'sharable_status' | 'tags'>;

  if (sharableStatusId !== undefined) {
    Object.assign(result, { sharable_status_id: sharableStatusId });
  }

  if (account !== null && account !== undefined) {
    Object.assign(result, { account: accountToJson(account) });
  }

  if (Array.isArray(tags)) {
    Object.assign(result, { tags });
  }

  return result as Omit<T, 'sharable_status'>;
}

export function playlistsToJson<T extends PlaylistWireInput>(
  playlists: T[]
): Array<Omit<T, 'sharable_status'>> {
  return playlists.map(playlistToJson);
}
