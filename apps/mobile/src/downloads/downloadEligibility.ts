import type { DTOItem } from '@podverse/helpers/dto';
import type {
  EnclosureSelectedParams,
  LabeledItemEnclosure,
} from '@podverse/helpers/item/itemEnclosure';
import {
  buildLabeledItemEnclosures,
  getSelectedLabeledItemEnclosureAndSource,
} from '@podverse/helpers/item/itemEnclosure';
import { isHlsSource } from '@podverse/helpers/item/mediaSourceClassification';

import type { DownloadMediaType } from './downloadTypes';

export { isHlsSource };

/**
 * Why an item cannot be downloaded for offline play:
 * - `livestream`   — the item is a Podcasting 2.0 live item (`item.live_item` set); it streams, it
 *                    is not a fixed file.
 * - `hls_playlist` — the only usable enclosure(s) point at an HLS playlist, which is a
 *                    manifest of segments, not a single progressive file we can store and replay.
 * - `no_enclosure` — no enclosure with a usable source URI.
 * - `offline_mode` — Offline Mode is on; the download manager rejects new transfers (not decided
 *                    by `isItemDownloadable`).
 */
export type DownloadIneligibleReason =
  'livestream' | 'hls_playlist' | 'no_enclosure' | 'offline_mode';

/** The selected progressive source to fetch when an item is downloadable. */
export interface DownloadSourceSelection {
  uri: string;
  mime: string | null;
  mediaType: DownloadMediaType;
  fileExtension: string | null;
}

export type DownloadEligibility =
  { ok: true; source: DownloadSourceSelection } | { ok: false; reason: DownloadIneligibleReason };

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

const candidateFromExplicitSelection = (
  labeledEnclosures: LabeledItemEnclosure[],
  selectedParams: EnclosureSelectedParams
): ProgressiveCandidate | null => {
  const selected = getSelectedLabeledItemEnclosureAndSource({
    enclosureRowIndex: selectedParams.enclosureRowSelected,
    labeledItemEnclosures: labeledEnclosures,
    sourceRowIndex: selectedParams.sourceRowSelected,
    type: selectedParams.type,
  });
  const uri = selected.source?.uri?.trim();
  if (uri === undefined || uri === '' || selected.labeledItemEnclosure === null) {
    return null;
  }
  return {
    labeled: selected.labeledItemEnclosure,
    mime: selected.labeledItemEnclosure.enclosure.type ?? null,
    uri,
  };
};

/**
 * Decide whether an item can be downloaded for offline playback and, if so, which progressive
 * source to fetch. Rejects livestreams and HLS-only items. An explicit enclosure selection wins
 * when it resolves to a progressive source; otherwise the default path prefers audio among
 * progressive candidates. Pure and unit-tested — screens and the download manager call this before
 * creating a downloads row (see mobile-only-features §1.1–1.2).
 */
export const isItemDownloadable = (
  item: DTOItem,
  selectedParams?: EnclosureSelectedParams | null
): DownloadEligibility => {
  if (item.live_item !== null && item.live_item !== undefined) {
    return { ok: false, reason: 'livestream' };
  }

  const enclosures = item.item_enclosures ?? [];
  if (enclosures.length === 0) {
    return { ok: false, reason: 'no_enclosure' };
  }

  const labeledEnclosures = buildLabeledItemEnclosures(enclosures);
  const candidates = labeledEnclosures
    .map(toCandidate)
    .filter((candidate): candidate is ProgressiveCandidate => candidate !== null);

  if (candidates.length === 0) {
    return { ok: false, reason: 'no_enclosure' };
  }

  const progressive = candidates.filter((candidate) => !isHlsSource(candidate.uri, candidate.mime));
  if (progressive.length === 0) {
    return { ok: false, reason: 'hls_playlist' };
  }

  // Explicit source selection takes precedence when it points to a progressive file.
  if (selectedParams !== undefined && selectedParams !== null) {
    const explicit = candidateFromExplicitSelection(labeledEnclosures, selectedParams);
    if (explicit !== null) {
      if (isHlsSource(explicit.uri, explicit.mime)) {
        return { ok: false, reason: 'hls_playlist' };
      }
      return {
        ok: true,
        source: {
          fileExtension: explicit.labeled.fileExtension ?? null,
          mediaType: explicit.labeled.mediaType,
          mime: explicit.mime,
          uri: explicit.uri,
        },
      };
    }
  }

  // Prefer audio by default; labeled entries are already default-first ordered.
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
