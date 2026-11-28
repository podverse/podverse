import { SharableStatusEnum } from '@podverse/helpers';
import { PlaylistTagService } from '@podverse/orm';

import { resolveSharableStatusId } from './resolveSharableStatusId.js';

const playlistTagService = new PlaylistTagService();

type PlaylistTagVisibilityRow = {
  id_text?: string | null;
  account?: { id_text?: string | null } | null;
  sharable_status_id?: number | null;
  sharable_status?: unknown;
  tags?: string[];
};

function readPlaylistIdText(playlist: PlaylistTagVisibilityRow): string | null {
  if (typeof playlist.id_text !== 'string' || playlist.id_text.length === 0) {
    return null;
  }
  return playlist.id_text;
}

function readOwnerIdText(playlist: PlaylistTagVisibilityRow): string | null {
  const idText = playlist.account?.id_text;
  if (typeof idText !== 'string' || idText.length === 0) {
    return null;
  }
  return idText;
}

export async function applyPlaylistTags(
  playlists: PlaylistTagVisibilityRow[],
  viewerAccountIdText: string | null
): Promise<void> {
  const idTexts: string[] = [];
  for (const playlist of playlists) {
    const idText = readPlaylistIdText(playlist);
    if (idText !== null) {
      idTexts.push(idText);
    }
  }

  const namesByIdText = await playlistTagService.loadTagNamesByPlaylistIdText(idTexts);

  for (const playlist of playlists) {
    const statusId = resolveSharableStatusId(playlist);
    const owner = readOwnerIdText(playlist);
    const viewerIsOwner =
      viewerAccountIdText !== null && owner !== null && owner === viewerAccountIdText;
    if (statusId === SharableStatusEnum.Private && !viewerIsOwner) {
      delete playlist.tags;
      continue;
    }

    const idText = readPlaylistIdText(playlist);
    const loaded = idText === null ? undefined : namesByIdText.get(idText);
    playlist.tags = loaded ?? [];
  }
}

export type { PlaylistTagVisibilityRow };
