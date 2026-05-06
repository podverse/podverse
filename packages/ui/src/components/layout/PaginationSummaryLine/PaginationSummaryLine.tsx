import classNames from 'classnames';
import type { HTMLAttributes } from 'react';

import styles from './PaginationSummaryLine.module.scss';

export type PaginationSummaryLineProps = HTMLAttributes<HTMLParagraphElement>;

export function PaginationSummaryLine({ className, ...rest }: PaginationSummaryLineProps) {
  return <p className={classNames(styles.root, className)} {...rest} />;
}
