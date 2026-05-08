'use client';

import classNames from 'classnames';
import type {
  AriaAttributes,
  ChangeEvent,
  CSSProperties,
  FocusEvent,
  KeyboardEventHandler,
  ReactNode,
  WheelEvent,
} from 'react';
import { useRef } from 'react';

import { Button } from '../../button/Button/Button';
import { TextInputNumberIncrement } from '../TextInputNumberIncrement/TextInputNumberIncrement';

import styles from './TextInput.module.scss';

export type TextInputButton = {
  disabled?: boolean;
  isLoading?: boolean;
  label: string;
  onClick: () => void;
};

export type TextInputButtonIcon = {
  className?: string;
  icon: ReactNode;
  onClick: () => void;
  position: 'start' | 'end';
};

export type TextInputProps = {
  autoComplete?: string;
  'aria-describedby'?: string;
  'aria-invalid'?: AriaAttributes['aria-invalid'];
  'aria-label'?: string;
  'aria-required'?: AriaAttributes['aria-required'];
  autoFocus?: boolean;
  button?: TextInputButton;
  buttonIcon?: TextInputButtonIcon;
  className?: string;
  disabled?: boolean;
  eyebrow?: string;
  id?: string;
  info?: string;
  infoError?: string;
  max?: number;
  maxLength?: number;
  min?: number;
  minLength?: number;
  name?: string;
  /** When `type` is `number`, localized labels for the vertical stepper buttons (required for stepper UI). */
  numberStepperAriaLabels?: { decrement: string; increment: string };
  onBlur?: (event: FocusEvent<HTMLInputElement>) => void;
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
  onKeyDown?: KeyboardEventHandler<HTMLInputElement>;
  onWheel?: (event: WheelEvent<HTMLInputElement>) => void;
  placeholder?: string;
  /** Rendered inside the input box, aligned left before the value (e.g. "$"). */
  prefix?: string;
  readOnly?: boolean;
  required?: boolean;
  step?: number;
  style?: CSSProperties;
  /** Rendered inside the input box, aligned right (e.g. "satoshis"); numeric-only when type="number". */
  suffix?: string;
  tabIndex?: number;
  type?: string;
  value: string;
};

export function TextInput({
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
  prefix,
  numberStepperAriaLabels,
  ...rest
}: TextInputProps) {
  const inputId = id ?? name ?? undefined;
  const infoId = info ? `${inputId ?? 'textinput'}-info` : undefined;
  const infoErrorId = infoError ? `${inputId ?? 'textinput'}-error` : undefined;

  const inputRef = useRef<HTMLInputElement>(null);
  const hasSuffix = suffix !== undefined && suffix !== '';
  const hasPrefix = prefix !== undefined && prefix !== '';
  const hasAffixes = hasPrefix || hasSuffix;
  const suffixInputWidthCh = hasSuffix ? Math.max(2, (value === '' ? '0' : value).length) : null;

  return (
    <div className={classNames(styles.textInput, className)} style={style}>
      <div
        className={classNames(styles.textInputWrapper, disabled && styles.textInputWrapperDisabled)}
      >
        {buttonIcon?.position === 'start' ? (
          <button
            className={classNames(styles.buttonIcon, styles.buttonIconStart, buttonIcon.className)}
            type="button"
            onClick={buttonIcon.onClick}
          >
            {buttonIcon.icon}
          </button>
        ) : null}
        <div className={styles.textInnerInputWrapper}>
          {eyebrow ? (
            <label htmlFor={inputId} className={styles.eyebrow}>
              {eyebrow}
            </label>
          ) : null}
          {hasAffixes ? (
            <div
              className={styles.inputWithAffixesRow}
              role="presentation"
              onClick={() => inputRef.current?.focus()}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  inputRef.current?.focus();
                }
              }}
            >
              {hasPrefix ? (
                <>
                  <span aria-hidden="true" className={styles.prefix}>
                    {prefix}
                  </span>
                  <span aria-hidden="true" className={styles.prefixSpacer} />
                </>
              ) : null}
              <input
                ref={inputRef}
                aria-describedby={info ? infoId : ariaDescribedBy}
                aria-invalid={ariaInvalid}
                aria-label={ariaLabel}
                aria-required={ariaRequired}
                autoFocus={autoFocus}
                className={classNames(
                  styles.input,
                  hasSuffix && styles.inputWithSuffix,
                  type === 'number' && styles.numberInput,
                  type === 'number' && Boolean(suffix) && styles.numberInputWithSuffix
                )}
                disabled={disabled}
                id={inputId}
                max={max}
                min={min}
                name={name}
                placeholder={placeholder}
                readOnly={readOnly}
                step={step}
                style={
                  suffixInputWidthCh !== null
                    ? { minWidth: '2ch', width: `${suffixInputWidthCh}ch` }
                    : undefined
                }
                tabIndex={tabIndex}
                type={type}
                value={value}
                onBlur={onBlur}
                onChange={onChange}
                onWheel={onWheel}
                {...rest}
              />
              {hasSuffix ? (
                <>
                  <span aria-hidden="true" className={styles.suffixSpacer} />
                  <span aria-hidden="true" className={styles.suffix}>
                    {suffix}
                  </span>
                </>
              ) : null}
            </div>
          ) : (
            <input
              aria-describedby={info ? infoId : ariaDescribedBy}
              aria-invalid={ariaInvalid}
              aria-label={ariaLabel}
              aria-required={ariaRequired}
              autoFocus={autoFocus}
              className={classNames(styles.input, type === 'number' && styles.numberInput)}
              disabled={disabled}
              id={inputId}
              max={max}
              min={min}
              name={name}
              placeholder={placeholder}
              readOnly={readOnly}
              step={step}
              tabIndex={tabIndex}
              type={type}
              value={value}
              onBlur={onBlur}
              onChange={onChange}
              onWheel={onWheel}
              {...rest}
            />
          )}
        </div>
        {type === 'number' && numberStepperAriaLabels !== undefined ? (
          <TextInputNumberIncrement
            decrementAriaLabel={numberStepperAriaLabels.decrement}
            disabled={disabled}
            incrementAriaLabel={numberStepperAriaLabels.increment}
            max={max}
            min={min}
            readOnly={readOnly}
            step={step}
            value={value}
            onChange={onChange}
          />
        ) : null}
        {button ? (
          <Button
            className={styles.button}
            disabled={button.disabled}
            isLoading={button.isLoading}
            variant="mini"
            onClick={button.onClick}
          >
            {button.label}
          </Button>
        ) : null}
        {buttonIcon?.position === 'end' ? (
          <button
            className={classNames(styles.buttonIcon, styles.buttonIconEnd, buttonIcon.className)}
            type="button"
            onClick={buttonIcon.onClick}
          >
            {buttonIcon.icon}
          </button>
        ) : null}
      </div>
      {info ? (
        <div id={infoId} className={styles.textInputInfo}>
          {info}
        </div>
      ) : null}
      {infoError ? (
        <div id={infoErrorId} className={styles.textInputInfoError}>
          {infoError}
        </div>
      ) : null}
    </div>
  );
}
