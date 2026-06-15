'use client';

import { useEffect, useRef } from 'react';

import {
  EMBED_RESIZE_MESSAGE_SOURCE,
  EMBED_RESIZE_MESSAGE_TYPE,
  type EmbedResizeMessage,
} from '../lib/embed/embedResizeMessage';

const RESIZE_POST_DEBOUNCE_MS = 100;

type UseEmbedTallAutoResizeInput = {
  enabled: boolean;
};

function resolveParentOriginFromReferrer(): string {
  if (document.referrer === '') {
    return '*';
  }

  try {
    return new URL(document.referrer).origin;
  } catch {
    return '*';
  }
}

export function useEmbedTallAutoResize({ enabled }: UseEmbedTallAutoResizeInput): void {
  const lastHeightRef = useRef<number | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const targetOrigin = resolveParentOriginFromReferrer();

    const postHeight = () => {
      const nextHeight = Math.ceil(document.documentElement.getBoundingClientRect().height);
      if (lastHeightRef.current === nextHeight) {
        return;
      }

      lastHeightRef.current = nextHeight;
      const message: EmbedResizeMessage = {
        source: EMBED_RESIZE_MESSAGE_SOURCE,
        type: EMBED_RESIZE_MESSAGE_TYPE,
        height: nextHeight,
      };

      window.parent.postMessage(message, targetOrigin);
    };

    const schedulePostHeight = () => {
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        timeoutRef.current = null;
        postHeight();
      }, RESIZE_POST_DEBOUNCE_MS);
    };

    postHeight();

    const observer = new ResizeObserver(() => {
      schedulePostHeight();
    });
    observer.observe(document.documentElement);

    window.addEventListener('resize', schedulePostHeight);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', schedulePostHeight);
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [enabled]);
}
