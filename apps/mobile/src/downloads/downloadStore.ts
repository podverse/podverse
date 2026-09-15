import type { DownloadPatch, DownloadRecord } from './downloadTypes';

/**
 * In-memory mirror of the downloads index, and the state every download affordance renders from.
 *
 * Two constraints shape this module. A transfer reports progress many times a second, and React
 * Native handles touches on the same thread those callbacks run on — so per-chunk SQLite work,
 * filesystem walks, or native-cache writes are felt as buttons that do not respond. And the
 * affordance appears on every row of a long list, so one item changing must not re-render the rest.
 *
 * Both fall out of three properties here:
 *
 * - **Two channels.** `subscribe` fires when the set or a status changes, which is rare and is all
 *   most subscribers need. `subscribeToProgress` fires for byte movement and is opt-in, so a screen
 *   that only counts jobs never wakes for a chunk.
 * - **Immutable records.** A mutation replaces one record and leaves every other reference
 *   untouched, so `get` returns a stable value and a row's `setState` bails out when its own item
 *   did not change.
 * - **Coalescing.** Status notifications fire on the leading edge, because a tap must paint in the
 *   same frame, then collapse a burst into one trailing pass. Progress notifications are trailing
 *   only.
 *
 * SQLite stays the durable store — `downloadManager` writes through to it. Nothing here imports
 * React Native or Expo, so the rules above are unit-testable.
 */

/** Status changes paint immediately, then a burst inside this window collapses to one pass. */
export const DOWNLOAD_STATUS_NOTIFY_MS = 100;

/**
 * How often byte progress repaints. Two frames a second reads as live to a person watching a bar,
 * and is roughly two orders of magnitude less work than repainting per chunk.
 */
export const DOWNLOAD_PROGRESS_NOTIFY_MS = 500;

export type DownloadProgressPatch = {
  bytesDownloaded: number;
  byteSize: number | null;
};

type Listener = () => void;

export type DownloadStore = {
  /** Replace the mirror with rows read from SQLite. */
  hydrate: (records: readonly DownloadRecord[]) => void;
  isHydrated: () => boolean;
  /** Most-recently-updated first, matching `downloadsRepository.list`. Stable while unchanged. */
  getAll: () => readonly DownloadRecord[];
  get: (itemIdText: string) => DownloadRecord | null;
  put: (record: DownloadRecord) => void;
  /** Status / path / error change. Returns the merged record, or `null` when the row is gone. */
  applyChange: (itemIdText: string, patch: DownloadPatch) => DownloadRecord | null;
  /** Byte movement only. Does not touch `updatedAt`, so an in-flight list keeps its order. */
  applyProgress: (itemIdText: string, progress: DownloadProgressPatch) => void;
  deleteRecord: (itemIdText: string) => void;
  clear: () => void;
  /**
   * Fire the change channel without touching a record. For state subscribers read alongside the
   * records — the Pause-all flag, the auto-delete notice — which live on `downloadManager`.
   */
  notify: () => void;
  /** Collapse several changes into one notification (bulk pause, resume, dismiss). */
  batch: (apply: () => void) => void;
  subscribe: (listener: Listener) => () => void;
  subscribeToProgress: (listener: Listener) => () => void;
};

export const createDownloadStore = (): DownloadStore => {
  const records = new Map<string, DownloadRecord>();
  const changeListeners = new Set<Listener>();
  const progressListeners = new Set<Listener>();

  let hydrated = false;
  let snapshot: readonly DownloadRecord[] | null = null;

  let changeTimer: ReturnType<typeof setTimeout> | null = null;
  let changeTrailingPending = false;
  let progressTimer: ReturnType<typeof setTimeout> | null = null;
  let batchDepth = 0;
  let batchedChange = false;

  const emit = (listeners: Set<Listener>): void => {
    for (const listener of [...listeners]) {
      listener();
    }
  };

  const notifyChange = (): void => {
    snapshot = null;
    if (batchDepth > 0) {
      batchedChange = true;
      return;
    }
    if (changeTimer !== null) {
      changeTrailingPending = true;
      return;
    }
    emit(changeListeners);
    changeTimer = setTimeout(() => {
      changeTimer = null;
      if (changeTrailingPending) {
        changeTrailingPending = false;
        notifyChange();
      }
    }, DOWNLOAD_STATUS_NOTIFY_MS);
  };

  const notifyProgress = (): void => {
    snapshot = null;
    if (progressListeners.size === 0 || progressTimer !== null) {
      return;
    }
    progressTimer = setTimeout(() => {
      progressTimer = null;
      emit(progressListeners);
    }, DOWNLOAD_PROGRESS_NOTIFY_MS);
  };

  return {
    applyChange: (itemIdText, patch) => {
      const current = records.get(itemIdText);
      if (current === undefined) {
        return null;
      }
      const next: DownloadRecord = { ...current, ...patch, updatedAt: Date.now() };
      records.set(itemIdText, next);
      notifyChange();
      return next;
    },

    applyProgress: (itemIdText, progress) => {
      const current = records.get(itemIdText);
      if (current === undefined) {
        return;
      }
      if (
        current.bytesDownloaded === progress.bytesDownloaded &&
        current.byteSize === progress.byteSize
      ) {
        return;
      }
      records.set(itemIdText, { ...current, ...progress });
      notifyProgress();
    },

    batch: (apply) => {
      batchDepth += 1;
      try {
        apply();
      } finally {
        batchDepth -= 1;
      }
      if (batchDepth === 0 && batchedChange) {
        batchedChange = false;
        notifyChange();
      }
    },

    clear: () => {
      if (records.size === 0) {
        return;
      }
      records.clear();
      notifyChange();
    },

    deleteRecord: (itemIdText) => {
      if (!records.delete(itemIdText)) {
        return;
      }
      notifyChange();
    },

    get: (itemIdText) => records.get(itemIdText) ?? null,

    getAll: () => {
      if (snapshot === null) {
        // Insertion order is the tiebreak: `sort` is stable, so rows sharing an `updatedAt`
        // millisecond keep the order SQLite handed over.
        snapshot = [...records.values()].sort((a, b) => b.updatedAt - a.updatedAt);
      }
      return snapshot;
    },

    hydrate: (incoming) => {
      records.clear();
      for (const record of incoming) {
        records.set(record.itemIdText, record);
      }
      hydrated = true;
      notifyChange();
    },

    isHydrated: () => hydrated,

    notify: () => {
      notifyChange();
    },

    put: (record) => {
      records.set(record.itemIdText, record);
      notifyChange();
    },

    subscribe: (listener) => {
      changeListeners.add(listener);
      return () => {
        changeListeners.delete(listener);
      };
    },

    subscribeToProgress: (listener) => {
      progressListeners.add(listener);
      return () => {
        progressListeners.delete(listener);
      };
    },
  };
};

export const downloadStore = createDownloadStore();
