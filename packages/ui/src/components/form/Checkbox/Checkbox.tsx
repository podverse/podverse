import classNames from 'classnames';
import type { InputHTMLAttributes, Ref } from 'react';
import { forwardRef } from 'react';

import styles from './Checkbox.module.scss';

export type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>;

/** Bare checkbox for table cells and custom layouts; use `CheckboxField` when a visible text label is required. */
export const Checkbox = forwardRef(function Checkbox(
  { className, ...rest }: CheckboxProps,
  ref: Ref<HTMLInputElement>
) {
  return (
    <input className={classNames(styles.root, className)} ref={ref} type="checkbox" {...rest} />
  );
});

Checkbox.displayName = 'Checkbox';
