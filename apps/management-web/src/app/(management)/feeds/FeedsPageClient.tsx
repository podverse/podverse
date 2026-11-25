'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import type { NavCard } from '@podverse/ui';
import { Breadcrumbs, ManagementPageShell, NavCardGrid } from '@podverse/ui';

import { getConfig } from '../../../config';
import { getCatalogAllowlist } from '../../../lib/requests/feeds';
import { ROUTES } from '../../../lib/routes';

export function FeedsPageClient() {
  const t = useTranslations('feedsHub');
  const tc = useTranslations('common');
  const tNav = useTranslations('nav');
  const [showAllowed, setShowAllowed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void getCatalogAllowlist()
      .then(() => {
        if (!cancelled) {
          setShowAllowed(true);
        }
      })
      .catch(() => {
        // A 404 means this instance has no allowlist. The card stays hidden.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const cards: NavCard[] = [
    {
      href: ROUTES.FEEDS_FLAG_STATUS,
      title: t('flagStatusCardTitle'),
      description: t('flagStatusCardDescription'),
    },
    {
      href: ROUTES.FEEDS_MERGE_REVIEW,
      title: t('mergeReviewCardTitle'),
      description: t('mergeReviewCardDescription'),
    },
    {
      href: ROUTES.FEEDS_REMOTE_STUBS,
      title: t('remoteStubsCardTitle'),
      description: t('remoteStubsCardDescription', {
        brand_name: getConfig().public.brand.name ?? 'Management',
      }),
    },
  ];
  if (showAllowed) {
    cards.push({
      href: ROUTES.FEEDS_ALLOWED,
      title: t('allowedFeedsCardTitle'),
      description: t('allowedFeedsCardDescription'),
    });
  }

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
