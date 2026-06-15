import type { EnclosureSelectedParams, LabeledItemEnclosure } from '@podverse/helpers';

import type { EmbedMediaType } from './embedTypes';

const DEFAULT_SELECTION: EnclosureSelectedParams = {
  type: 'default',
  enclosureRowSelected: null,
  sourceRowSelected: null,
};

/**
 * A sensible quality ceiling derived from the viewer's connection. `audioMaxKbps`
 * targets a reasonable mp3 encoding rate (not the highest available); `videoMaxHeight`
 * caps the video resolution.
 */
export type EmbedConnectionQualityTarget = {
  audioMaxKbps: number;
  videoMaxHeight: number;
};

export type EmbedBestFitOptions = {
  // When provided, selection is narrowed within the chosen media type toward a
  // sensible file size for the viewer's connection. Omit for the simple
  // "first enclosure of the preferred media type" pick.
  connectionTarget?: EmbedConnectionQualityTarget;
};

/**
 * "Best fit" default enclosure selection for an embed.
 *
 * A video embed prefers a video enclosure and falls back to audio; an audio embed
 * prefers audio and falls back to video. Within the resolved media type, when a
 * `connectionTarget` is supplied and the feed offers multiple encodings, the file
 * whose bitrate/resolution best fits the target is chosen (highest quality at or
 * below the ceiling; the smallest available when everything exceeds it). The user
 * can still override via the alternate enclosure modal.
 *
 * This is the single, intentional place where future per-user preference overrides
 * (e.g. "always prefer ogg", "force 1080p") should expand: adjust the candidate
 * scoring here rather than adding preference branching at call sites.
 */
export function resolveEmbedBestFitEnclosureSelectedParams(
  labeledItemEnclosures: LabeledItemEnclosure[],
  embedMediaType: EmbedMediaType,
  options: EmbedBestFitOptions = {}
): EnclosureSelectedParams {
  if (labeledItemEnclosures.length === 0) {
    return DEFAULT_SELECTION;
  }

  const preferenceOrder: Array<'audio' | 'video'> =
    embedMediaType === 'video' ? ['video', 'audio'] : ['audio', 'video'];

  for (const mediaType of preferenceOrder) {
    const candidates = labeledItemEnclosures.filter((entry) => entry.mediaType === mediaType);
    if (candidates.length === 0) {
      continue;
    }

    const enclosureRowSelected =
      mediaType === 'audio'
        ? pickBestFitWithinType(
            candidates,
            getAudioKbps,
            options.connectionTarget?.audioMaxKbps,
            true
          )
        : pickBestFitWithinType(
            candidates,
            getVideoHeight,
            options.connectionTarget?.videoMaxHeight,
            false
          );

    return {
      type: mediaType,
      enclosureRowSelected,
      sourceRowSelected: 0,
    };
  }

  return DEFAULT_SELECTION;
}

function getAudioKbps(entry: LabeledItemEnclosure): number | null {
  const bitrate = entry.enclosure.bitrate;
  if (bitrate === null || bitrate === undefined || bitrate <= 0) {
    return null;
  }
  // Enclosure bitrate is stored in bits per second (see formatBitrate).
  return bitrate / 1000;
}

function getVideoHeight(entry: LabeledItemEnclosure): number | null {
  const height = entry.enclosure.height;
  if (height === null || height === undefined || height <= 0) {
    return null;
  }
  return height;
}

function isMp3(entry: LabeledItemEnclosure): boolean {
  return entry.fileExtension === 'mp3' || entry.enclosure.type === 'audio/mpeg';
}

type ScoredCandidate = {
  index: number;
  value: number;
  entry: LabeledItemEnclosure;
};

/**
 * Returns the index (within the same-media-type subset) of the enclosure that best
 * fits the ceiling. With no ceiling, no comparable metadata, or a single candidate,
 * the first enclosure is kept so behavior matches the pre-size-aware default.
 */
function pickBestFitWithinType(
  candidates: LabeledItemEnclosure[],
  getValue: (entry: LabeledItemEnclosure) => number | null,
  ceiling: number | undefined,
  preferMp3: boolean
): number {
  if (candidates.length <= 1 || ceiling === undefined) {
    return 0;
  }

  const scored: ScoredCandidate[] = candidates
    .map((entry, index) => ({ index, value: getValue(entry), entry }))
    .filter((candidate): candidate is ScoredCandidate => candidate.value !== null);

  if (scored.length === 0) {
    return 0;
  }

  const withinBudget = scored.filter((candidate) => candidate.value <= ceiling);
  // Within budget: take the highest quality that fits. Over budget everywhere: take
  // the smallest file so a constrained connection still gets the lightest option.
  const pool = withinBudget.length > 0 ? withinBudget : scored;
  const preferHigher = withinBudget.length > 0;

  const first = pool[0];
  if (first === undefined) {
    return 0;
  }
  let best = first;
  for (const candidate of pool) {
    if (candidate.value === best.value) {
      if (preferMp3 && isMp3(candidate.entry) && !isMp3(best.entry)) {
        best = candidate;
      }
      continue;
    }

    const isBetter = preferHigher ? candidate.value > best.value : candidate.value < best.value;
    if (isBetter) {
      best = candidate;
    }
  }

  return best.index;
}
