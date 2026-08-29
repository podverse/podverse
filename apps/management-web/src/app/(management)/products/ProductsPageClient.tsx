'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';

import type { NavCard } from '@podverse/ui';
import { Breadcrumbs, ManagementPageShell, NavCardGrid } from '@podverse/ui';

import { ROUTES } from '../../../lib/routes';

export function ProductsPageClient() {
  const t = useTranslations('products');
  const tc = useTranslations('common');
  const tNav = useTranslations('nav');

  const cards: NavCard[] = [
    {
      href: ROUTES.PRODUCTS_MEMBERSHIPS,
      title: t('membershipsCardTitle'),
      description: t('membershipsCardDescription'),
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
