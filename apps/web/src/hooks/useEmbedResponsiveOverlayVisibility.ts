'use client';

import { useEffect, useRef, useState } from 'react';

import { EMBED_VIDEO_OVERLAY_FADE_DURATION_MS } from '../lib/embed/embedLayoutTokens';

type UseEmbedResponsiveOverlayVisibilityInput = {
  isPlaying: boolean;
};

export function useEmbedResponsiveOverlayVisibility({
  isPlaying,
}: UseEmbedResponsiveOverlayVisibilityInput) {
  const [isHovering, setIsHovering] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (hideTimeoutRef.current !== null) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }

    if (!isPlaying) {
      setIsVisible(true);
      return;
    }

    if (isHovering || isFocused) {
      setIsVisible(true);
      return;
    }

    hideTimeoutRef.current = setTimeout(() => {
      setIsVisible(false);
      hideTimeoutRef.current = null;
    }, EMBED_VIDEO_OVERLAY_FADE_DURATION_MS);

    return () => {
      if (hideTimeoutRef.current !== null) {
        clearTimeout(hideTimeoutRef.current);
        hideTimeoutRef.current = null;
      }
    };
  }, [isFocused, isHovering, isPlaying]);

  return {
    isVisible,
    setIsHovering,
    setIsFocused,
  };
}
