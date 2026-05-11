import classNames from 'classnames';

import { LoadingSpinner } from '../LoadingSpinner/index';

import styles from './LazyLoadPlaceholder.module.scss';

export type LazyLoadPlaceholderProps = {
  /** Localized accessible name for the loading region. */
  ariaLabel: string;
  className?: string;
};

export function LazyLoadPlaceholder({ ariaLabel, className }: LazyLoadPlaceholderProps) {
  return (
    <div
      className={classNames(styles.placeholder, className)}
      role="status"
      aria-live="polite"
      aria-label={ariaLabel}
    >
      <LoadingSpinner decorative />
    </div>
  );
}
