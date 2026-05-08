'use client';

import { useTranslations } from 'next-intl';

import type { LoadingSpinnerOverlayProps } from '@podverse/ui';
import { LoadingSpinnerOverlay } from '@podverse/ui';

export type ManagementLoadingSpinnerOverlayProps = Omit<LoadingSpinnerOverlayProps, 'ariaLabel'>;

/**
 * Full-viewport loading veil using `misc.loading` for the spinner announcement.
 * Prefer this over bare `LoadingSpinner` in management-web for async page/table loads.
 */
export function ManagementLoadingSpinnerOverlay(props: ManagementLoadingSpinnerOverlayProps) {
  const t = useTranslations('misc');
  return <LoadingSpinnerOverlay ariaLabel={t('loading')} {...props} />;
}

export type ManagementLoadingSpinnerOverlayStatusProps = Omit<
  LoadingSpinnerOverlayProps,
  'ariaLabel' | 'message'
> & {
  /** Localized status line; used for both visible message and aria announcement. */
  message: string;
};

/**
 * Overlay with a localized status line (aria + visible message share the same string).
 */
export function ManagementLoadingSpinnerOverlayStatus({
  message,
  ...rest
}: ManagementLoadingSpinnerOverlayStatusProps) {
  return <LoadingSpinnerOverlay {...rest} ariaLabel={message} message={message} />;
}
