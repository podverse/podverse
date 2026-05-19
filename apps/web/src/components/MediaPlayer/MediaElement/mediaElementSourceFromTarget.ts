import type { EnclosureSelectedParams, LabeledItemEnclosure } from '@podverse/helpers';
import { getSelectedLabeledItemEnclosureAndSource } from '@podverse/helpers';

import type { MediaElementSource } from '../../../hooks/useMediaElementBridge';
import type { PlaybackTarget } from '../../../lib/playback';

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
    return { kind: 'file', src };
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
  const mimeType =
    typeof mimeRaw === 'string' && mimeRaw.trim() !== '' ? mimeRaw.trim() : undefined;
  return mimeType !== undefined ? { kind: 'file', src, mimeType } : { kind: 'file', src };
}
