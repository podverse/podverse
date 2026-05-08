'use client';

import { useTranslations } from 'next-intl';

import type { LoadingSpinnerProps } from '@podverse/ui';
import { LoadingSpinner } from '@podverse/ui';

export type ManagementLoadingSpinnerSmallProps = Omit<LoadingSpinnerProps, 'ariaLabel' | 'size'>;

export function ManagementLoadingSpinnerSmall(props: ManagementLoadingSpinnerSmallProps) {
  const tm = useTranslations('misc');
  return <LoadingSpinner ariaLabel={tm('loading')} size="small" {...props} />;
}
