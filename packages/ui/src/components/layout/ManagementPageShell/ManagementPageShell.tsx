import classNames from 'classnames';
import type { ReactNode } from 'react';

import styles from './ManagementPageShell.module.scss';

export type ManagementPageShellProps = {
  children: ReactNode;
  className?: string;
  /** Shown as page `<h1>` */
  title?: ReactNode;
  /** Secondary line below header row (e.g. welcome copy), muted body style */
  subtitle?: ReactNode;
  /** Breadcrumbs, toolbar beside title, etc. — rendered after `title`, before `subtitle` */
  headerChildren?: ReactNode;
  /** Apply to the `<main>` element wrapping `children` */
  mainClassName?: string;
};

export type LeadParagraphProps = {
  children: ReactNode;
  className?: string;
};

/** Muted intro line under the page title (compose inside `headerChildren` when order differs from `subtitle`). */
export function LeadParagraph({ children, className }: LeadParagraphProps) {
  return <p className={classNames(styles.lead, className)}>{children}</p>;
}

export function ManagementPageShell({
  children,
  className,
  title,
  subtitle,
  headerChildren,
  mainClassName,
}: ManagementPageShellProps) {
  const hasTitle = title !== undefined;
  const hasSubtitle = subtitle !== undefined;
  const hasHeaderBlock = hasTitle || headerChildren !== undefined || hasSubtitle;

  return (
    <div className={classNames(styles.shell, className)}>
      {hasHeaderBlock ? (
        <header className={styles.header}>
          {hasTitle ? <h1 className={styles.title}>{title}</h1> : null}
          {headerChildren}
          {hasSubtitle ? <p className={styles.subtitle}>{subtitle}</p> : null}
        </header>
      ) : null}
      <main className={classNames(styles.main, mainClassName)}>{children}</main>
    </div>
  );
}
