import classNames from 'classnames';
import type { SelectHTMLAttributes } from 'react';
import { forwardRef } from 'react';

import styles from './FieldPrimitives.module.scss';

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement>;

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { className, ...props },
  ref
) {
  return <select ref={ref} className={classNames(styles.select, className)} {...props} />;
});
