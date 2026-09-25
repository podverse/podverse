import type { DirectDownloadResolution } from '@podverse/helpers';
import {
  getDownloadFilenameFromSource,
  resolveDirectDownloadUri,
} from '@podverse/helpers';

type StartProgressiveDownloadParams = {
  uri: string | null | undefined;
  mime: string | null | undefined;
  itemTitle: string | null;
  fallbackFilename: string;
  downloadAndSaveFile: (url: string, filename: string) => Promise<void>;
  showToastPromiseWithLoading: (
    promise: Promise<void>,
    messages: {
      loading: string;
      success: string;
      error: string;
    }
  ) => void;
  messages: {
    loading: string;
    success: string;
    error: string;
  };
};

/**
 * Starts a direct file download when the URI is one file. An HLS playlist is not fetched.
 * Returns the classification so the caller can explain a refusal.
 */
export function startProgressiveDownload({
  uri,
  mime,
  itemTitle,
  fallbackFilename,
  downloadAndSaveFile,
  showToastPromiseWithLoading,
  messages,
}: StartProgressiveDownloadParams): DirectDownloadResolution {
  const resolution = resolveDirectDownloadUri(uri, mime);
  if (!resolution.ok) {
    return resolution;
  }

  const filename = getDownloadFilenameFromSource({
    itemTitle,
    sourceUri: resolution.uri,
    fallbackFilename,
  });
  showToastPromiseWithLoading(downloadAndSaveFile(resolution.uri, filename), messages);
  return resolution;
}
