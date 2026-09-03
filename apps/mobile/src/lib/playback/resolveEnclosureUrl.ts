import type { DTOItem } from '@podverse/helpers/dto';

import { resolveE2eMediaUrl } from '../e2e/resolveE2eMediaUrl';

const isAudioType = (type: string | null | undefined): boolean => {
  return typeof type === 'string' && type.toLowerCase().startsWith('audio');
};

/**
 * Resolve the audio-first enclosure URL for an item. Prefers an audio
 * enclosure, then the item's default enclosure, then the first; picks the first source `uri`.
 * Video items still resolve to a URL here (native engine can play the audio track). Returns `null`
 * when no usable source exists. The result is E2E-rewritten so device tests hit the local host.
 */
export function resolveItemAudioEnclosureUrl(item: DTOItem): string | null {
  const enclosures = item.item_enclosures ?? [];
  if (enclosures.length === 0) {
    return null;
  }

  const preferred =
    enclosures.find((enclosure) => isAudioType(enclosure.type)) ??
    enclosures.find((enclosure) => enclosure.item_enclosure_default) ??
    enclosures[0];

  const uri = preferred?.item_enclosure_sources?.[0]?.uri;
  if (typeof uri !== 'string' || uri.trim() === '') {
    return null;
  }

  return resolveE2eMediaUrl(uri.trim());
}
