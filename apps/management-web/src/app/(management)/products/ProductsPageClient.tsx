'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';

import type { NavCard } from '@podverse/ui';
import { Breadcrumbs, ManagementPageShell, NavCardGrid } from '@podverse/ui';

export function ProductsPageClient() {
  const t = useTranslations('products');
  const tc = useTranslations('common');

  const cards: NavCard[] = [
    {
      href: '/products/memberships',
      title: t('membershipsCardTitle'),
      description: t('membershipsCardDescription'),
    },
  ];

  return (
    <ManagementPageShell
      headerChildren={
        <Breadcrumbs
          LinkComponent={Link}
          marginBottom="lg"
          navAriaLabel={tc('breadcrumbNav')}
          items={[
            { href: '/dashboard', label: t('breadcrumbDashboard') },
            { label: t('pageTitle') },
          ]}
        />
      }
      subtitle={t('welcomeLine')}
      title={t('pageTitle')}
    >
      <NavCardGrid cards={cards} LinkComponent={Link} />
    </ManagementPageShell>
  );
}
