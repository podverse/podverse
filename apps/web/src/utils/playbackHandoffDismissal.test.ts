import { describe, expect, it } from 'vitest';

import { LOCAL_STORAGE } from '../constants/localStorage';
import {
  buildPlaybackHandoffDismissedStateKey,
  readPlaybackHandoffDismissedStateKey,
  writePlaybackHandoffDismissedStateKey,
} from './playbackHandoffDismissal';

const createStorage = (): Storage => {
  const map = new Map<string, string>();

  return {
    clear() {
      map.clear();
    },
    getItem(key: string) {
      return map.has(key) ? (map.get(key) ?? null) : null;
    },
    key(index: number) {
      return Array.from(map.keys())[index] ?? null;
    },
    get length() {
      return map.size;
    },
    removeItem(key: string) {
      map.delete(key);
    },
    setItem(key: string, value: string) {
      map.set(key, value);
    },
  };
};

describe('playbackHandoffDismissal', () => {
  it('builds stable state keys from item id and timestamp', () => {
    expect(
      buildPlaybackHandoffDismissedStateKey({
        serverItemIdText: 'episode-1',
        serverLastPlayedAt: '2026-09-13T12:00:00.000Z',
      })
    ).toBe(`episode-1::${Date.parse('2026-09-13T12:00:00.000Z')}`);
  });

  it('writes and reads the dismissal key from storage', () => {
    const storage = createStorage();
    writePlaybackHandoffDismissedStateKey('episode-2::42', storage);
    expect(storage.getItem(LOCAL_STORAGE.PLAYBACK_HANDOFF_DISMISSED_STATE_KEY)).toBe(
      'episode-2::42'
    );
    expect(readPlaybackHandoffDismissedStateKey(storage)).toBe('episode-2::42');
  });

  it('clears storage when dismissal key is unset', () => {
    const storage = createStorage();
    writePlaybackHandoffDismissedStateKey('episode-2::42', storage);
    writePlaybackHandoffDismissedStateKey(null, storage);
    expect(storage.getItem(LOCAL_STORAGE.PLAYBACK_HANDOFF_DISMISSED_STATE_KEY)).toBeNull();
  });
});
