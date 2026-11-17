import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

type OrphanFile = { fileKey: string; root: 'app_documents' | 'app_external_files' };

const downloadRoots = () => ({
  documentDirectory: 'file:///docs/',
  fileRoots: [],
  sharedFolder: null,
});

const multiGet = vi.fn(async (..._args: unknown[]): Promise<[string, string | null][]> => []);
const hasRead = vi.fn(async () => false);
const saveRead = vi.fn(async (_input: unknown) => undefined);
const resolveRoots = vi.fn(async (_sharedFolder: unknown) => downloadRoots());
const listOrphans = vi.fn(async (..._args: unknown[]): Promise<OrphanFile[]> => []);

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    multiGet: (...args: unknown[]) => multiGet(...args),
  },
}));

vi.mock('../../data/repositories/v4DownloadCarryoverRepository', () => ({
  v4DownloadCarryoverRepository: {
    hasRead: () => hasRead(),
    saveRead: (input: unknown) => saveRead(input),
  },
}));

vi.mock('./v4DownloadFiles', () => ({
  listV4OrphanFiles: (...args: unknown[]) => listOrphans(...args),
  resolveV4DownloadRoots: (sharedFolder: unknown) => resolveRoots(sharedFolder),
}));

import { performV4DownloadRead } from './readV4DownloadState';

const stored = (
  downloaded: string | null,
  downloading: string | null,
  sharedFolder: string | null
): [string, string | null][] => [
  ['DOWNLOADED_PODCASTS', downloaded],
  ['DOWNLOADING_EPISODES', downloading],
  ['EXT_STORAGE_DLOAD_LOCATION', sharedFolder],
];

const downloadedEntry = {
  addByRssFeedUrl: null,
  episodeDurationSeconds: null,
  episodeGuid: null,
  episodeImageUrl: null,
  episodeMediaType: null,
  episodePubDateMs: null,
  episodeTitle: 'Episode',
  fileKey: 'ep1.mp3',
  isAddByRss: false,
  legacyEpisodeId: 'ep1',
  legacyExtension: '.mp3',
  legacyPodcastId: 'podcast1',
  mediaUrl: 'https://example.com/ep1.mp3',
  orphanRoot: null,
  podcastFeedUrl: null,
  podcastGuid: null,
  podcastImageUrl: null,
  podcastIndexId: null,
  podcastTitle: null,
  source: 'downloaded',
};

const orphanEntry = {
  addByRssFeedUrl: null,
  episodeDurationSeconds: null,
  episodeGuid: null,
  episodeImageUrl: null,
  episodeMediaType: null,
  episodePubDateMs: null,
  episodeTitle: null,
  fileKey: 'unnamed.mp3',
  isAddByRss: false,
  legacyEpisodeId: null,
  legacyExtension: '.mp3',
  legacyPodcastId: null,
  mediaUrl: null,
  orphanRoot: 'app_documents',
  podcastFeedUrl: null,
  podcastGuid: null,
  podcastImageUrl: null,
  podcastIndexId: null,
  podcastTitle: null,
  source: 'orphan',
};

describe('performV4DownloadRead', () => {
  const warnLog = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  const readLog = vi.spyOn(console, 'info').mockImplementation(() => undefined);

  beforeEach(() => {
    warnLog.mockClear();
    readLog.mockClear();
    multiGet.mockReset();
    hasRead.mockReset();
    hasRead.mockResolvedValue(false);
    saveRead.mockReset();
    saveRead.mockResolvedValue(undefined);
    resolveRoots.mockReset();
    resolveRoots.mockResolvedValue(downloadRoots());
    listOrphans.mockReset();
    listOrphans.mockResolvedValue([]);
  });

  afterAll(() => {
    warnLog.mockRestore();
    readLog.mockRestore();
  });

  it('does not stage rows when the download list read throws, and tries again', async () => {
    multiGet.mockRejectedValue(new Error('unavailable'));

    await expect(performV4DownloadRead()).resolves.toBe(false);
    await expect(performV4DownloadRead()).resolves.toBe(false);

    expect(multiGet).toHaveBeenCalledTimes(2);
    expect(multiGet).toHaveBeenCalledWith([
      'DOWNLOADED_PODCASTS',
      'DOWNLOADING_EPISODES',
      'EXT_STORAGE_DLOAD_LOCATION',
    ]);
    expect(saveRead).not.toHaveBeenCalled();
    expect(resolveRoots).not.toHaveBeenCalled();
    expect(listOrphans).not.toHaveBeenCalled();
    expect(readLog).not.toHaveBeenCalled();
    expect(warnLog).toHaveBeenCalledTimes(2);
    expect(warnLog).toHaveBeenCalledWith('[v4-carryover] download read failed');
  });

  it('does not stage rows when the download list read throws three times', async () => {
    multiGet.mockRejectedValue(new Error('unavailable'));

    await performV4DownloadRead();
    await performV4DownloadRead();
    await performV4DownloadRead();

    expect(multiGet).toHaveBeenCalledTimes(3);
    expect(saveRead).not.toHaveBeenCalled();
    expect(listOrphans).not.toHaveBeenCalled();
    expect(resolveRoots).not.toHaveBeenCalled();
  });

  it('stages an orphan after a finished read that named no episode', async () => {
    multiGet.mockResolvedValue(stored(null, null, null));
    listOrphans.mockResolvedValue([{ fileKey: 'unnamed.mp3', root: 'app_documents' }]);

    await expect(performV4DownloadRead()).resolves.toBe(true);

    expect(resolveRoots).toHaveBeenCalledTimes(1);
    expect(resolveRoots).toHaveBeenCalledWith(null);
    expect(saveRead).toHaveBeenCalledTimes(1);
    expect(saveRead).toHaveBeenCalledWith({
      entries: [orphanEntry],
      sharedFolder: null,
    });
    expect(warnLog).not.toHaveBeenCalled();
    expect(readLog).toHaveBeenCalledWith('[v4-carryover] download read finished', {
      addByRss: 0,
      downloaded: 0,
      downloading: 0,
      orphan: 1,
      withMediaUrl: 0,
      withSharedFolder: 0,
    });
  });

  it('stages the downloaded episode when the folder listing throws', async () => {
    multiGet.mockResolvedValue(
      stored(
        JSON.stringify([
          {
            episodes: [{ id: 'ep1', mediaUrl: 'https://example.com/ep1.mp3', title: 'Episode' }],
            id: 'podcast1',
          },
        ]),
        null,
        null
      )
    );
    listOrphans.mockRejectedValue(new Error('list failed'));

    await expect(performV4DownloadRead()).resolves.toBe(true);

    expect(saveRead).toHaveBeenCalledTimes(1);
    expect(saveRead).toHaveBeenCalledWith({
      entries: [downloadedEntry],
      sharedFolder: null,
    });
    expect(listOrphans).toHaveBeenCalledTimes(1);
    expect(warnLog).not.toHaveBeenCalled();
    expect(readLog).toHaveBeenCalledWith('[v4-carryover] download read finished', {
      addByRss: 0,
      downloaded: 1,
      downloading: 0,
      orphan: 0,
      withMediaUrl: 1,
      withSharedFolder: 0,
    });
  });
});
