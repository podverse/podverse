'use client';

import type { ChangeEvent } from 'react';
import { useCallback, useRef } from 'react';
import { FaChevronDown, FaChevronUp } from 'react-icons/fa';

import styles from './TextInputNumberIncrement.module.scss';

/** Delay (ms) before repeat starts after initial press */
const INITIAL_HOLD_DELAY_MS = 400;
/** Interval (ms) between steps when repeat first starts */
const FIRST_REPEAT_INTERVAL_MS = 120;
/** Cap only at an extremely high rate (ms); acceleration continues until release or this floor */
const MIN_REPEAT_INTERVAL_MS = 4;
/** Each repeat multiplies the interval by this; smaller = slower, steadier acceleration (0.96 ≈ 4% faster per step) */
const INTERVAL_DECAY = 0.96;

export type TextInputNumberIncrementProps = {
  value: string;
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled: boolean;
  readOnly: boolean;
  /** Localized accessible label for the increment (up) control. */
  incrementAriaLabel: string;
  /** Localized accessible label for the decrement (down) control. */
  decrementAriaLabel: string;
};

export function TextInputNumberIncrement({
  value,
  onChange,
  min,
  max,
  step,
  disabled,
  readOnly,
  incrementAriaLabel,
  decrementAriaLabel,
}: TextInputNumberIncrementProps) {
  const holdTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const repeatTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const repeatCountRef = useRef(0);
  const directionRef = useRef<1 | -1 | null>(null);

  const valueRef = useRef(value);
  const onChangeRef = useRef(onChange);
  valueRef.current = value;
  onChangeRef.current = onChange;

  const clearHold = useCallback(() => {
    if (holdTimeoutRef.current !== null) {
      clearTimeout(holdTimeoutRef.current);
      holdTimeoutRef.current = null;
    }
    if (repeatTimeoutRef.current !== null) {
      clearTimeout(repeatTimeoutRef.current);
      repeatTimeoutRef.current = null;
    }
    directionRef.current = null;
    repeatCountRef.current = 0;
  }, []);

  const fireStep = useCallback(
    (direction: 1 | -1) => {
      if (onChangeRef.current === undefined) {
        return;
      }
      const current = valueRef.current === '' ? 0 : Number(valueRef.current);
      const stepVal = step ?? 1;
      let next = current + stepVal * direction;
      if (typeof min === 'number') {
        next = Math.max(next, min);
      }
      if (typeof max === 'number') {
        next = Math.min(next, max);
      }
      valueRef.current = String(next);
      /* Synthetic change event for numeric steppers — parent handlers read target.value only. */
      const syntheticEvent = {
        target: { value: String(next) },
      } as ChangeEvent<HTMLInputElement>;
      onChangeRef.current(syntheticEvent);
    },
    [step, min, max]
  );

  const scheduleRepeat = useCallback(() => {
    if (directionRef.current === null) {
      return;
    }
    repeatCountRef.current += 1;
    const rawInterval =
      FIRST_REPEAT_INTERVAL_MS * Math.pow(INTERVAL_DECAY, repeatCountRef.current - 1);
    const interval = Math.max(MIN_REPEAT_INTERVAL_MS, rawInterval);
    repeatTimeoutRef.current = setTimeout(() => {
      repeatTimeoutRef.current = null;
      if (directionRef.current === null) {
        return;
      }
      const stepDirection = directionRef.current;
      fireStep(stepDirection);
      scheduleRepeat();
    }, interval);
  }, [fireStep]);

  const startHold = useCallback(
    (direction: 1 | -1) => {
      if (disabled || readOnly || onChange === undefined) {
        return;
      }
      clearHold();
      directionRef.current = direction;
      fireStep(direction);
      holdTimeoutRef.current = setTimeout(() => {
        holdTimeoutRef.current = null;
        repeatCountRef.current = 0;
        scheduleRepeat();
      }, INITIAL_HOLD_DELAY_MS);
    },
    [disabled, readOnly, onChange, clearHold, fireStep, scheduleRepeat]
  );

  const stopHold = useCallback(() => {
    clearHold();
  }, [clearHold]);

  const isDisabled = disabled || readOnly;

  return (
    <div className={styles.wrapper}>
      <button
        type="button"
        aria-label={incrementAriaLabel}
        onMouseDown={(e) => {
          e.preventDefault();
          startHold(1);
        }}
        onMouseLeave={stopHold}
        onMouseUp={stopHold}
        onTouchStart={(e) => {
          e.preventDefault();
          startHold(1);
        }}
        onTouchEnd={stopHold}
        onTouchCancel={stopHold}
        tabIndex={-1}
        disabled={isDisabled}
        className={styles.incrementButton}
      >
        <FaChevronUp />
      </button>
      <button
        type="button"
        aria-label={decrementAriaLabel}
        onMouseDown={(e) => {
          e.preventDefault();
          startHold(-1);
        }}
        onMouseLeave={stopHold}
        onMouseUp={stopHold}
        onTouchStart={(e) => {
          e.preventDefault();
          startHold(-1);
        }}
        onTouchEnd={stopHold}
        onTouchCancel={stopHold}
        tabIndex={-1}
        disabled={isDisabled}
        className={styles.decrementButton}
      >
        <FaChevronDown />
      </button>
    </div>
  );
}
