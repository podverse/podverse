import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  completeMobilePasswordLogin,
  completeMobilePasswordLoginMessageKey,
  useAuth,
} from '../../auth';
import { resolveLocalDevLoginPrefill } from '../../auth/localDevLoginPrefill';
import { TextField } from '../../components/form';
import { Button } from '../../components/primitives';
import { HeaderBarChrome } from '../../components/screen/HeaderBarChrome';
import { MobileScreenContainer } from '../../components/screen/MobileScreenContainer';
import { getMobileConfig } from '../../config';
import { formActionsTopGap } from '../../theme/screenLayout';
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
  });

  const handleSubmit = async () => {
    if (isLoading) {
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const result = await completeMobilePasswordLogin({
        clearSession,
        email,
        password,
        setAccount,
        setAuthError,
        setTokens,
      });
      if (!result.ok) {
        setError(t(completeMobilePasswordLoginMessageKey(result.error)));
      }
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
        <View style={styles.fields}>
          <TextField
            accessibilityLabel={t('authentication.email_or_username')}
            autoCapitalize="none"
            autoCorrect={false}
            eyebrow={t('authentication.email_or_username')}
            keyboardType="email-address"
            onChangeText={setEmail}
            placeholder={t('authentication.email_example')}
            testID="login-email"
            value={email}
          />
          <TextField
            accessibilityLabel={t('authentication.password')}
            autoCapitalize="none"
            autoCorrect={false}
            eyebrow={t('authentication.password')}
            onChangeText={setPassword}
            placeholder={t('authentication.password_hint')}
            // E2E: iOS Autofill + secureTextEntry blocks Maestro inputText; plaintext when isE2e.
            secureTextEntry={!isE2e}
            testID="login-password"
            value={password}
          />
        </View>
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
