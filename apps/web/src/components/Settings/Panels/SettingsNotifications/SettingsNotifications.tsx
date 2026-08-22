'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { validateHttpsUrl } from '@podverse/helpers-validation/client';
import {
  Button,
  Divider,
  InlineForm,
  InlineFormButtons,
  InlineFormFieldGroup,
  InlineFormInfo,
  SwitchButton,
  TextInput,
} from '@podverse/ui';

import { useAccount } from '../../../../contexts/Account';
import { useModals } from '../../../../contexts/Modals';
import { useNotifications } from '../../../../contexts/Notifications';
import { getApiRequestService } from '../../../../factories/apiRequestService';
import { useLoadingMap } from '../../../../hooks/useLoadingMap';
import { useMembershipGate } from '../../../../hooks/useMembershipGate';
import { disableNotificationPermission } from '../../../../lib/notifications/webpush/disableNotificationPermission';
import { requestNotificationPermission } from '../../../../lib/notifications/webpush/requestNotificationPermission';
import { SettingsSection } from '../../SettingsSection';

import styles from '../../../../styles/components/Settings/Panels/SettingsNotifications/SettingsNotifications.module.scss';

export function SettingsNotifications() {
  const {
    setPermission,
    registered,
    setRegistered,
    upRegistered,
    setUPRegistered,
    upEndpoint,
    setUPEndpoint,
  } = useNotifications();
  const { loadingMap, withLoading, setLoadingFor } = useLoadingMap();
  const { loggedInAccount, setLoggedInAccount } = useAccount();
  const { setModalLoginRequired } = useModals();
  const { tryHandleMembershipGateError } = useMembershipGate();
  const tInstructions = useTranslations('instructions');
  const tMisc = useTranslations('misc');
  const tSettings = useTranslations('settings');

  // State for UP form
  const [showUPForm, setShowUPForm] = useState(false);
  const [upEndpointInput, setUPEndpointInput] = useState('');
  const [upAuthKeyInput, setUPAuthKeyInput] = useState('');
  const [upEndpointError, setUPEndpointError] = useState<string | undefined>(undefined);

  // Web Push functions
  const enableWebPush = async () => {
    setLoadingFor('webpush', true);
    if (!loggedInAccount) {
      setModalLoginRequired({
        title: null,
        message: tInstructions('login_to_enable_notifications'),
      });
      setLoadingFor('webpush', false);
      return;
    }

    try {
      // Disable UP first if it's enabled (mutual exclusivity)
      if (upRegistered) {
        await disableUP();
      }

      await withLoading('webpush', async () => {
        await requestNotificationPermission();
      });
    } catch (error) {
      // requestNotificationPermission rethrows a membership 403 (member-gated device register) so we
      // can surface the shared membership modal instead of its generic alert; other errors it handles
      // internally and does not throw.
      if (!tryHandleMembershipGateError(error)) {
        console.warn('Could not enable web push', error);
      }
    } finally {
      if (typeof window !== 'undefined' && 'Notification' in window) {
        const p = Notification.permission;
        setPermission(p);

        if (p === 'granted') {
          try {
            const registration = await navigator.serviceWorker.getRegistration('/webpush-sw.js');
            if (registration) {
              const subscription = await registration.pushManager.getSubscription();
              if (subscription) {
                const devices =
                  await getApiRequestService().reqAccountWebPushDeviceGetAllForAccount();
                const match = devices.find((d) => d.endpoint === subscription.endpoint);
                setRegistered(!!match);
              } else {
                setRegistered(false);
              }
            } else {
              setRegistered(false);
            }
          } catch (e) {
            console.warn('Could not verify registration after enable', e);
            setRegistered(false);
          }
        } else {
          setRegistered(false);
        }
      }
    }
  };

  const disableWebPush = async () => {
    setLoadingFor('webpush', true);
    if (!loggedInAccount) {
      setModalLoginRequired({
        title: null,
        message: tInstructions('login_to_disable_notifications'),
      });
      setLoadingFor('webpush', false);
      return;
    }
    await withLoading('webpush', async () => {
      await disableNotificationPermission();
      if (typeof window !== 'undefined' && 'Notification' in window) {
        const p = Notification.permission;
        setPermission(p);
      } else {
        setPermission('default');
      }
      setRegistered(false);
    });
  };

  // Unified Push functions
  const handleUPToggle = async (next: boolean) => {
    if (!loggedInAccount) {
      setModalLoginRequired({
        title: null,
        message: tInstructions(
          next ? 'login_to_enable_notifications' : 'login_to_disable_notifications'
        ),
      });
      return;
    }

    if (next) {
      // Show the form instead of enabling immediately
      setShowUPForm(true);
      setUPEndpointInput(upEndpoint || '');
      setUPEndpointError(undefined);
    } else {
      await disableUP();
    }
  };

  const validateAndEnableUP = async () => {
    const validation = validateHttpsUrl(upEndpointInput);
    if (!validation.isValid) {
      setUPEndpointError(validation.error);
      return;
    }

    setUPEndpointError(undefined);
    await enableUP(upEndpointInput, upAuthKeyInput || null);
  };

  const enableUP = async (endpoint: string, authKey: string | null) => {
    setLoadingFor('unifiedpush', true);
    try {
      // Disable Web Push first if it's enabled (mutual exclusivity)
      if (registered) {
        await disableWebPush();
      }

      await withLoading('unifiedpush', async () => {
        await getApiRequestService().reqAccountUPDeviceCreate({
          up_endpoint: endpoint,
          up_auth_key: authKey,
        });
        // Re-fetch UP device to ensure state is in sync
        const upDevice = await getApiRequestService().reqAccountUPDeviceGetForAccount();
        if (upDevice) {
          setUPRegistered(true);
          setUPEndpoint(upDevice.up_endpoint);
        } else {
          setUPRegistered(false);
          setUPEndpoint(null);
        }
        setShowUPForm(false);
        setUPAuthKeyInput('');
      });
    } catch (error) {
      if (!tryHandleMembershipGateError(error)) {
        console.warn('Could not enable Unified Push', error);
        setUPEndpointError(tSettings('notifications.up_enable_error'));
      }
    } finally {
      setLoadingFor('unifiedpush', false);
    }
  };

  const disableUP = async () => {
    setLoadingFor('unifiedpush', true);
    try {
      await withLoading('unifiedpush', async () => {
        if (upEndpoint) {
          await getApiRequestService().reqAccountUPDeviceDelete({ up_endpoint: upEndpoint });
        }

        const upDevice = await getApiRequestService().reqAccountUPDeviceGetForAccount();
        if (upDevice) {
          setUPRegistered(true);
          setUPEndpoint(upDevice.up_endpoint);
        } else {
          setUPRegistered(false);
          setUPEndpoint(null);
        }
        setShowUPForm(false);
        setUPEndpointInput('');
        setUPAuthKeyInput('');
      });
    } catch (e) {
      console.warn('Could not disable Unified Push', e);
    } finally {
      setLoadingFor('unifiedpush', false);
    }
  };

  const cancelUPForm = () => {
    setShowUPForm(false);
    setUPEndpointInput('');
    setUPAuthKeyInput('');
    setUPEndpointError(undefined);
  };

  // Default notification types switches
  const defaultTypes = [
    { key: 'new-item', label: tSettings('notifications.default_new_item') },
    { key: 'livestream-scheduled', label: tSettings('notifications.default_livestream_scheduled') },
    { key: 'livestream-started', label: tSettings('notifications.default_livestream_started') },
  ];

  const toggleDefaultType = async (type: string, next: boolean) => {
    setLoadingFor(`notifications.${type}`, true);
    if (!loggedInAccount) {
      setModalLoginRequired({
        title: null,
        message: tInstructions(
          next ? 'login_to_enable_notifications' : 'login_to_disable_notifications'
        ),
      });
      setLoadingFor(`notifications.${type}`, false);
      return;
    }

    await withLoading(`notifications.${type}`, async () => {
      try {
        if (next) {
          const updated = await getApiRequestService().reqAccountSettingsNotificationTypeCreate({
            type,
          });
          setLoggedInAccount(updated as unknown as typeof loggedInAccount);
        } else {
          const updated = await getApiRequestService().reqAccountSettingsNotificationTypeDelete({
            type,
          });
          setLoggedInAccount(updated as unknown as typeof loggedInAccount);
        }
      } catch (error) {
        if (!tryHandleMembershipGateError(error)) {
          console.warn('Could not toggle notification type', type, error);
        }
      }
    });

    setLoadingFor(`notifications.${type}`, false);
  };

  // Check if any notification method is enabled
  const anyNotificationEnabled = registered || upRegistered;

  return (
    <>
      {/* Web Push (Primary) */}
      <SwitchButton
        id="webpush"
        label={tSettings('notifications.web_push')}
        checked={registered}
        onChange={async (next) => {
          if (next) {
            await enableWebPush();
          } else {
            await disableWebPush();
          }
        }}
        loading={!!loadingMap['webpush']}
        helpAriaLabel={tMisc('more_info')}
        helpText={tSettings('notifications.web_push_help')}
        aria-describedby="webpush-help"
        stateOffLabel={tMisc('off')}
        stateOnLabel={tMisc('on')}
      />

      <Divider withSpacing />

      {/* Unified Push (Secondary) */}
      <SettingsSection>
        <SwitchButton
          id="unifiedpush"
          label={tSettings('notifications.unified_push')}
          checked={upRegistered}
          onChange={handleUPToggle}
          loading={!!loadingMap['unifiedpush']}
          helpAriaLabel={tMisc('more_info')}
          helpText={tSettings('notifications.unified_push_help')}
          aria-describedby="unifiedpush-help"
          stateOffLabel={tMisc('off')}
          stateOnLabel={tMisc('on')}
        />

        {/* UP Form - shown when toggle is clicked to enable */}
        {showUPForm && !upRegistered && (
          <InlineForm>
            <InlineFormInfo>{tSettings('notifications.up_endpoint_info')}</InlineFormInfo>
            <TextInput
              id="up-endpoint"
              value={upEndpointInput}
              onChange={(e) => {
                setUPEndpointInput(e.target.value);
                setUPEndpointError(undefined);
              }}
              placeholder={tSettings('notifications.up_endpoint_placeholder')}
              eyebrow={tSettings('notifications.up_endpoint_label')}
              infoError={upEndpointError}
              aria-invalid={!!upEndpointError}
            />
            <InlineFormFieldGroup>
              <InlineFormInfo>{tSettings('notifications.up_auth_key_info')}</InlineFormInfo>
              <TextInput
                id="up-auth-key"
                value={upAuthKeyInput}
                onChange={(e) => setUPAuthKeyInput(e.target.value)}
                placeholder={tSettings('notifications.up_auth_key_placeholder')}
                eyebrow={tSettings('notifications.up_auth_key_label')}
                type="password"
              />
            </InlineFormFieldGroup>
            <InlineFormButtons>
              <Button variant="secondary" onClick={cancelUPForm}>
                {tSettings('notifications.cancel')}
              </Button>
              <Button
                variant="primary"
                onClick={validateAndEnableUP}
                disabled={!upEndpointInput.trim()}
              >
                {tSettings('notifications.enable')}
              </Button>
            </InlineFormButtons>
          </InlineForm>
        )}

        {/* Show current UP endpoint when registered */}
        {upRegistered && upEndpoint && (
          <div className={styles.upEndpointDisplay}>
            <span className={styles.upEndpointLabel}>
              {tSettings('notifications.up_current_endpoint')}
            </span>
            <span className={styles.upEndpointValue}>{upEndpoint}</span>
          </div>
        )}
      </SettingsSection>

      {/* Default notification types - only show when a notification method is enabled */}
      {anyNotificationEnabled && (
        <>
          <Divider withSpacing />
          <SettingsSection>
            {defaultTypes.map((dt) => (
              <SwitchButton
                key={dt.key}
                id={`notifications-${dt.key}`}
                label={dt.label}
                checked={
                  !!loggedInAccount?.account_settings?.account_settings_notification?.account_settings_notification_types?.find(
                    (t) => t.type === dt.key
                  )
                }
                onChange={async (next) => await toggleDefaultType(dt.key, next)}
                loading={!!loadingMap[`notifications.${dt.key}`]}
                helpAriaLabel={tMisc('more_info')}
                helpText={tSettings(`notifications.default_${dt.key}_help`)}
                aria-describedby={`notifications-help-${dt.key}`}
                stateOffLabel={tMisc('off')}
                stateOnLabel={tMisc('on')}
              />
            ))}
          </SettingsSection>
        </>
      )}
    </>
  );
}
