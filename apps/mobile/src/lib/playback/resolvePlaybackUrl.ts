import * as FileSystem from 'expo-file-system';

import type { DTOItem } from '@podverse/helpers/dto';
import type {
  EnclosureSelectedParams,
  LabeledItemEnclosure,
} from '@podverse/helpers/item/itemEnclosure';

import type { DownloadRecord } from '../../downloads';
import { downloadManager } from '../../downloads/downloadManager';
import { downloadStore } from '../../downloads/downloadStore';
import { isOfflineModeEnabled } from '../../prefs/offlineMode';
import { buildItemLabeledEnclosures, resolveItemEnclosureUrl } from './resolveEnclosureUrl';

/**
 * Resolve the URL the media engine should load for an item, preferring a
 * completed **local download** (`file://`) over the remote enclosure. Passed into the same
 * `podverse-media-engine` load path as remote playback — there is no second player.
 *
 * Only progressive files are ever downloaded (livestreams / HLS never have a download row — see
 * `downloadEligibility`), so this never returns a local URL for a live item; those keep the remote
 * enclosure path.
 *
 * While Offline Mode is on, only a completed local file is returned — there is no remote
 * enclosure fallback.
 *
 * If a row is `complete` but its file is gone from disk (cache clear, OS eviction), the row is
 * marked `failed` so the episode UI offers a re-download, and this falls back to the remote
 * enclosure for the current play (unless Offline Mode is on). Returns `null` only when there is
 * neither a local file nor a usable remote source (callers keep their existing
 * `media_player.no_media` notice).
 */
export async function resolvePlaybackUrl(
  item: DTOItem,
  selectedParams: EnclosureSelectedParams,
  labeledItemEnclosures?: LabeledItemEnclosure[]
): Promise<string | null> {
  const localUrl = await resolveLocalDownloadUrl(item.id_text);
  if (localUrl !== null) {
    return localUrl;
  }
  if (isOfflineModeEnabled()) {
    return null;
  }
  const labeled = labeledItemEnclosures ?? buildItemLabeledEnclosures(item);
  return resolveItemEnclosureUrl({ labeledItemEnclosures: labeled, selectedParams });
}

const resolveLocalDownloadUrl = async (itemIdText: string): Promise<string | null> => {
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

  try {
    const info = await FileSystem.getInfoAsync(record.filePath);
    if (info.exists) {
      return record.filePath;
    }
  } catch {
    return null;
  }

  // Row says complete but the file is gone — treat as failed so the episode screen offers a
  // re-download, and fall back to remote for this play. Best-effort; never block playback on it.
  try {
    await downloadManager.markFileMissing(itemIdText);
  } catch {
    // ignore bookkeeping failure
  }
  return null;
};
