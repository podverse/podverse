'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { login, getCurrentUser } from '../lib/requests/auth';
import { Button } from '../components/ui/Button/Button';
import { FormGroup, FormLabel, FormInput } from '../components/ui/Form';
import { Card } from '../components/ui/Card/Card';
import { CenterContainer } from '../components/ui/CenterContainer/CenterContainer';
import { Alert } from '../components/ui/Alert/Alert';
import { LoadingText } from '../components/ui/LoadingText/LoadingText';
import styles from './page.module.scss';

export default function HomePage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const currentUser = await getCurrentUser();
        if (currentUser) {
          // User is already logged in, redirect to dashboard
          router.push('/dashboard');
          return;
        }
      } catch (error) {
        // Not authenticated, stay on login page
        console.error('Auth check error:', error);
      } finally {
        setCheckingAuth(false);
      }
    };

    checkAuth();
  }, [router]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await login({ email, password });
      
      // The cookie is set automatically by the API response via Set-Cookie header
      // Redirect to dashboard on success
      router.push('/dashboard');
    } catch (err: unknown) {
      // Handle axios errors - they may have response.data.message
      let errorMessage = 'Invalid username or password';
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosError = err as { response?: { data?: { message?: string } } };
        if (axiosError.response?.data?.message) {
          errorMessage = axiosError.response.data.message;
        }
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }
      setError(errorMessage);
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Show loading state while checking authentication
  if (checkingAuth) {
    return (
      <CenterContainer>
        <LoadingText>Loading...</LoadingText>
      </CenterContainer>
    );
  }

  return (
    <CenterContainer>
      <Card className={styles.loginCard}>
        <div className={styles.loginHeader}>
          <h1 className={styles.loginTitle}>
            Podverse Management
          </h1>
          <p className={styles.loginSubtitle}>
            Please sign in to continue
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {error && (
            <Alert variant="error">{error}</Alert>
          )}

          <FormGroup>
            <FormLabel htmlFor="email">
              Username / Email
            </FormLabel>
            <FormInput
              id="email"
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
          </FormGroup>

          <FormGroup>
            <FormLabel htmlFor="password">
              Password
            </FormLabel>
            <FormInput
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
            />
          </FormGroup>

          <Button type="submit" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </Button>
        </form>
      </Card>
    </CenterContainer>
  );
}
