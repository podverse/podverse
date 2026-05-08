'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect } from 'react';

import { getAccountSignupModeCapabilities } from '@podverse/helpers';
import { MainColumnStack, MainHeader, MainSidebarLayout } from '@podverse/ui';

import { AuthResetPasswordForm } from '../../components/Auth/AuthResetPasswordForm';
import { MainWrapper } from '../../components/Main/MainWrapper';
import { getConfig } from '../../config';

type ResetPasswordPageClientProps = {
  token?: string;
};

export function ResetPasswordPageClient({ token }: ResetPasswordPageClientProps) {
  const tAuthentication = useTranslations('authentication');
  const router = useRouter();

  const config = getConfig();
  const signupMode = config.public.account.signupMode;
  const capabilities = getAccountSignupModeCapabilities(signupMode);

  useEffect(() => {
    if (!capabilities.canUseEmailVerificationFlows) {
      router.replace('/login');
    }
  }, [capabilities.canUseEmailVerificationFlows, router]);

  if (!capabilities.canUseEmailVerificationFlows) {
    return null;
  }

  return (
    <>
      <MainHeader title={tAuthentication('reset_password')} />
      <MainWrapper>
        <MainSidebarLayout>
          <MainColumnStack>
            <AuthResetPasswordForm token={token} />
          </MainColumnStack>
        </MainSidebarLayout>
      </MainWrapper>
    </>
  );
}
