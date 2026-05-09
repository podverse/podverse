'use client';

import type { CSSProperties, RefObject } from 'react';
import { useLayoutEffect, useState } from 'react';

import { clampRectToViewportEdges } from '../lib/viewport/clampRectToViewportEdges';

/** Matches typical `--spacing-sm`-scale inset from viewport edges when clamping dropdown panels. */
export const DROPDOWN_VIEWPORT_CLAMP_MARGIN_PX = 8;

export type UseDropdownViewportClampArgs = {
  open: boolean;
  menuRef: RefObject<HTMLUListElement | null>;
  menuItemCount: number;
  position?: 'left' | 'right';
  fullWidth?: boolean;
  verticalPosition?: 'above' | 'below';
};

export function useDropdownViewportClamp({
  open,
  menuRef,
  menuItemCount,
  position,
  fullWidth,
  verticalPosition = 'below',
}: UseDropdownViewportClampArgs): { viewportClampStyle: CSSProperties } {
  const [offset, setOffset] = useState({ dx: 0, dy: 0 });

  useLayoutEffect(() => {
    if (!open) {
      setOffset({ dx: 0, dy: 0 });
      return;
    }

    const run = () => {
      const el = menuRef.current;
      if (!el) {
        return;
      }
      const rect = el.getBoundingClientRect();
      const { dx, dy } = clampRectToViewportEdges(
        rect,
        window.innerWidth,
        window.innerHeight,
        DROPDOWN_VIEWPORT_CLAMP_MARGIN_PX
      );
      setOffset({ dx, dy });
    };

    run();

    window.addEventListener('resize', run);
    window.addEventListener('scroll', run, true);
    return () => {
      window.removeEventListener('resize', run);
      window.removeEventListener('scroll', run, true);
    };
  }, [open, menuItemCount, position, fullWidth, verticalPosition, menuRef]);

  if (!open) {
    return { viewportClampStyle: {} };
  }

  if (offset.dx === 0 && offset.dy === 0) {
    return { viewportClampStyle: {} };
  }

  return {
    viewportClampStyle: {
      transform: `translate(${offset.dx}px, ${offset.dy}px)`,
    },
  };
}
