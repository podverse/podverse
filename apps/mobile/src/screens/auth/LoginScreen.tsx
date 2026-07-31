import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { getErrorResponseStatus } from '@podverse/helpers/error';

import { loginWithMobileToken, useAuth } from '../../auth';
import { resolveLocalDevLoginPrefill } from '../../auth/localDevLoginPrefill';
import { getMobileConfig } from '../../config';
import { accountRepository } from '../../data';
import { applyAccountLocaleOverride } from '../../i18n';
import { useTheme } from '../../theme/useTheme';

type LoginScreenProps = {
  /** Return to the anonymous tab shell without signing in (guest skip). */
  onDismiss?: () => void;
  onSwitchToSignUp: () => void;
};

export function LoginScreen({ onDismiss, onSwitchToSignUp }: LoginScreenProps) {
  const { t } = useTranslation();
  const { isE2e } = getMobileConfig();
  const localDevPrefill = resolveLocalDevLoginPrefill({ isDev: __DEV__, isE2e });
  const [email, setEmail] = useState(localDevPrefill?.email ?? '');
  const [password, setPassword] = useState(localDevPrefill?.password ?? '');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { styles: themeStyles, tokens } = useTheme();
  const { clearSession, setAccount, setError: setAuthError, setTokens } = useAuth();

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
    title: {
      color: themeStyles.textPrimary.color,
      fontSize: 24,
      fontWeight: '700',
    },
  });

  const handleSubmit = async () => {
    if (isLoading) {
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const result = await loginWithMobileToken({ email, password, setTokens });
      if (!result.ok) {
        if (result.error === 'invalid_credentials') {
          setError(t('authentication.invalid_email_or_password'));
        } else {
          setError(t('authentication.mobile_api_not_configured'));
        }
        return;
      }

      try {
        const account = await accountRepository.refresh({
          accessToken: result.accessToken,
          clearSession,
          refreshToken: result.refreshToken,
          setTokens,
        });
        setAccount(account);
        try {
          await applyAccountLocaleOverride(
            account.account_settings?.account_settings_locale?.locale
          );
        } catch (error) {
          console.warn('Failed to apply account locale after login hydrate', error);
        }
        setAuthError(null);
      } catch (error) {
        if (getErrorResponseStatus(error) === 401) {
          setError(t('authentication.session_expired'));
          return;
        }

        setAuthError('auth_bootstrap_failed');
        setError(t('authentication.signed_in_account_load_failed'));
      }
    } catch {
      // Network/unexpected errors must surface: a silent failure looks identical to
      // "nothing happened" and is very hard to diagnose (especially in E2E).
      setError(t('authentication.could_not_sign_in'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container} testID="login-screen">
      <View style={styles.card}>
        <Text style={styles.title}>{t('authentication.login')}</Text>
        <Text style={styles.label}>{t('authentication.email')}</Text>
        <TextInput
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          onChangeText={setEmail}
          style={styles.input}
          testID="login-email"
          value={email}
        />
        <Text style={styles.label}>{t('authentication.password')}</Text>
        <TextInput
          autoCapitalize="none"
          autoCorrect={false}
          onChangeText={setPassword}
          // E2E: iOS Autofill + secureTextEntry blocks Maestro inputText; plaintext when isE2e.
          secureTextEntry={!isE2e}
          style={styles.input}
          testID="login-password"
          value={password}
        />
        <Pressable
          accessibilityRole="button"
          disabled={isLoading}
          onPress={() => {
            void handleSubmit();
          }}
          style={styles.button}
          testID="login-submit"
        >
          <Text style={styles.buttonText}>{isLoading ? t('misc.loading') : t('misc.submit')}</Text>
        </Pressable>
        {error !== null ? (
          <Text style={styles.error} testID="login-error">
            {error}
          </Text>
        ) : null}
        <Pressable
          accessibilityRole="button"
          onPress={onSwitchToSignUp}
          style={styles.button}
          testID="auth-switch-signup"
        >
          <Text style={styles.buttonText}>{t('authentication.need_an_account_sign_up')}</Text>
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
