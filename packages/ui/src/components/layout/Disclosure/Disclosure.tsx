import { type ReactNode, useState } from 'react';

import styles from './Disclosure.module.scss';

export type DisclosureProps = {
  /** Visible label for the summary control (e.g. section title). */
  title: ReactNode;
  children: ReactNode;
  id?: string;
  className?: string;
  /** Initial open state; false = collapsed. */
  defaultOpen?: boolean;
  summaryClassName?: string;
  contentClassName?: string;
};

/**
 * A native `<details>`/`<summary>` block styled for in-app sections.
 * Reusable for category groups, FAQ rows, and other expand/collapse UI.
 */
export function Disclosure({
  title,
  children,
  id,
  className,
  defaultOpen = false,
  summaryClassName,
  contentClassName,
}: DisclosureProps) {
  const [open, setOpen] = useState(() => defaultOpen);

  return (
    <details
      id={id}
      className={[styles.root, className].filter(Boolean).join(' ')}
      open={open}
      onToggle={(event) => {
        setOpen(event.currentTarget.open);
      }}
    >
      <summary className={[styles.summary, summaryClassName].filter(Boolean).join(' ')}>
        <span className={styles.summaryInner}>
          <span className={styles.chevron} aria-hidden />
          <span className={styles.title}>{title}</span>
        </span>
      </summary>
      <div className={[styles.content, contentClassName].filter(Boolean).join(' ')}>{children}</div>
    </details>
  );
}
