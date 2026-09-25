import { HLS_PLAYLIST_MIME_TYPE, isHlsMimeType, isHlsSource } from '@podverse/helpers';

/**
 * video.js source type for a livestream enclosure. A non-empty enclosure type is kept.
 * When that type is missing, an HLS playlist URI or HLS MIME becomes the source type.
 * A URI that is not an HLS playlist, with no type, stays unresolved so the player does not start.
 */
export function resolveLivestreamVideoJsSourceType(
  uri: string,
  enclosureType: string | null | undefined,
  sourceContentType?: string | null
): string | null {
  const trimmedType = typeof enclosureType === 'string' ? enclosureType.trim() : '';
  if (trimmedType !== '') {
    return trimmedType;
  }
  const trimmedContentType =
    typeof sourceContentType === 'string' ? sourceContentType.trim() : '';
  const mime = trimmedContentType !== '' ? trimmedContentType : null;
  if (!isHlsSource(uri, mime)) {
    return null;
  }
  if (mime !== null && isHlsMimeType(mime)) {
    return mime;
  }
  return HLS_PLAYLIST_MIME_TYPE;
}
