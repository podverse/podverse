import { beforeEach, describe, expect, it, vi } from 'vitest';

const isOfflineModeEnabled = vi.fn(() => false);
const getInfoAsync = vi.fn();
const resolveItemEnclosureUrl = vi.fn((..._args: unknown[]) => 'https://cdn.example.com/ep.mp3');
const buildItemLabeledEnclosures = vi.fn((..._args: unknown[]): unknown[] => []);
const downloadStoreGet = vi.fn();
const hydrate = vi.fn(async (..._args: unknown[]) => undefined);
const markFileMissing = vi.fn(async (..._args: unknown[]) => undefined);
const isLocalFileOnlyPlayback = vi.fn(async (..._args: unknown[]) => false);
const removeDownload = vi.fn(async (..._args: unknown[]) => undefined);

vi.mock('expo-file-system/legacy', () => ({
  // A stored file name joins under this directory as file:///downloads/<name>.
  documentDirectory: 'file:///',
  getInfoAsync: (uri: string) => getInfoAsync(uri),
}));

vi.mock('../../prefs/offlineMode', () => ({
  isOfflineModeEnabled: () => isOfflineModeEnabled(),
}));

vi.mock('./resolveEnclosureUrl', () => ({
  buildItemLabeledEnclosures: (...args: unknown[]) => buildItemLabeledEnclosures(...args),
  resolveItemEnclosureUrl: (...args: unknown[]) => resolveItemEnclosureUrl(...args),
}));

vi.mock('../../downloads/downloadManager', () => ({
  downloadManager: {
    hydrate: () => hydrate(),
    markFileMissing: (itemIdText: string) => markFileMissing(itemIdText),
  },
}));

vi.mock('../../downloads/downloadStore', () => ({
  downloadStore: {
    get: (itemIdText: string) => downloadStoreGet(itemIdText),
  },
}));

vi.mock('../../data/repositories/downloadsRepository', () => ({
  downloadsRepository: {
    isLocalFileOnlyPlayback: (itemIdText: string) => isLocalFileOnlyPlayback(itemIdText),
    remove: (itemIdText: string) => removeDownload(itemIdText),
  },
}));

import type { DTOItem } from '@podverse/helpers/dto';
import type { EnclosureSelectedParams } from '@podverse/helpers/item/itemEnclosure';

import {
  playbackUrlForEpisode,
  resolveLocalDownloadPlaybackUrl,
  resolvePlaybackUrl,
} from './resolvePlaybackUrl';

/** Minimal item identity for the Offline Mode branch under test. */
const item = { id_text: 'ep-1' } as DTOItem;
const selectedParams: EnclosureSelectedParams = {
  enclosureRowSelected: null,
  sourceRowSelected: null,
  type: 'default',
};

describe('resolvePlaybackUrl Offline Mode', () => {
  beforeEach(() => {
    isOfflineModeEnabled.mockReset();
    isOfflineModeEnabled.mockReturnValue(false);
    getInfoAsync.mockReset();
    resolveItemEnclosureUrl.mockClear();
    buildItemLabeledEnclosures.mockClear();
    downloadStoreGet.mockReset();
    hydrate.mockClear();
    markFileMissing.mockClear();
    isLocalFileOnlyPlayback.mockReset();
    isLocalFileOnlyPlayback.mockResolvedValue(false);
    removeDownload.mockReset();
  });

  it('returns null instead of the remote enclosure while Offline Mode is on', async () => {
    isOfflineModeEnabled.mockReturnValue(true);
    downloadStoreGet.mockReturnValue(null);

    await expect(resolvePlaybackUrl(item, selectedParams)).resolves.toBeNull();
    expect(resolveItemEnclosureUrl).not.toHaveBeenCalled();
  });

  it('still returns a completed local file while Offline Mode is on', async () => {
    isOfflineModeEnabled.mockReturnValue(true);
    downloadStoreGet.mockReturnValue({
      filePath: 'ep-1.mp3',
      status: 'complete',
    });
    getInfoAsync.mockResolvedValue({ exists: true });

    await expect(resolvePlaybackUrl(item, selectedParams)).resolves.toBe(
      'file:///downloads/ep-1.mp3'
    );
    expect(resolveItemEnclosureUrl).not.toHaveBeenCalled();
  });

  it('uses the selected enclosure resolver for remote playback', async () => {
    downloadStoreGet.mockReturnValue(null);
    resolveItemEnclosureUrl.mockReturnValue('https://cdn.example.com/video.mp4');

    await expect(resolvePlaybackUrl(item, selectedParams)).resolves.toBe(
      'https://cdn.example.com/video.mp4'
    );
    expect(buildItemLabeledEnclosures).toHaveBeenCalledWith(item);
    expect(resolveItemEnclosureUrl).toHaveBeenCalledWith({
      labeledItemEnclosures: [],
      selectedParams,
    });
  });

  it('removes a local-only episode whose file is gone and skips the remote enclosure', async () => {
    isLocalFileOnlyPlayback.mockResolvedValue(true);
    downloadStoreGet.mockReturnValue({
      filePath: 'ep-gone.mp3',
      status: 'complete',
    });
    getInfoAsync.mockResolvedValue({ exists: false });

    await expect(resolvePlaybackUrl(item, selectedParams)).resolves.toBeNull();
    expect(removeDownload).toHaveBeenCalledWith('ep-1');
    expect(resolveItemEnclosureUrl).not.toHaveBeenCalled();
  });
});

describe('playbackUrlForEpisode', () => {
  it('returns the local URL when a file is available', () => {
    expect(
      playbackUrlForEpisode({
        localFileOnly: true,
        localUrl: 'file:///downloads/ep.mp3',
        offlineMode: false,
        remoteUrl: 'https://cdn.example.com/ep.mp3',
      })
    ).toBe('file:///downloads/ep.mp3');
    expect(
      playbackUrlForEpisode({
        localFileOnly: false,
        localUrl: 'file:///downloads/ep.mp3',
        offlineMode: true,
        remoteUrl: 'https://cdn.example.com/ep.mp3',
      })
    ).toBe('file:///downloads/ep.mp3');
  });

  it('returns null for a local-only episode with no file even when a remote URL is set', () => {
    expect(
      playbackUrlForEpisode({
        localFileOnly: true,
        localUrl: null,
        offlineMode: false,
        remoteUrl: 'https://cdn.example.com/ep.mp3',
      })
    ).toBeNull();
  });

  it('returns the remote URL when the episode is not local-only and no file is available', () => {
    expect(
      playbackUrlForEpisode({
        localFileOnly: false,
        localUrl: null,
        offlineMode: false,
        remoteUrl: 'https://cdn.example.com/ep.mp3',
      })
    ).toBe('https://cdn.example.com/ep.mp3');
  });

  it('returns null while Offline Mode is on and no file is available', () => {
    expect(
      playbackUrlForEpisode({
        localFileOnly: false,
        localUrl: null,
        offlineMode: true,
        remoteUrl: 'https://cdn.example.com/ep.mp3',
      })
    ).toBeNull();
  });
});

describe('resolveLocalDownloadPlaybackUrl', () => {
  beforeEach(() => {
    isOfflineModeEnabled.mockReset();
    isOfflineModeEnabled.mockReturnValue(false);
    getInfoAsync.mockReset();
    resolveItemEnclosureUrl.mockClear();
    buildItemLabeledEnclosures.mockClear();
    downloadStoreGet.mockReset();
    hydrate.mockClear();
    markFileMissing.mockClear();
    isLocalFileOnlyPlayback.mockReset();
    isLocalFileOnlyPlayback.mockResolvedValue(false);
    removeDownload.mockReset();
  });

  it('returns the absolute path when a complete download file is on disk', async () => {
    downloadStoreGet.mockReturnValue({
      filePath: 'ep-1.mp3',
      status: 'complete',
    });
    getInfoAsync.mockResolvedValue({ exists: true });

    await expect(resolveLocalDownloadPlaybackUrl('ep-1')).resolves.toBe(
      'file:///downloads/ep-1.mp3'
    );
    expect(markFileMissing).not.toHaveBeenCalled();
  });

  it('returns null when the download row is not complete', async () => {
    downloadStoreGet.mockReturnValue({
      filePath: 'ep-1.mp3',
      status: 'downloading',
    });

    await expect(resolveLocalDownloadPlaybackUrl('ep-1')).resolves.toBeNull();
    expect(getInfoAsync).not.toHaveBeenCalled();
    expect(markFileMissing).not.toHaveBeenCalled();
  });

  it('returns null and marks the row missing when a complete download file is gone', async () => {
    downloadStoreGet.mockReturnValue({
      filePath: 'ep-gone.mp3',
      status: 'complete',
    });
    getInfoAsync.mockResolvedValue({ exists: false });

    await expect(resolveLocalDownloadPlaybackUrl('ep-gone')).resolves.toBeNull();
    expect(markFileMissing).toHaveBeenCalledWith('ep-gone');
  });

  it('returns a content:// URI when the document exists and does not mark the row missing', async () => {
    const documentUri =
      'content://com.android.externalstorage.documents/document/primary%3Aep-1.mp3';
    downloadStoreGet.mockReturnValue({
      filePath: documentUri,
      status: 'complete',
    });
    getInfoAsync.mockResolvedValue({ exists: true });

    await expect(resolveLocalDownloadPlaybackUrl('ep-1')).resolves.toBe(documentUri);
    expect(getInfoAsync).toHaveBeenCalledWith(documentUri);
    expect(markFileMissing).not.toHaveBeenCalled();
  });

  it('returns a content:// URI when the stat throws and does not mark the row missing', async () => {
    const documentUri =
      'content://com.android.externalstorage.documents/document/primary%3Aep-1.mp3';
    downloadStoreGet.mockReturnValue({
      filePath: documentUri,
      status: 'complete',
    });
    getInfoAsync.mockRejectedValue(new Error('stat failed'));

    await expect(resolveLocalDownloadPlaybackUrl('ep-1')).resolves.toBe(documentUri);
    expect(markFileMissing).not.toHaveBeenCalled();
  });

  it('marks the row missing when a content:// document is gone', async () => {
    const documentUri =
      'content://com.android.externalstorage.documents/document/primary%3Aep-gone.mp3';
    downloadStoreGet.mockReturnValue({
      filePath: documentUri,
      status: 'complete',
    });
    getInfoAsync.mockResolvedValue({ exists: false });

    await expect(resolveLocalDownloadPlaybackUrl('ep-gone')).resolves.toBeNull();
    expect(markFileMissing).toHaveBeenCalledWith('ep-gone');
  });
});
