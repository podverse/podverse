'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from 'react';

import {
  clampFloatingVideoPosition,
  hasExceededFloatingVideoDragStartThreshold,
  shouldFloatingVideoPortalIgnoreDrag,
  type FloatingVideoPosition,
} from '../utils/mediaPlayer/floatingVideoPortalDrag';

type ActiveDragState = {
  pointerId: number;
  offsetX: number;
  offsetY: number;
};

type PendingDragState = {
  pointerId: number;
  startClientX: number;
  startClientY: number;
  offsetX: number;
  offsetY: number;
};

export function useFloatingVideoTransform(containerRef: RefObject<HTMLElement | null>) {
  const [position, setPosition] = useState<FloatingVideoPosition | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragEnabled, setDragEnabled] = useState(false);
  const activeDragRef = useRef<ActiveDragState | null>(null);
  const pendingDragRef = useRef<PendingDragState | null>(null);
  const didDragRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const mediaQuery = window.matchMedia('(pointer: fine)');
    const updateDragEnabled = () => {
      setDragEnabled(mediaQuery.matches);
    };
    updateDragEnabled();
    mediaQuery.addEventListener('change', updateDragEnabled);
    return () => {
      mediaQuery.removeEventListener('change', updateDragEnabled);
    };
  }, []);

  const containerStyle: CSSProperties =
    position !== null
      ? {
          left: position.left,
          top: position.top,
          right: 'auto',
          bottom: 'auto',
        }
      : {};

  const updateDragPosition = useCallback(
    (event: ReactPointerEvent<HTMLElement>, dragState: ActiveDragState) => {
      const container = containerRef.current;
      if (container === null) {
        return;
      }
      const rect = container.getBoundingClientRect();
      const nextPosition = clampFloatingVideoPosition(
        event.clientX - dragState.offsetX,
        event.clientY - dragState.offsetY,
        rect.width,
        rect.height,
        window.innerWidth,
        window.innerHeight
      );
      setPosition(nextPosition);
    },
    [containerRef]
  );

  const beginDrag = useCallback(
    (event: ReactPointerEvent<HTMLElement>, pending: PendingDragState) => {
      const container = containerRef.current;
      if (container === null) {
        return;
      }
      event.preventDefault();
      const rect = container.getBoundingClientRect();
      if (position === null) {
        setPosition({ left: rect.left, top: rect.top });
      }
      activeDragRef.current = {
        pointerId: pending.pointerId,
        offsetX: pending.offsetX,
        offsetY: pending.offsetY,
      };
      pendingDragRef.current = null;
      event.currentTarget.setPointerCapture(event.pointerId);
      setIsDragging(true);
      didDragRef.current = true;
      if (activeDragRef.current !== null) {
        updateDragPosition(event, activeDragRef.current);
      }
    },
    [containerRef, position, updateDragPosition]
  );

  const clearPendingDrag = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    const pending = pendingDragRef.current;
    if (pending !== null && event.pointerId === pending.pointerId) {
      pendingDragRef.current = null;
    }
  }, []);

  const endDrag = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    const activeDrag = activeDragRef.current;
    if (activeDrag !== null && event.pointerId === activeDrag.pointerId) {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      activeDragRef.current = null;
      setIsDragging(false);
    }
    clearPendingDrag(event);
  }, [clearPendingDrag]);

  const onPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      const pending = pendingDragRef.current;
      if (
        pending !== null &&
        event.pointerId === pending.pointerId &&
        activeDragRef.current === null &&
        hasExceededFloatingVideoDragStartThreshold(
          pending.startClientX,
          pending.startClientY,
          event.clientX,
          event.clientY
        )
      ) {
        beginDrag(event, pending);
        return;
      }

      const activeDrag = activeDragRef.current;
      if (activeDrag === null || event.pointerId !== activeDrag.pointerId) {
        return;
      }
      updateDragPosition(event, activeDrag);
    },
    [beginDrag, updateDragPosition]
  );

  const onPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (!dragEnabled || event.pointerType === 'touch' || event.button !== 0) {
        return;
      }
      if (shouldFloatingVideoPortalIgnoreDrag(event.target)) {
        return;
      }
      const container = containerRef.current;
      if (container === null) {
        return;
      }
      const rect = container.getBoundingClientRect();
      pendingDragRef.current = {
        pointerId: event.pointerId,
        startClientX: event.clientX,
        startClientY: event.clientY,
        offsetX: event.clientX - rect.left,
        offsetY: event.clientY - rect.top,
      };
      didDragRef.current = false;
    },
    [containerRef, dragEnabled]
  );

  const consumeClickAfterDrag = useCallback((): boolean => {
    if (didDragRef.current) {
      didDragRef.current = false;
      return true;
    }
    return false;
  }, []);

  const dragHandleProps = dragEnabled
    ? {
        onPointerDown,
        onPointerMove,
        onPointerUp: endDrag,
        onPointerCancel: endDrag,
      }
    : {};

  return {
    containerStyle,
    dragHandleProps,
    isDragging,
    dragEnabled,
    consumeClickAfterDrag,
  };
}
