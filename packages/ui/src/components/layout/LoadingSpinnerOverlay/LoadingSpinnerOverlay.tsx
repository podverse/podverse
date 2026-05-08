import classNames from 'classnames';
import type { CSSProperties } from 'react';

import type { LoadingSpinnerSize } from '../LoadingSpinner';
import { LoadingSpinner } from '../LoadingSpinner';

import styles from './LoadingSpinnerOverlay.module.scss';

export type LoadingSpinnerOverlaySize = Exclude<LoadingSpinnerSize, 'inline'>;

export type LoadingSpinnerOverlayProps = {
  isLoading?: boolean;
  /** Localized optional status line — supplied by the app when shown. */
  message?: string;
  size?: LoadingSpinnerOverlaySize;
  className?: string;
  style?: CSSProperties;
  /** Passed to the inner `LoadingSpinner` as its accessible name when loading. */
  ariaLabel: string;
};

/**
 * Full-viewport loading veil with optional message and sidebar-aware horizontal offset.
 * Inner spinner uses `LoadingSpinner` so callers control the loading announcement via
 * `ariaLabel`.
 */
export function LoadingSpinnerOverlay({
  isLoading = false,
  message,
  size = 'large',
  className,
  style,
  ariaLabel,
}: LoadingSpinnerOverlayProps) {
  if (!isLoading) {
    return null;
  }

  return (
    <div className={classNames(styles.overlay, styles.overlayShell, className)} style={style}>
      <div className={styles.content}>
        {message !== undefined && message !== '' && <div className={styles.message}>{message}</div>}
        <div className={styles.spinnerWrapper}>
          <LoadingSpinner ariaLabel={ariaLabel} size={size} />
        </div>
      </div>
    </div>
  );
}
