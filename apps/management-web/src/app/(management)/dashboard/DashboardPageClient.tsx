'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import type { NavCard } from '@podverse/ui';
import { NavCardGrid } from '@podverse/ui';

import { getConfig } from '../../../config';
import {
  dashboardI18nDescriptionKey,
  dashboardI18nTitleKey,
  getManagementAppRoutesForUser,
} from '../../../lib/managementNavRoutes';
import { type CurrentUser, getCurrentUser } from '../../../lib/requests/auth';

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

  const cards: NavCard[] = getManagementAppRoutesForUser(user).map((r) => ({
    href: r.href,
    title: t(dashboardI18nTitleKey(r.section)),
    description: t(dashboardI18nDescriptionKey(r.section)),
  }));

  return (
    <div className="container">
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">
          {t('welcome', { brandName: getConfig().public.brand.name ?? 'Management' })}
        </p>
      </div>
      <main>
        <NavCardGrid cards={cards} LinkComponent={Link} />
      </main>
    </div>
  );
}
