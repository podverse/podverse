/**
 * Storage quota policy for offline downloads (master steps 13.7–13.8). Pure logic only — no React
 * Native / Expo imports — so it stays unit-testable in the node vitest project (see
 * vitest.config.ts). The manage-storage UI (LibraryDownloadsScreen), the auto-delete toggle pref
 * (`prefs/downloadPrefs`), and the download runner (`downloadManager`) all consume these helpers.
 */

import type { DownloadRecord } from './downloadTypes';

const BYTES_PER_GIB = 1024 * 1024 * 1024;
const BYTES_PER_MIB = 1024 * 1024;
const BYTES_PER_KIB = 1024;

/**
 * Default on-device cap for completed downloads. Fixed for the v1 sketch (detail 436 allows a fixed
 * default); a user-adjustable cap can layer on later via `prefs/downloadPrefs`. 3 GiB balances a
 * useful offline library against phone storage.
 */
export const DEFAULT_DOWNLOAD_QUOTA_BYTES = 3 * BYTES_PER_GIB;

/** Disk bytes a completed row occupies: known total, else best-effort bytes written. */
export const recordBytes = (record: DownloadRecord): number => {
  if (record.byteSize !== null && record.byteSize > 0) {
    return record.byteSize;
  }
  return record.bytesDownloaded > 0 ? record.bytesDownloaded : 0;
};

/** Total on-disk bytes of `complete` downloads (in-progress rows are ignored — no final file yet). */
export const sumCompletedBytes = (records: DownloadRecord[]): number =>
  records.reduce((total, record) => {
    if (record.status !== 'complete') {
      return total;
    }
    return total + recordBytes(record);
  }, 0);

export const isOverQuota = (records: DownloadRecord[], capBytes: number): boolean =>
  sumCompletedBytes(records) > capBytes;

/**
 * Choose which completed downloads to delete to get back under `capBytes`, **oldest completed
 * first** (by `updatedAt`). Never selects in-progress rows (only `complete` count toward usage) and
 * never selects `protectedItemIdText` (the just-finished download that triggered the check), so a
 * fresh download is not immediately evicted. Returns the `itemIdText`s to remove, oldest→newest.
 */
export const selectAutoDeleteVictims = (
  records: DownloadRecord[],
  capBytes: number,
  protectedItemIdText: string | null = null
): string[] => {
  const completed = records.filter((record) => record.status === 'complete');
  let runningBytes = completed.reduce((total, record) => total + recordBytes(record), 0);
  if (runningBytes <= capBytes) {
    return [];
  }

  const oldestFirst = [...completed].sort((a, b) => a.updatedAt - b.updatedAt);
  const victims: string[] = [];
  for (const record of oldestFirst) {
    if (runningBytes <= capBytes) {
      break;
    }
    if (record.itemIdText === protectedItemIdText) {
      continue;
    }
    victims.push(record.itemIdText);
    runningBytes -= recordBytes(record);
  }
  return victims;
};

/** Human-readable byte size for the usage summary (unit symbols only — no localized words). */
export const formatDownloadBytes = (bytes: number): string => {
  if (bytes >= BYTES_PER_GIB) {
    return `${(bytes / BYTES_PER_GIB).toFixed(1)} GB`;
  }
  if (bytes >= BYTES_PER_MIB) {
    return `${(bytes / BYTES_PER_MIB).toFixed(1)} MB`;
  }
  if (bytes >= BYTES_PER_KIB) {
    return `${Math.round(bytes / BYTES_PER_KIB)} KB`;
  }
  return `${Math.max(0, Math.round(bytes))} B`;
};
