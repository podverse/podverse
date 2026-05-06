import classNames from 'classnames';
import type { HTMLAttributes } from 'react';

import styles from './FlexBetween.module.scss';

export type FlexBetweenProps = HTMLAttributes<HTMLDivElement>;

export function FlexBetween({ className, ...rest }: FlexBetweenProps) {
  return <div className={classNames(styles.root, className)} {...rest} />;
}
