/**
 * Read-time classification of an enclosure URI and MIME type.
 * Callers use this for playback delivery and for deciding whether a URI is one
 * file that can be saved. Download eligibility also uses `isHttpOrHttpsUri`,
 * `isObviousNonMediaDownloadSource`, and `isProgressiveDownloadUri`. This module does not fetch
 * the URI or store a flag.
 */

export const HLS_SOURCE_MIME_TYPES = [
  'application/x-mpegurl',
  'application/vnd.apple.mpegurl',
  'audio/x-mpegurl',
  'audio/mpegurl',
] as const;

/** MIME used when an HLS playlist is identified and the enclosure type is missing or not an HLS type. */
export const HLS_PLAYLIST_MIME_TYPE = 'application/vnd.apple.mpegurl';

const HLS_SOURCE_MIME_TYPE_SET = new Set<string>(HLS_SOURCE_MIME_TYPES);

/** `hls` is an HLS playlist manifest. `file` is anything else, including non-media URIs. */
export type MediaSourceDelivery = 'hls' | 'file';

export type MediaSourceClassification = {
  delivery: MediaSourceDelivery;
  /** Lowercase path extension after the query and hash are removed, or null. */
  extension: string | null;
  /** Lowercase MIME type with parameters removed, or null when none was provided. */
  mime: string | null;
};

export type DirectDownloadBlockReason = 'missing_uri' | 'hls_playlist';

export type DirectDownloadResolution =
  | { ok: true; uri: string }
  | { ok: false; reason: DirectDownloadBlockReason };

/** Path with the query string and hash removed. Extension checks use this, not the raw URI. */
export function uriPathWithoutQueryOrHash(uri: string): string {
  return uri.split(/[?#]/)[0] ?? '';
}

/** Lowercase extension of the path, or null when the path has none. */
export function mediaSourcePathExtension(uri: string): string | null {
  const pathOnly = uriPathWithoutQueryOrHash(uri);
  const match = pathOnly.match(/\.([a-z0-9]+)$/i);
  if (!match || !match[1]) {
    return null;
  }
  return match[1].toLowerCase();
}

function normalizeMimeType(mime: string | null | undefined): string | null {
  if (typeof mime !== 'string') {
    return null;
  }
  const withoutParameters = mime.split(';')[0] ?? '';
  const normalized = withoutParameters.trim().toLowerCase();
  return normalized === '' ? null : normalized;
}

export function isHlsMimeType(mime: string | null | undefined): boolean {
  const normalized = normalizeMimeType(mime);
  return normalized !== null && HLS_SOURCE_MIME_TYPE_SET.has(normalized);
}

/**
 * Enclosure types that are documents, not a progressive media file.
 * Parameters such as `; charset=utf-8` are ignored by `normalizeMimeType`.
 */
const NON_MEDIA_DOWNLOAD_MIME_TYPES = [
  'application/bittorrent',
  'application/pdf',
  'application/x-bittorrent',
  'application/x-pdf',
  'application/xhtml+xml',
  'text/html',
] as const;

const NON_MEDIA_DOWNLOAD_MIME_TYPE_SET = new Set<string>(NON_MEDIA_DOWNLOAD_MIME_TYPES);

const HTML_DOWNLOAD_EXTENSIONS = new Set(['htm', 'html', 'xhtml']);

/** True when the URI scheme is `http` or `https`. Other schemes are not downloaded. */
export function isHttpOrHttpsUri(uri: string): boolean {
  const match = /^([a-z][a-z0-9+.-]*):/i.exec(uri.trim());
  const scheme = match?.[1]?.toLowerCase();
  return scheme === 'http' || scheme === 'https';
}

/**
 * True when a page or document extension and the MIME type describe the same non-media file.
 * A media MIME type does not agree, so a `.html` path labeled `audio/mpeg` stays eligible.
 */
function mimeAgreesWithNonMediaExtension(extension: string, mime: string): boolean {
  if (HTML_DOWNLOAD_EXTENSIONS.has(extension)) {
    return mime.startsWith('text/') || mime === 'application/xhtml+xml';
  }
  if (extension === 'pdf') {
    return mime === 'application/pdf' || mime === 'application/x-pdf';
  }
  if (extension === 'torrent') {
    return mime === 'application/bittorrent' || mime === 'application/x-bittorrent';
  }
  return false;
}

/**
 * True for an obvious non-media document. An explicit document MIME type is enough on its own.
 * A page or document extension counts only when the MIME type agrees. A missing MIME type does not.
 */
export function isObviousNonMediaDownloadSource(uri: string, mime?: string | null): boolean {
  const normalizedMime = normalizeMimeType(mime);
  if (normalizedMime !== null && NON_MEDIA_DOWNLOAD_MIME_TYPE_SET.has(normalizedMime)) {
    return true;
  }
  if (normalizedMime === null) {
    return false;
  }
  const extension = mediaSourcePathExtension(uri);
  if (extension === null) {
    return false;
  }
  return mimeAgreesWithNonMediaExtension(extension, normalizedMime);
}

/**
 * True when the path ends in `.m3u8` (query and hash ignored) or the MIME type is an HLS playlist type.
 * A `.m3u8` path wins even when the MIME type names a progressive file.
 */
export function isHlsSource(uri: string, mime?: string | null): boolean {
  if (mediaSourcePathExtension(uri) === 'm3u8') {
    return true;
  }
  return isHlsMimeType(mime);
}

/**
 * True when a URI can be saved as one progressive file.
 * Allows `http` and `https` only. An HLS playlist, an explicit document MIME type, or a
 * page/document extension that agrees with the MIME type is not saveable. A missing MIME type
 * stays saveable.
 */
export function isProgressiveDownloadUri(uri: string, mime?: string | null): boolean {
  const trimmed = uri.trim();
  if (trimmed === '') {
    return false;
  }
  if (isHlsSource(trimmed, mime)) {
    return false;
  }
  if (!isHttpOrHttpsUri(trimmed)) {
    return false;
  }
  return !isObviousNonMediaDownloadSource(trimmed, mime);
}

export function classifyMediaSource(
  uri: string,
  mime?: string | null
): MediaSourceClassification {
  const extension = mediaSourcePathExtension(uri);
  const normalizedMime = normalizeMimeType(mime);
  return {
    delivery: isHlsSource(uri, mime) ? 'hls' : 'file',
    extension,
    mime: normalizedMime,
  };
}

/**
 * URI to save as one file. An HLS playlist is not a single media file, so it resolves as
 * `hls_playlist`. Empty input resolves as `missing_uri`. Other URIs are returned trimmed;
 * this does not decide whether those bytes are media.
 */
export function resolveDirectDownloadUri(
  uri: string | null | undefined,
  mime?: string | null
): DirectDownloadResolution {
  if (typeof uri !== 'string' || uri.trim() === '') {
    return { ok: false, reason: 'missing_uri' };
  }
  const trimmed = uri.trim();
  if (isHlsSource(trimmed, mime)) {
    return { ok: false, reason: 'hls_playlist' };
  }
  return { ok: true, uri: trimmed };
}
