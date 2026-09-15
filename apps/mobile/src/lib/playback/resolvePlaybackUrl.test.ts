import { beforeEach, describe, expect, it, vi } from 'vitest';

const isOfflineModeEnabled = vi.fn(() => false);
const getInfoAsync = vi.fn();
const resolveItemAudioEnclosureUrl = vi.fn(
  async (..._args: unknown[]) => 'https://cdn.example.com/ep.mp3'
);
const downloadStoreGet = vi.fn();
const hydrate = vi.fn(async (..._args: unknown[]) => undefined);
const markFileMissing = vi.fn(async (..._args: unknown[]) => undefined);

vi.mock('expo-file-system', () => ({
  getInfoAsync: (...args: unknown[]) => getInfoAsync(...args),
}));

vi.mock('../../prefs/offlineMode', () => ({
  isOfflineModeEnabled: () => isOfflineModeEnabled(),
}));

vi.mock('./resolveEnclosureUrl', () => ({
  resolveItemAudioEnclosureUrl: (...args: unknown[]) => resolveItemAudioEnclosureUrl(...args),
}));

vi.mock('../../downloads/downloadManager', () => ({
  downloadManager: {
    hydrate: (...args: unknown[]) => hydrate(...args),
    markFileMissing: (...args: unknown[]) => markFileMissing(...args),
  },
}));

vi.mock('../../downloads/downloadStore', () => ({
  downloadStore: {
    get: (...args: unknown[]) => downloadStoreGet(...args),
  },
}));

import type { DTOItem } from '@podverse/helpers/dto';

import { resolvePlaybackUrl } from './resolvePlaybackUrl';

/** Minimal item identity for the Offline Mode branch under test. */
const item = { id_text: 'ep-1' } as DTOItem;

describe('resolvePlaybackUrl Offline Mode', () => {
  beforeEach(() => {
    isOfflineModeEnabled.mockReset();
    isOfflineModeEnabled.mockReturnValue(false);
    getInfoAsync.mockReset();
    resolveItemAudioEnclosureUrl.mockClear();
    downloadStoreGet.mockReset();
    hydrate.mockClear();
    markFileMissing.mockClear();
  });

  it('returns null instead of the remote enclosure while Offline Mode is on', async () => {
    isOfflineModeEnabled.mockReturnValue(true);
    downloadStoreGet.mockReturnValue(null);

    await expect(resolvePlaybackUrl(item)).resolves.toBeNull();
    expect(resolveItemAudioEnclosureUrl).not.toHaveBeenCalled();
  });

  it('still returns a completed local file while Offline Mode is on', async () => {
    isOfflineModeEnabled.mockReturnValue(true);
    downloadStoreGet.mockReturnValue({
      filePath: 'file:///downloads/ep-1.mp3',
      status: 'complete',
    });
    getInfoAsync.mockResolvedValue({ exists: true });

    await expect(resolvePlaybackUrl(item)).resolves.toBe('file:///downloads/ep-1.mp3');
    expect(resolveItemAudioEnclosureUrl).not.toHaveBeenCalled();
  });
});
