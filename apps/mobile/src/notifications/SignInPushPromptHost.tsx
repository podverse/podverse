import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';

import { useAuth } from '../auth/AuthProvider';
import type { AuthRequestDeps } from '../auth/authRequestWithRefresh';
import { ConfirmDialog } from '../components/feedback/ConfirmDialog';
import { notificationsRepository } from '../data/repositories';
import { resolveSupportedLocale } from '../i18n/locale';
import { accountHasAnyPushDevice } from '../lib/notifications/applyFirstSubscribePushChoice';
import { shouldPresentSignInPushPrompt } from '../lib/notifications/signInPushPrompt';
import { useAccessTier } from '../membership/useAccessTier';
import {
  hasShownSignInPushPrompt,
  markSignInPushPromptShown,
} from '../prefs/signInPushPromptPrefs';
import { readDevicePushState } from '../push/devicePushState.read';
import { enablePushOnThisDevice } from '../push/enablePushOnThisDevice';
import {
  isAccountConsentSettled,
  subscribeAccountConsentSettled,
} from '../terms/accountConsentSettled';

/**
 * Asks once, right after a person signs in on this device, whether to allow push here when the
 * account already has push on and a push device elsewhere. Opening the app already signed in
 * never asks.
 */
export function SignInPushPromptHost() {
  const { i18n, t } = useTranslation();
  const { accessToken, account, clearSession, refreshToken, setTokens, status } = useAuth();
  const { evaluateFeature } = useAccessTier();
  const consentSettled = useSyncExternalStore(
    subscribeAccountConsentSettled,
    isAccountConsentSettled
  );
  const [visible, setVisible] = useState(false);
  const previousStatusRef = useRef(status);
  const pendingSignInRef = useRef(false);
  const sessionRef = useRef(0);
  // Read through a ref so a token refresh during the check neither re-runs nor drops it.
  const authRef = useRef<AuthRequestDeps>({ accessToken, clearSession, refreshToken, setTokens });
  authRef.current = { accessToken, clearSession, refreshToken, setTokens };

  const accountIdText = account?.id_text ?? null;
  const notificationsAllowed = evaluateFeature('notifications').allowed;

  // Declared before the check effect so a sign-in sets the mark before that effect reads it in
  // the same commit.
  useEffect(() => {
    const previous = previousStatusRef.current;
    previousStatusRef.current = status;
    if (status !== 'authenticated') {
      sessionRef.current += 1;
      pendingSignInRef.current = false;
      setVisible(false);
      return;
    }
    if (previous === 'anonymous') {
      pendingSignInRef.current = true;
    }
  }, [status]);

  // No cleanup: a re-render on `consentSettled` or `notificationsAllowed` would otherwise drop the
  // only check this sign-in gets. `sessionRef` discards an answer that lands after sign-out.
  useEffect(() => {
    if (
      !pendingSignInRef.current ||
      status !== 'authenticated' ||
      accountIdText === null ||
      !consentSettled
    ) {
      return;
    }
    pendingSignInRef.current = false;
    if (!notificationsAllowed) {
      return;
    }

    const session = sessionRef.current;
    void shouldPresentSignInPushPrompt({
      readAccountHasPushDevice: () => accountHasAnyPushDevice(authRef.current),
      readDevicePushState,
      readPreferences: () => notificationsRepository.listPreferences(authRef.current),
      readPromptShown: () => hasShownSignInPushPrompt(accountIdText),
    })
      .then(async (present) => {
        if (!present || sessionRef.current !== session) {
          return;
        }
        setVisible(true);
        await markSignInPushPromptShown(accountIdText);
      })
      .catch((error: unknown) => {
        console.warn('Could not decide whether to offer push after sign-in', error);
      });
  }, [accountIdText, consentSettled, notificationsAllowed, status]);

  const handleEnable = useCallback(() => {
    setVisible(false);
    void enablePushOnThisDevice({
      auth: authRef.current,
      locale: resolveSupportedLocale(i18n.language),
    }).catch((error: unknown) => {
      console.warn('Could not enable push after the sign-in prompt', error);
    });
  }, [i18n.language]);

  const handleNotNow = useCallback(() => {
    setVisible(false);
  }, []);

  return (
    <ConfirmDialog
      body={t('settings.notifications.sign_in_push_prompt_body')}
      cancelLabel={t('settings.notifications.sign_in_push_prompt_not_now')}
      cancelTestID="sign-in-push-prompt-not-now"
      confirmLabel={t('settings.notifications.sign_in_push_prompt_enable')}
      confirmTestID="sign-in-push-prompt-enable"
      onCancel={handleNotNow}
      onConfirm={handleEnable}
      testID="sign-in-push-prompt-dialog"
      title={t('settings.notifications.sign_in_push_prompt_title')}
      visible={visible && status === 'authenticated'}
    />
  );
}
