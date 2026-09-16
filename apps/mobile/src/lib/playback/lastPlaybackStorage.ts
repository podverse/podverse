import AsyncStorage from '@react-native-async-storage/async-storage';

import { isPlainObject } from '@podverse/helpers/guards';
import type { PlaybackTarget } from '@podverse/playback-core';

/**
 * Device-local now-playing snapshot for every user, signed in or not. Lives outside the
 * account queue / history system: cold start restores the last item paused so the mini player
 * returns without a network round-trip. Cleared when the item finishes and when a user signs in
 * (the signing-in account's server queue is then authoritative).
 */
export const LAST_PLAYBACK_SNAPSHOT_VERSION = 1 as const;

/** Near-end window matching `clampNearEndSeconds` in `@podverse/playback-core`. */
const NEAR_END_SECONDS = 5;

// Mobile-only key (device storage is not shared with web).
const LAST_PLAYBACK_KEY = 'pv_mobile_last_playback';

export type LastPlaybackKind = 'item' | 'clip' | 'item_soundbite';

export type LastPlaybackSnapshotV1 = {
  v: typeof LAST_PLAYBACK_SNAPSHOT_VERSION;
  kind: LastPlaybackKind;
  id_text: string;
  playback_position_seconds: number;
  media_file_duration_seconds?: number;
  updated_at: string;
};

export type LastPlaybackSnapshot = LastPlaybackSnapshotV1;

export function parseLastPlaybackSnapshot(raw: string | null): LastPlaybackSnapshot | null {
  if (raw === null || raw === '') {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isPlainObject(parsed)) {
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
      v: LAST_PLAYBACK_SNAPSHOT_VERSION,
      ...(parsed.media_file_duration_seconds !== undefined
        ? { media_file_duration_seconds: parsed.media_file_duration_seconds }
        : {}),
    };
  } catch {
    return null;
  }
}

export async function readLastPlaybackSnapshot(): Promise<LastPlaybackSnapshot | null> {
  try {
    const raw = await AsyncStorage.getItem(LAST_PLAYBACK_KEY);
    return parseLastPlaybackSnapshot(raw);
  } catch {
    return null;
  }
}

export async function writeLastPlaybackSnapshot(snapshot: LastPlaybackSnapshotV1): Promise<void> {
  try {
    await AsyncStorage.setItem(LAST_PLAYBACK_KEY, JSON.stringify(snapshot));
  } catch {
    // Best-effort; a failed write only loses the restore convenience.
  }
}

export async function clearLastPlaybackSnapshot(): Promise<void> {
  try {
    await AsyncStorage.removeItem(LAST_PLAYBACK_KEY);
  } catch {
    // Best-effort.
  }
}

/**
 * Resolve the snapshot `kind` + `id_text` for a playback target. Clip and soundbite targets snapshot
 * their own id (so the restore reloads the bounded segment); item/chapter targets snapshot the item.
 * Add-by-RSS and livestream targets are not snapshotted (returns null).
 */
export function lastPlaybackIdentityFromTarget(
  target: PlaybackTarget
): { kind: LastPlaybackKind; id_text: string } | null {
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

/**
 * Build a snapshot from the active target + position. A position inside the near-end window means
 * the item is finished, so there is nothing to resume — callers must clear storage instead of
 * writing a clamped `0` that would reload the finished item on the next cold start.
 */
export function lastPlaybackSnapshotFromTarget(
  target: PlaybackTarget,
  positionSeconds: number,
  durationSeconds: number | undefined
): LastPlaybackSnapshotV1 | 'finished' | null {
  const identity = lastPlaybackIdentityFromTarget(target);
  if (identity === null) {
    return null;
  }

  const safePosition =
    Number.isFinite(positionSeconds) && positionSeconds > 0 ? positionSeconds : 0;
  const safeDuration =
    durationSeconds !== undefined && Number.isFinite(durationSeconds) && durationSeconds > 0
      ? durationSeconds
      : undefined;

  if (safeDuration !== undefined && safePosition >= safeDuration - NEAR_END_SECONDS) {
    return 'finished';
  }

  return {
    id_text: identity.id_text,
    kind: identity.kind,
    playback_position_seconds: safePosition,
    updated_at: new Date().toISOString(),
    v: LAST_PLAYBACK_SNAPSHOT_VERSION,
    ...(safeDuration !== undefined ? { media_file_duration_seconds: safeDuration } : {}),
  };
}
