import type { DTOItemEnclosure, DTOItemEnclosureIntegrity } from '@podverse/helpers';

import { showToast } from '../../components/Toast/Toast';
import type { ModalSourceSelector } from '../../contexts/Modals';
import type { AddByRSSItemIndexItem } from '../addByRSS/types';
import { beginDirectDownload } from './beginDirectDownload';

type AddByRSSBundleEnclosure = AddByRSSItemIndexItem['bundle']['enclosures'][number];

function toDTOIntegrity(
  integrity: AddByRSSBundleEnclosure['item_enclosure_integrity'],
  enclosureId: number
): DTOItemEnclosureIntegrity | null {
  if (!integrity) {
    return null;
  }

  return {
    id: enclosureId,
    item_enclosure_id: enclosureId,
    type: integrity.type,
    value: integrity.value,
  };
}

function compatEnclosuresToDTOLike(enclosures: AddByRSSBundleEnclosure[]): DTOItemEnclosure[] {
  return enclosures.map((e, idx) => ({
    id: idx,
    item_id: 0,
    type: e.item_enclosure.type,
    length: e.item_enclosure.length ?? undefined,
    bitrate: e.item_enclosure.bitrate ?? undefined,
    height: e.item_enclosure.height ?? undefined,
    language: e.item_enclosure.language ?? undefined,
    title: e.item_enclosure.title ?? undefined,
    rel: e.item_enclosure.rel ?? undefined,
    codecs: e.item_enclosure.codecs ?? undefined,
    item_enclosure_default: e.item_enclosure.item_enclosure_default,
    item_enclosure_integrity: toDTOIntegrity(e.item_enclosure_integrity, idx),
    item_enclosure_sources: e.item_enclosure_sources.map((source, sourceIndex) => ({
      id: sourceIndex,
      item_enclosure_id: idx,
      uri: source.uri,
      content_type: source.content_type,
    })),
  }));
}

type DownloadAddByRSSMediaParams = {
  indexItem: AddByRSSItemIndexItem;
  setModalSourceSelector: (val: ModalSourceSelector) => void;
  showToastPromiseWithLoading: (
    promise: Promise<void>,
    messages: { loading: string; success: string; error: string }
  ) => void;
  downloadAndSaveFile: (url: string, filename: string) => Promise<void>;
  tFeatures: (key: string) => string;
  variant: 'episode' | 'track';
};

export function downloadAddByRSSMediaWithModal({
  indexItem,
  setModalSourceSelector,
  showToastPromiseWithLoading,
  downloadAndSaveFile,
  tFeatures,
  variant,
}: DownloadAddByRSSMediaParams): void {
  const enclosures = indexItem?.bundle?.enclosures;
  if (!enclosures || enclosures.length === 0) {
    return;
  }

  const itemTitle = indexItem?.bundle?.item?.title ?? (variant === 'episode' ? 'episode' : 'track');
  const errorKey =
    variant === 'episode' ? 'download.episode_download_error' : 'download.track_download_error';

  beginDirectDownload({
    enclosures: compatEnclosuresToDTOLike(enclosures),
    actionType: variant === 'episode' ? 'download-episode' : 'download-track',
    itemTitle: itemTitle || null,
    fallbackFilename: variant === 'episode' ? 'episode.mp3' : 'track.mp3',
    setModalSourceSelector,
    showToastPromiseWithLoading,
    downloadAndSaveFile,
    messages: {
      loading: tFeatures(
        variant === 'episode' ? 'download.downloading_episode' : 'download.downloading_track'
      ),
      success: tFeatures(
        variant === 'episode' ? 'download.episode_downloaded' : 'download.track_downloaded'
      ),
      error: tFeatures(errorKey),
    },
    onIneligible: () => {
      showToast(tFeatures(errorKey), 'error');
    },
  });
}
