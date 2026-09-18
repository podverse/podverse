import * as FileSystem from 'expo-file-system';

import { primaryListArtworkUrl } from '@podverse/helpers';
import type { DTOItem } from '@podverse/helpers/dto';
import type { EnclosureSelectedParams } from '@podverse/helpers/item/itemEnclosure';

import { channelItemsRepository, downloadsRepository } from '../data/repositories';
import { resolveE2eMediaUrl } from '../lib/e2e/resolveE2eMediaUrl';
import {
  isDownloadQuotaUnlimited,
  readDownloadAutoDeleteOnDeviceLowEnabled,
  readDownloadAutoDeleteOnLimitEnabled,
  readDownloadQuotaBytes,
} from '../prefs/downloadPrefs';
import { isOfflineModeEnabled, subscribeOfflineMode } from '../prefs/offlineMode';
import { mergeDownloadChannelIdentity, usableDownloadChannelText } from './downloadChannelIdentity';
import type { DownloadIneligibleReason } from './downloadEligibility';
import { isItemDownloadable } from './downloadEligibility';
import {
  DEVICE_LOW_FREE_BYTES,
  selectAutoDeleteVictims,
  selectVictimsToFreeBytes,
} from './downloadQuota';
import {
  buildDownloadFileName,
  buildDownloadFilePath,
  DOWNLOADS_SUBDIRECTORY,
  hashEnclosureUri,
} from './downloadStorage';
import { downloadStore } from './downloadStore';
import type { DownloadPatch, DownloadRecord } from './downloadTypes';
import { DOWNLOAD_MAX_CONCURRENCY } from './downloadTypes';

/**
 * Download runner. Owns Expo FileSystem transfers, a capped concurrent queue
 * (`DOWNLOAD_MAX_CONCURRENCY`), pause/resume, and duplicate-tap de-dupe.
 *
 * **State reaches memory before disk.** `downloadStore` is what the UI renders, and every mutation
 * lands there synchronously so a tapped control changes in the same frame; the SQLite write follows
 * and is the durable record. Screens observe `downloadStore`, never Expo FileSystem, and never poll
 * SQLite on a progress tick.
 *
 * Livestreams and HLS/m3u8 are rejected by `isItemDownloadable` before any row is created — this
 * module only ever transfers progressive files (see src/downloads/README.md).
 */

export type EnqueueResult = { ok: true } | { ok: false; reason: DownloadIneligibleReason };

/** Last auto-delete result, surfaced as a manage-storage banner. `at` lets a subscriber
 * show each event once without a consume/reset race. */
export type AutoDeleteNotice = { count: number; at: number };

/**
 * How often byte counts reach SQLite, per transfer. They exist only so an interrupted download can
 * resume near where it stopped, so losing the last few seconds of them costs a few seconds of
 * re-fetch — far cheaper than a database write per chunk. A transfer also flushes on pause and on
 * failure, which are the moments the number actually gets read.
 */
const PROGRESS_PERSIST_INTERVAL_MS = 4000;

const inFlight = new Map<string, FileSystem.DownloadResumable>();
/** Item ids whose transfers are actively running (status downloading). */
const activeTransfers = new Set<string>();
/** When each transfer last wrote its byte counts through to SQLite. */
const lastProgressPersistAt = new Map<string, number>();
let pumpRunning = false;
let autoDeleteNotice: AutoDeleteNotice | null = null;
/** When true, Pause all is active until Resume all or an individual resume. */
let pauseAllActive = false;
let hydratePromise: Promise<void> | null = null;

const ensureHydrated = (): Promise<void> => {
  if (hydratePromise === null) {
    hydratePromise = downloadsRepository
      .list()
      .then(async (rows) => {
        const filled = await downloadsRepository.backfillMissingChannelTitles();
        downloadStore.hydrate(filled > 0 ? await downloadsRepository.list() : rows);
      })
      .catch((error: unknown) => {
        hydratePromise = null;
        throw error;
      });
  }
  return hydratePromise;
};

/**
 * Apply a state change to memory first, then write it through. The returned promise resolves once
 * the durable write settles; callers that only sequence UI state need not await it, and a failed
 * bookkeeping write never surfaces as an error the user can act on.
 */
const applyChange = (itemIdText: string, patch: DownloadPatch): Promise<void> => {
  downloadStore.applyChange(itemIdText, patch);
  return downloadsRepository.patch(itemIdText, patch).catch((error: unknown) => {
    if (__DEV__) {
      console.warn('[downloads] could not persist download change', error);
    }
  });
};

/** Write the live byte counts through, at most once per `PROGRESS_PERSIST_INTERVAL_MS` per item. */
const persistProgress = (itemIdText: string, force: boolean): void => {
  const record = downloadStore.get(itemIdText);
  if (record === null) {
    return;
  }
  const now = Date.now();
  if (!force && now - (lastProgressPersistAt.get(itemIdText) ?? 0) < PROGRESS_PERSIST_INTERVAL_MS) {
    return;
  }
  lastProgressPersistAt.set(itemIdText, now);
  void downloadsRepository
    .patchProgress(itemIdText, {
      byteSize: record.byteSize,
      bytesDownloaded: record.bytesDownloaded,
    })
    .catch(() => {
      // Resume bytes are an optimization; a failed write only costs re-fetching them.
    });
};

const artworkFromItem = (item: DTOItem): string | null =>
  primaryListArtworkUrl(item.item_images, item.channel?.channel_images);

const channelFromItem = (
  item: DTOItem
): { channelIdText: string | null; channelTitle: string | null } => {
  const channel = item.channel;
  if (channel === undefined || channel === null) {
    return { channelIdText: null, channelTitle: null };
  }
  return {
    channelIdText: usableDownloadChannelText(channel.id_text),
    channelTitle: usableDownloadChannelText(channel.title),
  };
};

const titleFromSiblingDownloads = (channelIdText: string): string | null => {
  for (const row of downloadStore.getAll()) {
    if (row.channelIdText === channelIdText) {
      const title = usableDownloadChannelText(row.channelTitle);
      if (title !== null) {
        return title;
      }
    }
  }
  return null;
};

/**
 * Episode list payloads often omit the nested channel, or send an id with no title. The stored
 * window, a sibling download, and the local subscription row still know the show's name.
 */
const resolveChannelForEnqueue = async (
  item: DTOItem
): Promise<{ channelIdText: string | null; channelTitle: string | null }> => {
  const fromItem = channelFromItem(item);
  let storedChannelId: string | null = fromItem.channelIdText;
  if (storedChannelId === null) {
    try {
      storedChannelId = await channelItemsRepository.getChannelIdForItem(item.id_text);
    } catch {
      storedChannelId = null;
    }
  }

  const siblingTitle = storedChannelId !== null ? titleFromSiblingDownloads(storedChannelId) : null;
  const merged = mergeDownloadChannelIdentity([
    fromItem,
    { channelIdText: storedChannelId, channelTitle: siblingTitle },
  ]);
  if (merged.channelIdText === null || merged.channelTitle !== null) {
    return merged;
  }

  try {
    const storedTitle = await downloadsRepository.findStoredChannelTitle(merged.channelIdText);
    return { channelIdText: merged.channelIdText, channelTitle: storedTitle };
  } catch {
    return merged;
  }
};

const ensureDownloadsDirectory = async (baseDirectory: string): Promise<void> => {
  const directory = `${baseDirectory}${DOWNLOADS_SUBDIRECTORY}`;
  const info = await FileSystem.getInfoAsync(directory);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
  }
};

/** Drop a download from memory and from the runner's bookkeeping. Returns the record that was held. */
const forgetDownload = (itemIdText: string): DownloadRecord | null => {
  const record = downloadStore.get(itemIdText);
  downloadStore.deleteRecord(itemIdText);
  lastProgressPersistAt.delete(itemIdText);
  activeTransfers.delete(itemIdText);
  return record;
};

/** Delete the file (best-effort) and the durable row for a download already dropped from memory. */
const eraseDownload = async (record: DownloadRecord | null, itemIdText: string): Promise<void> => {
  if (record !== null && record.filePath !== null) {
    try {
      await FileSystem.deleteAsync(record.filePath, { idempotent: true });
    } catch {
      // Best-effort file cleanup.
    }
  }
  await downloadsRepository.remove(itemIdText);
};

const completedDownloads = (): DownloadRecord[] =>
  downloadStore.getAll().filter((record) => record.status === 'complete');

const maybeAutoDelete = async (justCompletedItemIdText: string): Promise<void> => {
  const [onLimit, onDeviceLow, quotaBytes] = await Promise.all([
    readDownloadAutoDeleteOnLimitEnabled(),
    readDownloadAutoDeleteOnDeviceLowEnabled(),
    readDownloadQuotaBytes(),
  ]);

  const completed = completedDownloads();
  const victimIds = new Set<string>();

  if (onLimit && !isDownloadQuotaUnlimited(quotaBytes)) {
    for (const id of selectAutoDeleteVictims(completed, quotaBytes, justCompletedItemIdText)) {
      victimIds.add(id);
    }
  }

  if (onDeviceLow) {
    try {
      const free = await FileSystem.getFreeDiskStorageAsync();
      if (free < DEVICE_LOW_FREE_BYTES) {
        const need = DEVICE_LOW_FREE_BYTES - free;
        for (const id of selectVictimsToFreeBytes(completed, need, justCompletedItemIdText)) {
          victimIds.add(id);
        }
      }
    } catch {
      // Disk APIs can fail on some simulators; skip device-low eviction for this pass.
    }
  }

  if (victimIds.size === 0) {
    return;
  }

  const evicted: { itemIdText: string; record: DownloadRecord | null }[] = [];
  downloadStore.batch(() => {
    for (const victimId of victimIds) {
      evicted.push({ itemIdText: victimId, record: forgetDownload(victimId) });
    }
    autoDeleteNotice = { at: Date.now(), count: victimIds.size };
    downloadStore.notify();
  });

  for (const victim of evicted) {
    await eraseDownload(victim.record, victim.itemIdText);
  }
};

const runTransfer = async (itemIdText: string): Promise<void> => {
  const record = downloadStore.get(itemIdText);
  if (record === null || record.status === 'paused' || record.status === 'failed') {
    activeTransfers.delete(itemIdText);
    return;
  }

  const baseDirectory = FileSystem.documentDirectory;
  if (baseDirectory === null) {
    activeTransfers.delete(itemIdText);
    void applyChange(itemIdText, { errorReason: 'no_storage', status: 'failed' });
    return;
  }

  if (record.status !== 'downloading') {
    void applyChange(itemIdText, { errorReason: null, status: 'downloading' });
  }

  const fileName = buildDownloadFileName(itemIdText, record.fileExtension);
  const filePath = buildDownloadFilePath(baseDirectory, fileName);
  const sourceUrl = resolveE2eMediaUrl(record.enclosureUri);

  let resumable = inFlight.get(itemIdText);
  if (resumable === undefined) {
    resumable = FileSystem.createDownloadResumable(sourceUrl, filePath, {}, (progress) => {
      // Memory only. Repaint cadence belongs to `downloadStore`, and the durable write is
      // throttled — this callback fires many times a second on the same thread as touch handling.
      downloadStore.applyProgress(itemIdText, {
        byteSize:
          progress.totalBytesExpectedToWrite > 0 ? progress.totalBytesExpectedToWrite : null,
        bytesDownloaded: progress.totalBytesWritten,
      });
      persistProgress(itemIdText, false);
    });
    inFlight.set(itemIdText, resumable);
  }

  try {
    await ensureDownloadsDirectory(baseDirectory);
    const shouldResume = record.bytesDownloaded > 0 && inFlight.has(itemIdText);
    const result = shouldResume ? await resumable.resumeAsync() : await resumable.downloadAsync();
    inFlight.delete(itemIdText);
    activeTransfers.delete(itemIdText);

    if (result === undefined) {
      return;
    }

    const current = downloadStore.get(itemIdText);
    if (current === null || current.status === 'paused') {
      return;
    }

    lastProgressPersistAt.delete(itemIdText);
    await applyChange(itemIdText, {
      dismissedFromList: false,
      filePath: result.uri,
      status: 'complete',
    });
    await maybeAutoDelete(itemIdText);
  } catch {
    inFlight.delete(itemIdText);
    activeTransfers.delete(itemIdText);
    const current = downloadStore.get(itemIdText);
    if (current !== null && current.status === 'downloading') {
      persistProgress(itemIdText, true);
      void applyChange(itemIdText, { errorReason: 'transfer_failed', status: 'failed' });
    }
  }
};

/** Oldest queued job first, so taps are honored in the order they were made. */
const nextQueuedDownload = (): DownloadRecord | null => {
  let next: DownloadRecord | null = null;
  for (const record of downloadStore.getAll()) {
    if (record.status !== 'queued') {
      continue;
    }
    if (next === null || record.createdAt < next.createdAt) {
      next = record;
    }
  }
  return next;
};

const pumpQueue = (): void => {
  if (pumpRunning || pauseAllActive) {
    return;
  }
  pumpRunning = true;
  try {
    while (!pauseAllActive && activeTransfers.size < DOWNLOAD_MAX_CONCURRENCY) {
      const next = nextQueuedDownload();
      if (next === null) {
        break;
      }
      // Claim the slot and flip the status before starting, both synchronously, so the next
      // iteration respects the concurrency cap and cannot pick the same row twice.
      activeTransfers.add(next.itemIdText);
      void applyChange(next.itemIdText, { errorReason: null, status: 'downloading' });
      void runTransfer(next.itemIdText).finally(() => {
        pumpQueue();
      });
    }
  } finally {
    pumpRunning = false;
  }
};

export const downloadManager = {
  /**
   * Load the in-memory mirror from SQLite. Idempotent and shared, so every mounting hook may call
   * it; rejects only when the first read fails, and a later call retries.
   */
  hydrate: (): Promise<void> => ensureHydrated(),

  /** Discard the mirror and read it again from SQLite (error retry, pull-to-refresh). */
  reload: async (): Promise<void> => {
    hydratePromise = null;
    await ensureHydrated();
  },

  /**
   * Enqueue an item for offline download. Rejects ineligible items (livestream / HLS / no
   * enclosure) without creating a row, and de-dupes an item that is already queued/downloading/
   * paused/complete so duplicate taps do not spawn extra jobs.
   */
  enqueue: async (
    item: DTOItem,
    explicitSelectedParams?: EnclosureSelectedParams | null
  ): Promise<EnqueueResult> => {
    if (isOfflineModeEnabled()) {
      return { ok: false, reason: 'offline_mode' };
    }

    const eligibility = isItemDownloadable(item, explicitSelectedParams);
    if (!eligibility.ok) {
      return { ok: false, reason: eligibility.reason };
    }

    await ensureHydrated();

    const existing = downloadStore.get(item.id_text);
    if (
      existing !== null &&
      (existing.status === 'queued' ||
        existing.status === 'downloading' ||
        existing.status === 'paused' ||
        existing.status === 'complete')
    ) {
      return { ok: true };
    }

    const now = Date.now();
    const channel = await resolveChannelForEnqueue(item);
    const record: DownloadRecord = {
      artworkUrl: artworkFromItem(item),
      byteSize: null,
      bytesDownloaded: 0,
      channelIdText: channel.channelIdText,
      channelTitle: channel.channelTitle,
      createdAt: now,
      dismissedFromList: false,
      enclosureMime: eligibility.source.mime,
      enclosureUri: eligibility.source.uri,
      enclosureUrlHash: hashEnclosureUri(eligibility.source.uri),
      errorReason: null,
      fileExtension: eligibility.source.fileExtension,
      filePath: null,
      itemIdText: item.id_text,
      mediaType: eligibility.source.mediaType,
      status: pauseAllActive ? 'paused' : 'queued',
      title: item.title ?? null,
      updatedAt: now,
    };

    // The control has to change on this tap. Waiting for SQLite and the native-cache projection
    // first is what makes a second and third tap feel like the app stopped responding.
    downloadStore.put(record);
    if (channel.channelIdText !== null && channel.channelTitle !== null) {
      void downloadsRepository
        .attachChannelToDownloads({
          channelIdText: channel.channelIdText,
          channelTitle: channel.channelTitle,
        })
        .catch(() => {
          // The new row already carries the title; sibling backfill is best-effort.
        });
    }
    void downloadsRepository.upsert(record).catch((error: unknown) => {
      if (__DEV__) {
        console.warn('[downloads] could not persist enqueued download', error);
      }
    });

    if (!pauseAllActive) {
      pumpQueue();
    }
    return { ok: true };
  },

  getAutoDeleteNotice: (): AutoDeleteNotice | null => autoDeleteNotice,

  isPauseAllActive: (): boolean => pauseAllActive,

  /**
   * Pause one job. Active transfers use Expo pauseAsync; queued jobs flip to paused so the pump
   * will not start them.
   */
  pause: async (itemIdText: string): Promise<void> => {
    await ensureHydrated();
    const record = downloadStore.get(itemIdText);
    if (record === null) {
      return;
    }
    if (record.status === 'downloading') {
      activeTransfers.delete(itemIdText);
      void applyChange(itemIdText, { status: 'paused' });
      persistProgress(itemIdText, true);
      const resumable = inFlight.get(itemIdText);
      if (resumable !== undefined) {
        try {
          await resumable.pauseAsync();
        } catch {
          // Best-effort pause.
        }
      }
      pumpQueue();
      return;
    }
    if (record.status === 'queued') {
      void applyChange(itemIdText, { status: 'paused' });
    }
  },

  /** Resume one paused job. Clears the Pause-all master state. */
  resume: async (itemIdText: string): Promise<void> => {
    await ensureHydrated();
    const record = downloadStore.get(itemIdText);
    if (record === null || record.status !== 'paused') {
      return;
    }
    pauseAllActive = false;
    void applyChange(itemIdText, { status: 'queued' });
    pumpQueue();
  },

  /** Pause every in-flight transfer and hold remaining queued jobs as paused. */
  pauseAll: async (): Promise<void> => {
    await ensureHydrated();
    pauseAllActive = true;
    const affected = downloadStore
      .getAll()
      .filter((record) => record.status === 'downloading' || record.status === 'queued');

    // One notification for the whole set — a ten-job list must not re-render ten times.
    downloadStore.batch(() => {
      for (const record of affected) {
        downloadStore.applyChange(record.itemIdText, { status: 'paused' });
      }
      downloadStore.notify();
    });

    // `affected` holds the records as they were before the batch, which is what still says which
    // of them had a live transfer to stop.
    for (const record of affected) {
      if (record.status === 'downloading') {
        activeTransfers.delete(record.itemIdText);
        persistProgress(record.itemIdText, true);
        const resumable = inFlight.get(record.itemIdText);
        if (resumable !== undefined) {
          try {
            await resumable.pauseAsync();
          } catch {
            // Best-effort.
          }
        }
      }
      await downloadsRepository.patch(record.itemIdText, { status: 'paused' });
    }
  },

  /** Unpause every paused job and restart the pump. */
  resumeAll: async (): Promise<void> => {
    await ensureHydrated();
    pauseAllActive = false;
    const paused = downloadStore.getAll().filter((record) => record.status === 'paused');

    downloadStore.batch(() => {
      for (const record of paused) {
        downloadStore.applyChange(record.itemIdText, { status: 'queued' });
      }
      downloadStore.notify();
    });

    // Persist before pumping: the pump writes `downloading` for the rows it claims, and a trailing
    // `queued` write would overwrite it.
    for (const record of paused) {
      await downloadsRepository.patch(record.itemIdText, { status: 'queued' });
    }

    pumpQueue();
  },

  /** Re-queue a failed download. */
  retry: async (itemIdText: string): Promise<void> => {
    await ensureHydrated();
    const record = downloadStore.get(itemIdText);
    if (record === null || record.status !== 'failed') {
      return;
    }
    void applyChange(itemIdText, {
      errorReason: null,
      status: pauseAllActive ? 'paused' : 'queued',
    });
    if (!pauseAllActive) {
      pumpQueue();
    }
  },

  /**
   * A `complete` row whose file has gone from disk (cache clear, OS eviction). Flipping it to
   * failed is what makes the episode screen offer a re-download.
   */
  markFileMissing: async (itemIdText: string): Promise<void> => {
    await ensureHydrated();
    if (downloadStore.get(itemIdText) === null) {
      return;
    }
    await applyChange(itemIdText, {
      errorReason: 'file_missing',
      filePath: null,
      status: 'failed',
    });
  },

  /**
   * Cancel an in-progress or queued download and remove its row (and any partial/complete file).
   * A completed download can be removed from the library through the same operation.
   */
  remove: async (itemIdText: string): Promise<void> => {
    await ensureHydrated();
    const resumable = inFlight.get(itemIdText);
    inFlight.delete(itemIdText);
    const record = forgetDownload(itemIdText);

    if (resumable !== undefined) {
      try {
        await resumable.cancelAsync();
      } catch {
        // Best-effort cancel; the row and file still go below.
      }
    }

    await eraseDownload(record, itemIdText);
    pumpQueue();
  },

  /**
   * Delete every download (Settings "delete all"): cancel any in-flight transfers, remove all
   * files and rows. The repository projects an empty native-cache index.
   */
  removeAll: async (): Promise<void> => {
    await ensureHydrated();
    pauseAllActive = false;
    const all = [...downloadStore.getAll()];
    downloadStore.clear();
    lastProgressPersistAt.clear();
    activeTransfers.clear();

    for (const [itemIdText, resumable] of inFlight) {
      inFlight.delete(itemIdText);
      try {
        await resumable.cancelAsync();
      } catch {
        // Best-effort cancel.
      }
    }

    for (const record of all) {
      if (record.filePath !== null) {
        try {
          await FileSystem.deleteAsync(record.filePath, { idempotent: true });
        } catch {
          // Best-effort file cleanup.
        }
      }
    }

    await downloadsRepository.clear();
  },

  /**
   * Delete every download that belongs to one channel — completed rows and any still in flight.
   */
  removeAllForChannel: async (channelIdText: string): Promise<void> => {
    await ensureHydrated();
    const itemIdTexts = new Set<string>();
    for (const record of downloadStore.getAll()) {
      if (record.channelIdText === channelIdText) {
        itemIdTexts.add(record.itemIdText);
      }
    }
    for (const record of await downloadsRepository.listCompleteByChannel(channelIdText)) {
      itemIdTexts.add(record.itemIdText);
    }
    for (const itemIdText of itemIdTexts) {
      await downloadManager.remove(itemIdText);
    }
  },
};

// When Offline Mode turns on, pause every in-flight transfer so nothing keeps using the network.
void subscribeOfflineMode((enabled) => {
  if (enabled) {
    void downloadManager.pauseAll();
  }
});
