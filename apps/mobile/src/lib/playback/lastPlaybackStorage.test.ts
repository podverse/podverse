import AsyncStorage from '@react-native-async-storage/async-storage';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { PlaybackTarget } from '@podverse/playback-core';

import {
  clearLastPlaybackSnapshot,
  lastPlaybackIdentityFromTarget,
  lastPlaybackSnapshotFromTarget,
  parseLastPlaybackSnapshot,
  readLastPlaybackSnapshot,
  writeLastPlaybackSnapshot,
} from './lastPlaybackStorage';

const inMemoryStore = new Map<string, string>();

vi.mock('@react-native-async-storage/async-storage', () => {
  return {
    default: {
      getItem: vi.fn(async (key: string) => {
        return inMemoryStore.has(key) ? (inMemoryStore.get(key) ?? null) : null;
      }),
      removeItem: vi.fn(async (key: string) => {
        inMemoryStore.delete(key);
      }),
      setItem: vi.fn(async (key: string, value: string) => {
        inMemoryStore.set(key, value);
      }),
    },
  };
});

const itemTarget = {
  channel: { id_text: 'channel-1' },
  item: { id_text: 'item-1' },
  kind: 'item-podcast',
} as PlaybackTarget;

const clipTarget = {
  channel: { id_text: 'channel-1' },
  clip: { id_text: 'clip-1' },
  item: { id_text: 'item-1' },
  kind: 'clip',
} as PlaybackTarget;

const soundbiteTarget = {
  channel: { id_text: 'channel-1' },
  item: { id_text: 'item-1' },
  kind: 'soundbite',
  soundbite: { id_text: 'soundbite-1' },
} as PlaybackTarget;

const addByRssTarget = {
  kind: 'add-by-rss',
  resourceData: { title: 'Local RSS' },
} as PlaybackTarget;

const livestreamTarget = {
  channel: { id_text: 'channel-1' },
  item: { id_text: 'item-live' },
  kind: 'livestream',
} as PlaybackTarget;

const livestreamWithoutItemTarget = {
  channel: { id_text: 'channel-1' },
  item: null,
  kind: 'livestream',
} as PlaybackTarget;

describe('lastPlaybackStorage', () => {
  beforeEach(() => {
    inMemoryStore.clear();
    vi.mocked(AsyncStorage.getItem).mockClear();
    vi.mocked(AsyncStorage.setItem).mockClear();
    vi.mocked(AsyncStorage.removeItem).mockClear();
  });

  describe('lastPlaybackIdentityFromTarget', () => {
    it('snapshots item, clip, and soundbite ids by kind', () => {
      expect(lastPlaybackIdentityFromTarget(itemTarget)).toEqual({
        id_text: 'item-1',
        kind: 'item',
      });
      expect(lastPlaybackIdentityFromTarget(clipTarget)).toEqual({
        id_text: 'clip-1',
        kind: 'clip',
      });
      expect(lastPlaybackIdentityFromTarget(soundbiteTarget)).toEqual({
        id_text: 'soundbite-1',
        kind: 'item_soundbite',
      });
    });

    it('skips add-by-rss targets', () => {
      expect(lastPlaybackIdentityFromTarget(addByRssTarget)).toBeNull();
    });

    it('snapshots a livestream item and skips a livestream with no item', () => {
      expect(lastPlaybackIdentityFromTarget(livestreamTarget)).toEqual({
        id_text: 'item-live',
        is_live: true,
        kind: 'item',
      });
      expect(lastPlaybackIdentityFromTarget(livestreamWithoutItemTarget)).toBeNull();
    });
  });

  describe('lastPlaybackSnapshotFromTarget', () => {
    it('returns a snapshot for a mid-episode position', () => {
      const snapshot = lastPlaybackSnapshotFromTarget(itemTarget, 42, 600);
      expect(snapshot).toMatchObject({
        id_text: 'item-1',
        kind: 'item',
        media_file_duration_seconds: 600,
        playback_position_seconds: 42,
        v: 1,
      });
    });

    it('returns finished inside the near-end window instead of clamping to 0', () => {
      expect(lastPlaybackSnapshotFromTarget(itemTarget, 596, 600)).toBe('finished');
      expect(lastPlaybackSnapshotFromTarget(itemTarget, 600, 600)).toBe('finished');
    });

    it('returns null for unsupported targets', () => {
      expect(lastPlaybackSnapshotFromTarget(addByRssTarget, 10, 100)).toBeNull();
    });

    it('snapshots a livestream at position 0 without a file duration', () => {
      expect(lastPlaybackSnapshotFromTarget(livestreamTarget, 1200, 1210)).toEqual({
        id_text: 'item-live',
        is_live: true,
        kind: 'item',
        playback_position_seconds: 0,
        updated_at: expect.any(String),
        v: 1,
      });
    });
  });

  describe('parseLastPlaybackSnapshot', () => {
    it('accepts a valid v1 row', () => {
      expect(
        parseLastPlaybackSnapshot(
          JSON.stringify({
            id_text: 'item-1',
            kind: 'item',
            playback_position_seconds: 12,
            updated_at: '2026-01-01T00:00:00.000Z',
            v: 1,
          })
        )
      ).toEqual({
        id_text: 'item-1',
        kind: 'item',
        playback_position_seconds: 12,
        updated_at: '2026-01-01T00:00:00.000Z',
        v: 1,
      });
    });

    it('rejects malformed rows', () => {
      expect(parseLastPlaybackSnapshot(null)).toBeNull();
      expect(parseLastPlaybackSnapshot('')).toBeNull();
      expect(parseLastPlaybackSnapshot('{')).toBeNull();
      expect(parseLastPlaybackSnapshot(JSON.stringify({ v: 2 }))).toBeNull();
      expect(
        parseLastPlaybackSnapshot(
          JSON.stringify({
            id_text: '',
            kind: 'item',
            playback_position_seconds: 1,
            updated_at: '2026-01-01T00:00:00.000Z',
            v: 1,
          })
        )
      ).toBeNull();
      expect(
        parseLastPlaybackSnapshot(
          JSON.stringify({
            id_text: 'item-1',
            kind: 'item',
            playback_position_seconds: -1,
            updated_at: '2026-01-01T00:00:00.000Z',
            v: 1,
          })
        )
      ).toBeNull();
    });

    it('round-trips is_live and rejects any other value', () => {
      const row = {
        id_text: 'item-live',
        kind: 'item',
        playback_position_seconds: 0,
        updated_at: '2026-01-01T00:00:00.000Z',
        v: 1,
      };
      expect(parseLastPlaybackSnapshot(JSON.stringify({ ...row, is_live: true }))).toEqual({
        ...row,
        is_live: true,
      });
      const withoutLive = parseLastPlaybackSnapshot(JSON.stringify(row));
      expect(withoutLive).toEqual(row);
      expect(withoutLive).not.toHaveProperty('is_live');
      expect(parseLastPlaybackSnapshot(JSON.stringify({ ...row, is_live: false }))).toBeNull();
      expect(parseLastPlaybackSnapshot(JSON.stringify({ ...row, is_live: 'yes' }))).toBeNull();
    });
  });

  describe('read/write/clear', () => {
    it('round-trips a snapshot through AsyncStorage', async () => {
      const snapshot = {
        id_text: 'item-1',
        kind: 'item' as const,
        playback_position_seconds: 30,
        updated_at: '2026-01-01T00:00:00.000Z',
        v: 1 as const,
      };
      await writeLastPlaybackSnapshot(snapshot);
      await expect(readLastPlaybackSnapshot()).resolves.toEqual(snapshot);
      await clearLastPlaybackSnapshot();
      await expect(readLastPlaybackSnapshot()).resolves.toBeNull();
    });
  });
});
