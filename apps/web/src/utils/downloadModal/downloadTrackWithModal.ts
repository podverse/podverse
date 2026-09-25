import type { DTOItem } from '@podverse/helpers';
import {
  buildLabeledItemEnclosures,
  getSelectedLabeledItemEnclosureAndSource,
} from '@podverse/helpers';

import { showToast } from '../../components/Toast/Toast';
import type { ModalSourceSelector } from '../../contexts/Modals';
import { startProgressiveDownload } from './startProgressiveDownload';

type DownloadTrackWithModalParams = {
  item: DTOItem;
  setModalSourceSelector: (val: ModalSourceSelector) => void;
  showToastPromiseWithLoading: (
    promise: Promise<void>,
    messages: {
      loading: string;
      success: string;
      error: string;
    }
  ) => void;
  downloadAndSaveFile: (url: string, filename: string) => Promise<void>;
  tFeatures: (key: string) => string;
};

export const downloadTrackWithModal = async ({
  item,
  setModalSourceSelector,
  showToastPromiseWithLoading,
  downloadAndSaveFile,
  tFeatures,
}: DownloadTrackWithModalParams) => {
  const labeledItemEnclosures = buildLabeledItemEnclosures(item.item_enclosures);
  const hasMultipleEnclosures = labeledItemEnclosures && labeledItemEnclosures.length > 1;

  if (hasMultipleEnclosures) {
    setModalSourceSelector({
      labeledItemEnclosures: labeledItemEnclosures,
      actionType: 'download-track',
      itemTitle: item.title || null,
    });
    return;
  } else {
    const selected = getSelectedLabeledItemEnclosureAndSource({
      labeledItemEnclosures: labeledItemEnclosures,
      type: 'default',
      enclosureRowIndex: null,
      sourceRowIndex: null,
    });
    const resolution = startProgressiveDownload({
      uri: selected?.source?.uri,
      mime: selected?.labeledItemEnclosure?.enclosure.type,
      itemTitle: item.title || null,
      fallbackFilename: 'track.mp3',
      downloadAndSaveFile,
      showToastPromiseWithLoading,
      messages: {
        loading: tFeatures('download.downloading_track'),
        success: tFeatures('download.track_downloaded'),
        error: tFeatures('download.track_download_error'),
      },
    });
    if (!resolution.ok && resolution.reason === 'hls_playlist') {
      showToast(tFeatures('download.track_download_error'), 'error');
    }
  }
};
