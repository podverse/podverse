'use client';

import { useTranslations } from 'next-intl';

import type { LoadingSpinnerOverlayProps } from '@podverse/ui';
import { LoadingSpinnerOverlay } from '@podverse/ui';

export type WebLoadingSpinnerOverlayProps = Omit<LoadingSpinnerOverlayProps, 'ariaLabel'>;

/**
 * List/detail overlay using `misc.loading` for the spinner announcement.
 * Prefer this over repeating `LoadingSpinnerOverlay` + `tMisc('loading')` across the app.
 */
export function WebLoadingSpinnerOverlay(props: WebLoadingSpinnerOverlayProps) {
  const t = useTranslations('misc');
  return <LoadingSpinnerOverlay ariaLabel={t('loading')} {...props} />;
}

export type WebLoadingYourContentSpinnerOverlayProps = Omit<
  LoadingSpinnerOverlayProps,
  'ariaLabel' | 'message'
>;

/**
 * Full-page style Add-by-RSS loading: shared `misc.loading_your_content` for aria + message line.
 */
export function WebLoadingYourContentSpinnerOverlay(
  props: WebLoadingYourContentSpinnerOverlayProps
) {
  const t = useTranslations('misc');
  const message = t('loading_your_content');
  return <LoadingSpinnerOverlay {...props} ariaLabel={message} message={message} />;
}
