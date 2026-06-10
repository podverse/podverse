import type { EnclosureSelectedParams, LabeledItemEnclosure } from '@podverse/helpers';

export function buildEmbedEnclosureSelectionParams(
  labeledItemEnclosures: LabeledItemEnclosure[],
  labeledItemEnclosure: LabeledItemEnclosure
): EnclosureSelectedParams {
  const mediaType = labeledItemEnclosure.mediaType;
  const type = mediaType === 'video' ? 'video' : 'audio';
  const enclosureRowSelected = labeledItemEnclosures
    .filter((entry) => entry.mediaType === mediaType)
    .indexOf(labeledItemEnclosure);

  return {
    type,
    enclosureRowSelected: enclosureRowSelected >= 0 ? enclosureRowSelected : 0,
    sourceRowSelected: 0,
  };
}
