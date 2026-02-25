'use client';

import { useCallback, useRef } from 'react';
import { FaChevronUp, FaChevronDown } from 'react-icons/fa';
import styles from '../../styles/components/Form/TextInputNumberIncrements.module.scss';
import { useTranslations } from 'next-intl';

/** Delay (ms) before repeat starts after initial press */
const INITIAL_HOLD_DELAY_MS = 400;
/** Interval (ms) between steps when repeat first starts */
const FIRST_REPEAT_INTERVAL_MS = 120;
/** Cap only at an extremely high rate (ms); acceleration continues until release or this floor */
const MIN_REPEAT_INTERVAL_MS = 4;
/** Each repeat multiplies the interval by this; smaller = slower, steadier acceleration (0.96 ≈ 4% faster per step) */
const INTERVAL_DECAY = 0.96;

type NumberStepperProps = {
  value: string;
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled: boolean;
  readOnly: boolean;
};

export const TextInputNumberIncrement: React.FC<NumberStepperProps> = ({
  value,
  onChange,
  min,
  max,
  step,
  disabled,
  readOnly,
}) => {
  const tMisc = useTranslations('misc');
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
      const onChangeFn = onChangeRef.current;
      if (onChangeFn === undefined) {
        return;
      }
      const currentValue = valueRef.current;
      const current = currentValue === '' ? 0 : Number(currentValue);
      const stepVal = step ?? 1;
      let next = current + stepVal * direction;
      if (typeof min === 'number') {
        next = Math.max(next, min);
      }
      if (typeof max === 'number') {
        next = Math.min(next, max);
      }
      valueRef.current = String(next);
      const event = {
        ...({} as React.ChangeEvent<HTMLInputElement>),
        target: { value: String(next) },
      };
      onChangeFn(event as React.ChangeEvent<HTMLInputElement>);
    },
    [step, min, max]
  );

  const scheduleRepeat = useCallback(() => {
    const direction = directionRef.current;
    if (direction === null) {
      return;
    }
    repeatCountRef.current += 1;
    // Slowly but steadily accelerate: interval shrinks each step; only clamped at very high rate (4 ms)
    const rawInterval =
      FIRST_REPEAT_INTERVAL_MS * Math.pow(INTERVAL_DECAY, repeatCountRef.current - 1);
    const interval = Math.max(MIN_REPEAT_INTERVAL_MS, rawInterval);
    repeatTimeoutRef.current = setTimeout(() => {
      repeatTimeoutRef.current = null;
      fireStep(direction);
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
    <>
      <div className={styles.wrapper}>
        <button
          type="button"
          aria-label={tMisc('increment')}
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
          aria-label={tMisc('decrement')}
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
    </>
  );
};
