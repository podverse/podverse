import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { getEmailErrorKey } from '@podverse/helpers-validation/client';

import { createMobileApiRequestService } from '../../auth';
import { FormActions, TextField } from '../../components/form';
import { HeaderBarChrome } from '../../components/screen/HeaderBarChrome';
import { MobileScreenContainer } from '../../components/screen/MobileScreenContainer';
import { handleRateLimitMessage } from '../../lib/rateLimit/handleRateLimitMessage';
import { formActionsTopGap } from '../../theme/screenLayout';
import { typography } from '../../theme/typography';
import { useTheme } from '../../theme/useTheme';

type ForgotPasswordScreenProps = {
  onBackToLogin: () => void;
};

export function ForgotPasswordScreen({ onBackToLogin }: ForgotPasswordScreenProps) {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);
  const { styles: themeStyles, tokens } = useTheme();

  const styles = StyleSheet.create({
    error: {
      color: tokens.text.danger,
      fontWeight: '700',
      marginTop: tokens.spacing.md,
    },
    root: {
      backgroundColor: themeStyles.screen.backgroundColor,
      flex: 1,
    },
    sent: {
      ...typography.prose,
      color: themeStyles.textPrimary.color,
    },
    submit: {
      marginTop: formActionsTopGap(tokens.spacing),
    },
  });

  const handleSubmit = async () => {
    if (isLoading) {
      return;
    }

    if (getEmailErrorKey(email) !== undefined) {
      setError(t('authentication.invalid_email'));
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
      await apiRequestService.reqAccountSendResetPasswordEmail({ email });
      setEmailSent(true);
    } catch (sendError) {
      setError(handleRateLimitMessage(sendError, t) ?? t('errors.generic'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.root} testID="forgot-password-screen">
      <HeaderBarChrome
        backAccessibilityLabel={t('misc.go_back')}
        onBack={onBackToLogin}
        title={t('authentication.forgot_password')}
      />
      <MobileScreenContainer testID="forgot-password-form">
        {emailSent ? (
          <Text accessibilityLiveRegion="polite" style={styles.sent} testID="forgot-password-sent">
            {t('authentication.forgot_password_email_sent_message')}
          </Text>
        ) : (
          <>
            <TextField
              accessibilityLabel={t('authentication.email')}
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect={false}
              eyebrow={t('authentication.email')}
              keyboardType="email-address"
              onChangeText={(value) => {
                setEmail(value);
                setError(null);
              }}
              onSubmitEditing={() => {
                void handleSubmit();
              }}
              placeholder={t('authentication.email_example')}
              returnKeyType="done"
              testID="forgot-password-email"
              textContentType="emailAddress"
              value={email}
            />
            <FormActions
              actions={[
                {
                  disabled: isLoading,
                  label: t('misc.submit'),
                  loading: isLoading,
                  onPress: () => {
                    void handleSubmit();
                  },
                  testID: 'forgot-password-submit',
                },
              ]}
              style={styles.submit}
            />
            {error !== null ? (
              <Text
                accessibilityLiveRegion="polite"
                style={styles.error}
                testID="forgot-password-error"
              >
                {error}
              </Text>
            ) : null}
          </>
        )}
      </MobileScreenContainer>
    </View>
  );
}
