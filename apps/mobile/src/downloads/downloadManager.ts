import * as FileSystem from 'expo-file-system';

import { primaryListArtworkUrl } from '@podverse/helpers';
import type { DTOItem } from '@podverse/helpers/dto';

import { downloadsRepository } from '../data/repositories';
import { resolveE2eMediaUrl } from '../lib/e2e/resolveE2eMediaUrl';
import {
  isDownloadQuotaUnlimited,
  readDownloadAutoDeleteOnDeviceLowEnabled,
  readDownloadAutoDeleteOnLimitEnabled,
  readDownloadQuotaBytes,
} from '../prefs/downloadPrefs';
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
import { DOWNLOAD_MAX_CONCURRENCY } from './downloadTypes';

/**
 * Download runner. Owns Expo FileSystem transfers, a capped concurrent queue
 * (`DOWNLOAD_MAX_CONCURRENCY`), pause/resume, and duplicate-tap de-dupe.
 * `downloadsRepository` is the source of truth for state. Screens observe changes via `subscribe`
 * and never touch Expo FileSystem directly.
 *
 * Livestreams and HLS/m3u8 are rejected by `isItemDownloadable` before any row is created — this
 * module only ever transfers progressive files (see src/downloads/README.md).
 */

export type EnqueueResult = { ok: true } | { ok: false; reason: DownloadIneligibleReason };

type Listener = () => void;

/** Last auto-delete result, surfaced as a manage-storage banner. `at` lets a subscriber
 * show each event once without a consume/reset race. */
export type AutoDeleteNotice = { count: number; at: number };

const listeners = new Set<Listener>();
const inFlight = new Map<string, FileSystem.DownloadResumable>();
/** Item ids whose transfers are actively running (status downloading). */
const activeTransfers = new Set<string>();
let pumpRunning = false;
let autoDeleteNotice: AutoDeleteNotice | null = null;
/** When true, Pause all is active until Resume all or an individual resume. */
let pauseAllActive = false;

const notify = (): void => {
  for (const listener of listeners) {
    listener();
  }
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
    channelIdText: channel.id_text ?? null,
    channelTitle: channel.title ?? null,
  };
};

const ensureDownloadsDirectory = async (baseDirectory: string): Promise<void> => {
  const directory = `${baseDirectory}${DOWNLOADS_SUBDIRECTORY}`;
  const info = await FileSystem.getInfoAsync(directory);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
  }
};

/** Delete a completed download's file (best-effort) and its row; used by remove + auto-delete. */
const deleteDownload = async (itemIdText: string): Promise<void> => {
  const record = await downloadsRepository.getByItemIdText(itemIdText);
  if (record !== null && record.filePath !== null) {
    try {
      await FileSystem.deleteAsync(record.filePath, { idempotent: true });
    } catch {
      // Best-effort file cleanup.
    }
  }
  await downloadsRepository.remove(itemIdText);
};

const maybeAutoDelete = async (justCompletedItemIdText: string): Promise<void> => {
  const [onLimit, onDeviceLow, quotaBytes] = await Promise.all([
    readDownloadAutoDeleteOnLimitEnabled(),
    readDownloadAutoDeleteOnDeviceLowEnabled(),
    readDownloadQuotaBytes(),
  ]);

  const completed = await downloadsRepository.listByStatus('complete');
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
  for (const victimId of victimIds) {
    await deleteDownload(victimId);
  }
  autoDeleteNotice = { at: Date.now(), count: victimIds.size };
  notify();
};

const runTransfer = async (itemIdText: string): Promise<void> => {
  const record = await downloadsRepository.getByItemIdText(itemIdText);
  if (record === null || record.status === 'paused' || record.status === 'failed') {
    activeTransfers.delete(itemIdText);
    return;
  }

  const baseDirectory = FileSystem.documentDirectory;
  if (baseDirectory === null) {
    activeTransfers.delete(itemIdText);
    await downloadsRepository.patch(itemIdText, { status: 'failed', errorReason: 'no_storage' });
    notify();
    return;
  }

  if (record.status !== 'downloading') {
    await downloadsRepository.patch(itemIdText, { status: 'downloading', errorReason: null });
    notify();
  }

  const fileName = buildDownloadFileName(itemIdText, record.fileExtension);
  const filePath = buildDownloadFilePath(baseDirectory, fileName);
  const sourceUrl = resolveE2eMediaUrl(record.enclosureUri);

  let resumable = inFlight.get(itemIdText);
  if (resumable === undefined) {
    resumable = FileSystem.createDownloadResumable(sourceUrl, filePath, {}, (progress) => {
      void downloadsRepository.patch(itemIdText, {
        bytesDownloaded: progress.totalBytesWritten,
        byteSize: progress.totalBytesExpectedToWrite > 0 ? progress.totalBytesExpectedToWrite : null,
      });
      notify();
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

    const current = await downloadsRepository.getByItemIdText(itemIdText);
    if (current === null || current.status === 'paused') {
      return;
    }

    await downloadsRepository.patch(itemIdText, {
      dismissedFromList: false,
      filePath: result.uri,
      status: 'complete',
    });
    notify();
    await maybeAutoDelete(itemIdText);
  } catch {
    inFlight.delete(itemIdText);
    activeTransfers.delete(itemIdText);
    const current = await downloadsRepository.getByItemIdText(itemIdText);
    if (current !== null && current.status === 'downloading') {
      await downloadsRepository.patch(itemIdText, {
        errorReason: 'transfer_failed',
        status: 'failed',
      });
      notify();
    }
  }
};

const pumpQueue = async (): Promise<void> => {
  if (pumpRunning || pauseAllActive) {
    return;
  }
  pumpRunning = true;
  try {
    while (!pauseAllActive && activeTransfers.size < DOWNLOAD_MAX_CONCURRENCY) {
      const queued = await downloadsRepository.listByStatus('queued');
      const next = queued[queued.length - 1];
      if (next === undefined) {
        break;
      }
      // Claim the slot before starting so the next iteration respects the concurrency cap.
      activeTransfers.add(next.itemIdText);
      await downloadsRepository.patch(next.itemIdText, {
        errorReason: null,
        status: 'downloading',
      });
      notify();
      void runTransfer(next.itemIdText).finally(() => {
        void pumpQueue();
      });
    }
  } finally {
    pumpRunning = false;
  }
};

export const downloadManager = {
  /** Subscribe to download-state changes; returns an unsubscribe fn. */
  subscribe: (listener: Listener): (() => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  /**
   * Enqueue an item for offline download. Rejects ineligible items (livestream / HLS / no
   * enclosure) without creating a row, and de-dupes an item that is already queued/downloading/
   * paused/complete so duplicate taps do not spawn extra jobs.
   */
  enqueue: async (item: DTOItem): Promise<EnqueueResult> => {
    const eligibility = isItemDownloadable(item);
    if (!eligibility.ok) {
      return { ok: false, reason: eligibility.reason };
    }

    const existing = await downloadsRepository.getByItemIdText(item.id_text);
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
    const channel = channelFromItem(item);
    await downloadsRepository.upsert({
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
    });
    notify();
    if (!pauseAllActive) {
      void pumpQueue();
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
    const record = await downloadsRepository.getByItemIdText(itemIdText);
    if (record === null) {
      return;
    }
    if (record.status === 'downloading') {
      const resumable = inFlight.get(itemIdText);
      if (resumable !== undefined) {
        try {
          await resumable.pauseAsync();
        } catch {
          // Best-effort pause.
        }
      }
      activeTransfers.delete(itemIdText);
      await downloadsRepository.patch(itemIdText, { status: 'paused' });
      notify();
      void pumpQueue();
      return;
    }
    if (record.status === 'queued') {
      await downloadsRepository.patch(itemIdText, { status: 'paused' });
      notify();
    }
  },

  /** Resume one paused job. Clears the Pause-all master state. */
  resume: async (itemIdText: string): Promise<void> => {
    const record = await downloadsRepository.getByItemIdText(itemIdText);
    if (record === null || record.status !== 'paused') {
      return;
    }
    pauseAllActive = false;
    await downloadsRepository.patch(itemIdText, { status: 'queued' });
    notify();
    void pumpQueue();
  },

  /** Pause every in-flight transfer and hold remaining queued jobs as paused. */
  pauseAll: async (): Promise<void> => {
    pauseAllActive = true;
    const all = await downloadsRepository.list();
    for (const record of all) {
      if (record.status === 'downloading') {
        const resumable = inFlight.get(record.itemIdText);
        if (resumable !== undefined) {
          try {
            await resumable.pauseAsync();
          } catch {
            // Best-effort.
          }
        }
        activeTransfers.delete(record.itemIdText);
        await downloadsRepository.patch(record.itemIdText, { status: 'paused' });
      } else if (record.status === 'queued') {
        await downloadsRepository.patch(record.itemIdText, { status: 'paused' });
      }
    }
    notify();
  },

  /** Unpause every paused job and restart the pump. */
  resumeAll: async (): Promise<void> => {
    pauseAllActive = false;
    const paused = await downloadsRepository.listByStatus('paused');
    for (const record of paused) {
      await downloadsRepository.patch(record.itemIdText, { status: 'queued' });
    }
    notify();
    void pumpQueue();
  },

  /** Hide completed rows from the Downloads list without deleting files. */
  dismissAllFinished: async (): Promise<number> => {
    const count = await downloadsRepository.dismissAllFinished();
    notify();
    return count;
  },

  /** Re-queue a failed download. */
  retry: async (itemIdText: string): Promise<void> => {
    const record = await downloadsRepository.getByItemIdText(itemIdText);
    if (record === null || record.status !== 'failed') {
      return;
    }
    await downloadsRepository.patch(itemIdText, {
      errorReason: null,
      status: pauseAllActive ? 'paused' : 'queued',
    });
    notify();
    if (!pauseAllActive) {
      void pumpQueue();
    }
  },

  /**
   * Cancel an in-progress or queued download and remove its row (and any partial/complete file).
   * A completed download can be removed from the library through the same operation.
   */
  remove: async (itemIdText: string): Promise<void> => {
    const resumable = inFlight.get(itemIdText);
    if (resumable !== undefined) {
      inFlight.delete(itemIdText);
      activeTransfers.delete(itemIdText);
      try {
        await resumable.cancelAsync();
      } catch {
        // Best-effort cancel; we still delete the row + file below.
      }
    }

    await deleteDownload(itemIdText);
    notify();
    void pumpQueue();
  },

  /**
   * Delete every download (Settings "delete all"): cancel any in-flight transfers, remove all
   * files and rows. The repository projects an empty native-cache index.
   */
  removeAll: async (): Promise<void> => {
    pauseAllActive = false;
    for (const [itemIdText, resumable] of inFlight) {
      inFlight.delete(itemIdText);
      activeTransfers.delete(itemIdText);
      try {
        await resumable.cancelAsync();
      } catch {
        // Best-effort cancel.
      }
    }

    const all = await downloadsRepository.list();
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
    notify();
  },
};
