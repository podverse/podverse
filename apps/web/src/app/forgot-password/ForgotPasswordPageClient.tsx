'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect } from 'react';

import { getAccountSignupModeCapabilities } from '@podverse/helpers';

import { AuthForgotPasswordForm } from '../../components/Auth/AuthForgotPasswordForm';
import { MainHeader } from '../../components/Main/MainHeader';
import { MainInnerContentWrapper } from '../../components/Main/MainInnerContentWrapper';
import { MainInnerWrapper } from '../../components/Main/MainInnerWrapper';
import { MainWrapper } from '../../components/Main/MainWrapper';
import { getConfig } from '../../config';

export function ForgotPasswordPageClient() {
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
      <MainHeader title={tAuthentication('forgot_password')} />
      <MainWrapper>
        <MainInnerWrapper>
          <MainInnerContentWrapper>
            <AuthForgotPasswordForm />
          </MainInnerContentWrapper>
        </MainInnerWrapper>
      </MainWrapper>
    </>
  );
}
