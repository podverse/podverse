'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';

import type { NavCard } from '@podverse/ui';
import { Breadcrumbs, ManagementPageShell, NavCardGrid } from '@podverse/ui';

import { ROUTES } from '../../../lib/routes';

export function FeedsPageClient() {
  const t = useTranslations('feedsHub');
  const tc = useTranslations('common');
  const tNav = useTranslations('nav');

  const cards: NavCard[] = [
    {
      href: ROUTES.FEEDS_FLAG_STATUS,
      title: t('flagStatusCardTitle'),
      description: t('flagStatusCardDescription'),
    },
  ];

  return (
    <ManagementPageShell
      headerBreadcrumbs={
        <Breadcrumbs
          LinkComponent={Link}
          navAriaLabel={tc('breadcrumbNav')}
          items={[{ href: ROUTES.DASHBOARD, label: tNav('dashboard') }, { label: t('pageTitle') }]}
        />
      }
      title={t('pageTitle')}
    >
      <NavCardGrid cards={cards} LinkComponent={Link} />
    </ManagementPageShell>
  );
}
