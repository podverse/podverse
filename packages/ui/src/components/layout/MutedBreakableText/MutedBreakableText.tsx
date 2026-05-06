import classNames from 'classnames';
import type { HTMLAttributes } from 'react';

import styles from './MutedBreakableText.module.scss';

export type MutedBreakableTextProps = HTMLAttributes<HTMLDivElement>;

export function MutedBreakableText({ className, ...rest }: MutedBreakableTextProps) {
  return <div className={classNames(styles.root, className)} {...rest} />;
}
