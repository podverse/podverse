'use client';

import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import React, { useState } from 'react';

import { getEmailErrorKey } from '@podverse/helpers-validation/client';

import { getApiRequestService } from '../../factories/apiRequestService';
import { handleRateLimitAlert } from '../../utils/rateLimit/rateLimitAlert';
import { Button } from '../Button/Button';
import Form from '../Form/Form';
import { FormInfoMessageText } from '../Form/FormInfoMessageText';
import { TextInput } from '../Form/TextInput';

import styles from '../../styles/components/Auth/AuthEmailChangeForm.module.scss';

export const AuthEmailChangeForm: React.FC = () => {
  const [email, setEmail] = useState('');
  const [emailErrorKey, setEmailErrorKey] = useState<string | undefined>();
  const [emailTouched, setEmailTouched] = useState(false);
  const [isEmailSent, setIsEmailSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const tAuthentication = useTranslations('authentication');
  const tMisc = useTranslations('misc');
  const router = useRouter();
  const locale = useLocale();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isFormValid) {
      setIsLoading(true);
      try {
        await getApiRequestService().reqAccountSendChangeEmailAddressEmail({ new_email: email });
        setIsEmailSent(true);
      } catch (err) {
        const rateLimitErrorHandled = await handleRateLimitAlert(err, locale, tMisc);
        if (!rateLimitErrorHandled) {
          console.error('Send change email address email failed:', err);
          alert(tMisc('errors.generic'));
        }
      }
    }
    setIsLoading(false);
  };

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
  };

  const isFormValid = !getEmailErrorKey(email) && !!email;

  return (
    <div className={styles.authEmailChangeForm}>
      {!isEmailSent && (
        <Form onSubmit={handleSubmit}>
          <TextInput
            type="email"
            name="email"
            value={email}
            onChange={(e) => onEmailChange(e.target.value)}
            onBlur={handleEmailBlur}
            autoFocus
            placeholder={tAuthentication('email')}
            eyebrow={tAuthentication('email')}
            infoError={emailErrorKey ? tAuthentication(emailErrorKey) : undefined}
          />
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
      {isEmailSent && (
        <FormInfoMessageText message={tAuthentication('change_email_address_email_sent')} />
      )}
    </div>
  );
};
