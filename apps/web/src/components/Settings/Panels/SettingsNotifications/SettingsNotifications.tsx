'use client';

import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useState } from 'react';

import type { DTOAccountNotificationPreference, NotificationCategoryEnum } from '@podverse/helpers';
import { NotificationCategoryEnum as NotificationCategoryEnumValues } from '@podverse/helpers';
import { validateHttpsUrl } from '@podverse/helpers-validation/client';
import {
  Button,
  CheckboxField,
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
  const { loggedInAccount } = useAccount();
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
  const [preferences, setPreferences] = useState<DTOAccountNotificationPreference[]>([]);

  const pushMethodRegistered = registered || upRegistered;

  type PreferenceMetaRow = {
    category: NotificationCategoryEnum;
    titleKey: string;
    descriptionKey: string;
    forceInAppEnabled: boolean;
  };

  const preferenceRows = useMemo<PreferenceMetaRow[]>(
    () => [
      {
        category: NotificationCategoryEnumValues.NewContent,
        titleKey: 'category_new_content',
        descriptionKey: 'category_new_content_description',
        forceInAppEnabled: false,
      },
      {
        category: NotificationCategoryEnumValues.Livestream,
        titleKey: 'category_livestream',
        descriptionKey: 'category_livestream_description',
        forceInAppEnabled: false,
      },
      {
        category: NotificationCategoryEnumValues.ProductUpdate,
        titleKey: 'category_product_update',
        descriptionKey: 'category_product_update_description',
        forceInAppEnabled: false,
      },
      {
        category: NotificationCategoryEnumValues.Maintenance,
        titleKey: 'category_maintenance',
        descriptionKey: 'category_maintenance_description',
        forceInAppEnabled: true,
      },
      {
        category: NotificationCategoryEnumValues.TermsOfService,
        titleKey: 'category_terms_of_service',
        descriptionKey: 'category_terms_of_service_description',
        forceInAppEnabled: true,
      },
      {
        category: NotificationCategoryEnumValues.General,
        titleKey: 'category_general',
        descriptionKey: 'category_general_description',
        forceInAppEnabled: true,
      },
    ],
    []
  );

  const loadPreferences = useCallback(async () => {
    if (!loggedInAccount) {
      setPreferences([]);
      return;
    }
    try {
      const rows = await getApiRequestService().reqNotificationPreferencesGet();
      setPreferences(rows);
    } catch (error) {
      console.warn('Could not load notification preferences', error);
      setPreferences([]);
    }
  }, [loggedInAccount]);

  useEffect(() => {
    void loadPreferences();
  }, [loadPreferences]);

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

  const updatePreference = async (params: {
    category: NotificationCategoryEnum;
    nextInAppEnabled?: boolean;
    nextPushEnabled?: boolean;
    forceInAppEnabled: boolean;
  }) => {
    const loadingKey = `notification-preferences.${params.category}`;
    setLoadingFor(loadingKey, true);
    if (!loggedInAccount) {
      setModalLoginRequired({
        title: null,
        message: tInstructions('login_to_enable_notifications'),
      });
      setLoadingFor(loadingKey, false);
      return;
    }

    const existing = preferences.find((row) => row.category === params.category);
    if (!existing) {
      setLoadingFor(loadingKey, false);
      return;
    }

    const nextInAppEnabled = params.forceInAppEnabled
      ? true
      : (params.nextInAppEnabled ?? existing.in_app_enabled);
    const nextPushEnabled = params.nextPushEnabled ?? existing.push_enabled;

    await withLoading(loadingKey, async () => {
      try {
        const updated = await getApiRequestService().reqNotificationPreferencesUpdate({
          preferences: [
            {
              category: params.category,
              in_app_enabled: nextInAppEnabled,
              push_enabled: nextPushEnabled,
            },
          ],
        });
        setPreferences(updated);
      } catch (error) {
        if (!tryHandleMembershipGateError(error)) {
          console.warn('Could not update notification preferences', params.category, error);
        }
      }
    });

    setLoadingFor(loadingKey, false);
  };

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

      <Divider withSpacing />

      <SettingsSection>
        <h3 className={styles.preferencesHeading}>
          {tSettings('notifications.preference_section')}
        </h3>
        <p className={styles.preferencesSubheading}>
          {tSettings('notifications.preference_section_help')}
        </p>
        {preferenceRows.map((row) => {
          const pref = preferences.find((p) => p.category === row.category);
          const preferenceLoadingKey = `notification-preferences.${row.category}`;
          const inAppChecked = row.forceInAppEnabled ? true : (pref?.in_app_enabled ?? true);
          const pushChecked = pref?.push_enabled ?? false;

          return (
            <div className={styles.preferenceRow} key={row.category}>
              <div className={styles.preferenceRowHeader}>
                <h4 className={styles.preferenceTitle}>
                  {tSettings(`notifications.${row.titleKey}`)}
                </h4>
                <p className={styles.preferenceDescription}>
                  {tSettings(`notifications.${row.descriptionKey}`)}
                </p>
                {row.category === NotificationCategoryEnumValues.ProductUpdate ? (
                  <p className={styles.preferenceHint}>
                    {tSettings('notifications.product_update_disable_hint')}
                  </p>
                ) : null}
              </div>
              <div className={styles.preferenceControls}>
                <CheckboxField
                  id={`notifications-${row.category}-in-app`}
                  checked={inAppChecked}
                  disabled={row.forceInAppEnabled || !!loadingMap[preferenceLoadingKey]}
                  label={tSettings('notifications.preference_in_app')}
                  onChange={(checked) =>
                    void updatePreference({
                      category: row.category,
                      nextInAppEnabled: checked,
                      forceInAppEnabled: row.forceInAppEnabled,
                    })
                  }
                />
                <CheckboxField
                  id={`notifications-${row.category}-push`}
                  checked={pushChecked}
                  disabled={!pushMethodRegistered || !!loadingMap[preferenceLoadingKey]}
                  label={
                    pushMethodRegistered
                      ? tSettings('notifications.preference_push')
                      : tSettings('notifications.preference_push_disabled')
                  }
                  onChange={(checked) =>
                    void updatePreference({
                      category: row.category,
                      nextPushEnabled: checked,
                      forceInAppEnabled: row.forceInAppEnabled,
                    })
                  }
                />
              </div>
            </div>
          );
        })}
      </SettingsSection>
    </>
  );
}
