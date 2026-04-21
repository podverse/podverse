'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { Card } from '../../components/ui/Card/Card';
import { type CurrentUser, getCurrentUser } from '../../lib/requests/auth';

import styles from './page.module.scss';

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

  return (
    <div className="container">
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">Welcome to Podverse Management</p>
      </div>
      <main>
        <Card variant="bordered" className={styles.placeholderCard}>
          <p className={styles.placeholderText}>This is a placeholder dashboard page.</p>
        </Card>
      </main>
    </div>
  );
}
