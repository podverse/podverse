'use client';

import type { ReactNode } from 'react';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import type { MediaElementBridge } from '../hooks/useMediaElementBridge';

export type MediaPlayerControlsContextValue = MediaElementBridge & {
  /** True when the non-live file bridge is registered (regular AV mounted). */
  isAttached: boolean;
};

export const noopMediaElementBridge: MediaElementBridge = Object.freeze({
  loadAndStart: () => Promise.resolve(),
  play: () => Promise.resolve(),
  pause: () => {},
  togglePlay: () => Promise.resolve(),
  seek: () => {},
  jumpBy: () => 0,
  pauseAt: () => {},
  pauseAndDisarmBoundary: () => {},
  setVolume: () => {},
  setMuted: () => {},
  setPlaybackRate: () => {},
  currentSourceKind: null,
  syncHttpFileUrlRestoreSeekAndPlay: () => {},
  applyItemEnclosureSurfaceChange: () => {},
  readCurrentTimeSeconds: () => undefined,
});

const MediaPlayerControlsContext = createContext<MediaPlayerControlsContextValue | null>(null);

type RegistrarContextType = {
  register: (bridge: MediaElementBridge) => void;
  unregister: (bridge: MediaElementBridge) => void;
};

const MediaPlayerControlsRegistrarContext = createContext<RegistrarContextType | null>(null);

export function MediaPlayerControlsProvider({ children }: { children: ReactNode }) {
  // LIFO stack of registered bridges. Multiple non-live orchestrators (the always-mounted audio
  // element and the conditionally-mounted video element) register at once; the most recently
  // registered bridge owns active playback. Tracking the full stack means unmounting one
  // orchestrator falls back to the other instead of clearing the controls or leaving `seek`/`jumpBy`
  // pointed at a no-op bridge.
  const [stack, setStack] = useState<MediaElementBridge[]>([]);
  const register = useCallback((bridge: MediaElementBridge) => {
    setStack((prev) => (prev.includes(bridge) ? prev : [...prev, bridge]));
  }, []);
  const unregister = useCallback((bridge: MediaElementBridge) => {
    setStack((prev) => prev.filter((registered) => registered !== bridge));
  }, []);
  const registrarValue = useMemo(() => ({ register, unregister }), [register, unregister]);
  const value = useMemo((): MediaPlayerControlsContextValue => {
    const attached = stack[stack.length - 1] ?? null;
    if (attached === null) {
      return { ...noopMediaElementBridge, isAttached: false };
    }
    return { ...attached, isAttached: true };
  }, [stack]);
  return (
    <MediaPlayerControlsRegistrarContext.Provider value={registrarValue}>
      <MediaPlayerControlsContext.Provider value={value}>
        {children}
      </MediaPlayerControlsContext.Provider>
    </MediaPlayerControlsRegistrarContext.Provider>
  );
}

export function useRegisterMediaPlayerControlsBridge(bridge: MediaElementBridge): void {
  const ctx = useContext(MediaPlayerControlsRegistrarContext);
  useEffect(() => {
    if (!ctx) {
      return;
    }
    ctx.register(bridge);
    return () => {
      ctx.unregister(bridge);
    };
  }, [bridge, ctx]);
}

export function useMediaPlayerControls(): MediaPlayerControlsContextValue {
  const v = useContext(MediaPlayerControlsContext);
  if (!v) {
    throw new Error('useMediaPlayerControls must be used within MediaPlayerControlsProvider');
  }
  return v;
}
