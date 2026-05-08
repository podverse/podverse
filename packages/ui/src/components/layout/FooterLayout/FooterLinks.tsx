import classNames from 'classnames';
import type { ReactNode } from 'react';

import styles from './FooterLayout.module.scss';

export type FooterLinksProps = {
  children: ReactNode;
  className?: string;
};

export function FooterLinks({ children, className }: FooterLinksProps) {
  return <div className={classNames(styles.footerLinks, className)}>{children}</div>;
}
