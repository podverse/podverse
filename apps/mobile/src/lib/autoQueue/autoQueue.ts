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

/**
 * Caller-declared auto-queue side effect for a load (mirrors web `autoQueueShouldClear` /
 * `newAutoQueueConfig`). `preserve` keeps the seeded buffer; `clear` resets it for an explicit
 * play; `seed-playlist` points the buffer at a playlist.
 */
export type AutoQueueDirective =
  | { mode: 'clear' }
  | { mode: 'preserve' }
  | { mode: 'seed-playlist'; playlistIdText: string };

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

/**
 * Next config after an explicit play (`clear`) or playlist row play (`seed-playlist`).
 * `clear` mints a new shuffle hash so the next shuffle sequence does not repeat. `random` and
 * `repeat` stay as the user left them. Callers must not use this for `preserve`.
 */
export function resolveAutoQueueConfigAfterDirective(
  current: AutoQueueConfig,
  directive: Exclude<AutoQueueDirective, { mode: 'preserve' }>,
  nextShuffleHash: () => string
): AutoQueueConfig {
  if (directive.mode === 'seed-playlist') {
    return {
      ...current,
      disabled: false,
      nextPage: 1,
      playlist_id_text: directive.playlistIdText,
    };
  }

  return {
    ...current,
    nextPage: 1,
    playlist_id_text: null,
    shuffleHash: nextShuffleHash(),
  };
}

/**
 * Full-player shuffle toggle: flip `random`, mint a new hash, and restart paging. Callers clear
 * the resource buffer and reload.
 */
export function toggleAutoQueueShuffle(
  current: AutoQueueConfig,
  nextShuffleHash: () => string
): AutoQueueConfig {
  return {
    ...current,
    nextPage: 1,
    random: !current.random,
    shuffleHash: nextShuffleHash(),
  };
}
