'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import {
  Alert,
  AuthCard,
  AuthCardHeader,
  Button,
  CenterContainer,
  FormHintText,
  FormPrimaryActions,
  StackForm,
  TextInput,
} from '@podverse/ui';

import { ManagementLoadingSpinnerOverlay } from '../../../../components/LoadingSpinner/ManagementLoadingSpinnerOverlay';
import { redeemAdminInviteLink } from '../../../../lib/requests/admins';

type Props = {
  token: string;
};

export function RedeemAdminInviteLinkPageClient({ token }: Props) {
  const router = useRouter();
  const t = useTranslations('admins.setAdminPassword');
  const ta = useTranslations('users');
  const tc = useTranslations('common');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const missingToken = token.trim() === '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError(ta('passwordMinLength'));
      return;
    }
    if (password !== confirmPassword) {
      setError(t('passwordsDoNotMatch'));
      return;
    }
    setLoading(true);
    try {
      await redeemAdminInviteLink({ token, password });
      setSuccess(true);
    } catch {
      setError(t('failed'));
    } finally {
      setLoading(false);
    }
  };

  if (missingToken) {
    return (
      <CenterContainer>
        <AuthCard>
          <AuthCardHeader subtitle={t('missingToken')} title={t('title')} />
          <FormPrimaryActions>
            <Button
              type="button"
              variant="primary"
              onClick={() => {
                router.push('/');
              }}
            >
              {t('backToSignIn')}
            </Button>
          </FormPrimaryActions>
        </AuthCard>
      </CenterContainer>
    );
  }

  if (success) {
    return (
      <CenterContainer>
        <AuthCard>
          <AuthCardHeader subtitle={t('success')} title={t('title')} />
          <FormPrimaryActions>
            <Button
              type="button"
              variant="primary"
              onClick={() => {
                router.push('/');
              }}
            >
              {t('backToSignIn')}
            </Button>
          </FormPrimaryActions>
        </AuthCard>
      </CenterContainer>
    );
  }

  return (
    <CenterContainer>
      <ManagementLoadingSpinnerOverlay isLoading={loading} />
      <AuthCard>
        <AuthCardHeader subtitle={t('subtitle')} title={t('title')} />
        <StackForm onSubmit={(e) => void handleSubmit(e)}>
          <TextInput
            autoComplete="new-password"
            eyebrow={t('passwordLabel')}
            minLength={8}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <FormHintText>{ta('passwordMinLength')}</FormHintText>
          <TextInput
            autoComplete="new-password"
            eyebrow={t('confirmLabel')}
            minLength={8}
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
          <Alert>{error}</Alert>
          <FormPrimaryActions>
            <Button type="submit" disabled={loading}>
              {loading ? tc('saving') : t('submit')}
            </Button>
          </FormPrimaryActions>
        </StackForm>
      </AuthCard>
    </CenterContainer>
  );
}
