import classNames from 'classnames';
import type { FormHTMLAttributes } from 'react';

import formStackStyles from '../FormStack/FormStack.module.scss';

export type StackFormProps = FormHTMLAttributes<HTMLFormElement>;

/**
 * Native `<form>` with the same vertical spacing as {@link FormStack}
 * (flex column, `--spacing-3xl` gap between direct children).
 */
export function StackForm({ children, className, ...rest }: StackFormProps) {
  return (
    <form {...rest} className={classNames(formStackStyles.stack, className)}>
      {children}
    </form>
  );
}
