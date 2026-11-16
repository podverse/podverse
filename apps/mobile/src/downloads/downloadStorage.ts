/**
 * On-disk layout for downloaded episode files.
 *
 * Use **Expo FileSystem** (`expo-file-system`) for storage. It ships with Expo SDK 58. Callers stay
 * on `expo-file-system/legacy`. It supports resumable background downloads (`createDownloadResumable`)
 * and progress callbacks, and writes to
 * app-private `documentDirectory` (persists across launches, excluded from user-facing storage).
 * The absolute base directory is resolved by the download runner as
 * `FileSystem.documentDirectory + DOWNLOADS_SUBDIRECTORY`; this module stays pure (no native import)
 * so eligibility/naming logic is unit-testable.
 *
 * Files are stored **with their progressive extension** (`.mp3`, `.m4a`, `.mp4`, …). We never store
 * an HLS playlist (`.m3u8`) as a media file — those items are rejected upstream by `isItemDownloadable`.
 */
export const DOWNLOADS_SUBDIRECTORY = 'downloads';

/** Allowed on-disk filename characters; anything else in an id_text is collapsed to `_`. */
const SAFE_FILENAME_SEGMENT = /[^a-zA-Z0-9._-]/g;

const sanitizeSegment = (value: string): string => value.replace(SAFE_FILENAME_SEGMENT, '_');

/**
 * Deterministic 32-bit FNV-1a hash of the enclosure URI, returned as an 8-char hex string. Pure JS
 * (no `node:crypto`) so it runs identically on device and in tests. Used for de-dupe and stable
 * on-disk naming when two items resolve the same URI.
 */
export const hashEnclosureUri = (uri: string): string => {
  let hash = 0x811c9dc5;
  for (let index = 0; index < uri.length; index += 1) {
    hash ^= uri.charCodeAt(index);
    // FNV prime multiply via shifts, kept in 32-bit unsigned range.
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
};

/**
 * Build the on-disk filename for a download. Includes the progressive extension when known so the
 * media engine can infer the container. The `id_text` is sanitized for filesystem safety.
 */
export const buildDownloadFileName = (itemIdText: string, fileExtension: string | null): string => {
  const base = sanitizeSegment(itemIdText);
  const ext = fileExtension === null ? '' : fileExtension.replace(SAFE_FILENAME_SEGMENT, '');
  return ext === '' ? base : `${base}.${ext}`;
};

/**
 * Join the downloads base directory (absolute, from `FileSystem.documentDirectory` at runtime) with
 * a download filename. Kept here so path assembly is consistent and testable; the runner supplies
 * the base directory.
 */
export const buildDownloadFilePath = (baseDirectory: string, fileName: string): string => {
  const normalizedBase = baseDirectory.endsWith('/') ? baseDirectory : `${baseDirectory}/`;
  return `${normalizedBase}${DOWNLOADS_SUBDIRECTORY}/${fileName}`;
};

/**
 * Persist only the file name under `downloads/` for a private file. Absolute `file://` paths
 * embed the iOS container UUID, which changes on update/reinstall; readers always rejoin
 * against the current `documentDirectory`. Callers store a `content://` document URI as the
 * full URI and do not pass it through this function.
 */
export const toStoredDownloadFileName = (absoluteOrRelativePath: string): string => {
  const trimmed = absoluteOrRelativePath.trim();
  if (trimmed === '') {
    return trimmed;
  }
  const withoutQuery = trimmed.split('?')[0] ?? trimmed;
  const normalized = withoutQuery.replace(/\\/g, '/');
  const segments = normalized.split('/').filter((segment) => segment.length > 0);
  const last = segments[segments.length - 1] ?? normalized;
  if (last === DOWNLOADS_SUBDIRECTORY) {
    return last;
  }
  return last;
};

/**
 * Resolve a stored download path against the current document directory. An empty value stays
 * empty. A `content://` document URI is returned trimmed and is not joined under
 * `documentDirectory`. Every other value drops a leading `downloads/` prefix, then joins
 * through `buildDownloadFilePath`.
 */
export const resolveStoredDownloadFilePath = (
  storedPath: string,
  documentDirectory: string
): string => {
  const trimmed = storedPath.trim();
  if (trimmed === '') {
    return trimmed;
  }
  if (trimmed.startsWith('content://')) {
    return trimmed;
  }
  const prefix = `${DOWNLOADS_SUBDIRECTORY}/`;
  const fileName = trimmed.startsWith(prefix) ? trimmed.slice(prefix.length) : trimmed;
  return buildDownloadFilePath(documentDirectory, fileName);
};

/** A private file (`file://`) or a chosen-folder document (`content://`). A bare path is not. */
export const isLocalDownloadUrl = (url: string): boolean => {
  return url.startsWith('file://') || url.startsWith('content://');
};
