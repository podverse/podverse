/**
 * Whether a finished transfer may be stored as a completed download.
 *
 * HTTP status and file size are required. Content type is checked only against an explicit
 * non-media denylist, so a missing or unrecognized type still passes. Callers delete the file
 * and keep the row `failed` when this returns not ok.
 */

export const INVALID_DOWNLOAD_RESPONSE_REASON = 'invalid_response';

const NON_MEDIA_DOWNLOAD_CONTENT_TYPES = ['application/json', 'text/html', 'text/plain'] as const;

export type DownloadTransferSnapshot = {
  /** Bytes on disk after the transfer. `0` when the file is missing or unreadable. */
  byteSize: number;
  /** `mimeType` and/or the Content-Type header. Empty entries are ignored. */
  contentTypes: readonly (string | null | undefined)[];
  /** HTTP status from the transfer result. `null` when the platform did not report one. */
  status: number | null;
};

export type DownloadTransferValidation =
  | { ok: true }
  | { ok: false; errorReason: typeof INVALID_DOWNLOAD_RESPONSE_REASON };

const isNonMediaDownloadContentType = (token: string): boolean => {
  return NON_MEDIA_DOWNLOAD_CONTENT_TYPES.some((denied) => denied === token);
};

const contentTypeTokens = (contentType: string | null | undefined): string[] => {
  if (contentType === null || contentType === undefined || contentType.trim() === '') {
    return [];
  }
  const tokens: string[] = [];
  for (const part of contentType.split(',')) {
    const token = part.split(';')[0]?.trim().toLowerCase() ?? '';
    if (token !== '') {
      tokens.push(token);
    }
  }
  return tokens;
};

const hasDeniedDownloadContentType = (
  contentTypes: readonly (string | null | undefined)[]
): boolean => {
  for (const contentType of contentTypes) {
    for (const token of contentTypeTokens(contentType)) {
      if (isNonMediaDownloadContentType(token)) {
        return true;
      }
    }
  }
  return false;
};

const isSuccessfulHttpStatus = (status: number | null): boolean => {
  return status !== null && Number.isFinite(status) && status >= 200 && status < 300;
};

/** Case-insensitive Content-Type header read. Header maps differ in case across platforms. */
export const contentTypeHeaderValue = (
  headers: Readonly<Record<string, string>> | null | undefined
): string | null => {
  if (headers === null || headers === undefined) {
    return null;
  }
  for (const [name, value] of Object.entries(headers)) {
    if (name.toLowerCase() === 'content-type' && value.trim() !== '') {
      return value;
    }
  }
  return null;
};

export const validateDownloadTransfer = (
  snapshot: DownloadTransferSnapshot
): DownloadTransferValidation => {
  if (!isSuccessfulHttpStatus(snapshot.status) || snapshot.byteSize <= 0) {
    return { ok: false, errorReason: INVALID_DOWNLOAD_RESPONSE_REASON };
  }
  if (hasDeniedDownloadContentType(snapshot.contentTypes)) {
    return { ok: false, errorReason: INVALID_DOWNLOAD_RESPONSE_REASON };
  }
  return { ok: true };
};
