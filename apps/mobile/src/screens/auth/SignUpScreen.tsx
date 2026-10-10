import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { DTOTermsAgreement } from '@podverse/helpers';
import { DEFAULT_LOCALE } from '@podverse/helpers/locales';
import {
  getEmailErrorKey,
  getPassword2ErrorKey,
  getPasswordErrorKey,
} from '@podverse/helpers-validation/client';

import { createMobileApiRequestService } from '../../auth';
import { CopyMarkdown } from '../../components/content/CopyMarkdown';
import { TextField } from '../../components/form';
import { Accordion, Button } from '../../components/primitives';
import { HeaderBarChrome } from '../../components/screen/HeaderBarChrome';
import { MobileScreenContainer } from '../../components/screen/MobileScreenContainer';
import { RetryableError } from '../../components/state/RetryableError';
import { getMobileConfig } from '../../config';
import { writeSignupMergeEmail } from '../../data/repositories/subscriptionsSignupMarker';
import { formActionsTopGap } from '../../theme/screenLayout';
import { useTheme } from '../../theme/useTheme';

type SignUpScreenProps = {
  onDismiss: () => void;
  onSwitchToLogin: () => void;
};

const AUTHENTICATION_VALIDATION_KEY_PREFIX = 'authentication.';

export function SignUpScreen({ onDismiss, onSwitchToLogin }: SignUpScreenProps) {
  const { i18n, t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [agreement, setAgreement] = useState<DTOTermsAgreement | null>(null);
  const [termsError, setTermsError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isE2e } = getMobileConfig();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const { styles: themeStyles, tokens } = useTheme();

  const resolveValidationError = (validationError: string): string => {
    const validationErrorKeys = new Set(['invalid_email', 'invalid_password', 'password_mismatch']);
    if (validationErrorKeys.has(validationError)) {
      return t(`${AUTHENTICATION_VALIDATION_KEY_PREFIX}${validationError}`);
    }

    return t('authentication.invalid_email_or_password');
  };

  const styles = StyleSheet.create({
    agreeLabel: {
      color: themeStyles.textPrimary.color,
      flex: 1,
    },
    agreeRow: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: tokens.spacing.sm,
      marginTop: tokens.spacing.lg,
    },
    checkbox: {
      color: themeStyles.textPrimary.color,
      fontSize: 18,
    },
    date: {
      color: themeStyles.textSecondary.color,
      marginTop: tokens.spacing.md,
    },
    error: {
      color: themeStyles.textSecondary.color,
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
    success: {
      color: themeStyles.textPrimary.color,
      marginTop: tokens.spacing.md,
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

    const password2ErrorKey = getPassword2ErrorKey(password, passwordConfirm);
    if (password2ErrorKey !== undefined) {
      return password2ErrorKey;
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
    setSuccessMessage(null);
    try {
      await apiRequestService.reqAccountCreate({
        email,
        locale: DEFAULT_LOCALE,
        password,
        terms_version: agreement.version,
      });
      // Sign-up does not sign the user in, so subscriptions made while signed out are pushed up by
      // the login that follows. Recording the email here authorizes that one merge.
      await writeSignupMergeEmail(email);
      setSuccessMessage(t('authentication.account_created_message'));
    } catch {
      setError(t('authentication.could_not_sign_in'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.root} testID="signup-screen">
      <HeaderBarChrome
        backAccessibilityLabel={t('misc.dismiss')}
        backIcon="chevron-down"
        backTestID="auth-dismiss"
        onBack={onDismiss}
        title={t('authentication.sign_up')}
      />
      <MobileScreenContainer testID="signup-form">
        <View style={styles.fields}>
          <TextField
            accessibilityLabel={t('authentication.email')}
            autoCapitalize="none"
            autoCorrect={false}
            eyebrow={t('authentication.email')}
            keyboardType="email-address"
            onChangeText={setEmail}
            placeholder={t('authentication.email_example')}
            testID="signup-email"
            value={email}
          />
          <TextField
            accessibilityLabel={t('authentication.password')}
            autoCapitalize="none"
            autoCorrect={false}
            eyebrow={t('authentication.password')}
            onChangeText={setPassword}
            placeholder={t('authentication.password_hint')}
            secureTextEntry={!isE2e}
            testID="signup-password"
            value={password}
          />
          <TextField
            accessibilityLabel={t('authentication.confirm_password')}
            autoCapitalize="none"
            autoCorrect={false}
            eyebrow={t('authentication.confirm_password')}
            onChangeText={setPasswordConfirm}
            placeholder={t('authentication.password_hint')}
            secureTextEntry={!isE2e}
            testID="signup-password-confirm"
            value={passwordConfirm}
          />
        </View>
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: agreed }}
          onPress={() => {
            setAgreed((current) => !current);
          }}
          style={styles.agreeRow}
          testID="signup-agree-terms"
        >
          <Text style={styles.checkbox}>{agreed ? '☑' : '☐'}</Text>
          <Text style={styles.agreeLabel}>{t('terms_acceptance.checkbox_label')}</Text>
        </Pressable>
        {termsError ? (
          <RetryableError
            errorKey="terms_acceptance.load_error"
            onRetry={loadTerms}
            testID="signup-terms-error"
          />
        ) : null}
        {agreement !== null ? (
          <>
            <Text style={styles.date}>
              {t('terms_acceptance.agreement_date', { agreement_date: agreement.version })}
            </Text>
            <Accordion testID="signup-terms-full" title={t('terms_acceptance.full_agreement')}>
              <CopyMarkdown markdown={agreement.markdown} />
            </Accordion>
          </>
        ) : null}
        <View style={styles.submit}>
          <Button
            disabled={isLoading || !agreed || agreement === null}
            fullWidth
            label={t('authentication.create_account')}
            loading={isLoading}
            onPress={() => {
              void handleSubmit();
            }}
            testID="signup-submit"
          />
        </View>
        {error !== null ? (
          <Text style={styles.error} testID="signup-error">
            {error}
          </Text>
        ) : null}
        {successMessage !== null ? (
          <Text style={styles.success} testID="signup-success">
            {successMessage}
          </Text>
        ) : null}
        <View style={styles.promptBlock}>
          <Text style={styles.prompt}>{t('authentication.already_have_an_account')}</Text>
          <Pressable accessibilityRole="link" onPress={onSwitchToLogin} testID="auth-switch-login">
            <Text style={styles.link}>{t('authentication.login')}</Text>
          </Pressable>
        </View>
      </MobileScreenContainer>
    </View>
  );
}
