import type { DTOItem } from '@podverse/helpers';
import {
  buildLabeledItemEnclosures,
  getSelectedLabeledItemEnclosureAndSource,
} from '@podverse/helpers';

import { showToast } from '../../components/Toast/Toast';
import type { ModalSourceSelector } from '../../contexts/Modals';
import { startProgressiveDownload } from './startProgressiveDownload';

type DownloadEpisodeWithModalParams = {
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

export const downloadEpisodeWithModal = async ({
  item,
  setModalSourceSelector,
  showToastPromiseWithLoading,
  downloadAndSaveFile,
  tFeatures,
}: DownloadEpisodeWithModalParams) => {
  const labeledItemEnclosures = buildLabeledItemEnclosures(item.item_enclosures);
  const hasMultipleEnclosures = labeledItemEnclosures && labeledItemEnclosures.length > 1;

  if (hasMultipleEnclosures) {
    setModalSourceSelector({
      labeledItemEnclosures: labeledItemEnclosures,
      actionType: 'download-episode',
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
      fallbackFilename: 'episode.mp3',
      downloadAndSaveFile,
      showToastPromiseWithLoading,
      messages: {
        loading: tFeatures('download.downloading_episode'),
        success: tFeatures('download.episode_downloaded'),
        error: tFeatures('download.episode_download_error'),
      },
    });
    if (!resolution.ok && resolution.reason === 'hls_playlist') {
      showToast(tFeatures('download.episode_download_error'), 'error');
    }
  }
};
