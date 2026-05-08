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
  | 'linkInline'
  | 'mini'
  | 'miniSelected'
  | 'miniGlow'
  | 'miniGlowWarning'
  | 'miniGlowDanger'
  | 'unstyled';

type ButtonProps = {
  block?: boolean;
  children: React.ReactNode;
  onClick?: (
    event: React.MouseEvent<HTMLButtonElement> | React.MouseEvent<HTMLAnchorElement>
  ) => void;
  onKeyDown?: (
    event: React.KeyboardEvent<HTMLButtonElement> | React.KeyboardEvent<HTMLAnchorElement>
  ) => void;
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
  /** Renders an `<a>` with the same button chrome (do not wrap `<Button>` in `<a>`). */
  href?: string;
  target?: React.HTMLAttributeAnchorTarget;
  rel?: string;
};

export const Button = React.forwardRef<HTMLButtonElement | HTMLAnchorElement, ButtonProps>(
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
      href,
      target,
      rel,
      ...rest
    },
    ref
  ) => {
    const sharedClassName = classNames(
      styles.button,
      cssClass(styles, variant),
      { [cssClass(styles, 'disabled')]: disabled || isLoading },
      { [cssClass(styles, 'block')]: block },
      className
    );

    const inactive = disabled || isLoading;

    const inner = (
      <>
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
      </>
    );

    const asLink = href !== undefined && href !== '';

    const linkElement = asLink ? (
      <a
        {...rest}
        ref={ref as React.Ref<HTMLAnchorElement>}
        href={inactive ? undefined : href}
        target={target}
        rel={rel ?? (target === '_blank' ? 'noopener noreferrer' : undefined)}
        className={sharedClassName}
        style={style}
        aria-label={ariaLabel}
        aria-describedby={ariaDescribedBy}
        aria-pressed={ariaPressed}
        aria-haspopup={ariaHasPopup}
        aria-expanded={ariaExpanded}
        aria-disabled={inactive || undefined}
        aria-busy={isLoading || undefined}
        tabIndex={inactive ? -1 : tabIndex}
        autoFocus={autoFocus}
        id={id}
        title={title}
        onClick={(event) => {
          if (inactive) {
            event.preventDefault();
            return;
          }
          onClick?.(event);
        }}
        onKeyDown={onKeyDown}
      >
        {inner}
      </a>
    ) : null;

    const buttonElement = !asLink ? (
      <button
        ref={ref as React.Ref<HTMLButtonElement>}
        type={type}
        onClick={onClick}
        onKeyDown={onKeyDown}
        disabled={inactive}
        className={sharedClassName}
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
        {inner}
      </button>
    ) : null;

    const controlElement = asLink ? linkElement : buttonElement;

    if (description || errorMessage) {
      return (
        <div className={styles.buttonWrapper}>
          {description && <p className={styles.buttonDescription}>{description}</p>}
          {controlElement}
          {errorMessage && <p className={styles.buttonError}>{errorMessage}</p>}
        </div>
      );
    }

    return controlElement;
  }
);

Button.displayName = 'Button';
