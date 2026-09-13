import type { DownloadStatus } from './downloadTypes';

/** Jobs still transferring, waiting, or held paused. Failed, cancelled, and complete are excluded. */
export const IN_PROGRESS_DOWNLOAD_STATUSES = ['queued', 'downloading', 'paused'] as const;

export type InProgressDownloadStatus = (typeof IN_PROGRESS_DOWNLOAD_STATUSES)[number];

export const isInProgressDownloadStatus = (status: DownloadStatus): boolean => {
  return status === 'queued' || status === 'downloading' || status === 'paused';
};

export const countInProgressDownloads = (
  records: readonly { status: DownloadStatus }[]
): number => {
  return records.filter((record) => isInProgressDownloadStatus(record.status)).length;
};

/** Actively transferring (not merely queued or paused). */
export const countActiveDownloading = (
  records: readonly { status: DownloadStatus }[]
): number => {
  return records.filter((record) => record.status === 'downloading').length;
};

/** Tab badges show the sum of every in-progress row count on that tab. */
export const sumBadgeCounts = (counts: readonly number[]): number => {
  return counts.reduce((total, count) => total + Math.max(0, count), 0);
};
