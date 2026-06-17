import classNames from 'classnames';
import type { ReactNode } from 'react';

import styles from './CompactFieldRow.module.scss';

export type CompactFieldRowProps = {
  children: ReactNode;
  className?: string;
  /** Brief help shown below the row (localized by the app). */
  help?: string;
};

/**
 * Horizontal row for compact form fields (e.g. {@link CompactNumericInput}).
 * Each direct child is sized to one-sixth of the row width; long eyebrows ellipsis inside the slot.
 */
export function CompactFieldRow({ children, className, help }: CompactFieldRowProps) {
  return (
    <div className={classNames(styles.root, className)}>
      <div className={styles.row}>{children}</div>
      {help !== undefined && help !== '' ? <p className={styles.help}>{help}</p> : null}
    </div>
  );
}

/** @deprecated Prefer {@link CompactFieldRow}. */
export const CompactNumericInputRow = CompactFieldRow;

export type CompactNumericInputRowProps = CompactFieldRowProps;
