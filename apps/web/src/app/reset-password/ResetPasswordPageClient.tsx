'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect } from 'react';

import { getAccountSignupModeCapabilities } from '@podverse/helpers';

import { AuthResetPasswordForm } from '../../components/Auth/AuthResetPasswordForm';
import { MainHeader } from '../../components/Main/MainHeader';
import { MainInnerContentWrapper } from '../../components/Main/MainInnerContentWrapper';
import { MainInnerWrapper } from '../../components/Main/MainInnerWrapper';
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
        <MainInnerWrapper>
          <MainInnerContentWrapper>
            <AuthResetPasswordForm token={token} />
          </MainInnerContentWrapper>
        </MainInnerWrapper>
      </MainWrapper>
    </>
  );
}
