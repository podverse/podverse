import classNames from 'classnames';
import type { HTMLAttributes } from 'react';

import styles from './FormHintText.module.scss';

export type FormHintTextProps = HTMLAttributes<HTMLParagraphElement> & {
  /** Default: tight top margin under a field */
  variant?: 'inline' | 'block';
};

export function FormHintText({ className, variant = 'inline', ...rest }: FormHintTextProps) {
  return (
    <p
      className={classNames(variant === 'block' ? styles.hintBlock : styles.hint, className)}
      {...rest}
    />
  );
}
