import classNames from 'classnames';
import type { FormHTMLAttributes, HTMLAttributes } from 'react';

import styles from './FormContainer.module.scss';

export type FormContainerProps = FormHTMLAttributes<HTMLFormElement>;

/** Native `<form>` with management-web default max-width (`--form-max-width-md`). */
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
