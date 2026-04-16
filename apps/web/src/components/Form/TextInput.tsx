import classNames from 'classnames';
import type { AriaAttributes } from 'react';
import React, { useRef } from 'react';

import { cssClass } from '../../utils/cssModule';
import { Button } from '../Button/Button';
import { TextInputNumberIncrement } from './TextInputNumberIncrements';

import styles from '../../styles/components/Form/TextInput.module.scss';

type TextInputProps = {
  value: string;
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur?: (event: React.FocusEvent<HTMLInputElement>) => void;
  eyebrow?: string;
  info?: string;
  infoError?: string;
  placeholder?: string;
  type?: string;
  disabled?: boolean;
  readOnly?: boolean;
  className?: string;
  style?: React.CSSProperties;
  id?: string;
  name?: string;
  autoFocus?: boolean;
  tabIndex?: number;
  'aria-label'?: string;
  'aria-describedby'?: string;
  'aria-required'?: AriaAttributes['aria-required'];
  'aria-invalid'?: AriaAttributes['aria-invalid'];
  button?: TextInputButton;
  buttonIcon?: TextInputButtonIcon;
  onWheel?: (event: React.WheelEvent<HTMLInputElement>) => void;
  min?: number;
  max?: number;
  step?: number;
  /** Rendered inside the input box, aligned right (e.g. "satoshis"); input remains numeric-only when type="number" */
  suffix?: string;
};

export type TextInputButton = {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  isLoading?: boolean;
};

export type TextInputButtonIcon = {
  position: 'start' | 'end';
  icon: React.ReactNode;
  className?: string;
  onClick: () => void;
};

export const TextInput: React.FC<TextInputProps> = ({
  value,
  onChange,
  onBlur,
  eyebrow,
  info,
  infoError,
  placeholder,
  type = 'text',
  disabled = false,
  readOnly = false,
  className,
  style,
  id,
  name,
  autoFocus,
  tabIndex,
  'aria-label': ariaLabel,
  'aria-describedby': ariaDescribedBy,
  'aria-required': ariaRequired,
  'aria-invalid': ariaInvalid,
  button,
  buttonIcon,
  onWheel,
  min,
  max,
  step,
  suffix,
  ...rest
}) => {
  const inputId = id || name || undefined;
  const infoId = info ? `${inputId || 'textinput'}-info` : undefined;
  const infoErrorId = infoError ? `${inputId || 'textinput'}-error` : undefined;

  const inputRef = useRef<HTMLInputElement>(null);
  const suffixInputWidthCh =
    suffix !== undefined && suffix !== '' ? Math.max(2, (value === '' ? '0' : value).length) : null;

  return (
    <div className={`${styles.textInput} ${className || ''}`} style={style}>
      <div
        className={classNames(styles.textInputWrapper, disabled && styles.textInputWrapperDisabled)}
      >
        {buttonIcon?.position === 'start' && (
          <button
            className={classNames(
              styles.searchIcon,
              styles.buttonIcon,
              {
                [cssClass(styles, 'buttonIconStart')]: true,
                [cssClass(styles, 'buttonIconEnd')]: false,
              },
              buttonIcon.className
            )}
            onClick={buttonIcon.onClick}
          >
            {buttonIcon.icon}
          </button>
        )}
        <div className={styles.textInnerInputWrapper}>
          {eyebrow && (
            <label htmlFor={inputId} className={styles.eyebrow}>
              {eyebrow}
            </label>
          )}
          {suffix !== undefined && suffix !== '' ? (
            <div
              className={styles.inputWithSuffixRow}
              onClick={() => inputRef.current?.focus()}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  inputRef.current?.focus();
                }
              }}
              role="presentation"
            >
              <input
                ref={inputRef}
                id={inputId}
                name={name}
                type={type}
                value={value}
                onChange={onChange}
                onBlur={onBlur}
                placeholder={placeholder}
                disabled={disabled}
                readOnly={readOnly}
                autoFocus={autoFocus}
                tabIndex={tabIndex}
                aria-label={ariaLabel}
                aria-describedby={info ? infoId : ariaDescribedBy}
                aria-required={ariaRequired}
                className={classNames(styles.input, styles.inputWithSuffix, {
                  [cssClass(styles, 'numberInput')]: type === 'number',
                  [cssClass(styles, 'numberInputWithSuffix')]: type === 'number' && suffix,
                })}
                style={
                  suffixInputWidthCh !== null
                    ? { width: `${suffixInputWidthCh}ch`, minWidth: '2ch' }
                    : undefined
                }
                aria-invalid={ariaInvalid}
                onWheel={onWheel}
                min={min}
                max={max}
                step={step}
                {...rest}
              />
              <span className={styles.suffixSpacer} aria-hidden="true" />
              <span className={styles.suffix} aria-hidden="true">
                {suffix}
              </span>
            </div>
          ) : (
            <input
              id={inputId}
              name={name}
              type={type}
              value={value}
              onChange={onChange}
              onBlur={onBlur}
              placeholder={placeholder}
              disabled={disabled}
              readOnly={readOnly}
              autoFocus={autoFocus}
              tabIndex={tabIndex}
              aria-label={ariaLabel}
              aria-describedby={info ? infoId : ariaDescribedBy}
              aria-required={ariaRequired}
              className={classNames(styles.input, {
                [cssClass(styles, 'numberInput')]: type === 'number',
              })}
              aria-invalid={ariaInvalid}
              onWheel={onWheel}
              min={min}
              max={max}
              step={step}
              {...rest}
            />
          )}
        </div>
        {type === 'number' && (
          <TextInputNumberIncrement
            value={value}
            onChange={onChange}
            min={min}
            max={max}
            step={step}
            disabled={disabled}
            readOnly={readOnly}
          />
        )}
        {button && (
          <Button
            className={styles.button}
            onClick={button.onClick}
            variant="mini"
            disabled={button.disabled}
            isLoading={button.isLoading}
          >
            {button.label}
          </Button>
        )}
        {buttonIcon?.position === 'end' && (
          <button
            className={classNames(
              styles.searchIcon,
              styles.buttonIcon,
              {
                [cssClass(styles, 'buttonIconStart')]: true,
                [cssClass(styles, 'buttonIconEnd')]: false,
              },
              buttonIcon.className
            )}
            onClick={buttonIcon.onClick}
          >
            {buttonIcon.icon}
          </button>
        )}
      </div>
      {info && (
        <div id={infoId} className={styles.textInputInfo}>
          {info}
        </div>
      )}
      {infoError && (
        <div id={infoErrorId} className={styles.textInputInfoError}>
          {infoError}
        </div>
      )}
    </div>
  );
};
