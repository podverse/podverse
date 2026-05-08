'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import type { NavCard } from '@podverse/ui';
import { ManagementPageShell, NavCardGrid } from '@podverse/ui';

import { canReadFeeds } from '../../lib/managementPermissions';
import { type CurrentUser, getCurrentUser } from '../../lib/requests/auth';

export type DashboardPageClientProps = {
  /** Validated on the server before render; client re-check is fallback UX only. */
  initialUser: CurrentUser;
};

export function DashboardPageClient({ initialUser }: DashboardPageClientProps) {
  const [user, setUser] = useState<CurrentUser>(initialUser);
  const router = useRouter();
  const t = useTranslations('dashboard');

  useEffect(() => {
    let cancelled = false;

    const verifySessionFallback = async () => {
      try {
        const currentUser = await getCurrentUser();
        if (cancelled) {
          return;
        }
        if (!currentUser) {
          router.replace('/');
          return;
        }
        setUser(currentUser);
      } catch {
        if (!cancelled) {
          router.replace('/');
        }
      }
    };

    void verifySessionFallback();

    return () => {
      cancelled = true;
    };
  }, [router]);

  if (!user) {
    return null;
  }

  const isAdminsReadable =
    user.role === 'superuser' || (user.permissions && user.permissions.admins_crud >= 2);

  const isDatabaseReadable =
    user.role === 'superuser' ||
    (user.permissions &&
      (user.permissions.feeds_crud >= 2 || user.permissions.feed_takedown_reasons_crud >= 2));

  const isFeedFlagStatusToolVisible = canReadFeeds(user);

  const cards: NavCard[] = [
    ...(isFeedFlagStatusToolVisible
      ? [
          {
            href: '/feeds/flag-status',
            title: t('feedFlagStatus.title'),
            description: t('feedFlagStatus.description'),
          },
        ]
      : []),
    ...(isDatabaseReadable
      ? [
          {
            href: '/dashboard/database',
            title: t('database.title'),
            description: t('database.description'),
          },
        ]
      : []),
    ...(isAdminsReadable
      ? [
          {
            href: '/dashboard/admins',
            title: t('admins.title'),
            description: t('admins.description'),
          },
        ]
      : []),
    {
      href: '/dashboard/workers',
      title: t('workers.title'),
      description: t('workers.description'),
    },
  ];

  return (
    <ManagementPageShell subtitle={t('welcome')} title={t('title')}>
      <NavCardGrid cards={cards} LinkComponent={Link} />
    </ManagementPageShell>
  );
}
