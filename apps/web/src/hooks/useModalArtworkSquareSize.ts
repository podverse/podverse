'use client';

import type { RefObject } from 'react';
import { useCallback, useEffect, useLayoutEffect, useState } from 'react';

// Run measurement before paint in the browser to avoid a first-frame flash; fall back to
// useEffect during SSR where layout effects are not available.
const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

type UseModalArtworkSquareSizeParams = {
  /** Container that defines the full available column (title band + art + subtitle band). */
  infoRef: RefObject<HTMLElement | null>;
  /** Reserved title band whose measured height is subtracted from the available area. */
  titleRef: RefObject<HTMLElement | null>;
  /** Reserved subtitle band whose measured height is subtracted from the available area. */
  subtitleRef: RefObject<HTMLElement | null>;
  /** When false (e.g. video is showing), measurement is skipped and the size resets. */
  active: boolean;
};

/**
 * Sizes the square audio artwork to the largest square that fits the available area
 * (`min(availableWidth, availableHeight)`), where available height is the info column height
 * minus the reserved title/subtitle bands and the two gaps between them.
 *
 * CSS alone cannot size a hugging box to the smaller of two dynamic flex dimensions, so this
 * measures the layout and returns an explicit side length. The art wrapper then hugs the square,
 * keeping the title/subtitle a consistent gap away in both wide and tall-narrow windows.
 */
export function useModalArtworkSquareSize({
  infoRef,
  titleRef,
  subtitleRef,
  active,
}: UseModalArtworkSquareSizeParams): number | null {
  const [side, setSide] = useState<number | null>(null);

  const recompute = useCallback(() => {
    if (!active) {
      setSide(null);
      return;
    }
    const info = infoRef.current;
    if (!info) {
      return;
    }
    const infoRect = info.getBoundingClientRect();
    const titleHeight = titleRef.current?.getBoundingClientRect().height ?? 0;
    const subtitleHeight = subtitleRef.current?.getBoundingClientRect().height ?? 0;

    const rowGapRaw = window.getComputedStyle(info).rowGap;
    const rowGap = Number.parseFloat(rowGapRaw);
    const gapTotal = Number.isFinite(rowGap) ? rowGap * 2 : 0;

    const availableHeight = infoRect.height - titleHeight - subtitleHeight - gapTotal;
    const availableWidth = infoRect.width;
    const nextSide = Math.max(0, Math.floor(Math.min(availableWidth, availableHeight)));
    setSide(nextSide > 0 ? nextSide : null);
  }, [active, infoRef, titleRef, subtitleRef]);

  useIsomorphicLayoutEffect(() => {
    if (!active) {
      setSide(null);
      return;
    }
    recompute();

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', recompute);
      return () => {
        window.removeEventListener('resize', recompute);
      };
    }

    const observer = new ResizeObserver(() => {
      recompute();
    });
    const info = infoRef.current;
    const title = titleRef.current;
    const subtitle = subtitleRef.current;
    if (info) {
      observer.observe(info);
    }
    if (title) {
      observer.observe(title);
    }
    if (subtitle) {
      observer.observe(subtitle);
    }
    window.addEventListener('resize', recompute);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', recompute);
    };
  }, [active, recompute, infoRef, titleRef, subtitleRef]);

  return side;
}
