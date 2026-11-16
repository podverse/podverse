import {
  getNonEmptyTrimmedStringProperty,
  getOwnPropertyValue,
  isPlainObject,
  toNonEmptyTrimmedString,
} from '@podverse/helpers/guards';
import { canonicalAddByRSSFeedUrl } from '@podverse/helpers-validation/client';

import { httpUrlWithoutUserinfo, readArray, readCachedFeedUrl } from './parseV4LocalState';
import type { V4OrphanFile } from './v4DownloadFiles';
import type { V4FileRootKind } from './v4DownloadNames';
import {
  isSafeV4FileKey,
  legacyExtensionOfName,
  v4ExtensionFromUrl,
  v4FileKey,
} from './v4DownloadNames';

export type V4DownloadSource = 'downloaded' | 'downloading' | 'orphan';

/** One v4 media file before it is resolved. URLs carry no userinfo. */
export type V4DownloadStagedEntry = {
  fileKey: string;
  source: V4DownloadSource;
  orphanRoot: V4FileRootKind | null;
  legacyEpisodeId: string | null;
  legacyExtension: string;
  isAddByRss: boolean;
  legacyPodcastId: string | null;
  addByRssFeedUrl: string | null;
  podcastFeedUrl: string | null;
  podcastIndexId: string | null;
  podcastGuid: string | null;
  podcastTitle: string | null;
  podcastImageUrl: string | null;
  episodeGuid: string | null;
  mediaUrl: string | null;
  episodeTitle: string | null;
  episodePubDateMs: number | null;
  episodeDurationSeconds: number | null;
  episodeMediaType: string | null;
  episodeImageUrl: string | null;
};

/** The three AsyncStorage strings. List values are JSON, or null when the key is absent. */
export type V4DownloadStateRaw = {
  downloadedPodcasts: string | null;
  downloadingEpisodes: string | null;
  sharedFolder: string | null;
};

export type V4DownloadStateParsed = {
  entries: V4DownloadStagedEntry[];
  sharedFolder: string | null;
};

const readSharedFolder = (value: string | null): string | null => {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
};

const readHttpUrl = (value: unknown): string | null => {
  const trimmed = toNonEmptyTrimmedString(value);
  if (trimmed === null) {
    return null;
  }
  return httpUrlWithoutUserinfo(trimmed);
};

const readPodcastIndexId = (podcast: Record<string, unknown>): string | null => {
  const value = getOwnPropertyValue(podcast, 'podcastIndexId');
  if (typeof value === 'number') {
    return Number.isFinite(value) ? String(value) : null;
  }
  return toNonEmptyTrimmedString(value);
};

const readPubDateMs = (value: unknown): number | null => {
  if (typeof value !== 'string') {
    return null;
  }
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const finiteFloored = (value: number): number | null => {
  if (!Number.isFinite(value) || value < 0) {
    return null;
  }
  return Math.floor(value);
};

const readDurationSeconds = (value: unknown): number | null => {
  if (typeof value === 'number') {
    return finiteFloored(value);
  }
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  if (trimmed === '') {
    return null;
  }
  return finiteFloored(Number(trimmed));
};

const readAddByRss = (
  podcast: Record<string, unknown>,
  episode: Record<string, unknown>
): { addByRssFeedUrl: string | null; isAddByRss: boolean } => {
  const feedUrl = getNonEmptyTrimmedStringProperty(podcast, 'addByRSSPodcastFeedUrl');
  const isAddByRss = feedUrl !== null || getOwnPropertyValue(episode, 'addedByRSS') === true;
  if (!isAddByRss) {
    return { addByRssFeedUrl: null, isAddByRss: false };
  }
  const source = feedUrl ?? getNonEmptyTrimmedStringProperty(podcast, 'id');
  return {
    addByRssFeedUrl: source === null ? null : canonicalAddByRSSFeedUrl(source),
    isAddByRss: true,
  };
};

const stageEpisode = (
  episodeValue: unknown,
  podcast: Record<string, unknown>,
  source: 'downloaded' | 'downloading'
): V4DownloadStagedEntry | null => {
  if (!isPlainObject(episodeValue)) {
    return null;
  }
  const legacyEpisodeId = toNonEmptyTrimmedString(getOwnPropertyValue(episodeValue, 'id'));
  if (legacyEpisodeId === null) {
    return null;
  }
  const rawMediaUrl = getOwnPropertyValue(episodeValue, 'mediaUrl');
  if (typeof rawMediaUrl !== 'string' || rawMediaUrl.trim() === '') {
    return null;
  }
  const legacyExtension = v4ExtensionFromUrl(rawMediaUrl);
  const fileKey = v4FileKey(legacyEpisodeId, legacyExtension);
  if (!isSafeV4FileKey(fileKey)) {
    return null;
  }
  const addByRss = readAddByRss(podcast, episodeValue);
  const podcastId = getNonEmptyTrimmedStringProperty(podcast, 'id');
  return {
    addByRssFeedUrl: addByRss.addByRssFeedUrl,
    episodeDurationSeconds: readDurationSeconds(getOwnPropertyValue(episodeValue, 'duration')),
    episodeGuid: getNonEmptyTrimmedStringProperty(episodeValue, 'guid'),
    episodeImageUrl: readHttpUrl(getOwnPropertyValue(episodeValue, 'imageUrl')),
    episodeMediaType: getNonEmptyTrimmedStringProperty(episodeValue, 'mediaType'),
    episodePubDateMs: readPubDateMs(getOwnPropertyValue(episodeValue, 'pubDate')),
    episodeTitle: getNonEmptyTrimmedStringProperty(episodeValue, 'title'),
    fileKey,
    isAddByRss: addByRss.isAddByRss,
    legacyEpisodeId,
    legacyExtension,
    legacyPodcastId: addByRss.isAddByRss ? null : podcastId,
    mediaUrl: httpUrlWithoutUserinfo(rawMediaUrl.trim()),
    orphanRoot: null,
    podcastFeedUrl: addByRss.isAddByRss ? null : readCachedFeedUrl(podcast),
    podcastGuid: getNonEmptyTrimmedStringProperty(podcast, 'podcastGuid'),
    podcastImageUrl:
      readHttpUrl(getOwnPropertyValue(podcast, 'shrunkImageUrl')) ??
      readHttpUrl(getOwnPropertyValue(podcast, 'imageUrl')),
    podcastIndexId: readPodcastIndexId(podcast),
    podcastTitle: getNonEmptyTrimmedStringProperty(podcast, 'title'),
    source,
  };
};

const pushUnique = (
  entries: V4DownloadStagedEntry[],
  seen: Set<string>,
  staged: V4DownloadStagedEntry | null
): void => {
  if (staged === null || seen.has(staged.fileKey)) {
    return;
  }
  seen.add(staged.fileKey);
  entries.push(staged);
};

const readDownloaded = (raw: string | null): V4DownloadStagedEntry[] => {
  const entries: V4DownloadStagedEntry[] = [];
  const seen = new Set<string>();
  for (const item of readArray(raw)) {
    if (!isPlainObject(item)) {
      continue;
    }
    const episodes = getOwnPropertyValue(item, 'episodes');
    if (!Array.isArray(episodes)) {
      continue;
    }
    for (const episode of episodes) {
      pushUnique(entries, seen, stageEpisode(episode, item, 'downloaded'));
    }
  }
  return entries;
};

const readDownloading = (raw: string | null): V4DownloadStagedEntry[] => {
  const entries: V4DownloadStagedEntry[] = [];
  const seen = new Set<string>();
  for (const item of readArray(raw)) {
    if (!isPlainObject(item)) {
      continue;
    }
    const podcastValue = getOwnPropertyValue(item, 'podcast');
    const podcast = isPlainObject(podcastValue) ? podcastValue : {};
    pushUnique(entries, seen, stageEpisode(item, podcast, 'downloading'));
  }
  return entries;
};

const parseEntries = (raw: V4DownloadStateRaw): V4DownloadStagedEntry[] => {
  const downloaded = readDownloaded(raw.downloadedPodcasts);
  const downloading = readDownloading(raw.downloadingEpisodes);
  const seen = new Set(downloaded.map((entry) => entry.fileKey));
  const merged = [...downloaded];
  for (const entry of downloading) {
    if (seen.has(entry.fileKey)) {
      continue;
    }
    seen.add(entry.fileKey);
    merged.push(entry);
  }
  return merged;
};

/**
 * Reads the previous app's download lists. A value that is not the expected JSON shape is an
 * empty list. This never throws. `sharedFolder` is the trimmed folder text, or null when that
 * text is absent or blank.
 */
export const parseV4DownloadState = (raw: V4DownloadStateRaw): V4DownloadStateParsed => {
  let sharedFolder: string | null = null;
  try {
    sharedFolder = readSharedFolder(raw.sharedFolder);
    return { entries: parseEntries(raw), sharedFolder };
  } catch {
    return { entries: [], sharedFolder };
  }
};

/** A file in a v4 folder that neither download list names. */
export const orphanStagedEntry = (orphan: V4OrphanFile): V4DownloadStagedEntry => ({
  addByRssFeedUrl: null,
  episodeDurationSeconds: null,
  episodeGuid: null,
  episodeImageUrl: null,
  episodeMediaType: null,
  episodePubDateMs: null,
  episodeTitle: null,
  fileKey: orphan.fileKey,
  isAddByRss: false,
  legacyEpisodeId: null,
  legacyExtension: legacyExtensionOfName(orphan.fileKey),
  legacyPodcastId: null,
  mediaUrl: null,
  orphanRoot: orphan.root,
  podcastFeedUrl: null,
  podcastGuid: null,
  podcastImageUrl: null,
  podcastIndexId: null,
  podcastTitle: null,
  source: 'orphan',
});
