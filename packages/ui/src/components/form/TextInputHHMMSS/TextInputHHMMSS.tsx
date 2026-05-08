import type { AriaAttributes, ChangeEvent } from 'react';
import { FaPlay } from 'react-icons/fa6';

import { formatInputToHHMMSS } from '@podverse/helpers';

import styles from './TextInputHHMMSS.module.scss';

export type TextInputHHMMSSProps = {
  'aria-describedby'?: string;
  'aria-invalid'?: AriaAttributes['aria-invalid'];
  'aria-label': string;
  'aria-required'?: AriaAttributes['aria-required'];
  buttonAriaLabel: string;
  className?: string;
  eyebrow?: string;
  name: string;
  onButtonClick: () => void;
  onChange: (val: string) => void;
  placeholder: string;
  value: string;
};

export function TextInputHHMMSS({
  value,
  onChange,
  eyebrow,
  className,
  name,
  placeholder,
  onButtonClick,
  buttonAriaLabel,
  'aria-label': ariaLabel,
  'aria-describedby': ariaDescribedBy,
  'aria-required': ariaRequired,
  'aria-invalid': ariaInvalid,
}: TextInputHHMMSSProps) {
  const inputId = name || undefined;

  return (
    <div className={`${styles.hhmmss} ${className ?? ''}`}>
      <div className={styles.hhmmssInputWrapper}>
        <div className={styles.hhmmssInnerInputWrapper}>
          {eyebrow ? (
            <label htmlFor={inputId} className={styles.eyebrow}>
              {eyebrow}
            </label>
          ) : null}
          <input
            aria-describedby={ariaDescribedBy}
            aria-invalid={ariaInvalid}
            aria-label={ariaLabel}
            aria-required={ariaRequired}
            className={styles.input}
            id={inputId}
            name={name}
            placeholder={placeholder}
            type="text"
            value={value}
            onChange={(event: ChangeEvent<HTMLInputElement>) => {
              onChange(formatInputToHHMMSS(event.target.value));
            }}
          />
        </div>
        <button
          aria-label={buttonAriaLabel}
          className={styles.buttonWrapper}
          type="button"
          onClick={onButtonClick}
        >
          <FaPlay className={styles.playIcon} />
        </button>
      </div>
    </div>
  );
}
