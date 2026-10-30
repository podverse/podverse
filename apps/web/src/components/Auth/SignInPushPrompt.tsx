'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';

import { shouldOfferSignInPushPrompt } from '@podverse/helpers';
import { Button, Modal } from '@podverse/ui';

import { useAccount } from '../../contexts/Account';
import { useConfig } from '../../contexts/Config';
import { useLocalSettings } from '../../contexts/LocalSettings';
import { useNotifications } from '../../contexts/Notifications';
import { getApiRequestService } from '../../factories/apiRequestService';
import { useMembershipGate } from '../../hooks/useMembershipGate';
import { useWebDevicePushState } from '../../hooks/useWebDevicePushState';
import { accountHasAnyPushDevice } from '../../lib/notifications/firstSubscribePushPrompt';
import {
  hasShownSignInPushPrompt,
  markSignInPushPromptShown,
  takeSignInPushPromptPending,
} from '../../lib/notifications/signInPushPrompt';
import { requestNotificationPermission } from '../../lib/notifications/webpush/requestNotificationPermission';
import { shouldShowServerEnvironmentDisclaimer } from '../Modal/serverEnvironmentDisclaimer';

/** The one-time push dialog on the first page load after signing in on this browser. */
export function SignInPushPrompt() {
  const tSettings = useTranslations('settings');
  const tMisc = useTranslations('misc');
  const config = useConfig();
  const { loggedInAccount } = useAccount();
  const { serverEnvironmentDisclaimerAccepted } = useLocalSettings();
  const { refreshWebPushRegistration } = useNotifications();
  const { tryHandleMembershipGateError } = useMembershipGate();
  const { devicePushState, isChecked } = useWebDevicePushState();
  const [signInPending, setSignInPending] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const evaluatedRef = useRef(false);
  const busyRef = useRef(false);
  const accountIdText = loggedInAccount?.id_text ?? null;
  const showDisclaimer =
    shouldShowServerEnvironmentDisclaimer(config.public.server_env) &&
    !serverEnvironmentDisclaimerAccepted;

  useEffect(() => {
    setSignInPending(takeSignInPushPromptPending());
  }, []);

  useEffect(() => {
    if (
      !signInPending ||
      evaluatedRef.current ||
      accountIdText === null ||
      !isChecked ||
      showDisclaimer
    ) {
      return;
    }
    evaluatedRef.current = true;
    const signInPushPromptShown = hasShownSignInPushPrompt(accountIdText);
    if (signInPushPromptShown || devicePushState !== 'can_request') {
      return;
    }
    void (async () => {
      try {
        const [preferences, accountHasPushDevice] = await Promise.all([
          getApiRequestService().reqNotificationPreferencesGet(),
          accountHasAnyPushDevice(),
        ]);
        if (
          shouldOfferSignInPushPrompt({
            accountHasPushDevice,
            devicePushState,
            preferences,
            signInPushPromptShown,
          })
        ) {
          setIsOpen(true);
        }
      } catch (error) {
        console.warn('Could not decide whether to offer push after sign-in', error);
      }
    })();
  }, [accountIdText, devicePushState, isChecked, showDisclaimer, signInPending]);

  useEffect(() => {
    if (isOpen && accountIdText !== null) {
      markSignInPushPromptShown(accountIdText);
    }
  }, [accountIdText, isOpen]);

  const close = () => {
    if (busyRef.current) {
      return;
    }
    setIsOpen(false);
  };

  const enablePush = async () => {
    if (busyRef.current) {
      return;
    }
    busyRef.current = true;
    setIsBusy(true);
    try {
      await requestNotificationPermission();
    } catch (error) {
      if (!tryHandleMembershipGateError(error)) {
        console.warn('Could not enable push after sign-in', error);
      }
    } finally {
      await refreshWebPushRegistration();
      busyRef.current = false;
      setIsBusy(false);
      setIsOpen(false);
    }
  };

  const title = tSettings('notifications.sign_in_push_prompt_title');

  return (
    <Modal
      ariaLabel={title}
      closeButtonAriaLabel={tMisc('close_modal')}
      header={title}
      isOpen={isOpen}
      onClose={close}
    >
      <Modal.Body>
        <p>{tSettings('notifications.sign_in_push_prompt_body')}</p>
      </Modal.Body>
      <Modal.Actions>
        <Button disabled={isBusy} onClick={close} type="button" variant="secondary">
          {tSettings('notifications.sign_in_push_prompt_not_now')}
        </Button>
        <Button
          disabled={isBusy}
          isLoading={isBusy}
          onClick={() => {
            void enablePush();
          }}
          type="button"
          variant="primary"
        >
          {tSettings('notifications.sign_in_push_prompt_enable')}
        </Button>
      </Modal.Actions>
    </Modal>
  );
}
