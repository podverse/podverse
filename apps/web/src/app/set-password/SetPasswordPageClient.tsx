'use client';

import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import React, { useEffect, useMemo, useState } from 'react';

import type { DTOAccount } from '@podverse/helpers';
import {
  getPassword2ErrorKey,
  getPasswordErrorKey,
  getPasswordRequirementsInfoKey,
} from '@podverse/helpers-validation/client';
import {
  Button,
  FormInfoMessageText,
  MainColumnStack,
  MainHeader,
  MainSidebarLayout,
  StackForm,
  TextInput,
} from '@podverse/ui';

import { MainWrapper } from '../../components/Main/MainWrapper';
import { useAccount } from '../../contexts/Account';
import { getApiRequestService } from '../../factories/apiRequestService';
import { handleRateLimitAlert } from '../../utils/rateLimit/rateLimitAlert';

import styles from '../../styles/components/Auth/AuthResetPasswordForm.module.scss';

function sessionLabelForBanner(account: DTOAccount): string {
  const email = account.account_credentials?.email;
  if (email !== undefined && email !== null && email.trim() !== '') {
    return email.trim();
  }
  const displayName = account.account_profile?.display_name;
  if (displayName !== undefined && displayName !== null && displayName.trim() !== '') {
    return displayName.trim();
  }
  return account.id_text;
}

type SetPasswordPageClientProps = {
  token?: string;
};

export function SetPasswordPageClient({ token }: SetPasswordPageClientProps) {
  const [password1, setPassword1] = useState('');
  const [password2, setPassword2] = useState('');
  const [email, setEmail] = useState('');
  const [password1ErrorKey, setPassword1ErrorKey] = useState<string | undefined>();
  const [password2ErrorKey, setPassword2ErrorKey] = useState<string | undefined>();
  const [password1Touched, setPassword1Touched] = useState(false);
  const [password2Touched, setPassword2Touched] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [otherSessionBannerDismissed, setOtherSessionBannerDismissed] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const { loggedInAccount } = useAccount();
  const tAuthentication = useTranslations('authentication');
  const tMisc = useTranslations('misc');
  const router = useRouter();
  const locale = useLocale();

  const sessionBannerLabel = useMemo(() => {
    if (loggedInAccount === null || loggedInAccount === undefined) {
      return '';
    }
    return sessionLabelForBanner(loggedInAccount);
  }, [loggedInAccount]);

  const showOtherSessionBanner =
    !isComplete &&
    loggedInAccount !== null &&
    loggedInAccount !== undefined &&
    !otherSessionBannerDismissed;

  useEffect(() => {
    if (!token) {
      router.replace('/');
    }
  }, [token, router]);

  const handleSignOutAndContinue = async () => {
    if (!token) return;
    setIsSigningOut(true);
    try {
      await getApiRequestService().reqAuthLogout();
      window.location.assign(`/set-password?token=${encodeURIComponent(token)}`);
    } catch {
      setIsSigningOut(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    if (isFormValid) {
      setIsLoading(true);
      try {
        await getApiRequestService().apiRequest({
          method: 'POST',
          path: '/account/set-password',
          data: { token, password: password1, ...(email ? { email } : {}) },
        });
        setIsComplete(true);
      } catch (err) {
        const rateLimitErrorHandled = await handleRateLimitAlert(err, locale, tMisc);
        if (!rateLimitErrorHandled) {
          console.error('Set password failed:', err);
          alert(tMisc('errors.generic'));
        }
      }
    }
    setIsLoading(false);
  };

  const handlePassword1Blur = () => {
    if (password1Touched && password1.trim() !== '') {
      setPassword1ErrorKey(getPasswordErrorKey(password1) || undefined);
    }
    if (password2Touched && password2) {
      setPassword2ErrorKey(getPassword2ErrorKey(password1, password2) || undefined);
    }
  };

  const handlePassword2Blur = () => {
    if (password2Touched && password2.trim() !== '') {
      setPassword2ErrorKey(getPassword2ErrorKey(password1, password2) || undefined);
    }
  };

  const onPassword1Change = (value: string) => {
    setPassword1(value);
    setPassword1Touched(value !== '');
    if (password1ErrorKey) {
      const key = getPasswordErrorKey(value);
      if (!key) {
        setPassword1ErrorKey(undefined);
      }
    }
    if (value === '') {
      setPassword1ErrorKey(undefined);
    }
    if (password2Touched && password2) {
      const pwd2Key = getPassword2ErrorKey(value, password2);
      if (!pwd2Key) {
        setPassword2ErrorKey(undefined);
      } else {
        setPassword2ErrorKey(pwd2Key);
      }
    }
  };

  const onPassword2Change = (value: string) => {
    setPassword2(value);
    setPassword2Touched(value !== '');
    if (password2ErrorKey) {
      const key = getPassword2ErrorKey(password1, value);
      if (!key) {
        setPassword2ErrorKey(undefined);
      } else {
        setPassword2ErrorKey(key);
      }
    }
    if (value === '') {
      setPassword2ErrorKey(undefined);
    }
  };

  const isFormValid =
    !!token &&
    !getPasswordErrorKey(password1) &&
    !getPassword2ErrorKey(password1, password2) &&
    !!password1 &&
    !!password2;

  if (!token) {
    return null;
  }

  const emailLabel = tAuthentication('set_password_email_optional');

  return (
    <>
      <MainHeader title={tAuthentication('set_password')} />
      <MainWrapper>
        <MainSidebarLayout>
          <MainColumnStack>
            <div className={styles.authResetPasswordForm}>
              {!isComplete && showOtherSessionBanner && (
                <div className={styles.sessionBanner}>
                  <FormInfoMessageText
                    message={tAuthentication('set_password_other_session_banner', {
                      sessionLabel: sessionBannerLabel,
                    })}
                  />
                  <div className={styles.buttons}>
                    <Button
                      type="button"
                      disabled={isSigningOut}
                      onClick={() => setOtherSessionBannerDismissed(true)}
                      variant="secondary"
                    >
                      {tAuthentication('set_password_continue_without_signing_out')}
                    </Button>
                    <Button
                      type="button"
                      isLoading={isSigningOut}
                      onClick={() => void handleSignOutAndContinue()}
                      variant="primary"
                    >
                      {tAuthentication('set_password_sign_out_to_continue')}
                    </Button>
                  </div>
                </div>
              )}
              {!isComplete && (
                <StackForm onSubmit={handleSubmit}>
                  <TextInput
                    type="email"
                    name="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={emailLabel}
                    eyebrow={emailLabel}
                  />
                  <TextInput
                    type="password"
                    name="password1"
                    value={password1}
                    onChange={(e) => onPassword1Change(e.target.value)}
                    onBlur={handlePassword1Blur}
                    placeholder={tAuthentication('password')}
                    eyebrow={tAuthentication('password')}
                    infoError={password1ErrorKey ? tAuthentication(password1ErrorKey) : undefined}
                  />
                  <TextInput
                    type="password"
                    name="password2"
                    value={password2}
                    onChange={(e) => onPassword2Change(e.target.value)}
                    onBlur={handlePassword2Blur}
                    placeholder={tAuthentication('password')}
                    eyebrow={tAuthentication('confirm_password')}
                    infoError={password2ErrorKey ? tAuthentication(password2ErrorKey) : undefined}
                  />
                  <div className={styles.passwordInfo}>
                    {tAuthentication(getPasswordRequirementsInfoKey())}
                  </div>
                  <div className={styles.buttons}>
                    <Button type="button" onClick={() => router.push('/')} variant="secondary">
                      {tMisc('cancel')}
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      disabled={!isFormValid || isLoading}
                      isLoading={isLoading}
                    >
                      {tMisc('submit')}
                    </Button>
                  </div>
                </StackForm>
              )}
              {isComplete && (
                <>
                  <FormInfoMessageText message={tAuthentication('set_password_complete_message')} />
                  <div className={styles.buttons}>
                    <Button type="button" onClick={() => router.push('/login')} variant="primary">
                      {tAuthentication('login')}
                    </Button>
                  </div>
                </>
              )}
            </div>
          </MainColumnStack>
        </MainSidebarLayout>
      </MainWrapper>
    </>
  );
}
