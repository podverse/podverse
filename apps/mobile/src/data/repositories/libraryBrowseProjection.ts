import type { DTOPlaylist } from '@podverse/helpers/dto';

import type { NativeCacheBrowseNode } from '../nativeCache';
import type { SubscribedChannel } from './subscriptionsMerge';

/**
 * Pure mappers + merge for the car/watch `library-browse` projection (12.22). Kept free of
 * `expo-sqlite` / native imports (types only) so the mobile node-only Vitest suite can cover them;
 * `accountRepository` owns the impure orchestration (reads `subscriptionsRepository.list()`,
 * hydrates followed playlists, then projects). Channel merge/hydration lives in the shared
 * `subscriptionsRepository` (9b.8 / 600) and is deliberately not duplicated here.
 * Detail: docs/proposals/mobile/_master-plan_/phase-1/details/401-car-library-directory-follows.md
 */

const trimToNull = (value: string | null | undefined): string | null => {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

/**
 * Map a merged subscribed channel (directory or add-by-RSS) to a car browse node. The shared repo
 * guarantees a non-empty `title` and a stable `idText` (`id_text` for directory, `feed_url` for
 * add-by-RSS), so no drop is needed here.
 */
export const mapSubscribedChannelToNode = (channel: SubscribedChannel): NativeCacheBrowseNode => {
  return {
    idText: channel.idText,
    title: channel.title,
    kind: 'podcast',
    artworkUrl: channel.imageUrl,
  };
};

/**
 * Map a followed playlist to a car browse node. Returns `null` when the playlist has no usable
 * `id_text` or `title` (an untitled car row is not useful). `DTOPlaylist` carries no artwork, so
 * playlist nodes have a null `artworkUrl`.
 */
export const mapPlaylistToNode = (playlist: DTOPlaylist): NativeCacheBrowseNode | null => {
  const idText = trimToNull(playlist.id_text);
  const title = trimToNull(playlist.title);
  if (idText === null || title === null) {
    return null;
  }

  return {
    idText,
    title,
    kind: 'playlist',
    artworkUrl: null,
  };
};

/**
 * Concatenate channel + playlist nodes and dedupe by `idText` (first occurrence wins). Channels are
 * placed before playlists so a shared id keeps the channel node.
 */
export const mergeLibraryBrowseNodes = (
  channelNodes: NativeCacheBrowseNode[],
  playlistNodes: NativeCacheBrowseNode[]
): NativeCacheBrowseNode[] => {
  const byIdText = new Map<string, NativeCacheBrowseNode>();
  for (const node of [...channelNodes, ...playlistNodes]) {
    if (!byIdText.has(node.idText)) {
      byIdText.set(node.idText, node);
    }
  }
  return [...byIdText.values()];
};
