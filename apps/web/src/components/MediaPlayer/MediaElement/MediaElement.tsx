'use client';

import { createElement, type CSSProperties, type ReactElement, type RefObject } from 'react';

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
 * Single non-live `<audio>` / `<video>` shell. `key` stays `${audio|video}::file` until HLS attach
 * mode exists (livestream plan-set).
 */
export function MediaElement(props: MediaElementProps): ReactElement {
  const { isVideo, source, mediaRef, preload = 'auto', hidden, style } = props;
  const layoutStyle = hidden ? { display: 'none' as const, ...style } : style;
  const elementKey = `${isVideo ? 'video' : 'audio'}::file`;
  const file =
    source !== null && source.kind === 'file'
      ? { src: source.src, mimeType: source.mimeType }
      : null;

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
