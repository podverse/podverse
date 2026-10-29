'use client';

import classNames from 'classnames';
import type { MouseEvent, PointerEvent as ReactPointerEvent, ReactNode, Ref } from 'react';
import { forwardRef, useEffect, useRef } from 'react';

import styles from './HorizontalDragScroller.module.scss';

export type HorizontalDragScrollerProps = {
  children: ReactNode;
  className?: string;
  onScroll?: () => void;
};

/** Movement below this stays a click. Past it, the gesture scrolls and the click is swallowed. */
const DRAG_START_PX = 5;

function scrollerOverflows(scroller: HTMLElement): boolean {
  return scroller.scrollWidth - scroller.clientWidth > 1;
}

type Drag = {
  pointerId: number;
  startX: number;
  startScrollLeft: number;
  moved: boolean;
  removeWindowListeners: () => void;
};

/**
 * A horizontal scroller with no visible scrollbar. A mouse or pen drag scrolls it. A drag past a
 * few pixels does not activate the control under the pointer; a short press still does. Touch
 * scrolling stays with the browser. Controls inside keep their own cursor.
 */
export const HorizontalDragScroller = forwardRef(function HorizontalDragScroller(
  { children, className, onScroll }: HorizontalDragScrollerProps,
  forwardedRef: Ref<HTMLDivElement>
) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<Drag | null>(null);
  const suppressClickRef = useRef(false);

  const setScroller = (node: HTMLDivElement | null) => {
    scrollerRef.current = node;
    if (typeof forwardedRef === 'function') {
      forwardedRef(node);
    } else if (forwardedRef !== null) {
      forwardedRef.current = node;
    }
  };

  useEffect(() => {
    return () => {
      dragRef.current?.removeWindowListeners();
    };
  }, []);

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'touch' || event.button !== 0) {
      return;
    }
    const scroller = scrollerRef.current;
    if (scroller === null || !scrollerOverflows(scroller) || dragRef.current !== null) {
      return;
    }

    const pointerId = event.pointerId;
    const onMove = (moveEvent: PointerEvent) => {
      if (moveEvent.pointerId !== pointerId) {
        return;
      }
      const drag = dragRef.current;
      const node = scrollerRef.current;
      if (drag === null || node === null) {
        return;
      }
      const delta = moveEvent.clientX - drag.startX;
      if (!drag.moved) {
        if (Math.abs(delta) < DRAG_START_PX) {
          return;
        }
        drag.moved = true;
        suppressClickRef.current = true;
      }
      moveEvent.preventDefault();
      node.scrollLeft = drag.startScrollLeft - delta;
    };
    const onUp = (upEvent: PointerEvent) => {
      if (upEvent.pointerId !== pointerId) {
        return;
      }
      const drag = dragRef.current;
      drag?.removeWindowListeners();
      dragRef.current = null;
      if (drag === null || !drag.moved) {
        return;
      }
      suppressClickRef.current = true;
      window.setTimeout(() => {
        suppressClickRef.current = false;
      }, 0);
    };
    const listen = { capture: true } as const;
    const removeWindowListeners = () => {
      window.removeEventListener('pointermove', onMove, listen);
      window.removeEventListener('pointerup', onUp, listen);
      window.removeEventListener('pointercancel', onUp, listen);
    };
    dragRef.current = {
      pointerId,
      startX: event.clientX,
      startScrollLeft: scroller.scrollLeft,
      moved: false,
      removeWindowListeners,
    };
    window.addEventListener('pointermove', onMove, { capture: true, passive: false });
    window.addEventListener('pointerup', onUp, listen);
    window.addEventListener('pointercancel', onUp, listen);
  };

  const onClickCapture = (event: MouseEvent<HTMLDivElement>) => {
    if (!suppressClickRef.current) {
      return;
    }
    suppressClickRef.current = false;
    event.preventDefault();
    event.stopPropagation();
  };

  return (
    <div
      className={classNames(styles.scroller, className)}
      ref={setScroller}
      onPointerDown={onPointerDown}
      onClickCapture={onClickCapture}
      onScroll={onScroll}
    >
      {children}
    </div>
  );
});
