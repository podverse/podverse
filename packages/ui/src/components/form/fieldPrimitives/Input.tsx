import classNames from 'classnames';
import type { InputHTMLAttributes } from 'react';
import { forwardRef } from 'react';

import styles from './FieldPrimitives.module.scss';

export type InputProps = InputHTMLAttributes<HTMLInputElement>;

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, ...props },
  ref
) {
  return <input ref={ref} className={classNames(styles.input, className)} {...props} />;
});
