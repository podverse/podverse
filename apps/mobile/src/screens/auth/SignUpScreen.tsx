import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { DEFAULT_LOCALE } from '@podverse/helpers/locales';
import {
  getEmailErrorKey,
  getPassword2ErrorKey,
  getPasswordErrorKey,
} from '@podverse/helpers-validation/client';

import { createMobileApiRequestService } from '../../auth';
import { getMobileConfig } from '../../config';
import { writeSignupMergeEmail } from '../../data/repositories/subscriptionsSignupMarker';
import { useTheme } from '../../theme/useTheme';

type SignUpScreenProps = {
  /** Return to the anonymous tab shell without creating an account (guest skip). */
  onDismiss?: () => void;
  onSwitchToLogin: () => void;
};

const DEFAULT_TERMS_VERSION = '1';
const AUTHENTICATION_VALIDATION_KEY_PREFIX = 'authentication.';

export function SignUpScreen({ onDismiss, onSwitchToLogin }: SignUpScreenProps) {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
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
    button: {
      alignItems: 'center',
      backgroundColor: themeStyles.buttonPrimary.backgroundColor,
      borderRadius: tokens.radii.md,
      paddingHorizontal: tokens.spacing.lg,
      paddingVertical: tokens.spacing.md,
    },
    buttonText: {
      color: themeStyles.buttonPrimary.color,
      fontWeight: '600',
    },
    card: {
      backgroundColor: tokens.background.secondary,
      borderColor: themeStyles.border.borderColor,
      borderRadius: tokens.radii.md,
      borderWidth: 1,
      maxWidth: 440,
      padding: tokens.spacing['2xl'],
      width: '100%',
    },
    container: {
      alignItems: 'center',
      backgroundColor: themeStyles.screen.backgroundColor,
      flex: 1,
      justifyContent: 'center',
      padding: tokens.spacing['2xl'],
    },
    error: {
      color: themeStyles.textSecondary.color,
      marginTop: tokens.spacing.md,
    },
    input: {
      borderColor: themeStyles.border.borderColor,
      borderRadius: tokens.radii.sm,
      borderWidth: 1,
      color: themeStyles.textPrimary.color,
      marginTop: tokens.spacing.sm,
      paddingHorizontal: tokens.spacing.md,
      paddingVertical: tokens.spacing.sm,
    },
    label: {
      color: themeStyles.textPrimary.color,
      marginTop: tokens.spacing.md,
    },
    success: {
      color: themeStyles.textPrimary.color,
      marginTop: tokens.spacing.md,
    },
    title: {
      color: themeStyles.textPrimary.color,
      fontSize: 24,
      fontWeight: '700',
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

  const handleSubmit = async () => {
    if (isLoading) {
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
        allow_listen_stats: true,
        email,
        locale: DEFAULT_LOCALE,
        password,
        terms_version: DEFAULT_TERMS_VERSION,
      });
      // Sign-up does not sign the user in, so subscriptions made while signed out are pushed up by
      // the login that follows. Recording the email here is what authorizes that one merge (701).
      await writeSignupMergeEmail(email);
      setSuccessMessage(t('authentication.account_created_message'));
    } catch {
      setError(t('authentication.could_not_sign_in'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container} testID="signup-screen">
      <View style={styles.card}>
        <Text style={styles.title}>{t('authentication.sign_up')}</Text>
        <Text style={styles.label}>{t('authentication.email')}</Text>
        <TextInput
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          onChangeText={setEmail}
          style={styles.input}
          testID="signup-email"
          value={email}
        />
        <Text style={styles.label}>{t('authentication.password')}</Text>
        <TextInput
          autoCapitalize="none"
          autoCorrect={false}
          onChangeText={setPassword}
          secureTextEntry={!isE2e}
          style={styles.input}
          testID="signup-password"
          value={password}
        />
        <Text style={styles.label}>{t('authentication.confirm_password')}</Text>
        <TextInput
          autoCapitalize="none"
          autoCorrect={false}
          onChangeText={setPasswordConfirm}
          secureTextEntry={!isE2e}
          style={styles.input}
          testID="signup-password-confirm"
          value={passwordConfirm}
        />
        <Pressable
          accessibilityRole="button"
          disabled={isLoading}
          onPress={() => {
            void handleSubmit();
          }}
          style={styles.button}
          testID="signup-submit"
        >
          <Text style={styles.buttonText}>
            {isLoading ? t('misc.loading') : t('authentication.create_account')}
          </Text>
        </Pressable>
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
        <Pressable
          accessibilityRole="button"
          onPress={onSwitchToLogin}
          style={styles.button}
          testID="auth-switch-login"
        >
          <Text style={styles.buttonText}>
            {t('authentication.already_have_an_account_log_in')}
          </Text>
        </Pressable>
        {onDismiss !== undefined ? (
          <Pressable
            accessibilityRole="button"
            onPress={onDismiss}
            style={styles.button}
            testID="auth-dismiss"
          >
            <Text style={styles.buttonText}>{t('misc.cancel')}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
