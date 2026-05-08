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
  /** Breadcrumb trail — full width below the title/actions row on wide layouts */
  headerBreadcrumbs?: ReactNode;
  /** Primary actions (e.g. `PageHeaderActions`). Not for breadcrumbs — use `headerBreadcrumbs`. */
  headerChildren?: ReactNode;
  /** Apply to the `<main>` element wrapping `children` */
  mainClassName?: string;
};

export type LeadParagraphProps = {
  children: ReactNode;
  className?: string;
};

/** Muted intro line under the page header (compose in `<main>` when order differs from `subtitle`). */
export function LeadParagraph({ children, className }: LeadParagraphProps) {
  return <p className={classNames(styles.lead, className)}>{children}</p>;
}

export function ManagementPageShell({
  children,
  className,
  title,
  subtitle,
  headerBreadcrumbs,
  headerChildren,
  mainClassName,
}: ManagementPageShellProps) {
  const hasTitle = title !== undefined;
  const hasSubtitle = subtitle !== undefined;
  const hasHeaderBreadcrumbs = headerBreadcrumbs !== undefined;
  const hasHeaderChildren = headerChildren !== undefined;
  const hasHeaderGrid = hasTitle || hasHeaderBreadcrumbs || hasHeaderChildren;
  const hasHeaderBlock = hasHeaderGrid || hasSubtitle;

  const headerGridClassName = classNames(
    styles.headerGrid,
    hasTitle && !hasHeaderBreadcrumbs && !hasHeaderChildren && styles.headerGrid_titleOnly,
    hasTitle && hasHeaderBreadcrumbs && !hasHeaderChildren && styles.headerGrid_crumbsOnly,
    hasTitle && !hasHeaderBreadcrumbs && hasHeaderChildren && styles.headerGrid_actionsOnly,
    hasTitle && hasHeaderBreadcrumbs && hasHeaderChildren && styles.headerGrid_crumbsAndActions
  );

  return (
    <div className={classNames(styles.shell, className)}>
      {hasHeaderBlock ? (
        <header className={styles.header}>
          {hasHeaderGrid ? (
            <div className={headerGridClassName}>
              {hasTitle ? (
                <h1 className={classNames(styles.title, styles.gridTitle)}>{title}</h1>
              ) : null}
              {hasHeaderBreadcrumbs ? (
                <div className={classNames(styles.headerBreadcrumbsSlot, styles.gridCrumbs)}>
                  {headerBreadcrumbs}
                </div>
              ) : null}
              {hasHeaderChildren ? (
                <div className={classNames(styles.headerActionsSlot, styles.gridActions)}>
                  {headerChildren}
                </div>
              ) : null}
            </div>
          ) : null}
          {hasSubtitle ? <p className={styles.subtitle}>{subtitle}</p> : null}
        </header>
      ) : null}
      <main className={classNames(styles.main, mainClassName)}>{children}</main>
    </div>
  );
}
