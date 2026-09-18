import { beforeEach, describe, expect, it, vi } from 'vitest';

const isOfflineModeEnabled = vi.fn(() => false);
const getInfoAsync = vi.fn();
const resolveItemEnclosureUrl = vi.fn(() => 'https://cdn.example.com/ep.mp3');
const buildItemLabeledEnclosures = vi.fn(() => []);
const downloadStoreGet = vi.fn();
const hydrate = vi.fn(async (..._args: unknown[]) => undefined);
const markFileMissing = vi.fn(async (..._args: unknown[]) => undefined);

vi.mock('expo-file-system', () => ({
  getInfoAsync: (uri: string) => getInfoAsync(uri),
}));

vi.mock('../../prefs/offlineMode', () => ({
  isOfflineModeEnabled: () => isOfflineModeEnabled(),
}));

vi.mock('./resolveEnclosureUrl', () => ({
  buildItemLabeledEnclosures: () => buildItemLabeledEnclosures(),
  resolveItemEnclosureUrl: () => resolveItemEnclosureUrl(),
}));

vi.mock('../../downloads/downloadManager', () => ({
  downloadManager: {
    hydrate: () => hydrate(),
    markFileMissing: () => markFileMissing(),
  },
}));

vi.mock('../../downloads/downloadStore', () => ({
  downloadStore: {
    get: (itemIdText: string) => downloadStoreGet(itemIdText),
  },
}));

import type { DTOItem } from '@podverse/helpers/dto';
import type { EnclosureSelectedParams } from '@podverse/helpers/item/itemEnclosure';

import { resolvePlaybackUrl } from './resolvePlaybackUrl';

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
      filePath: 'file:///downloads/ep-1.mp3',
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
});
