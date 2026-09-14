import { afterEach, describe, expect, it } from 'vitest';

import {
  clearPlaybackHandoffLocalState,
  readPlaybackHandoffLocalState,
  writePlaybackHandoffLocalState,
} from './playbackHandoffState';

describe('playbackHandoffState', () => {
  afterEach(() => {
    clearPlaybackHandoffLocalState();
  });

  it('stores normalized local playback state', () => {
    writePlaybackHandoffLocalState({
      itemIdText: ' episode-1 ',
      itemTitle: ' Episode 1 ',
      lastPlayedAt: ' 2026-09-13T12:00:00.000Z ',
    });

    expect(readPlaybackHandoffLocalState()).toEqual({
      itemIdText: 'episode-1',
      itemTitle: 'Episode 1',
      lastPlayedAt: '2026-09-13T12:00:00.000Z',
    });
  });

  it('ignores writes without an item id', () => {
    writePlaybackHandoffLocalState({
      itemIdText: null,
      itemTitle: 'Episode 1',
      lastPlayedAt: '2026-09-13T12:00:00.000Z',
    });

    expect(readPlaybackHandoffLocalState()).toBeNull();
  });
});
