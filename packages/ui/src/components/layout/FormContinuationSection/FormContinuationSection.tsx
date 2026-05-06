import classNames from 'classnames';
import type { HTMLAttributes } from 'react';

import styles from './FormContinuationSection.module.scss';

export type FormContinuationSectionProps = HTMLAttributes<HTMLDivElement>;

export function FormContinuationSection({ className, ...rest }: FormContinuationSectionProps) {
  return <div className={classNames(styles.root, className)} {...rest} />;
}
