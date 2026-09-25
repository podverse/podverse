import type { DirectDownloadBlockReason } from '@podverse/helpers';
import {
  getDownloadFilenameFromSource,
  isProgressiveDownloadUri,
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

export type StartProgressiveDownloadResult =
  | { ok: true; uri: string }
  | { ok: false; reason: DirectDownloadBlockReason | 'unsupported_source' };

/**
 * Starts a direct file download when the URI is one progressive file. An HLS playlist, a
 * non-http(s) URI, and an obvious non-media document are not fetched. Returns the classification
 * so the caller can explain a refusal.
 */
export function startProgressiveDownload({
  uri,
  mime,
  itemTitle,
  fallbackFilename,
  downloadAndSaveFile,
  showToastPromiseWithLoading,
  messages,
}: StartProgressiveDownloadParams): StartProgressiveDownloadResult {
  const resolution = resolveDirectDownloadUri(uri, mime);
  if (!resolution.ok) {
    return resolution;
  }
  if (!isProgressiveDownloadUri(resolution.uri, mime)) {
    return { ok: false, reason: 'unsupported_source' };
  }

  const filename = getDownloadFilenameFromSource({
    itemTitle,
    sourceUri: resolution.uri,
    fallbackFilename,
  });
  showToastPromiseWithLoading(downloadAndSaveFile(resolution.uri, filename), messages);
  return resolution;
}
