/**
 * On-disk layout for downloaded episode files.
 *
 * Storage decision (13.2): use **Expo FileSystem** (`expo-file-system`) — it ships with Expo SDK 52,
 * supports resumable background downloads (`createDownloadResumable`) and progress callbacks, and
 * writes to app-private `documentDirectory` (persists across launches, excluded from user-facing
 * storage). The absolute base directory is resolved by the download runner (step 13.4) as
 * `FileSystem.documentDirectory + DOWNLOADS_SUBDIRECTORY`; this module stays pure (no native import)
 * so eligibility/naming logic is unit-testable.
 *
 * Files are stored **with their progressive extension** (`.mp3`, `.m4a`, `.mp4`, …). We never store
 * an HLS `.m3u8` playlist as a media file — HLS items are rejected upstream by `isItemDownloadable`.
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
