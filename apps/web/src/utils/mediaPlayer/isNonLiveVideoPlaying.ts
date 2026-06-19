import {
  type DTOItem,
  type EnclosureSelectedParams,
  getSelectedLabeledItemEnclosureAndSource,
  type LabeledItemEnclosure,
  MediumEnum,
} from '@podverse/helpers';

import type { MediaPlayerAddByRSSState } from '../../contexts/MediaPlayer';

export function isNonLiveVideoPlaying(params: {
  mpItem: DTOItem | null;
  mpAddByRSS: MediaPlayerAddByRSSState;
  mpItemLabeledItemEnclosures: LabeledItemEnclosure[];
  mpEnclosureSelectedParams: EnclosureSelectedParams;
}): boolean {
  const { mpItem, mpAddByRSS, mpItemLabeledItemEnclosures, mpEnclosureSelectedParams } = params;

  const selectedItemEnclosureAndSource =
    mpItemLabeledItemEnclosures.length > 0
      ? getSelectedLabeledItemEnclosureAndSource({
          labeledItemEnclosures: mpItemLabeledItemEnclosures,
          type: mpEnclosureSelectedParams.type,
          enclosureRowIndex: mpEnclosureSelectedParams.enclosureRowSelected,
          sourceRowIndex: mpEnclosureSelectedParams.sourceRowSelected,
        })
      : null;

  const addByRSSSelectedMediaType =
    mpAddByRSS && mpItemLabeledItemEnclosures.length > 0
      ? (selectedItemEnclosureAndSource?.labeledItemEnclosure?.mediaType ?? null)
      : null;

  const isAddByRSSVideo = mpAddByRSS
    ? addByRSSSelectedMediaType
      ? addByRSSSelectedMediaType === 'video'
      : mpAddByRSS.resourceData.medium_id === MediumEnum.Video
    : false;

  const isVideoFile = selectedItemEnclosureAndSource?.labeledItemEnclosure?.mediaType === 'video';
  const isLiveItem = mpItem?.live_item !== null && mpItem?.live_item !== undefined;

  if (mpAddByRSS && isAddByRSSVideo) {
    return true;
  }

  if (mpItem !== null && !isLiveItem && isVideoFile) {
    return true;
  }

  return false;
}
