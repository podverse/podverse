import AsyncStorage from '@react-native-async-storage/async-storage';

import type { PlaybackTarget } from '@podverse/playback-core';
import { clampPlaybackPositionForStorage } from '@podverse/playback-core/clampNearEndSeconds';

// Mirror of web `apps/web/src/utils/anonymousPlaybackStorage.ts`. Anonymous users have no server
// queue, so the last now-playing resource + position is snapshotted to device storage and restored
// on the next cold start (see `useAnonymousPlaybackRestore`). Logged-in users never write this
// snapshot; it is cleared when a session begins.
export const ANONYMOUS_PLAYBACK_SNAPSHOT_VERSION = 1 as const;

// Mobile-only key (device storage is not shared with web). Kept stable so restores survive updates.
const ANONYMOUS_LAST_PLAYBACK_KEY = 'pv_mobile_anonymous_last_playback';

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

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

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
    return {
      id_text: parsed.id_text,
      kind: parsed.kind,
      playback_position_seconds: parsed.playback_position_seconds,
      updated_at: parsed.updated_at,
      v: ANONYMOUS_PLAYBACK_SNAPSHOT_VERSION,
      ...(parsed.media_file_duration_seconds !== undefined
        ? { media_file_duration_seconds: parsed.media_file_duration_seconds }
        : {}),
    };
  } catch {
    return null;
  }
}

export async function readAnonymousPlaybackSnapshot(): Promise<AnonymousPlaybackSnapshot | null> {
  try {
    const raw = await AsyncStorage.getItem(ANONYMOUS_LAST_PLAYBACK_KEY);
    return parseAnonymousPlaybackSnapshot(raw);
  } catch {
    return null;
  }
}

export async function writeAnonymousPlaybackSnapshot(
  snapshot: AnonymousPlaybackSnapshotV1
): Promise<void> {
  try {
    await AsyncStorage.setItem(ANONYMOUS_LAST_PLAYBACK_KEY, JSON.stringify(snapshot));
  } catch {
    // Best-effort; a failed write only loses the restore convenience.
  }
}

export async function clearAnonymousPlaybackSnapshot(): Promise<void> {
  try {
    await AsyncStorage.removeItem(ANONYMOUS_LAST_PLAYBACK_KEY);
  } catch {
    // Best-effort.
  }
}

/**
 * Resolve the snapshot `kind` + `id_text` for a playback target. Clip and soundbite targets snapshot
 * their own id (so the restore reloads the bounded segment); item/chapter targets snapshot the item.
 * Add-by-RSS and livestream targets are not snapshotted (returns null).
 */
export function anonymousSnapshotIdentityFromTarget(
  target: PlaybackTarget
): { kind: AnonymousPlaybackKind; id_text: string } | null {
  switch (target.kind) {
    case 'clip':
      return { id_text: target.clip.id_text, kind: 'clip' };
    case 'soundbite':
      return { id_text: target.soundbite.id_text, kind: 'item_soundbite' };
    case 'chapter':
    case 'item-podcast':
    case 'item-video':
    case 'item-music':
      return { id_text: target.item.id_text, kind: 'item' };
    case 'add-by-rss':
    case 'livestream':
      return null;
  }
}

/** Build a snapshot from the active target + position; clamps near-end positions to 0 like web. */
export function anonymousSnapshotFromTarget(
  target: PlaybackTarget,
  positionSeconds: number,
  durationSeconds: number | undefined
): AnonymousPlaybackSnapshotV1 | null {
  const identity = anonymousSnapshotIdentityFromTarget(target);
  if (identity === null) {
    return null;
  }

  const safePosition =
    Number.isFinite(positionSeconds) && positionSeconds > 0 ? positionSeconds : 0;
  const safeDuration =
    durationSeconds !== undefined && Number.isFinite(durationSeconds) && durationSeconds > 0
      ? durationSeconds
      : undefined;
  const storedPositionSeconds = clampPlaybackPositionForStorage(safePosition, safeDuration);

  return {
    id_text: identity.id_text,
    kind: identity.kind,
    playback_position_seconds: storedPositionSeconds,
    updated_at: new Date().toISOString(),
    v: ANONYMOUS_PLAYBACK_SNAPSHOT_VERSION,
    ...(safeDuration !== undefined ? { media_file_duration_seconds: safeDuration } : {}),
  };
}
