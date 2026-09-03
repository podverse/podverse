import * as FileSystem from 'expo-file-system';

import type { DTOItem } from '@podverse/helpers/dto';

import { downloadsRepository } from '../../data/repositories';
import type { DownloadRecord } from '../../downloads';
import { resolveItemAudioEnclosureUrl } from './resolveEnclosureUrl';

/**
 * Resolve the URL the media engine should load for an item, preferring a
 * completed **local download** (`file://`) over the remote enclosure. Passed into the same
 * `podverse-media-engine` load path as remote playback — there is no second player.
 *
 * Only progressive files are ever downloaded (livestreams / HLS never have a download row — see
 * `downloadEligibility`), so this never returns a local URL for a live item; those keep the remote
 * path and the PlaybackProvider live_item block.
 *
 * If a row is `complete` but its file is gone from disk (cache clear, OS eviction), the row is
 * marked `failed` so the episode UI offers a re-download, and this falls back to the remote
 * enclosure for the current play. Returns `null` only when there is neither a local file nor a
 * usable remote source (callers keep their existing `media_player.no_media` notice).
 */
export async function resolvePlaybackUrl(item: DTOItem): Promise<string | null> {
  const localUrl = await resolveLocalDownloadUrl(item.id_text);
  if (localUrl !== null) {
    return localUrl;
  }
  return resolveItemAudioEnclosureUrl(item);
}

const resolveLocalDownloadUrl = async (itemIdText: string): Promise<string | null> => {
  let record: DownloadRecord | null;
  try {
    record = await downloadsRepository.getByItemIdText(itemIdText);
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
    await downloadsRepository.patch(itemIdText, {
      errorReason: 'file_missing',
      filePath: null,
      status: 'failed',
    });
  } catch {
    // ignore bookkeeping failure
  }
  return null;
};
