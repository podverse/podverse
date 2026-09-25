import type { DTOItem } from '@podverse/helpers';

import { showToast } from '../../components/Toast/Toast';
import type { ModalSourceSelector } from '../../contexts/Modals';
import { beginDirectDownload } from './beginDirectDownload';

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
  beginDirectDownload({
    enclosures: item.item_enclosures ?? [],
    actionType: 'download-track',
    itemTitle: item.title || null,
    fallbackFilename: 'track.mp3',
    setModalSourceSelector,
    showToastPromiseWithLoading,
    downloadAndSaveFile,
    messages: {
      loading: tFeatures('download.downloading_track'),
      success: tFeatures('download.track_downloaded'),
      error: tFeatures('download.track_download_error'),
    },
    onIneligible: () => {
      showToast(tFeatures('download.track_download_error'), 'error');
    },
  });
};
