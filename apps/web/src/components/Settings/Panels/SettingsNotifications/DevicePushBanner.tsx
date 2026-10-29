'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import type { NotificationPushPreferenceRow } from '@podverse/helpers';
import { shouldShowDevicePushBanner } from '@podverse/helpers';
import { Banner, Button, Modal } from '@podverse/ui';

import { useAccount } from '../../../../contexts/Account';
import { useWebDevicePushState } from '../../../../hooks/useWebDevicePushState';
import { accountHasAnyPushDevice } from '../../../../lib/notifications/firstSubscribePushPrompt';
import { SettingsSection } from '../../SettingsSection';

type DevicePushBannerProps = {
  enableWebPush: () => Promise<void>;
  loadingWebPush: boolean;
  preferences: readonly NotificationPushPreferenceRow[];
};

/** Warns that push is on for the account but this browser cannot show it yet. */
export function DevicePushBanner({
  enableWebPush,
  loadingWebPush,
  preferences,
}: DevicePushBannerProps) {
  const tSettings = useTranslations('settings');
  const tMisc = useTranslations('misc');
  const { loggedInAccount } = useAccount();
  const accountIdText = loggedInAccount?.id_text;
  const { devicePushState, isChecked } = useWebDevicePushState();
  const [accountHasPushDevice, setAccountHasPushDevice] = useState<boolean | null>(null);
  const [isGuidanceOpen, setIsGuidanceOpen] = useState(false);

  useEffect(() => {
    if (!accountIdText) {
      setAccountHasPushDevice(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const hasDevice = await accountHasAnyPushDevice();
        if (!cancelled) {
          setAccountHasPushDevice(hasDevice);
        }
      } catch (error) {
        console.warn('Could not check the account push devices for the settings banner', error);
        if (!cancelled) {
          setAccountHasPushDevice(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [accountIdText, devicePushState]);

  if (
    !isChecked ||
    accountHasPushDevice === null ||
    !shouldShowDevicePushBanner({ accountHasPushDevice, devicePushState, preferences })
  ) {
    return null;
  }

  const allowOnThisDevice = () => {
    if (devicePushState === 'blocked') {
      setIsGuidanceOpen(true);
      return;
    }
    void enableWebPush();
  };

  const guidanceTitle = tSettings('notifications.device_push_blocked_title');

  return (
    <>
      <SettingsSection>
        <div data-testid="settings-notifications-device-push-banner">
          <Banner
            action={
              <Button
                disabled={loadingWebPush}
                isLoading={loadingWebPush}
                onClick={allowOnThisDevice}
                type="button"
                variant="warning"
              >
                {tSettings('notifications.device_push_banner_action')}
              </Button>
            }
            message={tSettings('notifications.device_push_banner_message')}
            role="status"
            variant="warning"
          />
        </div>
      </SettingsSection>
      <Modal
        ariaLabel={guidanceTitle}
        closeButtonAriaLabel={tMisc('close_modal')}
        header={guidanceTitle}
        isOpen={isGuidanceOpen}
        onClose={() => setIsGuidanceOpen(false)}
      >
        <Modal.Body>
          <p>{tSettings('notifications.device_push_blocked_web_body')}</p>
        </Modal.Body>
        <Modal.Actions>
          <Button onClick={() => setIsGuidanceOpen(false)} type="button" variant="primary">
            {tMisc('ok')}
          </Button>
        </Modal.Actions>
      </Modal>
    </>
  );
}
