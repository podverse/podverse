'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';

import {
  Alert,
  AuthCard,
  AuthCardHeader,
  Button,
  CenterContainer,
  StackForm,
  TextInput,
} from '@podverse/ui';

import { ManagementLoadingSpinnerOverlay } from '../components/LoadingSpinner/ManagementLoadingSpinnerOverlay';
import { getConfig } from '../config';
import { getCurrentUser, login } from '../lib/requests/auth';

export default function HomePage() {
  const t = useTranslations('auth');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      const currentUser = await getCurrentUser();
      if (currentUser) {
        // User is already logged in, redirect to dashboard
        router.push('/dashboard');
        return;
      }
      // getCurrentUser returns null if not authenticated - this is expected behavior
      setCheckingAuth(false);
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
      let errorMessage = t('invalidCredentialsDefault');
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
        <ManagementLoadingSpinnerOverlay isLoading />
      </CenterContainer>
    );
  }

  return (
    <CenterContainer>
      <AuthCard>
        <AuthCardHeader
          title={getConfig().public.brand.name ?? t('defaultBrandName')}
          subtitle={t('signInSubtitle')}
        />

        <StackForm onSubmit={handleSubmit}>
          <Alert>{error}</Alert>

          <TextInput
            id="email"
            eyebrow={t('usernameOrEmail')}
            type="text"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
          />

          <TextInput
            id="password"
            eyebrow={t('password')}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading}
          />

          <Button block type="submit" disabled={loading}>
            {loading ? t('signingIn') : t('signIn')}
          </Button>
        </StackForm>
      </AuthCard>
    </CenterContainer>
  );
}
