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
  setVolume: () => {},
  setMuted: () => {},
  setPlaybackRate: () => {},
  currentSourceKind: null,
  syncHttpFileUrlRestoreSeekAndPlay: () => {},
  applyItemEnclosureSurfaceChange: () => {},
});

const MediaPlayerControlsContext = createContext<MediaPlayerControlsContextValue | null>(null);

type RegistrarContextType = {
  register: (bridge: MediaElementBridge | null) => void;
};

const MediaPlayerControlsRegistrarContext = createContext<RegistrarContextType | null>(null);

export function MediaPlayerControlsProvider({ children }: { children: ReactNode }) {
  const [attached, setAttached] = useState<MediaElementBridge | null>(null);
  const register = useCallback((bridge: MediaElementBridge | null) => {
    setAttached(bridge);
  }, []);
  const registrarValue = useMemo(() => ({ register }), [register]);
  const value = useMemo((): MediaPlayerControlsContextValue => {
    if (attached === null) {
      return { ...noopMediaElementBridge, isAttached: false };
    }
    return { ...attached, isAttached: true };
  }, [attached]);
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
      ctx.register(null);
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
