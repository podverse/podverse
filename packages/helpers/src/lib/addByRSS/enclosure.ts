/**
 * Add-by-RSS enclosure helpers.
 * Map compat bundle enclosures (parser-mapping shape) to DTO enclosures and
 * reuse buildLabeledItemEnclosures for consistent labeling across apps.
 */

import type {
  DTOItemEnclosure,
  DTOItemEnclosureIntegrity,
  DTOItemEnclosureSource,
} from '../../dtos/index.js';
import type { EnclosureSelectedParams, LabeledItemEnclosure } from '../item/itemEnclosure.js';
import { buildLabeledItemEnclosures } from '../item/itemEnclosure.js';

type AddByRSSCompatEnclosure = {
  item_enclosure: {
    type?: string | null;
    length?: number | null;
    bitrate?: number | null;
    height?: number | null;
    language?: string | null;
    title?: string | null;
    rel?: string | null;
    codecs?: string | null;
    item_enclosure_default?: boolean;
  };
  item_enclosure_integrity: {
    type?: 'sri' | 'pgp-signature' | string;
    value?: string;
  } | null;
  item_enclosure_sources: Array<{
    uri?: string | null;
    content_type?: string | null;
  }>;
};

function toDTOIntegrity(
  integrity: AddByRSSCompatEnclosure['item_enclosure_integrity'],
  enclosureId: number
): DTOItemEnclosureIntegrity | null {
  if (!integrity || typeof integrity !== 'object') {
    return null;
  }
  const type = integrity.type;
  const value = integrity.value;
  if ((type !== 'sri' && type !== 'pgp-signature') || typeof value !== 'string') {
    return null;
  }
  return {
    id: enclosureId,
    item_enclosure_id: enclosureId,
    type,
    value,
  };
}

export function addByRSSBundleEnclosuresToDTO(
  enclosures: AddByRSSCompatEnclosure[]
): DTOItemEnclosure[] {
  return compatEnclosuresToDTO(enclosures);
}

function compatEnclosuresToDTO(enclosures: AddByRSSCompatEnclosure[]): DTOItemEnclosure[] {
  return enclosures.map((e, idx) => {
    const sources: DTOItemEnclosureSource[] = (e.item_enclosure_sources ?? []).map(
      (source, sourceIndex) => ({
        id: sourceIndex,
        item_enclosure_id: idx,
        uri: typeof source.uri === 'string' ? source.uri : '',
        content_type: source.content_type ?? null,
      })
    );
    return {
      id: idx,
      item_id: 0,
      type: typeof e.item_enclosure?.type === 'string' ? e.item_enclosure.type : '',
      length: e.item_enclosure?.length ?? null,
      bitrate: e.item_enclosure?.bitrate ?? null,
      height: e.item_enclosure?.height ?? null,
      language: e.item_enclosure?.language ?? null,
      title: e.item_enclosure?.title ?? null,
      rel: e.item_enclosure?.rel ?? null,
      codecs: e.item_enclosure?.codecs ?? null,
      item_enclosure_default: e.item_enclosure?.item_enclosure_default === true,
      item_enclosure_integrity: toDTOIntegrity(e.item_enclosure_integrity, idx),
      item_enclosure_sources: sources,
    };
  });
}

/**
 * Build LabeledItemEnclosure[] from add-by-RSS bundle enclosures (episodes and tracks).
 */
export function buildLabeledItemEnclosuresFromAddByRSSBundle(
  enclosures: AddByRSSCompatEnclosure[]
): LabeledItemEnclosure[] {
  if (!enclosures || enclosures.length === 0) {
    return [];
  }
  const dto = compatEnclosuresToDTO(enclosures);
  return buildLabeledItemEnclosures(dto);
}

/**
 * Default enclosure selection params for first enclosure, first source.
 * type is derived from first labeled enclosure mediaType so it matches the active controller.
 */
export function getDefaultEnclosureSelectedParams(
  labeled: LabeledItemEnclosure[]
): EnclosureSelectedParams {
  const first = labeled[0];
  const type =
    first?.mediaType === 'audio' || first?.mediaType === 'video' ? first.mediaType : 'default';
  return {
    type,
    enclosureRowSelected: 0,
    sourceRowSelected: 0,
  };
}
