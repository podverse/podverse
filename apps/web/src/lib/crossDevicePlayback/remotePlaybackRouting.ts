import type {
  AddByRSSResourceData,
  DTOPlaybackCommand,
  DTOPlaybackResourceRef,
  DTOPlaybackState,
  PlaybackRole,
} from '@podverse/helpers';

import { isSamePlaybackResourceRef } from './playbackResource';

/**
 * An explicit play starts on this tab when no other tab of this session has announced that it
 * holds the audio. The remote role in that window is only the wait for an answer, and a command
 * would have nobody to run it. Another session, or a tab that has announced, still gets the command.
 */
export function shouldApplyExplicitPlayLocally(params: {
  role: PlaybackRole;
  thisSessionIdText: string | null;
  activeSessionIdText: string | null;
  thisTabId: string;
  audioTabId: string | null;
}): boolean {
  if (params.role !== 'remote') {
    return true;
  }
  const sameSession =
    params.thisSessionIdText !== null && params.activeSessionIdText === params.thisSessionIdText;
  if (!sameSession) {
    return false;
  }
  const otherTabAnnounced = params.audioTabId !== null && params.audioTabId !== params.thisTabId;
  return !otherTabAnnounced;
}

/** The command a pick sends in the remote role, or null to send nothing. */
export function resolveRemotePickCommand(params: {
  pickedRef: DTOPlaybackResourceRef | null;
  addByRSSResourceData: AddByRSSResourceData | null;
  startSeconds: number | null;
  loadsPaused: boolean;
  remoteState: DTOPlaybackState | null;
}): DTOPlaybackCommand | null {
  if (params.loadsPaused) {
    return null;
  }

  const { pickedRef, remoteState, startSeconds } = params;
  if (
    startSeconds === null &&
    remoteState !== null &&
    remoteState.resource !== null &&
    isSamePlaybackResourceRef(pickedRef, remoteState.resource.ref)
  ) {
    if (remoteState.status === 'playing' || remoteState.status === 'loading') {
      return { type: 'pause' };
    }
    return { type: 'play' };
  }

  if (pickedRef === null) {
    return null;
  }

  return {
    type: 'play_item',
    resource: pickedRef,
    add_by_rss_resource_data: pickedRef.kind === 'add_by_rss' ? params.addByRSSResourceData : null,
    start_seconds: startSeconds,
  };
}

/**
 * Seek seconds inside the playing device's file, or null when that state cannot be seeked.
 * No upper bound when the duration is unknown.
 */
export function clampRemoteSeekSeconds(
  remoteState: DTOPlaybackState,
  seconds: number
): number | null {
  if (remoteState.is_live || !Number.isFinite(seconds)) {
    return null;
  }
  const atLeastZero = Math.max(0, seconds);
  if (remoteState.duration_seconds === null || !Number.isFinite(remoteState.duration_seconds)) {
    return atLeastZero;
  }
  return Math.min(Math.max(0, remoteState.duration_seconds), atLeastZero);
}

/** Absolute seek for a relative move, or null when seeking is not allowed (live or no state). */
export function resolveRemoteJumpTarget(params: {
  remoteState: DTOPlaybackState | null;
  estimatedPositionSeconds: number | null;
  deltaSeconds: number;
}): number | null {
  const { remoteState } = params;
  if (remoteState === null || remoteState.is_live) {
    return null;
  }
  const position = params.estimatedPositionSeconds ?? 0;
  return clampRemoteSeekSeconds(remoteState, position + params.deltaSeconds);
}
