'use client';

import { useTranslations } from 'next-intl';

import { RouteNavigationLoading } from '@podverse/ui';

/**
 * Global in-app route transition overlay for the management-web app.
 */
export function ManagementRouteNavigationLoading() {
  const t = useTranslations('misc');
  return <RouteNavigationLoading ariaLabel={t('loading')} />;
}
