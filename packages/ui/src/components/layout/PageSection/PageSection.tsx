import classNames from 'classnames';
import type { HTMLAttributes } from 'react';

import styles from './PageSection.module.scss';

export type PageSectionProps = HTMLAttributes<HTMLElement>;

export function PageSection({ className, ...rest }: PageSectionProps) {
  return <section className={classNames(styles.section, className)} {...rest} />;
}
