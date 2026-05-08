'use client';

import { useTranslations } from 'next-intl';

import type { LoadingSpinnerProps } from '@podverse/ui';
import { LoadingSpinner } from '@podverse/ui';

export type ManagementLoadingSpinnerFullProps = Omit<LoadingSpinnerProps, 'ariaLabel'>;

export function ManagementLoadingSpinnerFull(props: ManagementLoadingSpinnerFullProps) {
  const tm = useTranslations('misc');
  return <LoadingSpinner ariaLabel={tm('loading')} {...props} />;
}
