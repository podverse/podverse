import classNames from 'classnames';
import type { ReactNode } from 'react';

import styles from './SectionHeading.module.scss';

export type SectionHeadingProps = {
  children: ReactNode;
  /** `h2` in cards, `h3` for chart-style titles, `h4` for subsections */
  level?: 2 | 3 | 4;
  /** Extra top margin (stats detail weekly breakdown) */
  spacedTop?: boolean;
  className?: string;
};

export function SectionHeading({
  children,
  level = 3,
  spacedTop = false,
  className,
}: SectionHeadingProps) {
  if (level === 2) {
    return <h2 className={classNames(styles.h2, styles.h2Tight, className)}>{children}</h2>;
  }

  if (level === 4) {
    return (
      <h4 className={classNames(styles.h4, spacedTop ? styles.h4Spaced : null, className)}>
        {children}
      </h4>
    );
  }

  return (
    <h3 className={classNames(styles.h3, spacedTop ? styles.h3SpacedTop : null, className)}>
      {children}
    </h3>
  );
}

export type SectionBlockProps = {
  children: ReactNode;
  className?: string;
};

/** Vertical spacing wrapper for chart/table sections */
export function SectionBlock({ children, className }: SectionBlockProps) {
  return <div className={classNames(styles.sectionSpaced, className)}>{children}</div>;
}
