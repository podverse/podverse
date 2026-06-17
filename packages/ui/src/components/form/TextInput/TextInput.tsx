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
import { FaCalendarDays, FaCircleQuestion, FaClock } from 'react-icons/fa6';

import { Button } from '../../button/Button/Button';
import { PopoverIcon } from '../../feedback/PopoverIcon/PopoverIcon';
import { TextInputNumberIncrement } from '../TextInputNumberIncrement/TextInputNumberIncrement';

import styles from './TextInput.module.scss';

function isNativePickerInputType(t: string): boolean {
  return t === 'date' || t === 'datetime-local' || t === 'time';
}

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
  /**
   * Where the optional `eyebrow` label is rendered.
   * - `inset` (default): inside the bordered control, above the value (dropdown-style).
   * - `field`: above the control, matching {@link RadioButton} group label spacing.
   */
  eyebrowPlacement?: 'field' | 'inset';
  id?: string;
  info?: string;
  /** When set with `info`, shows help in an inline popover beside the eyebrow instead of below the field. */
  infoAriaLabel?: string;
  infoError?: string;
  /** @default 'default' */
  layout?: 'compact' | 'default';
  max?: number;
  maxLength?: number;
  min?: number;
  minLength?: number;
  name?: string;
  /**
   * Accessible name for the trailing calendar/clock control when `eyebrow` is set with `type` `date`,
   * `datetime-local`, or `time` (same vertical alignment pattern as FormDropdown’s caret). Falls back to
   * `aria-label` on this control when omitted.
   */
  nativePickerAffixAriaLabel?: string;
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
  infoAriaLabel,
  infoError,
  eyebrowPlacement = 'inset',
  placeholder,
  type = 'text',
  disabled = false,
  readOnly = false,
  className,
  layout = 'default',
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
  nativePickerAffixAriaLabel,
  ...rest
}: TextInputProps) {
  const inputId = id ?? name ?? undefined;
  const showInfoPopover =
    info !== undefined &&
    info !== '' &&
    infoAriaLabel !== undefined &&
    infoAriaLabel !== '';
  const showInfoBelow = info !== undefined && info !== '' && !showInfoPopover;
  const infoId = showInfoBelow ? `${inputId ?? 'textinput'}-info` : undefined;
  const infoErrorId = infoError ? `${inputId ?? 'textinput'}-error` : undefined;
  const describedBy = showInfoBelow && infoId !== undefined ? infoId : ariaDescribedBy;

  const inputRef = useRef<HTMLInputElement>(null);
  const hasSuffix = suffix !== undefined && suffix !== '';
  const hasPrefix = prefix !== undefined && prefix !== '';
  const hasAffixes = hasPrefix || hasSuffix;
  const suffixInputWidthCh = hasSuffix ? Math.max(2, (value === '' ? '0' : value).length) : null;

  const pickerAffixAriaLabel = nativePickerAffixAriaLabel ?? ariaLabel;
  const useEyebrowNativePickerRow =
    eyebrow !== undefined &&
    eyebrow !== '' &&
    isNativePickerInputType(type) &&
    !hasAffixes &&
    pickerAffixAriaLabel !== undefined &&
    pickerAffixAriaLabel !== '';

  const openNativePicker = () => {
    const el = inputRef.current;
    if (!el) {
      return;
    }
    if (typeof el.showPicker === 'function') {
      try {
        void el.showPicker();
      } catch {
        el.focus();
      }
    } else {
      el.focus();
    }
  };

  const sharedInputClassName = classNames(
    styles.input,
    useEyebrowNativePickerRow && styles.inputNativePickerIndicatorHidden,
    hasSuffix && styles.inputWithSuffix,
    type === 'number' && styles.numberInput,
    type === 'number' && Boolean(suffix) && styles.numberInputWithSuffix
  );

  const renderEyebrow = (placement: 'field' | 'inset') => {
    if (eyebrow === undefined || eyebrow === '') {
      return null;
    }

    if (eyebrowPlacement !== placement) {
      return null;
    }

    if (showInfoPopover) {
      return (
        <div
          className={classNames(
            styles.eyebrowRow,
            placement === 'field' && styles.fieldLabelRow
          )}
        >
          <label htmlFor={inputId} className={styles.eyebrow}>
            {eyebrow}
          </label>
          <PopoverIcon
            ariaLabel={infoAriaLabel}
            body={info}
            icon={<FaCircleQuestion aria-hidden className={styles.helpIcon} />}
            interaction="click"
          />
        </div>
      );
    }

    return (
      <label
        htmlFor={inputId}
        className={classNames(
          styles.eyebrow,
          placement === 'field' && styles.fieldLabel
        )}
      >
        {eyebrow}
      </label>
    );
  };

  return (
    <div
      className={classNames(
        styles.textInput,
        layout === 'compact' && styles.textInputCompact,
        className
      )}
      style={style}
    >
      {renderEyebrow('field')}
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
          {useEyebrowNativePickerRow ? (
            <>
              {renderEyebrow('inset')}
              <span className={styles.nativePickerInputBox}>
                <input
                  ref={inputRef}
                  aria-describedby={describedBy}
                  aria-invalid={ariaInvalid}
                  aria-label={ariaLabel}
                  aria-required={ariaRequired}
                  autoFocus={autoFocus}
                  className={sharedInputClassName}
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
              </span>
            </>
          ) : (
            <>
              {renderEyebrow('inset')}
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
                    aria-describedby={describedBy}
                    aria-invalid={ariaInvalid}
                    aria-label={ariaLabel}
                    aria-required={ariaRequired}
                    autoFocus={autoFocus}
                    className={sharedInputClassName}
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
                  aria-describedby={describedBy}
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
            </>
          )}
        </div>
        {useEyebrowNativePickerRow ? (
          <button
            aria-label={pickerAffixAriaLabel}
            className={styles.nativePickerAffix}
            disabled={disabled || readOnly}
            type="button"
            onClick={() => {
              if (!disabled && !readOnly) {
                openNativePicker();
              }
            }}
          >
            {type === 'time' ? (
              <FaClock aria-hidden className={styles.nativePickerAffixIcon} />
            ) : (
              <FaCalendarDays aria-hidden className={styles.nativePickerAffixIcon} />
            )}
          </button>
        ) : null}
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
      {showInfoBelow ? (
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
