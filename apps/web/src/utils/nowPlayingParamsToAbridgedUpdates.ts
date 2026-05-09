import type {
  DTOClip,
  DTOItem,
  DTOItemSoundbite,
  QueueResourceAbridgedUpdates,
  QueueResourcesAbridgedIndex,
} from '@podverse/helpers';

export type NowPlayingLike = {
  mpClip: DTOClip | null;
  mpItem: DTOItem | null;
  mpItemSoundbite: DTOItemSoundbite | null;
  mpCurrentTime?: number;
  mpDuration?: number;
};

export function buildQueueResourceAbridgedUpdatesFromNowPlayingLike(
  params: NowPlayingLike,
  prevIndex: QueueResourcesAbridgedIndex,
  completed?: boolean
): QueueResourceAbridgedUpdates {
  const { mpClip, mpItemSoundbite, mpItem, mpDuration, mpCurrentTime } = params;
  const progressValue = completed === true ? '0' : String(mpCurrentTime ?? 0);
  const durationValue = String(mpDuration ?? 0);

  const updates: QueueResourceAbridgedUpdates = {
    clip: null,
    item_soundbite: null,
    item: null,
    add_by_rss_resource_data: null,
  };

  if (mpClip) {
    updates.clip = {
      i: mpClip.id,
      p: progressValue,
      d: durationValue,
      z: completed !== undefined ? completed : prevIndex.clips[mpClip.id]?.z === true,
    };
    return updates;
  }

  if (mpItemSoundbite) {
    updates.item_soundbite = {
      i: mpItemSoundbite.id,
      p: progressValue,
      d: durationValue,
      z:
        completed !== undefined
          ? completed
          : prevIndex.item_soundbites[mpItemSoundbite.id]?.z === true,
    };
    return updates;
  }

  if (mpItem) {
    updates.item = {
      i: mpItem.id,
      p: progressValue,
      d: durationValue,
      z: completed !== undefined ? completed : prevIndex.items[mpItem.id]?.z === true,
    };
  }

  return updates;
}
