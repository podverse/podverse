import type { EnclosureSelectedParams, LabeledItemEnclosure } from '@podverse/helpers';
import {
  classifyMediaSource,
  getSelectedLabeledItemEnclosureAndSource,
  HLS_PLAYLIST_MIME_TYPE,
  isHlsMimeType,
} from '@podverse/helpers';

import type { MediaElementSource } from '../../../hooks/useMediaElementBridge';
import type { PlaybackTarget } from '../../../lib/playback';

/**
 * File-element source for a URI. `delivery` is `hls` for an HLS playlist and `file` otherwise.
 * The element kind stays `file`.
 * An HLS playlist whose enclosure type is missing or is not an HLS type uses `HLS_PLAYLIST_MIME_TYPE`.
 */
export function toFileMediaElementSource(src: string, mime?: string | null): MediaElementSource {
  const classification = classifyMediaSource(src, mime);
  const trimmedMime =
    typeof mime === 'string' && mime.trim() !== '' ? mime.trim() : undefined;
  let mimeType: string | undefined;
  if (classification.delivery === 'hls') {
    mimeType =
      trimmedMime !== undefined && isHlsMimeType(trimmedMime)
        ? trimmedMime
        : HLS_PLAYLIST_MIME_TYPE;
  } else {
    mimeType = trimmedMime;
  }

  if (mimeType !== undefined) {
    return { kind: 'file', src, mimeType, delivery: classification.delivery };
  }
  return { kind: 'file', src, delivery: classification.delivery };
}

/**
 * Resolves a single file URL for non-live playback targets. Returns `null` for
 * livestreams (HLS / video.js path) or when no enclosure URL is available.
 */
export function mediaElementSourceFromTarget(
  target: PlaybackTarget,
  labeledItemEnclosures: LabeledItemEnclosure[],
  enclosureSelectedParams: EnclosureSelectedParams
): MediaElementSource | null {
  if (target.kind === 'livestream') {
    return null;
  }
  if (target.kind === 'add-by-rss') {
    const raw = target.resourceData.enclosure_url;
    const src = typeof raw === 'string' ? raw.trim() : '';
    if (src === '') {
      return null;
    }
    return toFileMediaElementSource(src);
  }
  const selected = getSelectedLabeledItemEnclosureAndSource({
    labeledItemEnclosures,
    type: enclosureSelectedParams.type,
    enclosureRowIndex: enclosureSelectedParams.enclosureRowSelected,
    sourceRowIndex: enclosureSelectedParams.sourceRowSelected,
  });
  const uriRaw = selected?.source?.uri;
  const src = typeof uriRaw === 'string' ? uriRaw.trim() : '';
  if (src === '') {
    return null;
  }
  const mimeRaw = selected?.labeledItemEnclosure?.enclosure?.type;
  return toFileMediaElementSource(src, typeof mimeRaw === 'string' ? mimeRaw : null);
}
