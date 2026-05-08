import classNames from 'classnames';
import type { FormHTMLAttributes, HTMLAttributes } from 'react';

import styles from './FormContainer.module.scss';

export type FormContainerProps = FormHTMLAttributes<HTMLFormElement>;

/**
 * `<form>` constrained to **`max-width: var(--form-max-width-md)`** — no flex column or vertical **`gap`** on
 * the root. Use {@link StackForm} (often inside {@link FormMaxWidth}) when fields should share the standard
 * **`--spacing-3xl`** stack rhythm.
 */
export function FormContainer({ children, className, ...rest }: FormContainerProps) {
  return (
    <form {...rest} className={classNames(styles.root, className)}>
      {children}
    </form>
  );
}

export type FormMaxWidthProps = HTMLAttributes<HTMLDivElement>;

/** Non-`<form>` layout shell with the same max-width as {@link FormContainer}. */
export function FormMaxWidth({ children, className, ...rest }: FormMaxWidthProps) {
  return (
    <div {...rest} className={classNames(styles.root, className)}>
      {children}
    </div>
  );
}
