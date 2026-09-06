import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { getErrorResponseStatus } from '@podverse/helpers/error';

import { loginWithMobileToken, useAuth } from '../../auth';
import { resolveLocalDevLoginPrefill } from '../../auth/localDevLoginPrefill';
import { reconcileAccountPrefsFromAccount } from '../../auth/syncAccountPrefs';
import { Button } from '../../components/primitives';
import { HeaderBarChrome } from '../../components/screen/HeaderBarChrome';
import { MobileScreenContainer } from '../../components/screen/MobileScreenContainer';
import { getMobileConfig } from '../../config';
import { accountRepository } from '../../data';
import { runSignupSubscriptionMerge } from '../../data/repositories/subscriptionsSignupMerge';
import { useTheme } from '../../theme/useTheme';

type LoginScreenProps = {
  onDismiss: () => void;
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

      const authContext = {
        accessToken: result.accessToken,
        clearSession,
        refreshToken: result.refreshToken,
        setTokens,
      };

      // Before the refresh below, which makes the account authoritative over local subscriptions.
      // Only does anything when this device just created this account; never throws.
      await runSignupSubscriptionMerge(email, authContext);

      try {
        // Someone is watching the sign-in spinner, so the account itself is fetched inline. What it
        // implies — the directory walk, playlists, the car index, device registration — is queued
        // by the sign-in trigger, because none of it is worth holding this button for.
        const account = await accountRepository.refreshSnapshot(authContext);
        setAccount(account);
        try {
          await reconcileAccountPrefsFromAccount(account);
        } catch (error) {
          console.warn('Failed to reconcile account prefs after login hydrate', error);
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
    <View style={styles.root} testID="login-screen">
      <HeaderBarChrome
        backAccessibilityLabel={t('misc.dismiss')}
        backIcon="chevron-down"
        backTestID="auth-dismiss"
        onBack={onDismiss}
        title={t('authentication.login')}
      />
      <MobileScreenContainer testID="login-form">
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
        <View style={styles.submit}>
          <Button
            disabled={isLoading}
            fullWidth
            label={t('misc.submit')}
            loading={isLoading}
            onPress={() => {
              void handleSubmit();
            }}
            testID="login-submit"
          />
        </View>
        {error !== null ? (
          <Text style={styles.error} testID="login-error">
            {error}
          </Text>
        ) : null}
        <View style={styles.promptBlock}>
          <Text style={styles.prompt}>{t('authentication.need_an_account')}</Text>
          <Pressable
            accessibilityRole="link"
            onPress={onSwitchToSignUp}
            testID="auth-switch-signup"
          >
            <Text style={styles.link}>{t('authentication.sign_up')}</Text>
          </Pressable>
        </View>
      </MobileScreenContainer>
    </View>
  );
}
