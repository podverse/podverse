import classNames from 'classnames';

import styles from './TableOfContents.module.scss';

export type TableOfContentsItem = {
  id: string;
  label: string;
};

export type TableOfContentsProps = {
  /** Localized nav landmark label (required; no default copy in shared UI). */
  navAriaLabel: string;
  /** Optional visible heading above the link list. */
  heading?: string;
  items: TableOfContentsItem[];
  className?: string;
};

export function TableOfContents({
  navAriaLabel,
  heading,
  items,
  className,
}: TableOfContentsProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <nav
      aria-label={navAriaLabel}
      className={classNames(styles.tableOfContents, className)}
    >
      {heading !== undefined && heading !== '' ? (
        <p className={styles.heading}>{heading}</p>
      ) : null}
      <ul className={styles.list}>
        {items.map((item) => (
          <li key={item.id}>
            <a className={styles.link} href={`#${item.id}`}>
              <span aria-hidden="true" className={styles.bullet}>
                •
              </span>
              {item.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
