'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import type { NavCard } from '@podverse/ui';
import { NavCardGrid } from '@podverse/ui';

import { canReadFeeds, canReadStats } from '../../../lib/managementPermissions';
import { type CurrentUser, getCurrentUser } from '../../../lib/requests/auth';

export type DashboardPageClientProps = {
  /** Validated on the server before render; client re-check is fallback UX only. */
  initialUser: CurrentUser;
};

export function DashboardPageClient({ initialUser }: DashboardPageClientProps) {
  const [user, setUser] = useState<CurrentUser>(initialUser);
  const router = useRouter();

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
      (user.permissions.feeds_crud >= 2 ||
        user.permissions.feed_flag_statuses_crud >= 2 ||
        user.permissions.feed_flag_status_reasons_crud >= 2));

  const isFeedFlagStatusToolVisible = canReadFeeds(user);
  const isStatsVisible = canReadStats(user);

  const cards: NavCard[] = [
    ...(isFeedFlagStatusToolVisible
      ? [
          {
            href: '/feed-operations/flag-status',
            title: 'Feed flag status',
            description:
              'Set takedown, spam, and other statuses with a reason and note (not the table browser)',
          },
        ]
      : []),
    ...(isStatsVisible
      ? [
          {
            href: '/stats',
            title: 'Stats',
            description:
              'View popularity and view count statistics across podcasts, episodes, clips, playlists, and profiles',
          },
        ]
      : []),
    ...(isDatabaseReadable
      ? [
          {
            href: '/database',
            title: 'Database',
            description: 'Browse and manage feed data, statuses, and reasons',
          },
        ]
      : []),
    ...(isAdminsReadable
      ? [
          {
            href: '/admins',
            title: 'Admins',
            description: 'Manage admin accounts and permissions',
          },
        ]
      : []),
    {
      href: '/workers',
      title: 'Workers',
      description: 'Background job management',
    },
  ];

  return (
    <div className="container">
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">Welcome to Podverse Management</p>
      </div>
      <main>
        <NavCardGrid cards={cards} LinkComponent={Link} />
      </main>
    </div>
  );
}
