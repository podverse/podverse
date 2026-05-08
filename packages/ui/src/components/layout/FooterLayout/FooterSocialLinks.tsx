import classNames from 'classnames';
import type { ReactNode } from 'react';

import styles from './FooterLayout.module.scss';

export type FooterSocialLinksProps = {
  children: ReactNode;
  className?: string;
};

export function FooterSocialLinks({ children, className }: FooterSocialLinksProps) {
  return <div className={classNames(styles.footerSocialLinks, className)}>{children}</div>;
}
