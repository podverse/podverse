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
import {
  computeResizeFromBottomRightAnchor,
  fitFloatingVideoToViewport,
  resolveFloatingVideoAspectRatio,
  type FloatingVideoSize,
} from '../utils/mediaPlayer/floatingVideoPortalResize';

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

type ActiveResizeState = {
  pointerId: number;
  anchorRight: number;
  anchorBottom: number;
  aspectRatio: number;
};

export function useFloatingVideoTransform(containerRef: RefObject<HTMLElement | null>) {
  const [position, setPosition] = useState<FloatingVideoPosition | null>(null);
  const [size, setSize] = useState<FloatingVideoSize | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragEnabled, setDragEnabled] = useState(false);
  const [resizeEnabled, setResizeEnabled] = useState(false);
  const activeDragRef = useRef<ActiveDragState | null>(null);
  const pendingDragRef = useRef<PendingDragState | null>(null);
  const activeResizeRef = useRef<ActiveResizeState | null>(null);
  const didDragRef = useRef(false);
  const didResizeRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const mediaQuery = window.matchMedia('(pointer: fine)');
    const updateFinePointerEnabled = () => {
      const enabled = mediaQuery.matches;
      setDragEnabled(enabled);
      setResizeEnabled(enabled);
    };
    updateFinePointerEnabled();
    mediaQuery.addEventListener('change', updateFinePointerEnabled);
    return () => {
      mediaQuery.removeEventListener('change', updateFinePointerEnabled);
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    if (size === null && position === null) {
      return;
    }

    const refitToViewport = () => {
      const container = containerRef.current;
      if (container === null) {
        return;
      }
      const aspectRatio = resolveFloatingVideoAspectRatio(container);
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      if (size !== null && position !== null) {
        const fitted = fitFloatingVideoToViewport(
          size,
          position,
          aspectRatio,
          viewportWidth,
          viewportHeight
        );
        setSize(fitted.size);
        setPosition(fitted.position);
        return;
      }

      if (position !== null) {
        const rect = container.getBoundingClientRect();
        setPosition(
          clampFloatingVideoPosition(
            position.left,
            position.top,
            rect.width,
            rect.height,
            viewportWidth,
            viewportHeight
          )
        );
      }
    };

    window.addEventListener('resize', refitToViewport);
    return () => {
      window.removeEventListener('resize', refitToViewport);
    };
  }, [size, position, containerRef]);

  const containerStyle: CSSProperties = {
    ...(position !== null
      ? {
          left: position.left,
          top: position.top,
          right: 'auto',
          bottom: 'auto',
        }
      : {}),
    ...(size !== null
      ? {
          width: size.width,
          height: size.height,
        }
      : {}),
  };

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

  const endDrag = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      const activeDrag = activeDragRef.current;
      if (activeDrag !== null && event.pointerId === activeDrag.pointerId) {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          event.currentTarget.releasePointerCapture(event.pointerId);
        }
        activeDragRef.current = null;
        setIsDragging(false);
      }
      clearPendingDrag(event);
    },
    [clearPendingDrag]
  );

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

  const updateResizeFromPointer = useCallback(
    (event: ReactPointerEvent<HTMLElement>, resizeState: ActiveResizeState) => {
      const result = computeResizeFromBottomRightAnchor(
        resizeState.anchorRight,
        resizeState.anchorBottom,
        event.clientX,
        resizeState.aspectRatio,
        window.innerWidth,
        window.innerHeight
      );
      setSize(result.size);
      setPosition(result.position);
    },
    []
  );

  const endResize = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    const activeResize = activeResizeRef.current;
    if (activeResize !== null && event.pointerId === activeResize.pointerId) {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      activeResizeRef.current = null;
      setIsResizing(false);
    }
  }, []);

  const onResizePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      const activeResize = activeResizeRef.current;
      if (activeResize === null || event.pointerId !== activeResize.pointerId) {
        return;
      }
      updateResizeFromPointer(event, activeResize);
    },
    [updateResizeFromPointer]
  );

  const onResizePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (!resizeEnabled || event.pointerType === 'touch' || event.button !== 0) {
        return;
      }
      event.stopPropagation();
      event.preventDefault();
      const container = containerRef.current;
      if (container === null) {
        return;
      }
      const rect = container.getBoundingClientRect();
      const aspectRatio = resolveFloatingVideoAspectRatio(container);
      activeResizeRef.current = {
        pointerId: event.pointerId,
        anchorRight: rect.right,
        anchorBottom: rect.bottom,
        aspectRatio,
      };
      event.currentTarget.setPointerCapture(event.pointerId);
      setIsResizing(true);
      didResizeRef.current = true;
      updateResizeFromPointer(event, activeResizeRef.current);
    },
    [containerRef, resizeEnabled, updateResizeFromPointer]
  );

  const consumeClickAfterDrag = useCallback((): boolean => {
    if (didDragRef.current) {
      didDragRef.current = false;
      return true;
    }
    if (didResizeRef.current) {
      didResizeRef.current = false;
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

  const resizeHandleProps = resizeEnabled
    ? {
        onPointerDown: onResizePointerDown,
        onPointerMove: onResizePointerMove,
        onPointerUp: endResize,
        onPointerCancel: endResize,
      }
    : {};

  return {
    containerStyle,
    dragHandleProps,
    resizeHandleProps,
    isDragging,
    isResizing,
    dragEnabled,
    resizeEnabled,
    consumeClickAfterDrag,
  };
}
