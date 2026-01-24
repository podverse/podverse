'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser, type CurrentUser } from '../../lib/requests/auth';
import { CenterContainer } from '../../components/ui/CenterContainer/CenterContainer';
import { Card } from '../../components/ui/Card/Card';
import { LoadingText } from '../../components/ui/LoadingText/LoadingText';
import styles from './page.module.scss';

export default function DashboardPage() {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const currentUser = await getCurrentUser();
        if (!currentUser) {
          // Not authenticated, redirect to login
          router.push('/');
          return;
        }
        setUser(currentUser);
      } catch (error) {
        console.error('Authentication check error:', error);
        router.push('/');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  // Show loading state while checking authentication
  if (loading) {
    return (
      <CenterContainer>
        <LoadingText>Loading...</LoadingText>
      </CenterContainer>
    );
  }

  // If no user, don't render (redirect is happening)
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
          <p className={styles.placeholderText}>
            This is a placeholder dashboard page.
          </p>
        </Card>
      </main>
    </div>
  );
}
