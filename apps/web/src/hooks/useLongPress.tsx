'use client';

import { useCallback, useEffect, useRef } from 'react';

export type UseLongPressOptions = {
  onLongPress: () => void | Promise<void>;
  onClick: () => void | Promise<void>;
  delayMs?: number;
};

export type UseLongPressReturn = {
  onClick: () => void;
  onPointerDown: (e: React.PointerEvent) => void;
  onPointerUp: () => void;
  onPointerLeave: () => void;
  onPointerCancel: () => void;
};

const DEFAULT_DELAY_MS = 500;

export function useLongPress(options: UseLongPressOptions): UseLongPressReturn {
  const { onLongPress, onClick, delayMs = DEFAULT_DELAY_MS } = options;
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressHandledRef = useRef(false);

  const onLongPressRef = useRef(onLongPress);
  const onClickRef = useRef(onClick);
  useEffect(() => {
    onLongPressRef.current = onLongPress;
    onClickRef.current = onClick;
  }, [onLongPress, onClick]);

  const clearTimer = useCallback(() => {
    if (longPressTimerRef.current !== null) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return;
      longPressHandledRef.current = false;
      clearTimer();
      longPressTimerRef.current = setTimeout(() => {
        longPressTimerRef.current = null;
        longPressHandledRef.current = true;
        void Promise.resolve(onLongPressRef.current()).catch(() => {});
      }, delayMs);
    },
    [delayMs, clearTimer]
  );

  const onPointerUp = useCallback(() => {
    clearTimer();
  }, [clearTimer]);

  const onPointerLeave = useCallback(() => {
    clearTimer();
  }, [clearTimer]);

  const onPointerCancel = useCallback(() => {
    clearTimer();
  }, [clearTimer]);

  useEffect(() => () => clearTimer(), [clearTimer]);

  const handleClick = useCallback(() => {
    if (longPressHandledRef.current) {
      longPressHandledRef.current = false;
      return;
    }
    void Promise.resolve(onClickRef.current()).catch(() => {});
  }, []);

  return {
    onClick: handleClick,
    onPointerDown,
    onPointerUp,
    onPointerLeave,
    onPointerCancel,
  };
}
