import classNames from 'classnames';
import type { LabelHTMLAttributes } from 'react';
import { forwardRef } from 'react';

import styles from './FieldPrimitives.module.scss';

export type LabelProps = LabelHTMLAttributes<HTMLLabelElement>;

export const Label = forwardRef<HTMLLabelElement, LabelProps>(function Label(
  { className, ...props },
  ref
) {
  return <label ref={ref} className={classNames(styles.label, className)} {...props} />;
});
