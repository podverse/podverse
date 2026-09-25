'use client';

import { createElement, useEffect } from 'react';
import type { CSSProperties, ReactElement, RefObject } from 'react';

import {
  attachNonLiveHlsPlayback,
  detachNonLiveHlsPlayback,
} from '../../../hooks/mediaElementBridgeSurface';
import type { MediaElementSource } from '../../../hooks/useMediaElementBridge';

export type MediaElementProps = {
  /** When `null`, mount an empty `<audio>` / `<video>` so the bridge can set `src` imperatively. */
  source: MediaElementSource | null;
  isVideo: boolean;
  mediaRef: RefObject<HTMLMediaElement | null>;
  preload?: 'auto' | 'metadata' | 'none';
  hidden?: boolean;
  style?: CSSProperties;
};

/**
 * Single non-live `<audio>` / `<video>` shell. A progressive file sets `src` here.
 * An HLS playlist omits `src` and is attached after mount: native HLS, or lazy `hls.js` when
 * the browser cannot play an HLS playlist itself.
 */
export function MediaElement(props: MediaElementProps): ReactElement {
  const { isVideo, source, mediaRef, preload = 'auto', hidden, style } = props;
  const layoutStyle = hidden ? { display: 'none' as const, ...style } : style;
  const elementKey = `${isVideo ? 'video' : 'audio'}::file`;
  const hlsPlaylistSrc = source?.delivery === 'hls' ? source.src : null;
  const file =
    source !== null && source.kind === 'file' && hlsPlaylistSrc === null ? { src: source.src } : null;

  useEffect(() => {
    const media = mediaRef.current;
    if (media === null) {
      return;
    }
    if (hlsPlaylistSrc === null) {
      detachNonLiveHlsPlayback(media);
      return;
    }
    let cancelled = false;
    void attachNonLiveHlsPlayback(media, hlsPlaylistSrc).then(() => {
      if (cancelled) {
        detachNonLiveHlsPlayback(media);
      }
    });
    return () => {
      cancelled = true;
      detachNonLiveHlsPlayback(media);
    };
  }, [mediaRef, hlsPlaylistSrc]);

  const srcProps = file !== null ? { src: file.src } : {};

  if (isVideo) {
    return createElement('video', {
      key: elementKey,
      ref: (el: HTMLVideoElement | null) => {
        mediaRef.current = el;
      },
      preload,
      style: layoutStyle,
      controls: false,
      ...srcProps,
    });
  }
  return createElement('audio', {
    key: elementKey,
    ref: (el: HTMLAudioElement | null) => {
      mediaRef.current = el;
    },
    preload,
    style: layoutStyle,
    ...srcProps,
  });
}
