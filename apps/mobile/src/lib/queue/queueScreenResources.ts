/**
 * A queue row the Queue screen can show. `list_position` `0` is now-playing; positive values are
 * upcoming. The screen hides now-playing when that row is what the player is already showing.
 */
export type QueueScreenResource = {
  add_by_rss_hash_id?: string | null;
  clip?: { id_text?: string | null } | null;
  item?: { id_text?: string | null } | null;
  item_soundbite?: { id_text?: string | null } | null;
  list_position: string;
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
 * Upcoming rows for the Queue screen. The now-playing row stays visible only on a queue the
 * player is not using, so the active queue does not repeat the item already in the player.
 */
export function queueResourcesForQueueScreen<T extends QueueScreenResource>(
  resources: readonly T[],
  options: { playingContentId: string | null; viewedQueueIsActive: boolean }
): T[] {
  return resources.filter((resource) => {
    if (!isNowPlayingListPosition(resource.list_position)) {
      return true;
    }
    if (options.viewedQueueIsActive) {
      return false;
    }
    const contentId = queueResourceContentId(resource);
    return contentId === null || contentId !== options.playingContentId;
  });
}
