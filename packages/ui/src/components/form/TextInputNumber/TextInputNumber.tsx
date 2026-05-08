import type { ChangeEvent, InputHTMLAttributes } from 'react';

import { TextInput } from '../TextInput/TextInput';

import styles from './TextInputNumber.module.scss';

export type TextInputNumberProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'onChange' | 'type' | 'value'
> & {
  eyebrow?: string;
  infoError?: string;
  max?: number;
  min?: number;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  prefix?: string;
  /** Localized accessible labels for the numeric stepper buttons. */
  stepperAriaLabels: { decrement: string; increment: string };
  step?: number;
  /** Shown inside the input area on the right (e.g. currency unit). */
  sideText?: string;
  value: number | string;
};

export function TextInputNumber({
  value,
  onChange,
  min,
  max,
  step = 1,
  eyebrow,
  sideText,
  prefix,
  infoError,
  stepperAriaLabels,
  ...rest
}: TextInputNumberProps) {
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === '' || /^-?\d*\.?\d*$/.test(val)) {
      onChange(e);
    }
  };

  return (
    <div className={styles.wrapper}>
      <TextInput
        {...rest}
        eyebrow={eyebrow}
        infoError={infoError}
        max={max}
        min={min}
        numberStepperAriaLabels={stepperAriaLabels}
        prefix={prefix}
        step={step}
        suffix={sideText}
        type="number"
        value={value.toString()}
        onChange={handleChange}
        onWheel={(e) => {
          e.currentTarget.blur();
        }}
      />
    </div>
  );
}
