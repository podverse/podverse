import * as FileSystem from 'expo-file-system/legacy';

import type { DTOItem } from '@podverse/helpers/dto';
import type {
  EnclosureSelectedParams,
  LabeledItemEnclosure,
} from '@podverse/helpers/item/itemEnclosure';

import { downloadsRepository } from '../../data/repositories/downloadsRepository';
import type { DownloadRecord } from '../../downloads';
import { downloadManager } from '../../downloads/downloadManager';
import { resolveStoredDownloadFilePath } from '../../downloads/downloadStorage';
import { downloadStore } from '../../downloads/downloadStore';
import { isOfflineModeEnabled } from '../../prefs/offlineMode';
import { buildItemLabeledEnclosures, resolveItemEnclosureUrl } from './resolveEnclosureUrl';

/**
 * The URL the media engine should load.
 *
 * A local file wins. An episode kept only for that file plays it and does not fall back to the
 * remote enclosure, including while Offline Mode is off. Offline Mode also refuses the remote
 * enclosure for a server episode.
 */
export const playbackUrlForEpisode = (params: {
  localFileOnly: boolean;
  localUrl: string | null;
  offlineMode: boolean;
  remoteUrl: string | null;
}): string | null => {
  if (params.localUrl !== null) {
    return params.localUrl;
  }
  if (params.localFileOnly || params.offlineMode) {
    return null;
  }
  return params.remoteUrl;
};

/**
 * Resolve the URL the media engine should load for an item, preferring a completed local
 * download (`file://`, or a `content://` document) over the remote enclosure. Passed into the
 * same `podverse-media-engine` load path as remote playback — there is no second player.
 *
 * Only progressive files are ever downloaded (livestreams / HLS never have a download row — see
 * `downloadEligibility`), so this never returns a local URL for a live item; those keep the remote
 * enclosure path.
 *
 * A directory episode kept for its download, and an Add by RSS local episode, play the finished
 * file only. When that file is already gone, the download row and the local content row are
 * removed so the episode screen does not offer a re-download of an episode the server does not
 * list, and there is no remote enclosure.
 *
 * A server episode uses the local file when the download is complete. When the file is gone the
 * row is marked `failed` so the episode UI offers a re-download, and play falls back to the
 * remote enclosure unless Offline Mode is on. Returns `null` when there is no local file and no
 * usable remote source (callers keep their existing `media_player.no_media` notice).
 */
export async function resolvePlaybackUrl(
  item: DTOItem,
  selectedParams: EnclosureSelectedParams,
  labeledItemEnclosures?: LabeledItemEnclosure[]
): Promise<string | null> {
  const localFileOnly = await downloadsRepository.isLocalFileOnlyPlayback(item.id_text);
  const localUrl = await resolveLocalDownloadPlaybackUrl(item.id_text);
  if (localUrl === null && localFileOnly) {
    await downloadsRepository.remove(item.id_text);
    return null;
  }
  const offlineMode = isOfflineModeEnabled();
  const remoteUrl =
    localUrl !== null || offlineMode
      ? null
      : resolveItemEnclosureUrl({
          labeledItemEnclosures: labeledItemEnclosures ?? buildItemLabeledEnclosures(item),
          selectedParams,
        });
  return playbackUrlForEpisode({ localFileOnly, localUrl, offlineMode, remoteUrl });
}

/**
 * The local URL of a completed download that can still be opened, else `null`. A private file is
 * a `file://` path. A chosen-folder file is its `content://` document URI. A complete row whose
 * file is gone is marked failed so the UI offers a re-download. A thrown stat on a document URI
 * is not proof the document is gone, so that URI is returned and the row stays complete.
 */
export const resolveLocalDownloadPlaybackUrl = async (
  itemIdText: string
): Promise<string | null> => {
  let record: DownloadRecord | null;
  try {
    await downloadManager.hydrate();
    record = downloadStore.get(itemIdText);
  } catch {
    return null;
  }
  if (record === null || record.status !== 'complete' || record.filePath === null) {
    return null;
  }

  const documentDirectory = FileSystem.documentDirectory;
  if (documentDirectory === null) {
    return null;
  }
  const absolutePath = resolveStoredDownloadFilePath(record.filePath, documentDirectory);

  try {
    const info = await FileSystem.getInfoAsync(absolutePath);
    if (info.exists) {
      return absolutePath;
    }
  } catch {
    // A thrown stat on a document URI is not proof the document is gone.
    if (absolutePath.startsWith('content://')) {
      return absolutePath;
    }
    return null;
  }

  // The row says complete but the file is gone. Mark it failed so the episode screen offers a
  // re-download. Best-effort; a bookkeeping failure still returns null.
  try {
    await downloadManager.markFileMissing(itemIdText);
  } catch {
    // ignore bookkeeping failure
  }
  return null;
};
