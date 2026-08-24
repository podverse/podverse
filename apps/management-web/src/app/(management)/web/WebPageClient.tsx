'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';

import type { NavCard } from '@podverse/ui';
import { Breadcrumbs, ManagementPageShell, NavCardGrid } from '@podverse/ui';

import { ROUTES } from '../../../lib/routes';

export function WebPageClient() {
  const t = useTranslations('webHub');
  const tc = useTranslations('common');
  const tNav = useTranslations('nav');

  const cards: NavCard[] = [
    {
      href: ROUTES.WEB_EMBED_DEMO,
      title: t('embedDemoCardTitle'),
      description: t('embedDemoCardDescription'),
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
