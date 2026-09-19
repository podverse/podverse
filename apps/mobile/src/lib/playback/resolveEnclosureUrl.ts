import type { DTOItem } from '@podverse/helpers/dto';
import type {
  EnclosureSelectedParams,
  LabeledItemEnclosure,
  MediaTypePreference,
} from '@podverse/helpers/item/itemEnclosure';
import {
  buildLabeledItemEnclosures,
  getSelectedLabeledItemEnclosureAndSource,
  resolvePreferredMediaTypeEnclosureSelectedParams,
} from '@podverse/helpers/item/itemEnclosure';

import { resolveE2eMediaUrl } from '../e2e/resolveE2eMediaUrl';

export const DEFAULT_ENCLOSURE_SELECTED_PARAMS: EnclosureSelectedParams = {
  enclosureRowSelected: null,
  sourceRowSelected: null,
  type: 'default',
};

export const isFreshEnclosureSelectedParams = (params: EnclosureSelectedParams): boolean => {
  return (
    params.type === 'default' &&
    params.enclosureRowSelected === null &&
    params.sourceRowSelected === null
  );
};

export const resolveSessionEnclosureSelectedParams = (params: {
  current: EnclosureSelectedParams;
  labeledItemEnclosures: LabeledItemEnclosure[];
  preferredMediaType: MediaTypePreference;
}): EnclosureSelectedParams => {
  if (!isFreshEnclosureSelectedParams(params.current)) {
    return params.current;
  }
  if (params.labeledItemEnclosures.length === 0) {
    return params.current;
  }
  return resolvePreferredMediaTypeEnclosureSelectedParams(
    params.labeledItemEnclosures,
    params.preferredMediaType
  );
};

export const resolveItemEnclosureUrl = (params: {
  labeledItemEnclosures: LabeledItemEnclosure[];
  selectedParams: EnclosureSelectedParams;
}): string | null => {
  const selected = getSelectedLabeledItemEnclosureAndSource({
    enclosureRowIndex: params.selectedParams.enclosureRowSelected,
    labeledItemEnclosures: params.labeledItemEnclosures,
    sourceRowIndex: params.selectedParams.sourceRowSelected,
    type: params.selectedParams.type,
  });
  const uri = selected.source?.uri?.trim();
  if (uri === undefined || uri.length === 0) {
    return null;
  }
  return resolveE2eMediaUrl(uri);
};

export const resolveSelectedItemEnclosureMediaType = (params: {
  labeledItemEnclosures: LabeledItemEnclosure[];
  selectedParams: EnclosureSelectedParams;
}): 'audio' | 'video' | null => {
  const selected = getSelectedLabeledItemEnclosureAndSource({
    enclosureRowIndex: params.selectedParams.enclosureRowSelected,
    labeledItemEnclosures: params.labeledItemEnclosures,
    sourceRowIndex: params.selectedParams.sourceRowSelected,
    type: params.selectedParams.type,
  });
  return selected.labeledItemEnclosure?.mediaType ?? null;
};

export const buildItemLabeledEnclosures = (item: DTOItem): LabeledItemEnclosure[] => {
  return buildLabeledItemEnclosures(item.item_enclosures ?? []);
};
