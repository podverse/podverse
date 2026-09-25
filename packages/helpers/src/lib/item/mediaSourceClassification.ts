/**
 * Read-time classification of an enclosure URI and MIME type.
 * Callers use this for playback delivery and for deciding whether a URI is one
 * file that can be saved. It does not fetch the URI or store a flag.
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
 * True when the path ends in `.m3u8` (query and hash ignored) or the MIME type is an HLS playlist type.
 * A `.m3u8` path wins even when the MIME type names a progressive file.
 */
export function isHlsSource(uri: string, mime?: string | null): boolean {
  if (mediaSourcePathExtension(uri) === 'm3u8') {
    return true;
  }
  return isHlsMimeType(mime);
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
