import { afterEach, describe, expect, it } from 'vitest';

import type { DTOClip, DTOItem } from '@podverse/helpers';

import { LOCAL_STORAGE } from '../constants/localStorage';
import {
  clearAnonymousPlaybackSnapshot,
  parseAnonymousPlaybackSnapshot,
  readAnonymousPlaybackSnapshot,
  writeAnonymousPlaybackSnapshot,
  writeAnonymousPlaybackSnapshotFromPlayerState,
} from './anonymousPlaybackStorage';

function createStorageMock(): Storage {
  const store: Record<string, string> = {};
  return {
    get length() {
      return Object.keys(store).length;
    },
    clear() {
      for (const k of Object.keys(store)) {
        delete store[k];
      }
    },
    getItem(key: string) {
      return store[key] ?? null;
    },
    key(index: number) {
      return Object.keys(store)[index] ?? null;
    },
    removeItem(key: string) {
      delete store[key];
    },
    setItem(key: string, value: string) {
      store[key] = value;
    },
  };
}

describe('anonymousPlaybackStorage', () => {
  const originalWindow = globalThis.window;

  afterEach(() => {
    if (originalWindow !== undefined) {
      Object.defineProperty(globalThis, 'window', {
        configurable: true,
        value: originalWindow,
        writable: true,
      });
    } else {
      Reflect.deleteProperty(globalThis, 'window');
    }
  });

  it('parseAnonymousPlaybackSnapshot returns null for invalid JSON', () => {
    expect(parseAnonymousPlaybackSnapshot('not json')).toBeNull();
  });

  it('parseAnonymousPlaybackSnapshot returns null for wrong version', () => {
    expect(
      parseAnonymousPlaybackSnapshot(
        JSON.stringify({
          v: 2,
          kind: 'item',
          id_text: 'a',
          playback_position_seconds: 0,
          updated_at: 'x',
        })
      )
    ).toBeNull();
  });

  it('parseAnonymousPlaybackSnapshot returns null for bad kind', () => {
    expect(
      parseAnonymousPlaybackSnapshot(
        JSON.stringify({
          v: 1,
          kind: 'add_by_rss',
          id_text: 'a',
          playback_position_seconds: 0,
          updated_at: 'x',
        })
      )
    ).toBeNull();
  });

  it('parseAnonymousPlaybackSnapshot returns null for empty id_text', () => {
    expect(
      parseAnonymousPlaybackSnapshot(
        JSON.stringify({
          v: 1,
          kind: 'item',
          id_text: '',
          playback_position_seconds: 0,
          updated_at: 'x',
        })
      )
    ).toBeNull();
  });

  it('parseAnonymousPlaybackSnapshot returns null for negative position', () => {
    expect(
      parseAnonymousPlaybackSnapshot(
        JSON.stringify({
          v: 1,
          kind: 'item',
          id_text: 'a',
          playback_position_seconds: -1,
          updated_at: 'x',
        })
      )
    ).toBeNull();
  });

  it('parseAnonymousPlaybackSnapshot accepts a valid v1 payload', () => {
    const raw = JSON.stringify({
      v: 1,
      kind: 'item',
      id_text: 'item-id',
      playback_position_seconds: 12.5,
      media_file_duration_seconds: 3600,
      updated_at: '2026-01-01T00:00:00.000Z',
    });
    const parsed = parseAnonymousPlaybackSnapshot(raw);
    expect(parsed).not.toBeNull();
    expect(parsed?.kind).toBe('item');
    expect(parsed?.id_text).toBe('item-id');
    expect(parsed?.playback_position_seconds).toBe(12.5);
    expect(parsed?.media_file_duration_seconds).toBe(3600);
  });

  it('write/read/clear round-trip via mock storage', () => {
    const storage = createStorageMock();
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: { localStorage: storage },
      writable: true,
    });

    writeAnonymousPlaybackSnapshot(
      {
        v: 1,
        kind: 'clip',
        id_text: 'clip-t',
        playback_position_seconds: 3,
        updated_at: '2026-05-01T12:00:00.000Z',
      },
      storage
    );

    expect(storage.getItem(LOCAL_STORAGE.ANONYMOUS_LAST_PLAYBACK_KEY)).toContain('"kind":"clip"');

    const read = readAnonymousPlaybackSnapshot(storage);
    expect(read?.kind).toBe('clip');
    expect(read?.id_text).toBe('clip-t');
    expect(read?.playback_position_seconds).toBe(3);

    clearAnonymousPlaybackSnapshot(storage);
    expect(storage.getItem(LOCAL_STORAGE.ANONYMOUS_LAST_PLAYBACK_KEY)).toBeNull();
  });

  it('writeAnonymousPlaybackSnapshotFromPlayerState writes clip when clip is set', () => {
    const storage = createStorageMock();
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: { localStorage: storage },
      writable: true,
    });

    writeAnonymousPlaybackSnapshotFromPlayerState(
      {
        mpClip: {
          id: 1,
          id_text: 'c1',
        } as DTOClip,
        mpItem: { id: 2, id_text: 'i1' } as DTOItem,
        mpItemSoundbite: null,
        mpCurrentTime: 10,
        mpDuration: 100,
      },
      storage
    );

    const read = readAnonymousPlaybackSnapshot(storage);
    expect(read?.kind).toBe('clip');
    expect(read?.id_text).toBe('c1');
    expect(read?.playback_position_seconds).toBe(10);
  });

  it('writeAnonymousPlaybackSnapshotFromPlayerState prefers clip over item', () => {
    const storage = createStorageMock();
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: { localStorage: storage },
      writable: true,
    });

    writeAnonymousPlaybackSnapshotFromPlayerState(
      {
        mpClip: {
          id: 1,
          id_text: 'c1',
        } as DTOClip,
        mpItem: { id: 2, id_text: 'i1' } as DTOItem,
        mpItemSoundbite: null,
        mpCurrentTime: 1,
        mpDuration: 2,
      },
      storage
    );

    expect(readAnonymousPlaybackSnapshot(storage)?.kind).toBe('clip');
  });

  // -- Boundary cases captured by the media-player decision matrix --
  // See apps/web/src/components/MediaPlayer/MEDIA-PLAYER-DECISION-MATRIX.md

  it('parseAnonymousPlaybackSnapshot returns null when playback_position is NaN', () => {
    expect(
      parseAnonymousPlaybackSnapshot(
        JSON.stringify({
          v: 1,
          kind: 'item',
          id_text: 'a',
          playback_position_seconds: Number.NaN,
          updated_at: 'x',
        })
      )
    ).toBeNull();
  });

  it('parseAnonymousPlaybackSnapshot returns null when playback_position is Infinity', () => {
    // JSON.stringify writes Infinity as null → rejected by the type check.
    const raw =
      '{"v":1,"kind":"item","id_text":"a","playback_position_seconds":null,"updated_at":"x"}';
    expect(parseAnonymousPlaybackSnapshot(raw)).toBeNull();
  });

  it('parseAnonymousPlaybackSnapshot accepts zero duration as a valid value', () => {
    const raw = JSON.stringify({
      v: 1,
      kind: 'item',
      id_text: 'a',
      playback_position_seconds: 0,
      media_file_duration_seconds: 0,
      updated_at: 'x',
    });
    const parsed = parseAnonymousPlaybackSnapshot(raw);
    expect(parsed).not.toBeNull();
    expect(parsed?.media_file_duration_seconds).toBe(0);
  });

  it('parseAnonymousPlaybackSnapshot accepts a very large playback position', () => {
    const raw = JSON.stringify({
      v: 1,
      kind: 'item',
      id_text: 'a',
      playback_position_seconds: 9_999_999.5,
      updated_at: 'x',
    });
    expect(parseAnonymousPlaybackSnapshot(raw)?.playback_position_seconds).toBe(9_999_999.5);
  });

  it('writeAnonymousPlaybackSnapshotFromPlayerState clamps negative mpCurrentTime to 0', () => {
    const storage = createStorageMock();
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: { localStorage: storage },
      writable: true,
    });

    writeAnonymousPlaybackSnapshotFromPlayerState(
      {
        mpClip: null,
        mpItem: { id: 1, id_text: 'i1' } as DTOItem,
        mpItemSoundbite: null,
        mpCurrentTime: -42,
        mpDuration: 300,
      },
      storage
    );

    expect(readAnonymousPlaybackSnapshot(storage)?.playback_position_seconds).toBe(0);
  });

  it('writeAnonymousPlaybackSnapshotFromPlayerState clamps near-end position to 0 before persist', () => {
    const storage = createStorageMock();
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: { localStorage: storage },
      writable: true,
    });

    writeAnonymousPlaybackSnapshotFromPlayerState(
      {
        mpClip: null,
        mpItem: { id: 1, id_text: 'i1' } as DTOItem,
        mpItemSoundbite: null,
        mpCurrentTime: 97,
        mpDuration: 100,
      },
      storage
    );

    expect(readAnonymousPlaybackSnapshot(storage)?.playback_position_seconds).toBe(0);
  });

  it('writeAnonymousPlaybackSnapshotFromPlayerState drops NaN/Infinity duration silently', () => {
    const storage = createStorageMock();
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: { localStorage: storage },
      writable: true,
    });

    writeAnonymousPlaybackSnapshotFromPlayerState(
      {
        mpClip: null,
        mpItem: { id: 1, id_text: 'i1' } as DTOItem,
        mpItemSoundbite: null,
        mpCurrentTime: 10,
        mpDuration: Number.POSITIVE_INFINITY,
      },
      storage
    );

    const read = readAnonymousPlaybackSnapshot(storage);
    expect(read?.playback_position_seconds).toBe(10);
    expect(read?.media_file_duration_seconds).toBeUndefined();
  });

  it('writeAnonymousPlaybackSnapshotFromPlayerState skips write when no clip/soundbite/item is set', () => {
    const storage = createStorageMock();
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: { localStorage: storage },
      writable: true,
    });

    writeAnonymousPlaybackSnapshotFromPlayerState(
      {
        mpClip: null,
        mpItem: null,
        mpItemSoundbite: null,
        mpCurrentTime: 5,
        mpDuration: 10,
      },
      storage
    );

    expect(readAnonymousPlaybackSnapshot(storage)).toBeNull();
  });
});
