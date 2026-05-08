import classNames from 'classnames';
import type { ReactNode } from 'react';

import styles from './FooterLayout.module.scss';

export type FooterLayoutProps = {
  top: ReactNode;
  links: ReactNode;
  social: ReactNode;
  className?: string;
};

export function FooterLayout({ top, links, social, className }: FooterLayoutProps) {
  return (
    <footer className={classNames(styles.footer, className)}>
      <div className={styles.footerTop}>{top}</div>
      <div className={styles.footerBottom}>
        {links}
        {social}
      </div>
    </footer>
  );
}
