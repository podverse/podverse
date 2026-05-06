'use client';

import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import React, { useEffect, useState } from 'react';

import {
  getPassword2ErrorKey,
  getPasswordErrorKey,
  getPasswordRequirementsInfoKey,
} from '@podverse/helpers-validation/client';
import { Button, FormInfoMessageText } from '@podverse/ui';

import Form from '../../components/Form/Form';
import { TextInput } from '../../components/Form/TextInput';
import { MainHeader } from '../../components/Main/MainHeader';
import { MainInnerContentWrapper } from '../../components/Main/MainInnerContentWrapper';
import { MainInnerWrapper } from '../../components/Main/MainInnerWrapper';
import { MainWrapper } from '../../components/Main/MainWrapper';
import { getApiRequestService } from '../../factories/apiRequestService';
import { handleRateLimitAlert } from '../../utils/rateLimit/rateLimitAlert';

import styles from '../../styles/components/Auth/AuthResetPasswordForm.module.scss';

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
  const tAuthentication = useTranslations('authentication');
  const tMisc = useTranslations('misc');
  const router = useRouter();
  const locale = useLocale();

  useEffect(() => {
    if (!token) {
      router.replace('/');
    }
  }, [token, router]);

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
        <MainInnerWrapper>
          <MainInnerContentWrapper>
            <div className={styles.authResetPasswordForm}>
              {!isComplete && (
                <Form onSubmit={handleSubmit}>
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
                </Form>
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
          </MainInnerContentWrapper>
        </MainInnerWrapper>
      </MainWrapper>
    </>
  );
}
