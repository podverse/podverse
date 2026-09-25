import type { DTOItem } from '@podverse/helpers';

import { showToast } from '../../components/Toast/Toast';
import type { ModalSourceSelector } from '../../contexts/Modals';
import { beginDirectDownload } from './beginDirectDownload';

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
  beginDirectDownload({
    enclosures: item.item_enclosures ?? [],
    actionType: 'download-episode',
    itemTitle: item.title || null,
    fallbackFilename: 'episode.mp3',
    setModalSourceSelector,
    showToastPromiseWithLoading,
    downloadAndSaveFile,
    messages: {
      loading: tFeatures('download.downloading_episode'),
      success: tFeatures('download.episode_downloaded'),
      error: tFeatures('download.episode_download_error'),
    },
    onIneligible: () => {
      showToast(tFeatures('download.episode_download_error'), 'error');
    },
  });
};
