import type { ReactNode } from 'react';

import styles from './NavBar.module.scss';

export type NavBarProps = {
  brand: ReactNode;
  left?: ReactNode;
  right?: ReactNode;
};

export function NavBar({ brand, left, right }: NavBarProps) {
  return (
    <nav className={styles.navBar}>
      <div className={styles.brand}>{brand}</div>
      {left && <div className={styles.left}>{left}</div>}
      {right && <div className={styles.right}>{right}</div>}
    </nav>
  );
}
