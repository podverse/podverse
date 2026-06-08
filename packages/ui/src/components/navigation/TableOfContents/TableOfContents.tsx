import classNames from 'classnames';

import styles from './TableOfContents.module.scss';

export type TableOfContentsLinkItem = {
  id: string;
  label: string;
};

export type TableOfContentsSection = {
  id: string;
  label: string;
  items: TableOfContentsLinkItem[];
};

/** @deprecated Use {@link TableOfContentsSection} via the `sections` prop. */
export type TableOfContentsItem = TableOfContentsLinkItem;

export type TableOfContentsProps = {
  /** Localized nav landmark label (required; no default copy in shared UI). */
  navAriaLabel: string;
  /** Optional visible heading above the link list. */
  heading?: string;
  /** Grouped sections with nested demo links. */
  sections: TableOfContentsSection[];
  className?: string;
};

export function TableOfContents({ navAriaLabel, heading, sections, className }: TableOfContentsProps) {
  if (sections.length === 0) {
    return null;
  }

  return (
    <nav aria-label={navAriaLabel} className={classNames(styles.tableOfContents, className)}>
      {heading !== undefined && heading !== '' ? (
        <h2 className={styles.heading}>{heading}</h2>
      ) : null}
      <ul className={styles.list}>
        {sections.map((section) => (
          <li key={section.id} className={styles.section}>
            <a className={classNames(styles.link, styles.sectionLink)} href={`#${section.id}`}>
              <span aria-hidden="true" className={styles.sectionBullet}>
                •
              </span>
              {section.label}
            </a>
            {section.items.length > 0 ? (
              <ul className={styles.nestedList}>
                {section.items.map((item) => (
                  <li key={item.id}>
                    <a className={classNames(styles.link, styles.nestedLink)} href={`#${item.id}`}>
                      <span aria-hidden="true" className={styles.nestedBullet}>
                        –
                      </span>
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
          </li>
        ))}
      </ul>
    </nav>
  );
}
