import type { DTOItem } from '@podverse/helpers';
import {
  buildLabeledItemEnclosures,
  getDownloadFilenameFromSource,
  getSelectedLabeledItemEnclosureAndSource,
} from '@podverse/helpers';

import type { ModalSourceSelector } from '../../contexts/Modals';

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
    if (selected?.source?.uri) {
      const filename = getDownloadFilenameFromSource({
        itemTitle: item.title,
        sourceUri: selected.source.uri,
        fallbackFilename: 'episode.mp3',
      });
      showToastPromiseWithLoading(downloadAndSaveFile(selected.source.uri, filename), {
        loading: tFeatures('download.downloading_episode'),
        success: tFeatures('download.episode_downloaded'),
        error: tFeatures('download.episode_download_error'),
      });
    }
  }
};
