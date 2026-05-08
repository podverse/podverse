'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';

import type { NavCard } from '@podverse/ui';
import { ManagementPageShell, NavCardGrid } from '@podverse/ui';

import { getConfig } from '../../../config';
import { useManagementClientSessionGuard } from '../../../hooks/useManagementClientSessionGuard';
import type { ManagementAppNavContext } from '../../../lib/managementNavRoutes';
import {
  dashboardI18nDescriptionKey,
  dashboardI18nTitleKey,
  getManagementAppRoutesForUser,
} from '../../../lib/managementNavRoutes';
import type { CurrentUser } from '../../../lib/requests/auth';

export type DashboardPageClientProps = {
  /** Validated on the server before render; client re-check is fallback UX only. */
  initialUser: CurrentUser;
  bucketStorageEnabled: boolean;
};

export function DashboardPageClient({
  initialUser,
  bucketStorageEnabled,
}: DashboardPageClientProps) {
  const t = useTranslations('dashboard');
  const user = useManagementClientSessionGuard(initialUser);

  const navContext: ManagementAppNavContext = { bucketStorageEnabled };

  const cards: NavCard[] = getManagementAppRoutesForUser(user, navContext).map((r) => ({
    href: r.href,
    title: t(dashboardI18nTitleKey(r.section)),
    description: t(dashboardI18nDescriptionKey(r.section)),
  }));

  return (
    <ManagementPageShell
      subtitle={t('welcome', { brandName: getConfig().public.brand.name ?? 'Management' })}
      title={t('title')}
    >
      <NavCardGrid cards={cards} LinkComponent={Link} />
    </ManagementPageShell>
  );
}
