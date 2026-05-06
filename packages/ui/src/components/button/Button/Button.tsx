import classNames from 'classnames';
import type { AriaAttributes } from 'react';
import React from 'react';
import { FaChevronDown, FaSpinner } from 'react-icons/fa';

import { cssClass } from '../../../lib/cssModule';

import styles from './Button.module.scss';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'warning'
  | 'success'
  | 'danger'
  | 'outline'
  | 'link'
  | 'mini'
  | 'miniSelected'
  | 'miniGlow'
  | 'miniGlowWarning'
  | 'miniGlowDanger'
  | 'unstyled';

type ButtonProps = {
  block?: boolean;
  children: React.ReactNode;
  onClick?: (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
  onKeyDown?: (event: React.KeyboardEvent<HTMLButtonElement>) => void;
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
  className?: string;
  style?: React.CSSProperties;
  variant?: ButtonVariant;
  'aria-label'?: string;
  'aria-describedby'?: string;
  'aria-pressed'?: AriaAttributes['aria-pressed'];
  'aria-haspopup'?: AriaAttributes['aria-haspopup'];
  'aria-expanded'?: AriaAttributes['aria-expanded'];
  tabIndex?: number;
  autoFocus?: boolean;
  id?: string;
  name?: string;
  title?: string;
  role?: string;
  isDropdownButton?: boolean;
  isLoading?: boolean;
  description?: string;
  errorMessage?: string;
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      block = false,
      children,
      onClick,
      onKeyDown,
      type = 'button',
      disabled = false,
      className,
      style,
      variant = 'primary',
      'aria-label': ariaLabel,
      'aria-describedby': ariaDescribedBy,
      'aria-pressed': ariaPressed,
      'aria-haspopup': ariaHasPopup,
      'aria-expanded': ariaExpanded,
      tabIndex,
      autoFocus,
      id,
      name,
      title,
      role = 'button',
      isDropdownButton = false,
      isLoading = false,
      description,
      errorMessage,
      ...rest
    },
    ref
  ) => {
    const buttonElement = (
      <button
        ref={ref}
        type={type}
        onClick={onClick}
        onKeyDown={onKeyDown}
        disabled={disabled || isLoading}
        className={classNames(
          styles.button,
          cssClass(styles, variant),
          { [cssClass(styles, 'disabled')]: disabled || isLoading },
          { [cssClass(styles, 'block')]: block },
          className
        )}
        style={style}
        aria-label={ariaLabel}
        aria-describedby={ariaDescribedBy}
        aria-pressed={ariaPressed}
        aria-haspopup={ariaHasPopup}
        aria-expanded={ariaExpanded}
        tabIndex={tabIndex}
        autoFocus={autoFocus}
        id={id}
        name={name}
        title={title}
        role={role}
        {...rest}
      >
        <span
          className={classNames(styles.buttonContent, {
            [cssClass(styles, 'invisible')]: isLoading,
          })}
        >
          {children}
          {isDropdownButton && <FaChevronDown className={styles.chevronIcon} />}
        </span>
        {isLoading && (
          <span className={styles.spinnerWrapper}>
            <FaSpinner className={styles.spinner} />
          </span>
        )}
      </button>
    );

    if (description || errorMessage) {
      return (
        <div className={styles.buttonWrapper}>
          {description && <p className={styles.buttonDescription}>{description}</p>}
          {buttonElement}
          {errorMessage && <p className={styles.buttonError}>{errorMessage}</p>}
        </div>
      );
    }

    return buttonElement;
  }
);

Button.displayName = 'Button';
