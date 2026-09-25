import type { DTOItemEnclosure, LabeledItemEnclosure } from '@podverse/helpers';
import {
  buildLabeledItemEnclosures,
  labeledItemEnclosuresForDirectDownload,
  pickDefaultDirectDownloadSource,
} from '@podverse/helpers';

import type { ModalSourceSelector } from '../../contexts/Modals';
import { startProgressiveDownload } from './startProgressiveDownload';

type DirectDownloadMessages = {
  loading: string;
  success: string;
  error: string;
};

type BeginDirectDownloadParams = {
  enclosures: DTOItemEnclosure[];
  actionType: 'download-episode' | 'download-track';
  itemTitle: string | null;
  fallbackFilename: string;
  setModalSourceSelector: (val: ModalSourceSelector) => void;
  showToastPromiseWithLoading: (
    promise: Promise<void>,
    messages: DirectDownloadMessages
  ) => void;
  downloadAndSaveFile: (url: string, filename: string) => Promise<void>;
  messages: DirectDownloadMessages;
  onIneligible: () => void;
};

function directDownloadSourceCount(labeledItemEnclosures: LabeledItemEnclosure[]): number {
  return labeledItemEnclosures.reduce(
    (count, labeled) => count + labeled.enclosure.item_enclosure_sources.length,
    0
  );
}

/**
 * Downloads the only progressive file, or opens the source modal when more than one can be saved.
 * HLS playlists and other ineligible sources are left out of that choice.
 */
export function beginDirectDownload({
  enclosures,
  actionType,
  itemTitle,
  fallbackFilename,
  setModalSourceSelector,
  showToastPromiseWithLoading,
  downloadAndSaveFile,
  messages,
  onIneligible,
}: BeginDirectDownloadParams): void {
  const labeledItemEnclosures = buildLabeledItemEnclosures(enclosures);
  const downloadable = labeledItemEnclosuresForDirectDownload(labeledItemEnclosures);
  const sourceCount = directDownloadSourceCount(downloadable);

  if (sourceCount === 0) {
    onIneligible();
    return;
  }

  if (sourceCount > 1) {
    setModalSourceSelector({
      labeledItemEnclosures: downloadable,
      actionType,
      itemTitle,
    });
    return;
  }

  const selected = pickDefaultDirectDownloadSource(downloadable);
  if (selected === null) {
    onIneligible();
    return;
  }

  const resolution = startProgressiveDownload({
    uri: selected.uri,
    mime: selected.mime,
    itemTitle,
    fallbackFilename,
    downloadAndSaveFile,
    showToastPromiseWithLoading,
    messages,
  });
  if (!resolution.ok && resolution.reason !== 'missing_uri') {
    onIneligible();
  }
}
