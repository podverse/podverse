import type {
  DTOChannel,
  DTOClip,
  DTOItemQueueItem,
  DTOItemSoundbite,
} from '@podverse/helpers/dto';
import { getShuffleHash } from '@podverse/helpers-requests';

/**
 * Auto-queue types + pure helpers, ported from web `apps/web/src/contexts/AutoQueue.tsx`. Auto-queue
 * fills the "up next" list from a playlist or channel source when the manual queue is empty; the
 * orchestrator advances through it. Kept framework-free so it is unit-testable.
 */
export type AutoQueueResourcesMapRow = {
  item: DTOItemQueueItem;
  clip: DTOClip | null;
  item_soundbite: DTOItemSoundbite | null;
  channel: DTOChannel | null;
};

export type AutoQueueResourcesMap = { [key: number]: AutoQueueResourcesMapRow };

export type AutoQueueConfig = {
  playlist_id_text: string | null;
  disabled: boolean;
  random: boolean;
  repeat: boolean;
  nextPage: number;
  shuffleHash: string;
};

export function checkIsActiveRowHighestKey(
  autoQueueActiveRow: number | null,
  autoQueueResources: AutoQueueResourcesMap
): boolean {
  if (autoQueueActiveRow === null) {
    return false;
  }
  const keys = Object.keys(autoQueueResources).map(Number);
  if (keys.length === 0) {
    return false;
  }
  const highestKey = Math.max(...keys);
  return autoQueueActiveRow === highestKey;
}

export function autoQueueIncrementActiveRow(autoQueueActiveRow: number | null): number {
  if (autoQueueActiveRow === null || autoQueueActiveRow < 1) {
    return 1;
  }
  return autoQueueActiveRow + 1;
}

/** Fresh default config. `shuffleHash` is randomized per session, mirroring web. */
export function createDefaultAutoQueueConfig(): AutoQueueConfig {
  return {
    disabled: false,
    nextPage: 1,
    playlist_id_text: null,
    random: false,
    repeat: false,
    shuffleHash: getShuffleHash(),
  };
}
