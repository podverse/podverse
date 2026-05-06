import classNames from 'classnames';
import type { HTMLAttributes } from 'react';

import styles from './ToolbarCluster.module.scss';

export type ToolbarClusterProps = HTMLAttributes<HTMLDivElement>;

export function ToolbarCluster({ className, ...rest }: ToolbarClusterProps) {
  return <div className={classNames(styles.root, className)} {...rest} />;
}
