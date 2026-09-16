import type { DownloadStatus } from './downloadTypes';

/**
 * Catalog key for the next download tap — download, cancel, or delete — so the row icon and the
 * More menu say the same thing for the same status.
 */
export const downloadActionLabelKey = (status: DownloadStatus | null): string => {
  switch (status) {
    case 'complete':
      return 'features.download.delete';
    case 'queued':
    case 'downloading':
    case 'paused':
      return 'features.download.cancel_download';
    case 'failed':
      return 'features.download.episode_download_error';
    case 'cancelled':
    case null:
      return 'features.download.download_episode';
  }
};

export const runDownloadAction = ({
  remove,
  start,
  status,
}: {
  remove: () => void;
  start: () => void;
  status: DownloadStatus | null;
}): void => {
  const isInProgress = status === 'queued' || status === 'downloading' || status === 'paused';
  if (status === 'complete' || isInProgress) {
    remove();
    return;
  }
  start();
};
