import type { DTOItem } from '@podverse/helpers/dto';
import type { LabeledItemEnclosure } from '@podverse/helpers/item/itemEnclosure';
import { buildLabeledItemEnclosures } from '@podverse/helpers/item/itemEnclosure';

import type { DownloadMediaType } from './downloadTypes';

/**
 * Why an item cannot be downloaded for offline play:
 * - `livestream`   — the item is a Podcasting 2.0 live item (`item.live_item` set); it streams, it
 *                    is not a fixed file.
 * - `hls_playlist` — the only usable enclosure(s) point at an HLS/m3u8 playlist, which is a
 *                    manifest of segments, not a single progressive file we can store and replay.
 * - `no_enclosure` — no enclosure with a usable source URI.
 */
export type DownloadIneligibleReason = 'livestream' | 'hls_playlist' | 'no_enclosure';

/** The selected progressive source to fetch when an item is downloadable. */
export interface DownloadSourceSelection {
  uri: string;
  mime: string | null;
  mediaType: DownloadMediaType;
  fileExtension: string | null;
}

export type DownloadEligibility =
  { ok: true; source: DownloadSourceSelection } | { ok: false; reason: DownloadIneligibleReason };

const HLS_MIME_TYPES = new Set([
  'application/x-mpegurl',
  'application/vnd.apple.mpegurl',
  'audio/x-mpegurl',
  'audio/mpegurl',
]);

/** True when a URI/MIME describes an HLS playlist (streamed), not a downloadable progressive file. */
export const isHlsSource = (uri: string, mime: string | null): boolean => {
  const pathOnly = uri.split(/[?#]/)[0]?.toLowerCase() ?? '';
  if (pathOnly.endsWith('.m3u8')) {
    return true;
  }
  return mime !== null && HLS_MIME_TYPES.has(mime.toLowerCase());
};

type ProgressiveCandidate = {
  labeled: LabeledItemEnclosure;
  uri: string;
  mime: string | null;
};

const toCandidate = (labeled: LabeledItemEnclosure): ProgressiveCandidate | null => {
  const uri = labeled.enclosure.item_enclosure_sources[0]?.uri?.trim();
  if (uri === undefined || uri === '') {
    return null;
  }
  return { labeled, uri, mime: labeled.enclosure.type ?? null };
};

/**
 * Decide whether an item can be downloaded for offline playback and, if so, which progressive
 * source to fetch. Rejects livestreams and HLS-only items, and prefers an audio source (matching
 * mobile audio-first playback) among progressive candidates. Pure and unit-tested — screens and the
 * download manager call this before creating a downloads row (see mobile-only-features §1.1–1.2).
 */
export const isItemDownloadable = (item: DTOItem): DownloadEligibility => {
  if (item.live_item !== null && item.live_item !== undefined) {
    return { ok: false, reason: 'livestream' };
  }

  const enclosures = item.item_enclosures ?? [];
  if (enclosures.length === 0) {
    return { ok: false, reason: 'no_enclosure' };
  }

  const candidates = buildLabeledItemEnclosures(enclosures)
    .map(toCandidate)
    .filter((candidate): candidate is ProgressiveCandidate => candidate !== null);

  if (candidates.length === 0) {
    return { ok: false, reason: 'no_enclosure' };
  }

  const progressive = candidates.filter((candidate) => !isHlsSource(candidate.uri, candidate.mime));
  if (progressive.length === 0) {
    return { ok: false, reason: 'hls_playlist' };
  }

  // Prefer audio (mobile plays audio-first); labeled entries are already default-first ordered.
  const chosen =
    progressive.find((candidate) => candidate.labeled.mediaType === 'audio') ?? progressive[0];

  if (chosen === undefined) {
    return { ok: false, reason: 'no_enclosure' };
  }

  return {
    ok: true,
    source: {
      uri: chosen.uri,
      mime: chosen.mime,
      mediaType: chosen.labeled.mediaType,
      fileExtension: chosen.labeled.fileExtension ?? null,
    },
  };
};
