import type { ReactNode } from 'react';

import styles from './MainHeader.module.scss';

export type MainHeaderProps = {
  title: string;
  buttonsNode?: ReactNode;
};

export function MainHeader({ title, buttonsNode }: MainHeaderProps) {
  return (
    <header className={styles.header}>
      <div className={styles.headerContent}>
        <h1 className={styles.title}>{title}</h1>
        {buttonsNode ? <div className={styles.buttons}>{buttonsNode}</div> : null}
      </div>
    </header>
  );
}
