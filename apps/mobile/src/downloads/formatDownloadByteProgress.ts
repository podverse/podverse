import { formatFileSize } from '@podverse/helpers/fileSize';

/**
 * Optional size suffix for a downloading row: written bytes alone, or written / total when the
 * Content-Length (or enclosure length) is known. Returns null when nothing useful is known yet.
 */
export const formatDownloadByteProgress = (
  bytesDownloaded: number,
  byteSize: number | null
): string | null => {
  const totalKnown = byteSize !== null && byteSize > 0;
  if (!totalKnown && bytesDownloaded <= 0) {
    return null;
  }

  const downloadedLabel = formatFileSize(bytesDownloaded, { zeroLabel: '0 B' });
  if (downloadedLabel === null) {
    return null;
  }

  if (!totalKnown) {
    return downloadedLabel;
  }

  const totalLabel = formatFileSize(byteSize);
  if (totalLabel === null) {
    return downloadedLabel;
  }

  return `${downloadedLabel} / ${totalLabel}`;
};
