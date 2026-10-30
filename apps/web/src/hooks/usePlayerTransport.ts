'use client';

import { useCallback } from 'react';

import type { DTOPlaybackState, PlaybackSpeedValue } from '@podverse/helpers';
import { getNextPlaybackSpeed } from '@podverse/helpers';

import { useCrossDevicePlaybackSnapshot } from '../contexts/CrossDevicePlayback';
import { useMediaPlayer } from '../contexts/MediaPlayer';
import { useMediaPlayerControls } from '../contexts/MediaPlayerControls';
import { useMediaPlayerCurrentTime } from '../contexts/MediaPlayerCurrentTime';
import { crossDevicePlaybackStore } from '../lib/crossDevicePlayback/crossDevicePlaybackStore';
import {
  isPlayerResourceLive,
  nearestPlaybackSpeedValue,
} from '../lib/crossDevicePlayback/playbackResource';
import {
  clampRemoteSeekSeconds,
  resolveRemoteJumpTarget,
} from '../lib/crossDevicePlayback/remotePlaybackRouting';
import { sendPlaybackCommand } from '../lib/crossDevicePlayback/sendPlaybackCommand';
import { liveMediaStore } from '../lib/livePlayback/liveMediaStore';

export type PlayerTransport = {
  isRemote: boolean;
  isPlaying: boolean;
  isLive: boolean;
  playbackSpeed: PlaybackSpeedValue;
  hasResource: boolean;
  togglePlayPause: () => void;
  seekTo: (seconds: number) => void;
  jumpBy: (deltaSeconds: number) => void;
  cyclePlaybackSpeed: () => void;
  goToLive: () => void;
};

/**
 * State for a control that just ran. `local` plays in this tab. `drop` is a remote tab with
 * nothing loaded, so the control does not start audio here.
 */
function readRemoteControlState():
  { kind: 'local' } | { kind: 'drop' } | { kind: 'remote'; state: DTOPlaybackState } {
  const snapshot = crossDevicePlaybackStore.getSnapshot();
  if (snapshot.role !== 'remote') {
    return { kind: 'local' };
  }
  const state = snapshot.displayState;
  if (state === null || state.resource === null) {
    return { kind: 'drop' };
  }
  return { kind: 'remote', state };
}

export function usePlayerTransport(): PlayerTransport {
  // Remote display is subscribed only in the remote role, so local publishes do not re-render.
  const role = useCrossDevicePlaybackSnapshot((snapshot) => snapshot.role);
  const displayState = useCrossDevicePlaybackSnapshot((snapshot) =>
    snapshot.role === 'remote' ? snapshot.displayState : null
  );
  const isRemote = role === 'remote';

  const {
    mpAddByRSS,
    mpChannel,
    mpIsPlaying,
    mpItem,
    mpPlaybackSpeed,
    setMPIsPlaying,
    setMPPlaybackSpeed,
  } = useMediaPlayer();
  const { seek, jumpBy: jumpByOnElement } = useMediaPlayerControls();
  const { setMPCurrentTime } = useMediaPlayerCurrentTime();

  const togglePlayPause = useCallback(() => {
    const remote = readRemoteControlState();
    if (remote.kind === 'drop') {
      return;
    }
    if (remote.kind === 'remote') {
      void sendPlaybackCommand(
        remote.state.status === 'paused' ? { type: 'play' } : { type: 'pause' }
      );
      return;
    }
    setMPIsPlaying(!mpIsPlaying);
  }, [mpIsPlaying, setMPIsPlaying]);

  const seekTo = useCallback(
    (seconds: number) => {
      const remote = readRemoteControlState();
      if (remote.kind === 'drop') {
        return;
      }
      if (remote.kind === 'remote') {
        const positionSeconds = clampRemoteSeekSeconds(remote.state, seconds);
        if (positionSeconds === null) {
          return;
        }
        void sendPlaybackCommand({ type: 'seek', position_seconds: positionSeconds });
        return;
      }
      if (isPlayerResourceLive({ mpItem, mpAddByRSS })) {
        liveMediaStore.seekTo(seconds);
        return;
      }
      seek(seconds);
      setMPCurrentTime(seconds);
    },
    [mpAddByRSS, mpItem, seek, setMPCurrentTime]
  );

  const jumpBy = useCallback(
    (deltaSeconds: number) => {
      const remote = readRemoteControlState();
      if (remote.kind === 'drop') {
        return;
      }
      if (remote.kind === 'remote') {
        const positionSeconds = resolveRemoteJumpTarget({
          remoteState: remote.state,
          estimatedPositionSeconds: crossDevicePlaybackStore.getEstimatedPositionSeconds(),
          deltaSeconds,
        });
        if (positionSeconds === null) {
          return;
        }
        void sendPlaybackCommand({ type: 'seek', position_seconds: positionSeconds });
        return;
      }
      if (isPlayerResourceLive({ mpItem, mpAddByRSS })) {
        liveMediaStore.jumpBy(deltaSeconds);
        return;
      }
      setMPCurrentTime(jumpByOnElement(deltaSeconds));
    },
    [jumpByOnElement, mpAddByRSS, mpItem, setMPCurrentTime]
  );

  const goToLive = useCallback(() => {
    const remote = readRemoteControlState();
    if (remote.kind === 'drop' || remote.kind === 'remote') {
      return;
    }
    if (!isPlayerResourceLive({ mpItem, mpAddByRSS })) {
      return;
    }
    liveMediaStore.goToLive();
    setMPIsPlaying(true);
  }, [mpAddByRSS, mpItem, setMPIsPlaying]);

  const cyclePlaybackSpeed = useCallback(() => {
    const remote = readRemoteControlState();
    if (remote.kind === 'drop') {
      return;
    }
    if (remote.kind === 'remote') {
      void sendPlaybackCommand({
        type: 'set_rate',
        rate: getNextPlaybackSpeed(nearestPlaybackSpeedValue(remote.state.rate)),
      });
      return;
    }
    setMPPlaybackSpeed(getNextPlaybackSpeed(mpPlaybackSpeed));
  }, [mpPlaybackSpeed, setMPPlaybackSpeed]);

  const isPlaying = isRemote
    ? displayState !== null && displayState.status !== 'paused'
    : mpIsPlaying;
  const isLive = isRemote
    ? displayState?.is_live === true
    : isPlayerResourceLive({ mpItem, mpAddByRSS });
  const playbackSpeed = isRemote
    ? nearestPlaybackSpeedValue(displayState?.rate ?? 1)
    : mpPlaybackSpeed;
  const hasResource = isRemote
    ? displayState !== null && displayState.resource !== null
    : mpChannel !== null || mpAddByRSS !== null;

  return {
    isRemote,
    isPlaying,
    isLive,
    playbackSpeed,
    hasResource,
    togglePlayPause,
    seekTo,
    jumpBy,
    cyclePlaybackSpeed,
    goToLive,
  };
}
