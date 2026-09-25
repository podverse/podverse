import type { DTOItem } from '@podverse/helpers/dto';
import type {
  EnclosureSelectedParams,
  LabeledItemEnclosure,
} from '@podverse/helpers/item/itemEnclosure';
import {
  buildLabeledItemEnclosures,
  getSelectedLabeledItemEnclosureAndSource,
  labeledItemEnclosuresForDirectDownload,
} from '@podverse/helpers/item/itemEnclosure';
import {
  isHlsSource,
  isProgressiveDownloadUri,
} from '@podverse/helpers/item/mediaSourceClassification';

import type { DownloadMediaType } from './downloadTypes';

export { isHlsSource };

/**
 * Why an item cannot be downloaded for offline play:
 * - `livestream`   — the item is a Podcasting 2.0 live item (`item.live_item` set); it streams, it
 *                    is not a fixed file.
 * - `hls_playlist` — the only usable enclosure(s) point at an HLS playlist, which is a
 *                    manifest of segments, not a single progressive file we can store and replay.
 * - `no_enclosure` — no enclosure with a usable source URI.
 * - `unsupported_source` — the enclosure is not an `http`/`https` URI, or it is an obvious
 *                    non-media document. A missing MIME type stays eligible.
 * - `offline_mode` — Offline Mode is on; the download manager rejects new transfers (not decided
 *                    by `isItemDownloadable`).
 */
export type DownloadIneligibleReason =
  'livestream' | 'hls_playlist' | 'no_enclosure' | 'unsupported_source' | 'offline_mode';

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

/** `null` when this progressive URI can be saved. HLS is reported separately from other rejects. */
const progressiveDownloadBlock = (
  uri: string,
  mime: string | null
): 'hls_playlist' | 'unsupported_source' | null => {
  if (isProgressiveDownloadUri(uri, mime)) {
    return null;
  }
  if (isHlsSource(uri, mime)) {
    return 'hls_playlist';
  }
  return 'unsupported_source';
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
 * source to fetch. Rejects livestreams, HLS-only items, non-http(s) URIs, and obvious non-media
 * documents. An explicit enclosure selection wins when it resolves to a saveable source; otherwise
 * the default path prefers audio among saveable candidates. Pure and unit-tested — screens, the
 * download manager, and the auto-download planner call this before creating a downloads row.
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
  const sourceEntries = labeledEnclosures.flatMap((labeled) => {
    const mime = labeled.enclosure.type ?? null;
    return (labeled.enclosure.item_enclosure_sources ?? [])
      .map((source) => source.uri?.trim() ?? '')
      .filter((uri) => uri !== '')
      .map((uri) => ({ uri, mime }));
  });

  const saveable = labeledItemEnclosuresForDirectDownload(labeledEnclosures);
  if (saveable.length === 0) {
    if (sourceEntries.length === 0) {
      return { ok: false, reason: 'no_enclosure' };
    }
    const onlyHls = sourceEntries.every((entry) => isHlsSource(entry.uri, entry.mime));
    return { ok: false, reason: onlyHls ? 'hls_playlist' : 'unsupported_source' };
  }

  // Explicit source selection takes precedence when it points to a saveable file.
  if (selectedParams !== undefined && selectedParams !== null) {
    const explicit = candidateFromExplicitSelection(labeledEnclosures, selectedParams);
    if (explicit !== null) {
      const block = progressiveDownloadBlock(explicit.uri, explicit.mime);
      if (block !== null) {
        return { ok: false, reason: block };
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
  const chosen = saveable.find((candidate) => candidate.mediaType === 'audio') ?? saveable[0];
  const uri = chosen?.enclosure.item_enclosure_sources[0]?.uri?.trim() ?? '';

  if (chosen === undefined || uri === '') {
    return { ok: false, reason: 'no_enclosure' };
  }

  return {
    ok: true,
    source: {
      uri,
      mime: chosen.enclosure.type ?? null,
      mediaType: chosen.mediaType,
      fileExtension: chosen.fileExtension ?? null,
    },
  };
};
