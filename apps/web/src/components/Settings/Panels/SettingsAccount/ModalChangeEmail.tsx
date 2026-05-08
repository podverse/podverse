'use client';

import { useTranslations } from 'next-intl';
import { useLocale } from 'next-intl';
import React, { useState } from 'react';

import { getEmailErrorKey } from '@podverse/helpers-validation/client';
import { Button, FormInfoMessageText, Modal, ModalActions, TextInput } from '@podverse/ui';

import { getApiRequestService } from '../../../../factories/apiRequestService';
import { handleRateLimitAlert } from '../../../../utils/rateLimit/rateLimitAlert';

import styles from '../../../../styles/components/Modal/ModalChangeEmail.module.scss';

type ModalChangeEmailProps = {
  isOpen: boolean;
  onClose: () => void;
};

export const ModalChangeEmail: React.FC<ModalChangeEmailProps> = ({ isOpen, onClose }) => {
  const tSettings = useTranslations('settings');
  const tAuthentication = useTranslations('authentication');
  const tMisc = useTranslations('misc');
  const locale = useLocale();
  const [email, setEmail] = useState('');
  const [emailErrorKey, setEmailErrorKey] = useState<string | undefined>();
  const [emailTouched, setEmailTouched] = useState(false);
  const [isEmailSent, setIsEmailSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showErrorMessage, setShowErrorMessage] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleEmailBlur = () => {
    if (emailTouched && email.trim() !== '') {
      setEmailErrorKey(getEmailErrorKey(email) || undefined);
    }
  };

  const onEmailChange = (value: string) => {
    setEmail(value);
    setEmailTouched(value !== '');
    if (emailErrorKey) {
      const key = getEmailErrorKey(value);
      if (!key) {
        setEmailErrorKey(undefined);
      }
    }
    if (value === '') {
      setEmailErrorKey(undefined);
    }
    setShowErrorMessage(false);
    setErrorMessage('');
  };

  const isFormValid = !getEmailErrorKey(email) && !!email;

  const getErrorMessage = (): string | undefined => {
    if (isLoading) {
      return undefined;
    }
    if (showErrorMessage && errorMessage) {
      return errorMessage;
    }
    if (emailErrorKey && emailTouched) {
      return tAuthentication(emailErrorKey);
    }
    return undefined;
  };

  const errorMessageToShow = getErrorMessage();

  const handleSubmit = async () => {
    if (!isFormValid) {
      return;
    }

    setIsLoading(true);
    setShowErrorMessage(false);
    setErrorMessage('');

    try {
      await getApiRequestService().reqAccountSendChangeEmailAddressEmail({ new_email: email });
      setIsEmailSent(true);
    } catch (err: unknown) {
      const rateLimitErrorHandled = await handleRateLimitAlert(err, locale, tMisc);
      if (!rateLimitErrorHandled) {
        type ErrorWithResponse = { response?: { data?: { message?: string } } };
        setErrorMessage(
          (err as ErrorWithResponse)?.response?.data?.message || tMisc('errors.generic')
        );
        setShowErrorMessage(true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setEmail('');
    setEmailErrorKey(undefined);
    setEmailTouched(false);
    setIsEmailSent(false);
    setIsLoading(false);
    setShowErrorMessage(false);
    setErrorMessage('');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      closeButtonAriaLabel={tMisc('close_modal')}
      header={tSettings('account.change_email_modal.title')}
      ariaLabel={tSettings('account.change_email_modal.title')}
    >
      <div className={styles.content}>
        {!isEmailSent && (
          <>
            <p className={styles.message}>{tSettings('account.change_email_modal.message')}</p>
            <TextInput
              type="email"
              name="email"
              value={email}
              onChange={(e) => onEmailChange(e.target.value)}
              onBlur={handleEmailBlur}
              placeholder={tAuthentication('email')}
              eyebrow={tAuthentication('email')}
              infoError={errorMessageToShow}
              aria-invalid={!!errorMessageToShow}
              autoFocus
            />
            <ModalActions>
              <Button type="button" onClick={handleClose} variant="secondary" disabled={isLoading}>
                {tMisc('cancel')}
              </Button>
              <Button
                type="button"
                onClick={handleSubmit}
                variant="primary"
                disabled={!isFormValid || isLoading}
                isLoading={isLoading}
              >
                {tSettings('account.change_email')}
              </Button>
            </ModalActions>
          </>
        )}
        {isEmailSent && (
          <FormInfoMessageText message={tSettings('account.change_email_modal.email_sent')} />
        )}
      </div>
    </Modal>
  );
};
