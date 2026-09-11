import type { DownloadStatus } from './downloadTypes';

/** Jobs still transferring or waiting to transfer. Failed, cancelled, and complete are excluded. */
export const IN_PROGRESS_DOWNLOAD_STATUSES = ['queued', 'downloading'] as const;

export type InProgressDownloadStatus = (typeof IN_PROGRESS_DOWNLOAD_STATUSES)[number];

export const isInProgressDownloadStatus = (status: DownloadStatus): boolean => {
  return status === 'queued' || status === 'downloading';
};

export const countInProgressDownloads = (
  records: readonly { status: DownloadStatus }[]
): number => {
  return records.filter((record) => isInProgressDownloadStatus(record.status)).length;
};

/** Tab badges show the sum of every in-progress row count on that tab. */
export const sumBadgeCounts = (counts: readonly number[]): number => {
  return counts.reduce((total, count) => total + Math.max(0, count), 0);
};
