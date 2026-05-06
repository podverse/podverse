import classNames from 'classnames';
import type { HTMLAttributes } from 'react';

import styles from './EmptyStateText.module.scss';

export type EmptyStateTextProps = HTMLAttributes<HTMLParagraphElement>;

export function EmptyStateText({ className, ...rest }: EmptyStateTextProps) {
  return <p className={classNames(styles.root, className)} {...rest} />;
}
