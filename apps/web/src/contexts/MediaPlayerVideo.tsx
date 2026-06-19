import type { ReactNode } from 'react';
import { createContext, useContext, useState } from 'react';

import type { FloatingVideoPosition } from '../utils/mediaPlayer/floatingVideoPortalDrag';
import type { FloatingVideoSize } from '../utils/mediaPlayer/floatingVideoPortalResize';

type Location = 'embedded' | 'full-modal' | 'floating' | null;

type MediaPlayerVideoType = {
  videoLocation: Location;
  setVideoLocation: (val: Location) => void;
  modalVideoTarget: HTMLElement | null;
  setModalVideoTarget: (el: HTMLElement | null) => void;
  modalVideoAspectRatio: number | null;
  setModalVideoAspectRatio: (val: number | null) => void;
  floatingPosition: FloatingVideoPosition | null;
  setFloatingPosition: (val: FloatingVideoPosition | null) => void;
  floatingSize: FloatingVideoSize | null;
  setFloatingSize: (val: FloatingVideoSize | null) => void;
};

export const MediaPlayerVideoContext = createContext<MediaPlayerVideoType | undefined>(undefined);

type MediaPlayerVideoProviderProps = {
  children: ReactNode;
};

export const MediaPlayerVideoProvider = ({ children }: MediaPlayerVideoProviderProps) => {
  const [videoLocation, setVideoLocation] = useState<Location>('floating');
  const [modalVideoTarget, setModalVideoTarget] = useState<HTMLElement | null>(null);
  const [modalVideoAspectRatio, setModalVideoAspectRatio] = useState<number | null>(null);
  const [floatingPosition, setFloatingPosition] = useState<FloatingVideoPosition | null>(null);
  const [floatingSize, setFloatingSize] = useState<FloatingVideoSize | null>(null);

  return (
    <MediaPlayerVideoContext.Provider
      value={{
        videoLocation,
        setVideoLocation,
        modalVideoTarget,
        setModalVideoTarget,
        modalVideoAspectRatio,
        setModalVideoAspectRatio,
        floatingPosition,
        setFloatingPosition,
        floatingSize,
        setFloatingSize,
      }}
    >
      {children}
    </MediaPlayerVideoContext.Provider>
  );
};

export function useMediaPlayerVideo() {
  const ctx = useContext(MediaPlayerVideoContext);
  if (!ctx) {
    throw new Error('useMediaPlayerVideo must be used within a MediaPlayerVideoProvider');
  }
  return ctx;
}
