import * as FileSystem from 'expo-file-system';

import type { DTOItem } from '@podverse/helpers/dto';

import { downloadsRepository } from '../data/repositories';
import { resolveE2eMediaUrl } from '../lib/e2e/resolveE2eMediaUrl';
import { readDownloadAutoDeleteEnabled } from '../prefs/downloadPrefs';
import type { DownloadIneligibleReason } from './downloadEligibility';
import { isItemDownloadable } from './downloadEligibility';
import { DEFAULT_DOWNLOAD_QUOTA_BYTES, selectAutoDeleteVictims } from './downloadQuota';
import {
  buildDownloadFileName,
  buildDownloadFilePath,
  DOWNLOADS_SUBDIRECTORY,
  hashEnclosureUri,
} from './downloadStorage';

/**
 * Download runner for Track 13. Owns the Expo FileSystem transfer, a **single-concurrency** queue,
 * and duplicate-tap de-dupe; `downloadsRepository` is the source of truth for state. Screens observe
 * changes via `subscribe` (they re-read the repository) and never touch Expo FileSystem directly.
 *
 * Livestreams and HLS/m3u8 are rejected by `isItemDownloadable` before any row is created — this
 * module only ever transfers progressive files (see src/downloads/README.md).
 */

export type EnqueueResult = { ok: true } | { ok: false; reason: DownloadIneligibleReason };

type Listener = () => void;

/** Last auto-delete result, surfaced as a manage-storage banner (13.8). `at` lets a subscriber
 * show each event once without a consume/reset race. */
export type AutoDeleteNotice = { count: number; at: number };

const listeners = new Set<Listener>();
const inFlight = new Map<string, FileSystem.DownloadResumable>();
let isRunning = false;
let autoDeleteNotice: AutoDeleteNotice | null = null;

const notify = (): void => {
  for (const listener of listeners) {
    listener();
  }
};

const artworkFromItem = (item: DTOItem): string | null =>
  item.item_images[0]?.url ?? item.channel?.channel_images?.[0]?.url ?? null;

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

/**
 * After a download completes, if the user enabled auto-delete and total completed bytes exceed the
 * cap, remove the **oldest completed** downloads until under cap. Never deletes in-progress jobs
 * (only `complete` rows count toward usage) nor the just-finished item. Records a banner notice.
 */
const maybeAutoDelete = async (justCompletedItemIdText: string): Promise<void> => {
  const enabled = await readDownloadAutoDeleteEnabled();
  if (!enabled) {
    return;
  }
  const completed = await downloadsRepository.listByStatus('complete');
  const victims = selectAutoDeleteVictims(
    completed,
    DEFAULT_DOWNLOAD_QUOTA_BYTES,
    justCompletedItemIdText
  );
  if (victims.length === 0) {
    return;
  }
  for (const victimId of victims) {
    await deleteDownload(victimId);
  }
  autoDeleteNotice = { at: Date.now(), count: victims.length };
  notify();
};

const runTransfer = async (itemIdText: string): Promise<void> => {
  const record = await downloadsRepository.getByItemIdText(itemIdText);
  if (record === null) {
    return;
  }

  const baseDirectory = FileSystem.documentDirectory;
  if (baseDirectory === null) {
    await downloadsRepository.patch(itemIdText, { status: 'failed', errorReason: 'no_storage' });
    notify();
    return;
  }

  await downloadsRepository.patch(itemIdText, { status: 'downloading', errorReason: null });
  notify();

  const fileName = buildDownloadFileName(itemIdText, record.fileExtension);
  const filePath = buildDownloadFilePath(baseDirectory, fileName);
  // Same loopback-host rewrite as playback so on-device E2E (EXPO_PUBLIC_MOBILE_E2E) can fetch
  // test-assets media; a no-op in production (see resolveE2eMediaUrl).
  const sourceUrl = resolveE2eMediaUrl(record.enclosureUri);

  const resumable = FileSystem.createDownloadResumable(sourceUrl, filePath, {}, (progress) => {
    void downloadsRepository.patch(itemIdText, {
      bytesDownloaded: progress.totalBytesWritten,
      byteSize: progress.totalBytesExpectedToWrite > 0 ? progress.totalBytesExpectedToWrite : null,
    });
    notify();
  });
  inFlight.set(itemIdText, resumable);

  try {
    await ensureDownloadsDirectory(baseDirectory);
    const result = await resumable.downloadAsync();
    inFlight.delete(itemIdText);

    if (result === undefined) {
      // Cancelled — cancel()/remove() already reconciled the row and file.
      return;
    }

    await downloadsRepository.patch(itemIdText, {
      status: 'complete',
      filePath: result.uri,
    });
    notify();
    await maybeAutoDelete(itemIdText);
  } catch {
    inFlight.delete(itemIdText);
    // If the row was cancelled/removed mid-flight, don't resurrect it as failed.
    const current = await downloadsRepository.getByItemIdText(itemIdText);
    if (current !== null && current.status === 'downloading') {
      await downloadsRepository.patch(itemIdText, {
        status: 'failed',
        errorReason: 'transfer_failed',
      });
      notify();
    }
  }
};

const runNext = async (): Promise<void> => {
  if (isRunning) {
    return;
  }
  const queued = await downloadsRepository.listByStatus('queued');
  // listByStatus is ordered newest-first; take the oldest queued job (FIFO).
  const next = queued[queued.length - 1];
  if (next === undefined) {
    return;
  }

  isRunning = true;
  try {
    await runTransfer(next.itemIdText);
  } finally {
    isRunning = false;
    await runNext();
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
   * complete so duplicate taps do not spawn extra jobs.
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
        existing.status === 'complete')
    ) {
      return { ok: true };
    }

    const now = Date.now();
    await downloadsRepository.upsert({
      itemIdText: item.id_text,
      enclosureUri: eligibility.source.uri,
      enclosureUrlHash: hashEnclosureUri(eligibility.source.uri),
      enclosureMime: eligibility.source.mime,
      mediaType: eligibility.source.mediaType,
      fileExtension: eligibility.source.fileExtension,
      filePath: null,
      byteSize: null,
      bytesDownloaded: 0,
      status: 'queued',
      title: item.title ?? null,
      artworkUrl: artworkFromItem(item),
      errorReason: null,
      createdAt: now,
      updatedAt: now,
    });
    notify();
    void runNext();
    return { ok: true };
  },

  /** Most recent auto-delete result (or `null`); drives the manage-storage banner (13.8). */
  getAutoDeleteNotice: (): AutoDeleteNotice | null => autoDeleteNotice,

  /**
   * Cancel an in-progress or queued download and remove its row (and any partial/complete file).
   * Also used to delete a completed download from the library.
   */
  remove: async (itemIdText: string): Promise<void> => {
    const resumable = inFlight.get(itemIdText);
    if (resumable !== undefined) {
      inFlight.delete(itemIdText);
      try {
        await resumable.cancelAsync();
      } catch {
        // Best-effort cancel; we still delete the row + file below.
      }
    }

    await deleteDownload(itemIdText);
    notify();
    void runNext();
  },

  /**
   * Delete every download (manage-storage "delete all"): cancel any in-flight transfers, remove all
   * files and rows. The repository projects an empty native-cache index (13.9).
   */
  removeAll: async (): Promise<void> => {
    for (const [itemIdText, resumable] of inFlight) {
      inFlight.delete(itemIdText);
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
