import { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text } from 'react-native';

import { getEmailErrorKey } from '@podverse/helpers-validation/client';

import { requestWithMobileAuthRefresh, useAuth } from '../auth';
import { FormActions, TextField } from '../components/form';
import { Button, Card } from '../components/primitives';
import { handleRateLimitMessage } from '../lib/rateLimit/handleRateLimitMessage';
import { formActionsTopGap } from '../theme/screenLayout';
import { typography } from '../theme/typography';
import { useTheme } from '../theme/useTheme';

/**
 * Starts an email change from the account access panel. The confirmation link stays on the
 * website. The panel is a full-screen modal, so this form stays inline.
 */
export function AccountAccessChangeEmail() {
  const { t } = useTranslation();
  const { styles: themeStyles, tokens } = useTheme();
  const { accessToken, clearSession, refreshToken, setTokens } = useAuth();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [emailTouched, setEmailTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const submittingRef = useRef(false);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        description: {
          color: themeStyles.textSecondary.color,
          fontSize: 15,
          marginBottom: tokens.spacing.md,
        },
        error: {
          ...typography.body,
          color: themeStyles.textSecondary.color,
          marginTop: tokens.spacing.sm,
        },
        formActions: {
          marginTop: formActionsTopGap(tokens.spacing),
        },
        intro: {
          ...typography.prose,
          color: themeStyles.textSecondary.color,
          marginBottom: tokens.spacing.md,
        },
        message: {
          ...typography.prose,
          color: themeStyles.textSecondary.color,
        },
        section: {
          marginBottom: tokens.spacing.lg,
        },
        sectionTitle: {
          color: themeStyles.textPrimary.color,
          fontSize: 18,
          fontWeight: '400',
          marginBottom: tokens.spacing.sm,
        },
      }),
    [themeStyles, tokens]
  );

  const emailInvalid = getEmailErrorKey(email.trim()) !== undefined;
  const validationMessage = emailTouched && emailInvalid ? t('authentication.invalid_email') : null;
  const visibleError = serverError ?? validationMessage;

  const closeForm = () => {
    submittingRef.current = false;
    setOpen(false);
    setEmail('');
    setEmailTouched(false);
    setSubmitting(false);
    setSent(false);
    setServerError(null);
  };

  const submit = async () => {
    if (submittingRef.current) {
      return;
    }
    setEmailTouched(true);
    if (getEmailErrorKey(email.trim()) !== undefined) {
      return;
    }

    submittingRef.current = true;
    setSubmitting(true);
    setServerError(null);
    try {
      await requestWithMobileAuthRefresh(
        { accessToken, clearSession, refreshToken, setTokens },
        (api) => api.reqAccountSendChangeEmailAddressEmail({ new_email: email.trim() })
      );
      setSent(true);
    } catch (error) {
      setServerError(handleRateLimitMessage(error, t) ?? t('errors.generic'));
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  if (!open) {
    return (
      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>{t('settings.account.change_email')}</Text>
        <Text style={styles.description}>{t('settings.account.change_email_description')}</Text>
        <Button
          fullWidth
          label={t('settings.account.change_email')}
          onPress={() => {
            setOpen(true);
          }}
          size="form"
          testID="account-access-change-email"
        />
      </Card>
    );
  }

  return (
    <Card style={styles.section}>
      <Text style={styles.sectionTitle}>{t('settings.account.change_email_modal.title')}</Text>
      {sent ? (
        <Text
          accessibilityLiveRegion="polite"
          style={styles.message}
          testID="account-access-change-email-sent"
        >
          {t('settings.account.change_email_modal.email_sent')}
        </Text>
      ) : (
        <>
          <Text style={styles.intro}>{t('settings.account.change_email_modal.message')}</Text>
          <TextField
            accessibilityLabel={t('authentication.email')}
            autoCapitalize="none"
            autoComplete="email"
            autoCorrect={false}
            eyebrow={t('authentication.email')}
            keyboardType="email-address"
            onBlur={() => {
              setEmailTouched(true);
            }}
            onChangeText={(value) => {
              setEmail(value);
              setServerError(null);
            }}
            placeholder={t('authentication.email_example')}
            testID="account-access-change-email-email"
            textContentType="emailAddress"
            value={email}
          />
          {visibleError !== null ? (
            <Text
              accessibilityLiveRegion="polite"
              style={styles.error}
              testID="account-access-change-email-error"
            >
              {visibleError}
            </Text>
          ) : null}
          <FormActions
            actions={[
              {
                label: t('misc.cancel'),
                onPress: closeForm,
                testID: 'account-access-change-email-cancel',
                variant: 'secondary',
              },
              {
                disabled: emailInvalid || submitting,
                label: t('settings.account.change_email'),
                loading: submitting,
                onPress: () => {
                  void submit();
                },
                testID: 'account-access-change-email-submit',
              },
            ]}
            style={styles.formActions}
          />
        </>
      )}
    </Card>
  );
}
