/**
 * Queue list rows the Queue screen can show. `list_position` `0` is the queue head; positive
 * values are upcoming.
 */
export type QueueScreenResource = {
  add_by_rss_hash_id?: string | null;
  clip?: { id_text?: string | null } | null;
  item?: { id_text?: string | null } | null;
  item_soundbite?: { id_text?: string | null } | null;
  list_position: string;
};

export type SplitQueueScreenResourcesResult<T extends QueueScreenResource> = {
  nowPlaying: T | null;
  upcoming: T[];
};

const NOW_PLAYING_EPSILON = 1e-9;

export function isNowPlayingListPosition(listPosition: string): boolean {
  if (listPosition.trim() === '') {
    return false;
  }
  const position = Number(listPosition);
  return Number.isFinite(position) && Math.abs(position) <= NOW_PLAYING_EPSILON;
}

export function queueResourceContentId(resource: QueueScreenResource): string | null {
  const clipId = resource.clip?.id_text;
  if (typeof clipId === 'string' && clipId.length > 0) {
    return clipId;
  }
  const soundbiteId = resource.item_soundbite?.id_text;
  if (typeof soundbiteId === 'string' && soundbiteId.length > 0) {
    return soundbiteId;
  }
  const itemId = resource.item?.id_text;
  if (typeof itemId === 'string' && itemId.length > 0) {
    return itemId;
  }
  const addByRssHashId = resource.add_by_rss_hash_id;
  if (typeof addByRssHashId === 'string' && addByRssHashId.length > 0) {
    return addByRssHashId;
  }
  return null;
}

/**
 * Splits queue resources for the Queue screen. When the viewed chip matches the player's
 * medium and a row's content id matches the playing item, that row is Now Playing. Queue heads
 * that are not the playing item are omitted. Upcoming is positive `list_position` only.
 *
 * When no queue row matches, `nowPlaying` is null so the screen can fill the section from
 * player state.
 */
export function splitQueueScreenResources<T extends QueueScreenResource>(
  resources: readonly T[],
  options: {
    playingContentId: string | null;
    viewedQueueMatchesPlayerMedium: boolean;
  }
): SplitQueueScreenResourcesResult<T> {
  const playingContentId =
    typeof options.playingContentId === 'string' && options.playingContentId.length > 0
      ? options.playingContentId
      : null;

  let nowPlaying: T | null = null;
  if (options.viewedQueueMatchesPlayerMedium && playingContentId !== null) {
    for (const resource of resources) {
      if (queueResourceContentId(resource) === playingContentId) {
        nowPlaying = resource;
        break;
      }
    }
  }

  const upcoming: T[] = [];
  for (const resource of resources) {
    if (nowPlaying !== null && resource === nowPlaying) {
      continue;
    }
    if (isNowPlayingListPosition(resource.list_position)) {
      continue;
    }
    upcoming.push(resource);
  }

  return { nowPlaying, upcoming };
}
