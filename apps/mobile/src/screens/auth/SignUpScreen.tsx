import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { DTOTermsAgreement } from '@podverse/helpers';
import { DEFAULT_LOCALE } from '@podverse/helpers/locales';
import { getEmailErrorKey, getPasswordErrorKey } from '@podverse/helpers-validation/client';

import { createMobileApiRequestService } from '../../auth';
import { signupCompletionKind } from '../../auth/signupVerificationEmailNotice';
import { VerificationEmailNotSentMessage } from '../../auth/VerificationEmailNotSentMessage';
import { CopyMarkdown } from '../../components/content/CopyMarkdown';
import { CustomApiNotice } from '../../components/feedback/CustomApiNotice';
import { FormActions, TextField } from '../../components/form';
import { Accordion, CheckboxRow } from '../../components/primitives';
import { HeaderBarChrome } from '../../components/screen/HeaderBarChrome';
import { MobileScreenContainer } from '../../components/screen/MobileScreenContainer';
import { RetryableError } from '../../components/state/RetryableError';
import { getMobileConfig } from '../../config';
import { writeSignupMergeEmail } from '../../data/repositories/subscriptionsSignupMarker';
import { SlideUpDismissGesture } from '../../navigation/SlideUpDismissGesture';
import { formActionsTopGap } from '../../theme/screenLayout';
import { typography } from '../../theme/typography';
import { useTheme } from '../../theme/useTheme';

type SignUpScreenProps = {
  onDismiss: () => void;
  /** Downward drag from the header band. Skips the Modal slide so the drag is the only motion. */
  onDragDismiss: () => void;
  onSwitchToLogin: () => void;
};

const AUTHENTICATION_VALIDATION_KEY_PREFIX = 'authentication.';

export function SignUpScreen({ onDismiss, onDragDismiss, onSwitchToLogin }: SignUpScreenProps) {
  const { i18n, t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [agreement, setAgreement] = useState<DTOTermsAgreement | null>(null);
  const [termsError, setTermsError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isE2e } = getMobileConfig();
  const [accountCreated, setAccountCreated] = useState(false);
  const [verificationEmailNotSent, setVerificationEmailNotSent] = useState(false);
  const { styles: themeStyles, tokens } = useTheme();

  const resolveValidationError = (validationError: string): string => {
    const validationErrorKeys = new Set(['invalid_email', 'invalid_password']);
    if (validationErrorKeys.has(validationError)) {
      return t(`${AUTHENTICATION_VALIDATION_KEY_PREFIX}${validationError}`);
    }

    return t('authentication.invalid_email_or_password');
  };

  const styles = StyleSheet.create({
    agreeRow: {
      marginTop: formActionsTopGap(tokens.spacing),
    },
    error: {
      color: tokens.text.danger,
      fontWeight: '700',
      marginTop: tokens.spacing.md,
    },
    fields: {
      gap: tokens.spacing.md,
    },
    link: {
      color: tokens.text.link,
      fontWeight: '600',
    },
    prompt: {
      color: themeStyles.textPrimary.color,
    },
    promptBlock: {
      alignItems: 'flex-start',
      gap: tokens.spacing.sm,
      marginTop: tokens.spacing.lg,
    },
    root: {
      backgroundColor: themeStyles.screen.backgroundColor,
      flex: 1,
    },
    submit: {
      marginTop: formActionsTopGap(tokens.spacing),
    },
    successBody: {
      ...typography.prose,
      color: themeStyles.textPrimary.color,
    },
    termsAccordion: {
      marginTop: formActionsTopGap(tokens.spacing),
    },
  });

  const validateInputs = (): string | null => {
    const emailErrorKey = getEmailErrorKey(email);
    if (emailErrorKey !== undefined) {
      return emailErrorKey;
    }

    const passwordErrorKey = getPasswordErrorKey(password);
    if (passwordErrorKey !== undefined) {
      return passwordErrorKey;
    }

    return null;
  };

  const loadTerms = useCallback(() => {
    const api = createMobileApiRequestService();
    if (api === null) {
      setTermsError(true);
      return;
    }
    setTermsError(false);
    let cancelled = false;
    void api
      .reqLegalTerms({ locale: i18n.language })
      .then((data) => {
        if (!cancelled) {
          setAgreement(data);
          setTermsError(false);
        }
      })
      .catch((loadError: unknown) => {
        console.warn('[SignUpScreen] terms load failed', loadError);
        if (!cancelled) {
          setAgreement(null);
          setTermsError(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [i18n.language]);

  useEffect(() => {
    const cleanup = loadTerms();
    return cleanup;
  }, [loadTerms]);

  const handleSubmit = async () => {
    if (isLoading || agreement === null || !agreed) {
      return;
    }

    const validationError = validateInputs();
    if (validationError !== null) {
      setError(resolveValidationError(validationError));
      return;
    }

    const apiRequestService = createMobileApiRequestService();
    if (apiRequestService === null) {
      setError(t('authentication.mobile_api_not_configured'));
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const created = await apiRequestService.reqAccountCreate({
        email,
        locale: DEFAULT_LOCALE,
        password,
        terms_version: agreement.version,
      });
      // Sign-up does not sign the user in, so subscriptions made while signed out are pushed up by
      // the login that follows. Recording the email here authorizes that one merge.
      await writeSignupMergeEmail(email);
      setVerificationEmailNotSent(
        signupCompletionKind(created.code) === 'verification_email_not_sent'
      );
      setAccountCreated(true);
    } catch {
      setError(t('authentication.could_not_sign_in'));
    } finally {
      setIsLoading(false);
    }
  };

  if (accountCreated) {
    const title = verificationEmailNotSent
      ? t('authentication.verification_email_not_sent_title')
      : t('authentication.account_created_title');
    return (
      <SlideUpDismissGesture enabled onDismiss={onDragDismiss}>
        <View style={styles.root} testID="signup-screen">
          <HeaderBarChrome
            backAccessibilityLabel={t('misc.dismiss')}
            backIcon="chevron-down"
            backTestID="auth-dismiss"
            onBack={onDismiss}
            title={title}
          />
          <MobileScreenContainer testID="signup-success">
            {verificationEmailNotSent ? (
              <VerificationEmailNotSentMessage
                contactTestID="signup-verification-email-not-sent-contact"
                testID="signup-verification-email-not-sent"
              />
            ) : (
              <Text
                accessibilityLiveRegion="polite"
                style={styles.successBody}
                testID="signup-success-message"
              >
                {t('authentication.account_created_body')}
              </Text>
            )}
            <FormActions
              actions={[
                {
                  label: t('authentication.login'),
                  onPress: onSwitchToLogin,
                  testID: 'signup-success-login',
                },
              ]}
              style={styles.submit}
            />
          </MobileScreenContainer>
        </View>
      </SlideUpDismissGesture>
    );
  }

  return (
    <SlideUpDismissGesture enabled onDismiss={onDragDismiss}>
      <View style={styles.root} testID="signup-screen">
        <HeaderBarChrome
          backAccessibilityLabel={t('misc.dismiss')}
          backIcon="chevron-down"
          backTestID="auth-dismiss"
          onBack={onDismiss}
          title={t('authentication.sign_up')}
        />
        <MobileScreenContainer testID="signup-form">
          <CustomApiNotice />
          <View style={styles.fields}>
            <TextField
              accessibilityLabel={t('authentication.email')}
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect={false}
              eyebrow={t('authentication.email')}
              keyboardType="email-address"
              onChangeText={setEmail}
              placeholder={t('authentication.email_example')}
              testID="signup-email"
              textContentType="emailAddress"
              value={email}
            />
            <TextField
              accessibilityLabel={t('authentication.password')}
              autoCapitalize="none"
              autoComplete={isE2e ? 'off' : 'new-password'}
              autoCorrect={false}
              eyebrow={t('authentication.password')}
              onChangeText={setPassword}
              placeholder={t('authentication.password_hint')}
              secureTextEntry={!isE2e}
              testID="signup-password"
              textContentType={isE2e ? 'none' : 'newPassword'}
              value={password}
            />
          </View>
          {termsError ? (
            <RetryableError
              errorKey="terms_acceptance.load_error"
              onRetry={loadTerms}
              testID="signup-terms-error"
            />
          ) : null}
          {agreement !== null ? (
            <View style={styles.termsAccordion}>
              <Accordion
                subtitle={t('terms_acceptance.agreement_date', {
                  agreement_date: agreement.version,
                })}
                testID="signup-terms-full"
                title={t('terms_acceptance.full_agreement')}
              >
                <CopyMarkdown markdown={agreement.markdown} />
              </Accordion>
            </View>
          ) : null}
          <CheckboxRow
            checked={agreed}
            label={t('terms_acceptance.checkbox_label')}
            onPress={() => {
              setAgreed((current) => !current);
            }}
            style={styles.agreeRow}
            testID="signup-agree-terms"
          />
          <FormActions
            actions={[
              {
                disabled: isLoading || !agreed || agreement === null,
                label: t('authentication.create_account'),
                loading: isLoading,
                onPress: () => {
                  void handleSubmit();
                },
                testID: 'signup-submit',
              },
            ]}
            style={styles.submit}
          />
          {error !== null ? (
            <Text style={styles.error} testID="signup-error">
              {error}
            </Text>
          ) : null}
          <View style={styles.promptBlock}>
            <Text style={styles.prompt}>{t('authentication.already_have_an_account')}</Text>
            <Pressable
              accessibilityRole="link"
              onPress={onSwitchToLogin}
              testID="auth-switch-login"
            >
              <Text style={styles.link}>{t('authentication.login')}</Text>
            </Pressable>
          </View>
        </MobileScreenContainer>
      </View>
    </SlideUpDismissGesture>
  );
}
