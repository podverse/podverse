export { isItemDownloadable, isHlsSource } from './downloadEligibility';
export type {
  DownloadEligibility,
  DownloadIneligibleReason,
  DownloadSourceSelection,
} from './downloadEligibility';

export {
  DOWNLOADS_SUBDIRECTORY,
  buildDownloadFileName,
  buildDownloadFilePath,
  hashEnclosureUri,
} from './downloadStorage';

export {
  DEFAULT_DOWNLOAD_QUOTA_BYTES,
  formatDownloadBytes,
  isOverQuota,
  recordBytes,
  selectAutoDeleteVictims,
  sumCompletedBytes,
} from './downloadQuota';

export {
  countInProgressDownloads,
  isInProgressDownloadStatus,
  sumBadgeCounts,
} from './inProgressDownloadCount';
export {
  createDownloadStore,
  DOWNLOAD_PROGRESS_NOTIFY_MS,
  DOWNLOAD_STATUS_NOTIFY_MS,
  downloadStore,
} from './downloadStore';
export { groupUnsubscribedDownloadChannels } from './unsubscribedDownloadChannels';
export type {
  ItemChannelHint,
  UnsubscribedDownloadChannel,
  UnsubscribedDownloadSourceRow,
} from './unsubscribedDownloadChannels';
export type { DownloadProgressPatch, DownloadStore } from './downloadStore';
export { DOWNLOAD_STATUSES, isDownloadMediaType, isDownloadStatus } from './downloadTypes';
export type {
  DownloadMediaType,
  DownloadPatch,
  DownloadProgressEvent,
  DownloadRecord,
  DownloadStatus,
} from './downloadTypes';
