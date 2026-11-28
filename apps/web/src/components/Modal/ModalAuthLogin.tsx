'use client';

import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import React, { useState } from 'react';

import {
  ACCOUNT_RESPONSE_CODES,
  ERROR_MESSAGES,
  getAccountSignupModeCapabilities,
  getErrorResponseBodyCode,
  getErrorResponseStatus,
  isSecondFactorLoginStep,
} from '@podverse/helpers';
import {
  Button,
  FormErrorMessageText,
  FormInfoMessageText,
  Modal,
  ModalActions,
  StackForm,
  TextInput,
} from '@podverse/ui';

import { useConfig } from '../../contexts/Config';
import { useModals } from '../../contexts/Modals';
import { getApiRequestService } from '../../factories/apiRequestService';
import { markSignInPushPromptPending } from '../../lib/notifications/signInPushPrompt';
import { handleRateLimitAlert } from '../../utils/rateLimit/rateLimitAlert';
import { VerificationEmailNotSentModal } from '../Auth/VerificationEmailNotSentModal';

import styles from '../../styles/components/Modal/ModalAuthLogin.module.scss';

export const ModalAuthLogin: React.FC = () => {
  const { modalAuthLogin, setModalAuthLogin } = useModals();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showErrorMessage, setShowErrorMessage] = useState(false);
  const [accountNotVerified, setAccountNotVerified] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [verificationEmailSent, setVerificationEmailSent] = useState(false);
  const [factorCode, setFactorCode] = useState('');
  const [factorNotice, setFactorNotice] = useState<string | null>(null);
  const [factor, setFactor] = useState<
    | { kind: 'code'; challengeToken: string }
    | { kind: 'setup'; setupToken: string; qrDataUrl: string; manualKey: string }
    | { kind: 'backup'; codes: string[] }
    | null
  >(null);
  const [verificationEmailNotSent, setVerificationEmailNotSent] = useState(false);
  const tAuthentication = useTranslations('authentication');
  const tMisc = useTranslations('misc');
  const router = useRouter();
  const locale = useLocale();

  const config = useConfig();
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
      if (factor?.kind === 'backup') {
        markSignInPushPromptPending();
        window.location.reload();
        return;
      }
      if (factor?.kind === 'code' || factor?.kind === 'setup') {
        const confirmed =
          factor.kind === 'code'
            ? await getApiRequestService().reqAuthSecondFactorCode({
                challengeToken: factor.challengeToken,
                code: factorCode,
              })
            : await getApiRequestService().reqAuthSecondFactorSetupConfirm({
                setupToken: factor.setupToken,
                code: factorCode,
              });
        if (confirmed.challenge === 'expired') {
          setFactor(null);
          setFactorNotice(tAuthentication('second_factor_expired'));
          return;
        }
        if (factor.kind === 'setup' && Array.isArray(confirmed.backupCodes)) {
          setFactor({ kind: 'backup', codes: confirmed.backupCodes });
          return;
        }
        markSignInPushPromptPending();
        window.location.reload();
        return;
      }
      const result = await getApiRequestService().reqAuthLogin({ email, password });
      if (isSecondFactorLoginStep(result)) {
        if (result.step === 'code') {
          setFactor({ kind: 'code', challengeToken: result.challengeToken });
          setFactorCode('');
          return;
        }
        const started = await getApiRequestService().reqAuthSecondFactorSetup({
          setupToken: result.setupToken,
        });
        if (
          typeof started.setupToken === 'string' &&
          typeof started.qrDataUrl === 'string' &&
          typeof started.manualKey === 'string'
        ) {
          setFactor({
            kind: 'setup',
            setupToken: started.setupToken,
            qrDataUrl: started.qrDataUrl,
            manualKey: started.manualKey,
          });
          setFactorCode('');
          setFactorNotice(tAuthentication('second_factor_required'));
        }
        return;
      }
      markSignInPushPromptPending();
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
    setVerificationEmailNotSent(false);
    try {
      await getApiRequestService().reqAccountSendVerificationEmail({ email });
      setVerificationEmailSent(true);
    } catch (err) {
      const rateLimitErrorHandled = await handleRateLimitAlert(err, locale, tMisc);
      if (rateLimitErrorHandled) {
        return;
      }
      if (
        getErrorResponseStatus(err) === 503 &&
        getErrorResponseBodyCode(err) === ACCOUNT_RESPONSE_CODES.VERIFICATION_EMAIL_NOT_SENT
      ) {
        setVerificationEmailNotSent(true);
        return;
      }
      console.error('Resend verification email failed:', err);
    }
  };

  const sendFactorEmail = async () => {
    if (factor?.kind !== 'code') {
      return;
    }
    try {
      await getApiRequestService().reqAuthSecondFactorEmail({
        challengeToken: factor.challengeToken,
      });
      setFactorNotice(tAuthentication('second_factor_email_sent'));
    } catch (err) {
      const rateLimitErrorHandled = await handleRateLimitAlert(err, locale, tMisc);
      if (!rateLimitErrorHandled) {
        setShowErrorMessage(true);
      }
    }
  };

  const handleNavAndClose = (path: string) => {
    setModalAuthLogin({ isOpen: false });
    router.push(path);
  };

  return (
    <>
      <Modal
        header={tAuthentication('login')}
        isOpen={modalAuthLogin.isOpen}
        onClose={() => setModalAuthLogin({ isOpen: false })}
        closeButtonAriaLabel={tMisc('close_modal')}
        ariaLabel={tAuthentication('login')}
      >
        <StackForm onSubmit={handleSubmit}>
          {factor?.kind === 'backup' ? (
            <>
              <FormInfoMessageText message={tAuthentication('second_factor_backup_help')} />
              <p data-testid="second-factor-backup-codes">{factor.codes.join('\n')}</p>
            </>
          ) : null}
          {factor?.kind === 'setup' ? (
            <>
              <FormInfoMessageText
                message={factorNotice ?? tAuthentication('second_factor_setup_help')}
              />
              <img alt="" src={factor.qrDataUrl} />
              <p data-testid="second-factor-manual-key">{factor.manualKey}</p>
            </>
          ) : null}
          {factor?.kind === 'code' ? (
            <FormInfoMessageText
              message={factorNotice ?? tAuthentication('second_factor_code_help')}
            />
          ) : null}
          {factor === null ? (
            <>
              <TextInput
                type="text"
                name="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoFocus
                placeholder={tAuthentication('email_example')}
                eyebrow={inputLabel}
              />
              <TextInput
                type="password"
                name="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={tAuthentication('password_hint')}
                eyebrow={tAuthentication('password')}
              />
            </>
          ) : null}
          {factor?.kind === 'code' || factor?.kind === 'setup' ? (
            <TextInput
              type="text"
              name="code"
              value={factorCode}
              onChange={(e) => setFactorCode(e.target.value)}
              autoFocus
              eyebrow={tAuthentication('second_factor_code')}
              id="second-factor-code"
            />
          ) : null}
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
            <FormErrorMessageText
              message={
                factor === null
                  ? tAuthentication('invalid_email_or_password')
                  : tAuthentication('invalid_password')
              }
            />
          )}
          {factor?.kind === 'code' ? (
            <Button id="second-factor-email" type="button" variant="link" onClick={sendFactorEmail}>
              {tAuthentication('second_factor_email')}
            </Button>
          ) : null}
          <ModalActions>
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
          </ModalActions>
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
      <VerificationEmailNotSentModal
        isOpen={verificationEmailNotSent}
        onClose={() => {
          setVerificationEmailNotSent(false);
        }}
      />
    </>
  );
};
