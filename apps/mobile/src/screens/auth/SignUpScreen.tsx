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
import { Button } from '../../components/primitives';
import { HeaderBarChrome } from '../../components/screen/HeaderBarChrome';
import { MobileScreenContainer } from '../../components/screen/MobileScreenContainer';
import { getMobileConfig } from '../../config';
import { writeSignupMergeEmail } from '../../data/repositories/subscriptionsSignupMarker';
import { useTheme } from '../../theme/useTheme';

type SignUpScreenProps = {
  onDismiss: () => void;
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
      marginTop: tokens.spacing.xl,
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
        <View style={styles.submit}>
          <Button
            disabled={isLoading}
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
  );
}
