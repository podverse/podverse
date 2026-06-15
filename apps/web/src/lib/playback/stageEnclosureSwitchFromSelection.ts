import type {
  DTOClip,
  DTOItemChapter,
  DTOItemSoundbite,
  EnclosureSelectedParams,
  LabeledItemEnclosure,
} from '@podverse/helpers';
import { getSelectedLabeledItemEnclosureAndSource } from '@podverse/helpers';

import type { PlaybackLoadDecision } from './resolvePlaybackLoadDecision';
import { resolveEnclosureSwitchPlaybackDecision } from './resolveEnclosureSwitchPlaybackDecision';

export type StageEnclosureSwitchFromSelectionParams = {
  labeledItemEnclosures: LabeledItemEnclosure[];
  currentEnclosureSelectedParams: EnclosureSelectedParams;
  nextEnclosureSelectedParams: EnclosureSelectedParams;
  resumeAtSeconds: number;
  mpClip: DTOClip | null;
  mpItemSoundbite: DTOItemSoundbite | null;
  mpItemChapter: DTOItemChapter | null;
};

function enclosureSelectionKey(params: EnclosureSelectedParams): string {
  return `${params.type}:${params.enclosureRowSelected}:${params.sourceRowSelected}`;
}

export function isDifferentEnclosureSelection(
  current: EnclosureSelectedParams,
  next: EnclosureSelectedParams
): boolean {
  return enclosureSelectionKey(current) !== enclosureSelectionKey(next);
}

export function buildEnclosureSwitchPlaybackDecisionIfChanged(
  params: StageEnclosureSwitchFromSelectionParams
): PlaybackLoadDecision | null {
  if (
    !isDifferentEnclosureSelection(
      params.currentEnclosureSelectedParams,
      params.nextEnclosureSelectedParams
    )
  ) {
    return null;
  }

  const currentSelected = getSelectedLabeledItemEnclosureAndSource({
    labeledItemEnclosures: params.labeledItemEnclosures,
    type: params.currentEnclosureSelectedParams.type,
    enclosureRowIndex: params.currentEnclosureSelectedParams.enclosureRowSelected,
    sourceRowIndex: params.currentEnclosureSelectedParams.sourceRowSelected,
  });
  const nextSelected = getSelectedLabeledItemEnclosureAndSource({
    labeledItemEnclosures: params.labeledItemEnclosures,
    type: params.nextEnclosureSelectedParams.type,
    enclosureRowIndex: params.nextEnclosureSelectedParams.enclosureRowSelected,
    sourceRowIndex: params.nextEnclosureSelectedParams.sourceRowSelected,
  });

  const currentUri = currentSelected?.source?.uri ?? '';
  const nextUri = nextSelected?.source?.uri ?? '';
  if (currentUri !== '' && currentUri === nextUri) {
    return null;
  }

  return resolveEnclosureSwitchPlaybackDecision({
    resumeAtSeconds: params.resumeAtSeconds,
    mpClip: params.mpClip,
    mpItemSoundbite: params.mpItemSoundbite,
    mpItemChapter: params.mpItemChapter,
  });
}
