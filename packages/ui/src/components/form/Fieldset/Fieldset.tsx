import classNames from 'classnames';
import type { ReactNode } from 'react';

import styles from './Fieldset.module.scss';

export type FieldsetProps = {
  legend: ReactNode;
  children: ReactNode;
  className?: string;
};

/** Bordered `<fieldset>` with styled `<legend>`. */
export function Fieldset({ legend, children, className }: FieldsetProps) {
  return (
    <fieldset className={classNames(styles.fieldset, className)}>
      <legend className={styles.legend}>{legend}</legend>
      {children}
    </fieldset>
  );
}
