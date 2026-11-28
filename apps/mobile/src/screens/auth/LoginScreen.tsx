import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { getAccountSignupModeCapabilities } from '@podverse/helpers';
import {
  ACCOUNT_RESPONSE_CODES,
  getErrorResponseBodyCode,
  getErrorResponseStatus,
} from '@podverse/helpers/error';

import {
  completeMobilePasswordLogin,
  completeMobilePasswordLoginMessageKey,
  createMobileApiRequestService,
  useAuth,
} from '../../auth';
import { accountRepository } from '../../data/repositories/accountRepository';
import { resolveLocalDevLoginPrefill } from '../../auth/localDevLoginPrefill';
import { VerificationEmailNotSentMessage } from '../../auth/VerificationEmailNotSentMessage';
import { CustomApiNotice } from '../../components/feedback/CustomApiNotice';
import { FormActions, TextField } from '../../components/form';
import { HeaderBarChrome } from '../../components/screen/HeaderBarChrome';
import { MobileScreenContainer } from '../../components/screen/MobileScreenContainer';
import { getMobileConfig } from '../../config';
import { handleRateLimitMessage } from '../../lib/rateLimit/handleRateLimitMessage';
import { SlideUpDismissGesture } from '../../navigation/SlideUpDismissGesture';
import { formActionsTopGap } from '../../theme/screenLayout';
import { useTheme } from '../../theme/useTheme';

type LoginScreenProps = {
  onDismiss: () => void;
  /** Downward drag from the header band. Skips the Modal slide so the drag is the only motion. */
  onDragDismiss: () => void;
  onForgotPassword: () => void;
  onSwitchToSignUp: () => void;
};

export function LoginScreen({
  onDismiss,
  onDragDismiss,
  onForgotPassword,
  onSwitchToSignUp,
}: LoginScreenProps) {
  const { t } = useTranslation();
  const { accountSignupMode, isE2e } = getMobileConfig();
  const showForgotPassword =
    getAccountSignupModeCapabilities(accountSignupMode).canUseEmailVerificationFlows;
  const localDevPrefill = resolveLocalDevLoginPrefill({ isDev: __DEV__, isE2e });
  const [email, setEmail] = useState(localDevPrefill?.email ?? '');
  const [password, setPassword] = useState(localDevPrefill?.password ?? '');
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accountNotVerified, setAccountNotVerified] = useState(false);
  const [verificationEmailSent, setVerificationEmailSent] = useState(false);
  const [verificationEmailNotSent, setVerificationEmailNotSent] = useState(false);
  const [factorCode, setFactorCode] = useState('');
  const [factor, setFactor] = useState<
    | { challengeToken: string; kind: 'code' }
    | { kind: 'setup'; manualKey: string; qrDataUrl: string; setupToken: string }
    | { codes: string[]; kind: 'backup' }
    | null
  >(null);
  const { styles: themeStyles, tokens } = useTheme();
  const { clearSession, setAccount, setError: setAuthError, setTokens } = useAuth();

  const styles = StyleSheet.create({
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
    notice: {
      color: themeStyles.textPrimary.color,
    },
    noticeBlock: {
      gap: tokens.spacing.sm,
      marginTop: tokens.spacing.md,
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

  const hideUnverifiedNotice = () => {
    setAccountNotVerified(false);
    setVerificationEmailSent(false);
    setVerificationEmailNotSent(false);
  };

  const handleSubmit = async () => {
    if (isLoading) {
      return;
    }

    setIsLoading(true);
    setError(null);
    hideUnverifiedNotice();
    try {
      const api = createMobileApiRequestService();
      if (factor?.kind === 'backup') {
        onDismiss();
        return;
      }
      if ((factor?.kind === 'code' || factor?.kind === 'setup') && api !== null) {
        const confirmed =
          factor.kind === 'code'
            ? await api.reqAuthSecondFactorCode({
                challengeToken: factor.challengeToken,
                code: factorCode,
              })
            : await api.reqAuthSecondFactorSetupConfirm({
                code: factorCode,
                setupToken: factor.setupToken,
              });
        if (confirmed.challenge === 'expired') {
          setFactor(null);
          setError(t('authentication.second_factor_expired'));
          return;
        }
        if (factor.kind === 'setup' && Array.isArray(confirmed.backupCodes)) {
          if (typeof confirmed.access_token === 'string' && typeof confirmed.refresh_token === 'string') {
            await setTokens({
              accessToken: confirmed.access_token,
              refreshToken: confirmed.refresh_token,
            });
            const account = await accountRepository.refreshSnapshot({
              accessToken: confirmed.access_token,
              clearSession,
              refreshToken: confirmed.refresh_token,
              setTokens,
            });
            setAccount(account);
          }
          setFactor({ codes: confirmed.backupCodes, kind: 'backup' });
          return;
        }
        if (typeof confirmed.access_token === 'string' && typeof confirmed.refresh_token === 'string') {
          await setTokens({
            accessToken: confirmed.access_token,
            refreshToken: confirmed.refresh_token,
          });
          const account = await accountRepository.refreshSnapshot({
            accessToken: confirmed.access_token,
            clearSession,
            refreshToken: confirmed.refresh_token,
            setTokens,
          });
          setAccount(account);
          onDismiss();
        }
        return;
      }
      const result = await completeMobilePasswordLogin({
        clearSession,
        email,
        password,
        setAccount,
        setAuthError,
        setTokens,
      });
      if (!result.ok) {
        if (result.error === 'second_factor' && result.step === 'code' && result.challengeToken) {
          setFactor({ challengeToken: result.challengeToken, kind: 'code' });
          return;
        }
        if (result.error === 'second_factor' && result.step === 'setup' && result.setupToken && api) {
          const started = await api.reqAuthSecondFactorSetup({ setupToken: result.setupToken });
          if (typeof started.manualKey === 'string' && typeof started.setupToken === 'string') {
            setFactor({
              kind: 'setup',
              manualKey: started.manualKey,
              qrDataUrl: typeof started.qrDataUrl === 'string' ? started.qrDataUrl : '',
              setupToken: started.setupToken,
            });
          }
          return;
        }
        if (result.error === 'second_factor') {
          return;
        }
        if (result.error === 'rate_limited') {
          setError(handleRateLimitMessage(result.rateLimitError, t) ?? t('errors.generic'));
          return;
        }
        if (result.error === 'account_not_verified') {
          setAccountNotVerified(true);
          return;
        }
        setError(t(completeMobilePasswordLoginMessageKey(result.error)));
      }
    } catch {
      setError(t('authentication.could_not_sign_in'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendVerificationEmail = async () => {
    if (isResending) {
      return;
    }

    const apiRequestService = createMobileApiRequestService();
    if (apiRequestService === null) {
      setError(t('authentication.mobile_api_not_configured'));
      return;
    }

    setIsResending(true);
    setError(null);
    setVerificationEmailNotSent(false);
    try {
      await apiRequestService.reqAccountSendVerificationEmail({ email });
      setVerificationEmailSent(true);
    } catch (resendError) {
      const rateLimitText = handleRateLimitMessage(resendError, t);
      if (rateLimitText !== null) {
        setError(rateLimitText);
        return;
      }
      const notSent =
        getErrorResponseStatus(resendError) === 503 &&
        getErrorResponseBodyCode(resendError) ===
          ACCOUNT_RESPONSE_CODES.VERIFICATION_EMAIL_NOT_SENT;
      if (notSent) {
        setVerificationEmailNotSent(true);
        return;
      }
      setError(t('errors.generic'));
    } finally {
      setIsResending(false);
    }
  };

  return (
    <SlideUpDismissGesture enabled onDismiss={onDragDismiss}>
      <View style={styles.root} testID="login-screen">
        <HeaderBarChrome
          backAccessibilityLabel={t('misc.dismiss')}
          backIcon="chevron-down"
          backTestID="auth-dismiss"
          onBack={onDismiss}
          title={t('authentication.login')}
        />
        <MobileScreenContainer testID="login-form">
          <CustomApiNotice />
          <View style={styles.fields}>
            {factor?.kind === 'setup' ? (
              <Text testID="second-factor-manual-key">{factor.manualKey}</Text>
            ) : null}
            {factor?.kind === 'backup' ? (
              <Text testID="second-factor-backup-codes">{factor.codes.join('\n')}</Text>
            ) : null}
            {factor === null ? (
            <>
            <TextField
              accessibilityLabel={t('authentication.email_or_username')}
              autoCapitalize="none"
              autoComplete="username"
              autoCorrect={false}
              eyebrow={t('authentication.email_or_username')}
              keyboardType="email-address"
              onChangeText={(value) => {
                setEmail(value);
                hideUnverifiedNotice();
              }}
              placeholder={t('authentication.email_example')}
              testID="login-email"
              textContentType="username"
              value={email}
            />
            <TextField
              accessibilityLabel={t('authentication.password')}
              autoCapitalize="none"
              autoComplete={isE2e ? 'off' : 'current-password'}
              autoCorrect={false}
              eyebrow={t('authentication.password')}
              onChangeText={(value) => {
                setPassword(value);
                hideUnverifiedNotice();
              }}
              placeholder={t('authentication.password_hint')}
              // E2E: iOS Autofill + secureTextEntry blocks Maestro inputText; plaintext when isE2e.
              secureTextEntry={!isE2e}
              testID="login-password"
              textContentType={isE2e ? 'none' : 'password'}
              value={password}
            />
            </>
            ) : (
            <TextField
              accessibilityLabel={t('authentication.second_factor_code')}
              autoCapitalize="none"
              autoCorrect={false}
              eyebrow={t('authentication.second_factor_code')}
              onChangeText={setFactorCode}
              testID="second-factor-code"
              value={factorCode}
            />
            )}
            {factor?.kind === 'code' ? (
              <Pressable
                accessibilityRole="link"
                onPress={() => {
                  const api = createMobileApiRequestService();
                  if (api === null) {
                    return;
                  }
                  void api
                    .reqAuthSecondFactorEmail({ challengeToken: factor.challengeToken })
                    .then(() => {
                      setError(t('authentication.second_factor_email_sent'));
                    });
                }}
                testID="second-factor-email"
              >
                <Text style={styles.link}>{t('authentication.second_factor_email')}</Text>
              </Pressable>
            ) : null}
            {showForgotPassword && factor === null ? (
              <Pressable
                accessibilityLabel={t('authentication.forgot_password')}
                accessibilityRole="link"
                onPress={onForgotPassword}
                testID="login-forgot-password"
              >
                <Text style={styles.link}>{t('authentication.forgot_password')}</Text>
              </Pressable>
            ) : null}
          </View>
          {accountNotVerified ? (
            <View style={styles.noticeBlock} testID="login-account-not-verified">
              {verificationEmailSent ? (
                <Text accessibilityLiveRegion="polite" style={styles.notice}>
                  {t('authentication.verification_email_sent')}
                </Text>
              ) : (
                <>
                  <Text accessibilityLiveRegion="polite" style={styles.notice}>
                    {t('authentication.account_not_verified')}
                  </Text>
                  {verificationEmailNotSent ? (
                    <VerificationEmailNotSentMessage
                      contactTestID="login-verification-email-not-sent-contact"
                      showTitle
                      testID="login-verification-email-not-sent"
                    />
                  ) : null}
                  <Pressable
                    accessibilityLabel={t('authentication.resend_verification_email')}
                    accessibilityRole="link"
                    accessibilityState={{ busy: isResending }}
                    onPress={() => {
                      void handleResendVerificationEmail();
                    }}
                    testID="login-resend-verification"
                  >
                    <Text style={styles.link}>{t('authentication.resend_verification_email')}</Text>
                  </Pressable>
                </>
              )}
            </View>
          ) : null}
          <FormActions
            actions={[
              {
                disabled: isLoading,
                label: t('misc.submit'),
                loading: isLoading,
                onPress: () => {
                  void handleSubmit();
                },
                testID: 'login-submit',
              },
            ]}
            style={styles.submit}
          />
          {error !== null ? (
            <Text accessibilityLiveRegion="polite" style={styles.error} testID="login-error">
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
    </SlideUpDismissGesture>
  );
}
