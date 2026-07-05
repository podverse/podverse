import type { DTOClip, DTOItem, DTOItemSoundbite } from '@podverse/helpers';

import { LOCAL_STORAGE } from '../constants/localStorage';
import { clampPlaybackPositionForStorage } from '../lib/playback';

export const ANONYMOUS_PLAYBACK_SNAPSHOT_VERSION = 1 as const;

export type AnonymousPlaybackKind = 'item' | 'clip' | 'item_soundbite';

export type AnonymousPlaybackSnapshotV1 = {
  v: typeof ANONYMOUS_PLAYBACK_SNAPSHOT_VERSION;
  kind: AnonymousPlaybackKind;
  id_text: string;
  playback_position_seconds: number;
  media_file_duration_seconds?: number;
  updated_at: string;
};

export type AnonymousPlaybackSnapshot = AnonymousPlaybackSnapshotV1;

export type AnonymousPlaybackWriteInput = {
  mpClip: DTOClip | null;
  mpItem: DTOItem | null;
  mpItemSoundbite: DTOItemSoundbite | null;
  mpCurrentTime?: number;
  mpDuration?: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function parseAnonymousPlaybackSnapshot(
  raw: string | null
): AnonymousPlaybackSnapshot | null {
  if (raw === null || raw === '') {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) {
      return null;
    }
    if (parsed.v !== 1) {
      return null;
    }
    if (parsed.kind !== 'item' && parsed.kind !== 'clip' && parsed.kind !== 'item_soundbite') {
      return null;
    }
    if (typeof parsed.id_text !== 'string' || parsed.id_text.length === 0) {
      return null;
    }
    if (
      typeof parsed.playback_position_seconds !== 'number' ||
      !Number.isFinite(parsed.playback_position_seconds) ||
      parsed.playback_position_seconds < 0
    ) {
      return null;
    }
    if (parsed.media_file_duration_seconds !== undefined) {
      if (
        typeof parsed.media_file_duration_seconds !== 'number' ||
        !Number.isFinite(parsed.media_file_duration_seconds)
      ) {
        return null;
      }
    }
    if (typeof parsed.updated_at !== 'string' || parsed.updated_at.length === 0) {
      return null;
    }
    return parsed as AnonymousPlaybackSnapshotV1;
  } catch {
    return null;
  }
}

export function readAnonymousPlaybackSnapshot(storage?: Storage): AnonymousPlaybackSnapshot | null {
  if (typeof window === 'undefined') {
    return null;
  }
  const store = storage ?? window.localStorage;
  return parseAnonymousPlaybackSnapshot(store.getItem(LOCAL_STORAGE.ANONYMOUS_LAST_PLAYBACK_KEY));
}

export function writeAnonymousPlaybackSnapshot(
  snapshot: AnonymousPlaybackSnapshotV1,
  storage?: Storage
): void {
  if (typeof window === 'undefined') {
    return;
  }
  const store = storage ?? window.localStorage;
  store.setItem(LOCAL_STORAGE.ANONYMOUS_LAST_PLAYBACK_KEY, JSON.stringify(snapshot));
}

export function clearAnonymousPlaybackSnapshot(storage?: Storage): void {
  if (typeof window === 'undefined') {
    return;
  }
  const store = storage ?? window.localStorage;
  store.removeItem(LOCAL_STORAGE.ANONYMOUS_LAST_PLAYBACK_KEY);
}

function resolveKindAndIdText(input: AnonymousPlaybackWriteInput): {
  kind: AnonymousPlaybackKind;
  id_text: string;
} | null {
  if (input.mpClip !== null && typeof input.mpClip.id_text === 'string') {
    return { kind: 'clip', id_text: input.mpClip.id_text };
  }
  if (input.mpItemSoundbite !== null && typeof input.mpItemSoundbite.id_text === 'string') {
    return { kind: 'item_soundbite', id_text: input.mpItemSoundbite.id_text };
  }
  if (input.mpItem !== null && typeof input.mpItem.id_text === 'string') {
    return { kind: 'item', id_text: input.mpItem.id_text };
  }
  return null;
}

export function writeAnonymousPlaybackSnapshotFromPlayerState(
  input: AnonymousPlaybackWriteInput,
  storage?: Storage
): void {
  const resolved = resolveKindAndIdText(input);
  if (resolved === null) {
    return;
  }

  const positionRaw = input.mpCurrentTime;
  const positionSeconds =
    typeof positionRaw === 'number' && Number.isFinite(positionRaw) ? Math.max(0, positionRaw) : 0;

  const durationRaw = input.mpDuration;
  const durationSeconds =
    typeof durationRaw === 'number' && Number.isFinite(durationRaw) && durationRaw >= 0
      ? durationRaw
      : undefined;

  const storedPositionSeconds = clampPlaybackPositionForStorage(positionSeconds, durationSeconds);

  const snapshot: AnonymousPlaybackSnapshotV1 = {
    v: ANONYMOUS_PLAYBACK_SNAPSHOT_VERSION,
    kind: resolved.kind,
    id_text: resolved.id_text,
    playback_position_seconds: storedPositionSeconds,
    updated_at: new Date().toISOString(),
  };

  if (durationSeconds !== undefined) {
    snapshot.media_file_duration_seconds = durationSeconds;
  }

  writeAnonymousPlaybackSnapshot(snapshot, storage);
}
