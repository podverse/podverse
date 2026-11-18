import AsyncStorage from '@react-native-async-storage/async-storage';

import { v4DownloadCarryoverRepository } from '../../data/repositories/v4DownloadCarryoverRepository';
import type { V4DownloadStagedEntry } from './parseV4DownloadState';
import { orphanStagedEntry, parseV4DownloadState } from './parseV4DownloadState';
import { listV4OrphanFiles, resolveV4DownloadRoots } from './v4DownloadFiles';

/**
 * The previous app's download lists and the Android folder setting. Feed passwords are not in
 * this set.
 */
export const V4_DOWNLOAD_STATE_KEYS = {
  downloadedPodcasts: 'DOWNLOADED_PODCASTS',
  downloadingEpisodes: 'DOWNLOADING_EPISODES',
  sharedFolder: 'EXT_STORAGE_DLOAD_LOCATION',
} as const;

const V4_DOWNLOAD_ASYNC_STORAGE_KEYS = [
  V4_DOWNLOAD_STATE_KEYS.downloadedPodcasts,
  V4_DOWNLOAD_STATE_KEYS.downloadingEpisodes,
  V4_DOWNLOAD_STATE_KEYS.sharedFolder,
] as const;

type DownloadReadCounts = {
  downloaded: number;
  downloading: number;
  orphan: number;
  addByRss: number;
  withMediaUrl: number;
  withSharedFolder: 0 | 1;
};

const summarize = (
  entries: readonly V4DownloadStagedEntry[],
  sharedFolder: string | null
): DownloadReadCounts => {
  const counts: DownloadReadCounts = {
    addByRss: 0,
    downloaded: 0,
    downloading: 0,
    orphan: 0,
    withMediaUrl: 0,
    withSharedFolder: sharedFolder === null ? 0 : 1,
  };
  for (const entry of entries) {
    if (entry.source === 'downloaded') {
      counts.downloaded += 1;
    } else if (entry.source === 'downloading') {
      counts.downloading += 1;
    } else {
      counts.orphan += 1;
    }
    if (entry.isAddByRss) {
      counts.addByRss += 1;
    }
    if (entry.mediaUrl !== null) {
      counts.withMediaUrl += 1;
    }
  }
  return counts;
};

/**
 * Files in v4's own folders that the lists did not name. A failure here drops those files from
 * this pass and leaves the parsed list entries in place. Nothing is deleted.
 */
const stageOrphans = async (
  entries: readonly V4DownloadStagedEntry[]
): Promise<V4DownloadStagedEntry[]> => {
  try {
    const roots = await resolveV4DownloadRoots(null);
    if (roots === null) {
      return [];
    }
    const knownFileKeys = new Set(entries.map((entry) => entry.fileKey));
    const orphans = await listV4OrphanFiles(roots, knownFileKeys);
    return orphans.map(orphanStagedEntry);
  } catch {
    return [];
  }
};

/**
 * True when this call staged at least one row. Never throws.
 *
 * A thrown read of the download lists does not write `v4_download_carryover.read_at` and does
 * not stage rows, so the files stay where they are and the next launch tries again. This
 * function does not delete or move a file.
 */
export const performV4DownloadRead = async (): Promise<boolean> => {
  try {
    if (await v4DownloadCarryoverRepository.hasRead()) {
      return false;
    }
    const stored = await AsyncStorage.multiGet([...V4_DOWNLOAD_ASYNC_STORAGE_KEYS]);
    const byKey = new Map(stored);
    const parsed = parseV4DownloadState({
      downloadedPodcasts: byKey.get(V4_DOWNLOAD_STATE_KEYS.downloadedPodcasts) ?? null,
      downloadingEpisodes: byKey.get(V4_DOWNLOAD_STATE_KEYS.downloadingEpisodes) ?? null,
      sharedFolder: byKey.get(V4_DOWNLOAD_STATE_KEYS.sharedFolder) ?? null,
    });
    const orphans = await stageOrphans(parsed.entries);
    const entries = [...parsed.entries, ...orphans];
    await v4DownloadCarryoverRepository.saveRead({
      entries,
      sharedFolder: parsed.sharedFolder,
    });
    // eslint-disable-next-line no-console -- counts only; this line is the record of the one-time read
    console.info('[v4-carryover] download read finished', summarize(entries, parsed.sharedFolder));
    return entries.length > 0;
  } catch {
    console.warn('[v4-carryover] download read failed');
    return false;
  }
};
