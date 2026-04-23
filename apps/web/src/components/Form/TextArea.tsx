import classNames from 'classnames';
import type { AriaAttributes } from 'react';
import React from 'react';
import { FaSpinner } from 'react-icons/fa';

import styles from '../../styles/components/Form/TextArea.module.scss';

type TextAreaProps = {
  value: string;
  onChange?: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  eyebrow?: string;
  info?: string;
  /** Renders on the left of the info row (same row as character counter when maxLength is set). */
  footerLeftContent?: React.ReactNode;
  placeholder?: string;
  rows?: number;
  type?: string;
  disabled?: boolean;
  readOnly?: boolean;
  className?: string;
  style?: React.CSSProperties;
  id?: string;
  name?: string;
  autoFocus?: boolean;
  tabIndex?: number;
  maxLength?: number;
  'aria-label'?: string;
  'aria-describedby'?: string;
  'aria-required'?: AriaAttributes['aria-required'];
  'aria-invalid'?: AriaAttributes['aria-invalid'];
  /** Centered spinner overlay over the textarea (e.g. mbrss-v1 capability loading). */
  showLoadingOverlay?: boolean;
  /** Accessible status for the loading overlay (e.g. translated string). */
  loadingOverlayStatusText?: string;
};

export const TextArea: React.FC<TextAreaProps> = ({
  value,
  onChange,
  eyebrow,
  info,
  footerLeftContent,
  placeholder,
  rows = 4,
  type: _type = 'text',
  disabled = false,
  readOnly = false,
  className,
  style,
  id,
  name,
  autoFocus,
  tabIndex,
  maxLength,
  'aria-label': ariaLabel,
  'aria-describedby': ariaDescribedBy,
  'aria-required': ariaRequired,
  'aria-invalid': ariaInvalid,
  showLoadingOverlay = false,
  loadingOverlayStatusText,
  ...rest
}) => {
  const textAreaId = id || name || undefined;
  const infoId = info ? `${textAreaId || 'textarea'}-info` : undefined;

  const handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (typeof maxLength === 'number' && event.target.value.length > maxLength) {
      event.target.value = event.target.value.slice(0, maxLength);
    }
    onChange?.(event);
  };

  return (
    <div className={classNames(styles.wrapper, className)} style={style}>
      <div
        className={classNames(styles.textAreaWrapper, disabled && styles.textAreaWrapperDisabled)}
      >
        <div className={styles.textInnerAreaWrapper}>
          {eyebrow && (
            <label htmlFor={textAreaId} className={styles.eyebrow}>
              {eyebrow}
            </label>
          )}
          <div className={styles.textAreaFieldShell}>
            <textarea
              id={textAreaId}
              className={styles.textArea}
              name={name}
              value={value}
              onChange={handleChange}
              placeholder={placeholder}
              disabled={disabled}
              readOnly={readOnly}
              rows={rows}
              autoFocus={autoFocus}
              tabIndex={tabIndex}
              maxLength={maxLength}
              aria-label={ariaLabel}
              aria-describedby={info ? infoId : ariaDescribedBy}
              aria-required={ariaRequired}
              aria-invalid={ariaInvalid}
              aria-busy={showLoadingOverlay ? true : undefined}
              {...rest}
            />
            {showLoadingOverlay && (
              <div
                className={styles.loadingOverlay}
                role="status"
                aria-live="polite"
                aria-label={loadingOverlayStatusText}
              >
                <FaSpinner className={styles.loadingSpinner} aria-hidden />
              </div>
            )}
          </div>
        </div>
      </div>
      {(info || typeof maxLength === 'number' || footerLeftContent) && (
        <div className={styles.textAreaInfoRow}>
          {footerLeftContent !== undefined ? (
            footerLeftContent
          ) : info ? (
            <div id={infoId} className={styles.textAreaInfo}>
              {info}
            </div>
          ) : null}
          {typeof maxLength === 'number' && (
            <div className={styles.textAreaCounter}>
              <span>
                {value.length} / {maxLength}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
