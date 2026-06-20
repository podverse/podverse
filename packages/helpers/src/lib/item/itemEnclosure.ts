import type { DTOItemEnclosureSource } from '../../dtos/index.js';
import type { DTOItemEnclosure } from '../../dtos/item/itemEnclosure.js';
import type { FormattedBitrate } from '../bitrate.js';
import { formatBitrate } from '../bitrate.js';

const EXTENSION_MEDIA_TYPE_MAP: Record<string, 'audio' | 'video'> = {
  mp3: 'audio',
  aac: 'audio',
  opus: 'audio',
  m4a: 'audio',
  ogg: 'audio',
  wav: 'audio',
  mp4: 'video',
  m4v: 'video',
  webm: 'video',
  mov: 'video',
  mkv: 'video',
};

export function getMediaTypeFromSource(uri: string): 'audio' | 'video' | undefined {
  const urlWithoutParams = uri.split(/[?#]/)[0] ?? '';
  const match = urlWithoutParams.match(/\.([a-z0-9]+)$/i);
  if (!match || !match[1]) {
    return undefined;
  }
  const ext = match[1].toLowerCase();
  return EXTENSION_MEDIA_TYPE_MAP[ext];
}

export type EnclosureSelectedParams = {
  type: 'default' | 'audio' | 'video' | null;
  enclosureRowSelected: number | null;
  sourceRowSelected: number | null;
};

/** A user's preferred media type for default enclosure selection. */
export type MediaTypePreference = 'audio' | 'video';

/**
 * Resolve the default enclosure selection for a preferred media type.
 *
 * The preferred type is tried first; the other type is the fallback so a
 * preference for video still plays audio-only feeds (and vice versa). When no
 * enclosure of either type exists, the caller-facing `'default'` selection is
 * returned. By default the first enclosure within the resolved media type is
 * chosen; callers may pass `pickWithinType` to apply their own scoring (e.g.
 * the embed best-fit connection-quality logic) without duplicating the
 * preference-order traversal.
 *
 * The returned `enclosureRowSelected` is the index within the same-media-type
 * subset, matching `getSelectedLabeledItemEnclosureAndSource`.
 */
export function resolvePreferredMediaTypeEnclosureSelectedParams(
  labeledItemEnclosures: LabeledItemEnclosure[],
  preferred: MediaTypePreference,
  pickWithinType?: (candidates: LabeledItemEnclosure[], mediaType: MediaTypePreference) => number
): EnclosureSelectedParams {
  const fallback: EnclosureSelectedParams = {
    type: 'default',
    enclosureRowSelected: null,
    sourceRowSelected: null,
  };

  if (!labeledItemEnclosures || labeledItemEnclosures.length === 0) {
    return fallback;
  }

  const preferenceOrder: MediaTypePreference[] =
    preferred === 'video' ? ['video', 'audio'] : ['audio', 'video'];

  for (const mediaType of preferenceOrder) {
    const candidates = labeledItemEnclosures.filter((entry) => entry.mediaType === mediaType);
    if (candidates.length === 0) {
      continue;
    }

    const enclosureRowSelected = pickWithinType ? pickWithinType(candidates, mediaType) : 0;

    return {
      type: mediaType,
      enclosureRowSelected,
      sourceRowSelected: 0,
    };
  }

  return fallback;
}

export type SelectedLabeledItemEnclosureAndSource = {
  labeledItemEnclosure: LabeledItemEnclosure | null;
  source: DTOItemEnclosureSource | null;
};

export function getSelectedLabeledItemEnclosureAndSource({
  labeledItemEnclosures,
  type,
  enclosureRowIndex,
  sourceRowIndex,
}: {
  labeledItemEnclosures: LabeledItemEnclosure[];
  type: 'default' | 'audio' | 'video' | null;
  enclosureRowIndex: number | null;
  sourceRowIndex: number | null;
}): SelectedLabeledItemEnclosureAndSource {
  if (!labeledItemEnclosures || labeledItemEnclosures.length === 0) {
    return { labeledItemEnclosure: null, source: null };
  }

  let labeledItemEnclosure: LabeledItemEnclosure | null;
  let source: DTOItemEnclosureSource | null;

  // Helper to get first enclosure of a given mediaType
  const getFirstOfType = (mediaType: 'audio' | 'video') =>
    labeledItemEnclosures.find((e: LabeledItemEnclosure) => e.mediaType === mediaType) || null;

  // Helper to get enclosure by index and type
  const getByTypeAndIndex = (mediaType: 'audio' | 'video', idx: number) => {
    const filtered = labeledItemEnclosures.filter(
      (e: LabeledItemEnclosure) => e.mediaType === mediaType
    );
    return filtered[idx] || filtered[0] || null;
  };

  // Default type logic
  if (type === 'default' || !type) {
    labeledItemEnclosure =
      labeledItemEnclosures.find((e: LabeledItemEnclosure) => e.enclosure.item_enclosure_default) ||
      labeledItemEnclosures[0] ||
      null;
    const sources = labeledItemEnclosure?.enclosure.item_enclosure_sources || [];
    const srcIdx = typeof sourceRowIndex === 'number' ? sourceRowIndex : 0;
    source = sources[srcIdx] || sources[0] || null;
    return { labeledItemEnclosure, source };
  }

  // Audio type logic
  if (type === 'audio') {
    const encIdx = typeof enclosureRowIndex === 'number' ? enclosureRowIndex : 0;
    labeledItemEnclosure = getByTypeAndIndex('audio', encIdx);
    if (!labeledItemEnclosure) {
      labeledItemEnclosure = getFirstOfType('audio');
    }
    const sources = labeledItemEnclosure?.enclosure.item_enclosure_sources || [];
    const srcIdx = typeof sourceRowIndex === 'number' ? sourceRowIndex : 0;
    source = sources[srcIdx] || sources[0] || null;
    return { labeledItemEnclosure, source };
  }

  // Video type logic
  if (type === 'video') {
    const encIdx = typeof enclosureRowIndex === 'number' ? enclosureRowIndex : 0;
    labeledItemEnclosure = getByTypeAndIndex('video', encIdx);
    if (!labeledItemEnclosure) {
      labeledItemEnclosure = getFirstOfType('video');
    }
    const sources = labeledItemEnclosure?.enclosure.item_enclosure_sources || [];
    const srcIdx = typeof sourceRowIndex === 'number' ? sourceRowIndex : 0;
    source = sources[srcIdx] || sources[0] || null;
    return { labeledItemEnclosure, source };
  }

  // Fallback: just return first enclosure and source
  labeledItemEnclosure = labeledItemEnclosures[0] || null;
  const sources = labeledItemEnclosure?.enclosure.item_enclosure_sources || [];
  source = sources[0] || null;
  return { labeledItemEnclosure, source };
}

export type ItemEnclosureModalityIndicator = 'none' | 'video' | 'mixed';

/**
 * Resolve whether an item's enclosures should display a modality indicator icon:
 * - `'none'` for audio-only (no icon),
 * - `'video'` for video-only,
 * - `'mixed'` when both audio and video enclosures are present.
 */
export function resolveItemEnclosureModalityIndicator(
  enclosures: DTOItemEnclosure[] | null | undefined
): ItemEnclosureModalityIndicator {
  if (!enclosures || enclosures.length === 0) {
    return 'none';
  }
  const labeled = buildLabeledItemEnclosures(enclosures);
  const hasAudio = labeled.some((e) => e.mediaType === 'audio');
  const hasVideo = labeled.some((e) => e.mediaType === 'video');
  if (hasVideo && hasAudio) {
    return 'mixed';
  }
  if (hasVideo) {
    return 'video';
  }
  return 'none';
}

export interface LabeledItemEnclosure {
  enclosure: DTOItemEnclosure;
  mediaType: 'audio' | 'video';
  label: 'audio' | 'video'; // base media type label for translation key lookups
  audioBitrate?: FormattedBitrate; // present when mediaType === 'audio' and bitrate is available
  videoHeight?: number; // present when mediaType === 'video' and height is available
  fileExtension?: string; // lowercase extension (e.g. mp3, mp4, mov, ogg) if derivable
}

export function buildLabeledItemEnclosures(enclosures: DTOItemEnclosure[]): LabeledItemEnclosure[] {
  const sorted = [...enclosures].sort((a, b) => {
    if (a.item_enclosure_default === b.item_enclosure_default) {
      return 0;
    }
    return a.item_enclosure_default ? -1 : 1;
  });

  return sorted.map((e) => {
    let mediaType: 'audio' | 'video';
    if (e.height !== null && e.height !== undefined) {
      mediaType = 'video';
    } else if (e.type?.startsWith('video/')) {
      mediaType = 'video';
    } else {
      mediaType = 'audio';
    }

    const labeled: LabeledItemEnclosure = {
      enclosure: e,
      mediaType,
      label: mediaType,
    };

    if (mediaType === 'audio' && e.bitrate) {
      labeled.audioBitrate = formatBitrate(e.bitrate);
    }
    if (mediaType === 'video' && e.height) {
      labeled.videoHeight = e.height;
    }

    // Derive file extension from first source URI if present, else fallback to mime type mapping.
    const source = e.item_enclosure_sources?.[0];
    let ext: string | undefined;
    if (source?.uri) {
      const urlWithoutParams = source.uri.split(/[?#]/)[0] ?? '';
      const match = urlWithoutParams.match(/\.([a-z0-9]+)$/i);
      if (match && match[1]) {
        ext = match[1].toLowerCase();
      }
    }
    if (!ext && e.type) {
      // Map common mime types to typical file extensions.
      const mime = e.type.toLowerCase();
      const mimeMap: Record<string, string> = {
        'audio/mpeg': 'mp3',
        'audio/opus': 'opus',
        'audio/aac': 'aac',
        'audio/ogg': 'ogg',
        'audio/wav': 'wav',
        'video/mp4': 'mp4',
        'video/quicktime': 'mov',
        'video/x-matroska': 'mkv',
        'application/x-mpegurl': 'm3u8',
      };
      ext = mimeMap[mime];
    }
    if (ext) {
      labeled.fileExtension = ext;
    }

    return labeled;
  });
}
