'use client';

import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import React, { useState } from 'react';

import { ERROR_MESSAGES, getAccountSignupModeCapabilities } from '@podverse/helpers';
import {
  Button,
  FormErrorMessageText,
  FormInfoMessageText,
  Modal,
  MODAL_CONTENT_MAX_WIDTH,
  StackForm,
  TextInput,
} from '@podverse/ui';

import { getConfig } from '../../config';
import { useModals } from '../../contexts/Modals';
import { getApiRequestService } from '../../factories/apiRequestService';
import { handleRateLimitAlert } from '../../utils/rateLimit/rateLimitAlert';

import styles from '../../styles/components/Modal/ModalAuthLogin.module.scss';

export const ModalAuthLogin: React.FC = () => {
  const { modalAuthLogin, setModalAuthLogin } = useModals();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showErrorMessage, setShowErrorMessage] = useState(false);
  const [accountNotVerified, setAccountNotVerified] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [verificationEmailSent, setVerificationEmailSent] = useState(false);
  const tAuthentication = useTranslations('authentication');
  const tMisc = useTranslations('misc');
  const router = useRouter();
  const locale = useLocale();

  const config = getConfig();
  const signupMode = config.public.account.signupMode;
  const capabilities = getAccountSignupModeCapabilities(signupMode);

  const inputLabel = tAuthentication('email_or_username');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      setShowErrorMessage(false);
      setAccountNotVerified(false);
      setVerificationEmailSent(false);
      await getApiRequestService().reqAuthLogin({ email, password });
      window.location.reload();
    } catch (err: unknown) {
      const rateLimitErrorHandled = await handleRateLimitAlert(err, locale, tMisc);
      if (!rateLimitErrorHandled) {
        type ErrorWithResponse = { response?: { data?: { message?: string } } };
        const responseMessage = (err as ErrorWithResponse)?.response?.data?.message;
        if (responseMessage === ERROR_MESSAGES.ACCOUNT.NOT_VERIFIED) {
          setAccountNotVerified(true);
          setShowErrorMessage(false);
        } else {
          setShowErrorMessage(true);
        }
      }
    }
    setIsSubmitting(false);
  };

  const handleResendVerificationEmail = async () => {
    try {
      await getApiRequestService().reqAccountSendVerificationEmail({ email });
      setVerificationEmailSent(true);
    } catch (err) {
      const rateLimitErrorHandled = await handleRateLimitAlert(err, locale, tMisc);
      if (!rateLimitErrorHandled) {
        console.error('Resend verification email failed:', err);
      }
    }
  };

  const handleNavAndClose = (path: string) => {
    setModalAuthLogin({ isOpen: false });
    router.push(path);
  };

  return (
    <Modal
      header={tAuthentication('login')}
      isOpen={modalAuthLogin.isOpen}
      onClose={() => setModalAuthLogin({ isOpen: false })}
      closeButtonAriaLabel={tMisc('close_modal')}
      ariaLabel={tAuthentication('login')}
      modalContentMaxWidth={MODAL_CONTENT_MAX_WIDTH}
    >
      <StackForm onSubmit={handleSubmit}>
        <TextInput
          type="text"
          name="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoFocus
          placeholder={inputLabel}
          eyebrow={inputLabel}
        />
        <TextInput
          type="password"
          name="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={tAuthentication('password')}
          eyebrow={tAuthentication('password')}
        />
        {accountNotVerified && (
          <div className={styles.verificationSection}>
            {!verificationEmailSent ? (
              <>
                <FormInfoMessageText message={tAuthentication('account_not_verified')} />
                <Button type="button" variant="link" onClick={handleResendVerificationEmail}>
                  {tAuthentication('resend_verification_email')}
                </Button>
              </>
            ) : (
              <FormInfoMessageText message={tAuthentication('verification_email_sent')} />
            )}
          </div>
        )}
        {!accountNotVerified && showErrorMessage && (
          <FormErrorMessageText message={tAuthentication('invalid_email_or_password')} />
        )}
        <div className={styles.buttons}>
          <Button
            type="button"
            onClick={() => setModalAuthLogin({ isOpen: false })}
            variant="secondary"
          >
            {tMisc('cancel')}
          </Button>
          <Button type="submit" variant="primary" disabled={isSubmitting}>
            {tMisc('submit')}
          </Button>
        </div>
        <div className={styles.links}>
          {capabilities.canUseEmailVerificationFlows && (
            <Button
              type="button"
              variant="link"
              onClick={() => handleNavAndClose('/forgot-password')}
            >
              {tAuthentication('forgot_password')}
            </Button>
          )}
          {capabilities.canPublicSignup && (
            <Button type="button" variant="link" onClick={() => handleNavAndClose('/sign-up')}>
              {tAuthentication('sign_up')}
            </Button>
          )}
        </div>
      </StackForm>
    </Modal>
  );
};
