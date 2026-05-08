'use client';

import classNames from 'classnames';

import {
  LoadingSpinnerOverlay,
  type LoadingSpinnerOverlayProps,
} from '../LoadingSpinnerOverlay/LoadingSpinnerOverlay';

import styles from './NavigationLoadingOverlay.module.scss';

export type NavigationLoadingOverlayProps = LoadingSpinnerOverlayProps;

/**
 * Full-viewport loading veil that blocks interaction while async navigation / list loads complete.
 * Prefer over `LoadingSpinnerOverlay` when the user must not click underlying UI.
 */
export function NavigationLoadingOverlay(props: NavigationLoadingOverlayProps) {
  const { className, ...rest } = props;
  return <LoadingSpinnerOverlay {...rest} className={classNames(styles.blocking, className)} />;
}
