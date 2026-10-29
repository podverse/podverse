'use client';

import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useState } from 'react';

import type {
  AccountNotificationTypeValues,
  DTOAccountNotificationPreference,
  NotificationCategoryEnum,
} from '@podverse/helpers';
import {
  AccountNotificationTypeEnum,
  getDefaultNotificationCategoryPreference,
  NotificationCategoryEnum as NotificationCategoryEnumValues,
} from '@podverse/helpers';
import { Button, Divider, Modal, SwitchButton } from '@podverse/ui';

import { useAccount } from '../../../../contexts/Account';
import { useModals } from '../../../../contexts/Modals';
import { getApiRequestService } from '../../../../factories/apiRequestService';
import { useLoadingMap } from '../../../../hooks/useLoadingMap';
import { useMembershipGate } from '../../../../hooks/useMembershipGate';
import { SettingsSection } from '../../SettingsSection';
import { DevicePushBanner } from './DevicePushBanner';
import { usePushChannelControls } from './usePushChannelControls';

import styles from '../../../../styles/components/Settings/Panels/SettingsNotifications/SettingsNotifications.module.scss';

const PUSH_REQUIREMENT_ID = 'notification-push-requirement';

type PreferenceMetaRow = {
  category: NotificationCategoryEnum;
  titleKey: string;
  descriptionKey: string;
  forceInAppEnabled: boolean;
};

const MEDIA_PREFERENCE_ROWS: readonly PreferenceMetaRow[] = [
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
];

const SYSTEM_PREFERENCE_ROWS: readonly PreferenceMetaRow[] = [
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
];

export function SettingsNotifications() {
  const { disableWebPush, enableWebPush, loadingWebPush, registered, upRegistered } =
    usePushChannelControls();
  const { loadingMap, withLoading, setLoadingFor } = useLoadingMap();
  const { loggedInAccount, setLoggedInAccount } = useAccount();
  const { setModalLoginRequired } = useModals();
  const { tryHandleMembershipGateError } = useMembershipGate();
  const tInstructions = useTranslations('instructions');
  const tMisc = useTranslations('misc');
  const tSettings = useTranslations('settings');

  const [preferences, setPreferences] = useState<DTOAccountNotificationPreference[]>([]);
  const [applyDialog, setApplyDialog] = useState<null | 'auto_enable' | 'type_default'>(null);
  const [pendingApplyEnabled, setPendingApplyEnabled] = useState(false);
  const [pendingApplyType, setPendingApplyType] = useState<AccountNotificationTypeValues | null>(
    null
  );
  const [affectedCount, setAffectedCount] = useState(0);

  const pushMethodRegistered = registered || upRegistered;

  type NotificationTypeMetaRow = {
    labelKey: string;
    type: AccountNotificationTypeValues;
  };

  const notificationTypeRows = useMemo<NotificationTypeMetaRow[]>(
    () => [
      { labelKey: 'new_item', type: AccountNotificationTypeEnum.NewItem },
      { labelKey: 'livestream_scheduled', type: AccountNotificationTypeEnum.LivestreamScheduled },
      { labelKey: 'livestream_started', type: AccountNotificationTypeEnum.LivestreamStarting },
    ],
    []
  );

  const settingsNotification = loggedInAccount?.account_settings?.account_settings_notification;
  const autoEnableOnSubscribe = settingsNotification?.auto_enable_on_subscribe ?? false;
  const defaultNotificationTypes = settingsNotification?.account_settings_notification_types ?? [];

  const isNotificationTypeEnabled = (type: AccountNotificationTypeValues) =>
    defaultNotificationTypes.some((row) => row.type === type);

  const requireLoginForNotificationSettings = (enabling: boolean): boolean => {
    if (loggedInAccount) {
      return false;
    }
    setModalLoginRequired({
      title: null,
      message: tInstructions(
        enabling ? 'login_to_enable_notifications' : 'login_to_disable_notifications'
      ),
    });
    return true;
  };

  const updateAutoEnableOnSubscribe = async (next: boolean) => {
    const loadingKey = 'notification-auto-enable-on-subscribe';
    if (requireLoginForNotificationSettings(next)) {
      return;
    }

    await withLoading(loadingKey, async () => {
      try {
        const updated = await getApiRequestService().reqAccountSettingsNotificationUpdate({
          auto_enable_on_subscribe: next,
        });
        setLoggedInAccount(updated);

        const count = next
          ? ((
              await getApiRequestService().reqChannelGetMany({
                category: null,
                medium: 'podcasts',
                page: 1,
                range: null,
                sort: 'a_z',
                type: 'subscribed',
              })
            ).meta.count ?? 0)
          : (await getApiRequestService().reqAccountNotificationChannelsGetAll()).length;

        if (count > 0) {
          setPendingApplyEnabled(next);
          setAffectedCount(count);
          setApplyDialog('auto_enable');
        }
      } catch (error) {
        if (!tryHandleMembershipGateError(error)) {
          console.warn('Could not update auto-enable-on-subscribe setting', error);
        }
      }
    });
  };

  const toggleNotificationTypeDefault = async (
    type: AccountNotificationTypeValues,
    next: boolean
  ) => {
    const loadingKey = `notification-type-default.${type}`;
    if (requireLoginForNotificationSettings(next)) {
      return;
    }

    await withLoading(loadingKey, async () => {
      try {
        const updated = next
          ? await getApiRequestService().reqAccountSettingsNotificationTypeCreate({ type })
          : await getApiRequestService().reqAccountSettingsNotificationTypeDelete({ type });
        setLoggedInAccount(updated);

        const channels = await getApiRequestService().reqAccountNotificationChannelsGetAll();
        if (channels.length > 0) {
          setPendingApplyType(type);
          setPendingApplyEnabled(next);
          setAffectedCount(channels.length);
          setApplyDialog('type_default');
        }
      } catch (error) {
        if (!tryHandleMembershipGateError(error)) {
          console.warn('Could not update notification type default', type, error);
        }
      }
    });
  };

  const confirmApplyDialog = async () => {
    const dialog = applyDialog;
    setApplyDialog(null);
    if (dialog === null) {
      return;
    }

    try {
      if (dialog === 'auto_enable') {
        if (pendingApplyEnabled) {
          await getApiRequestService().reqAccountNotificationChannelsBulkEnable();
        } else {
          await getApiRequestService().reqAccountNotificationChannelsBulkDisable();
        }
        return;
      }

      if (dialog === 'type_default' && pendingApplyType !== null) {
        await getApiRequestService().reqAccountNotificationChannelsBulkType({
          enabled: pendingApplyEnabled,
          type: pendingApplyType,
        });
      }
    } catch (error) {
      if (!tryHandleMembershipGateError(error)) {
        console.warn('Could not apply notification default to existing podcasts', error);
      }
    }
  };

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

    if (params.nextPushEnabled === true && !pushMethodRegistered) {
      await enableWebPush();
      const permissionGranted =
        typeof window !== 'undefined' &&
        'Notification' in window &&
        Notification.permission === 'granted';
      if (!permissionGranted) {
        setLoadingFor(loadingKey, false);
        return;
      }
    }

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

  const renderPreferenceRows = (rows: readonly PreferenceMetaRow[]) => {
    return rows.map((row) => {
      const pref = preferences.find((p) => p.category === row.category);
      const preferenceLoadingKey = `notification-preferences.${row.category}`;
      const defaultInApp = getDefaultNotificationCategoryPreference(row.category).in_app_enabled;
      const categoryEnabled = row.forceInAppEnabled ? true : (pref?.in_app_enabled ?? defaultInApp);
      const showOptionalChannels = categoryEnabled;
      const accountPushEnabled = pref?.push_enabled ?? false;
      const pushChecked = accountPushEnabled && pushMethodRegistered;
      const showPushAsterisk = showOptionalChannels && !pushMethodRegistered;

      return (
        <div className={styles.preferenceRow} key={row.category}>
          <div className={styles.preferenceRowHeader}>
            <p className={styles.preferenceDescription}>
              {tSettings(`notifications.${row.descriptionKey}`)}
            </p>
            {row.category === NotificationCategoryEnumValues.ProductUpdate ? (
              <p className={styles.preferenceHint}>
                {tSettings('notifications.product_update_enable_hint')}
              </p>
            ) : null}
          </div>
          <div className={styles.preferenceControls}>
            <SwitchButton
              id={`notifications-${row.category}`}
              checked={categoryEnabled}
              label={tSettings(`notifications.${row.titleKey}`)}
              loading={!!loadingMap[preferenceLoadingKey]}
              onChange={(checked) => {
                if (row.forceInAppEnabled) {
                  return;
                }
                void updatePreference({
                  category: row.category,
                  nextInAppEnabled: checked,
                  forceInAppEnabled: row.forceInAppEnabled,
                });
              }}
              stateOffLabel={tMisc('off')}
              stateOnLabel={tMisc('on')}
            />
            {showOptionalChannels ? (
              <SwitchButton
                id={`notifications-${row.category}-push`}
                aria-describedby={showPushAsterisk ? PUSH_REQUIREMENT_ID : undefined}
                checked={pushChecked}
                label={
                  showPushAsterisk
                    ? `${tSettings('notifications.preference_push')} *`
                    : tSettings('notifications.preference_push')
                }
                loading={!!loadingMap[preferenceLoadingKey] || loadingWebPush}
                onChange={(checked) =>
                  void updatePreference({
                    category: row.category,
                    nextPushEnabled: checked,
                    forceInAppEnabled: row.forceInAppEnabled,
                  })
                }
                stateOffLabel={tMisc('off')}
                stateOnLabel={tMisc('on')}
              />
            ) : null}
          </div>
        </div>
      );
    });
  };

  return (
    <>
      <DevicePushBanner
        enableWebPush={enableWebPush}
        loadingWebPush={loadingWebPush}
        preferences={preferences}
      />
      <SettingsSection>
        <h3 className={styles.preferencesHeading}>
          {tSettings('notifications.when_i_subscribe_section')}
        </h3>
        <SwitchButton
          id="notification-auto-enable-on-subscribe"
          label={tSettings('notifications.auto_enable_on_subscribe')}
          checked={autoEnableOnSubscribe}
          onChange={async (next) => await updateAutoEnableOnSubscribe(next)}
          loading={!!loadingMap['notification-auto-enable-on-subscribe']}
          helpAriaLabel={tMisc('more_info')}
          helpText={tSettings('notifications.auto_enable_on_subscribe_help')}
          stateOffLabel={tMisc('off')}
          stateOnLabel={tMisc('on')}
        />
      </SettingsSection>

      <Divider withSpacing />

      <SettingsSection>
        <h3 className={styles.preferencesHeading}>
          {tSettings('notifications.type_defaults_section')}
        </h3>
        <p className={styles.preferencesSubheading}>
          {tSettings('notifications.type_defaults_section_help')}
        </p>
        {notificationTypeRows.map((row) => (
          <SwitchButton
            key={row.type}
            id={`notification-type-default-${row.type}`}
            label={tSettings(`notifications.${row.labelKey}`)}
            checked={isNotificationTypeEnabled(row.type)}
            onChange={async (next) => await toggleNotificationTypeDefault(row.type, next)}
            loading={!!loadingMap[`notification-type-default.${row.type}`]}
            stateOffLabel={tMisc('off')}
            stateOnLabel={tMisc('on')}
          />
        ))}
      </SettingsSection>

      <Divider withSpacing />

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
        loading={loadingWebPush}
        helpAriaLabel={tMisc('more_info')}
        helpText={tSettings('notifications.web_push_help')}
        aria-describedby="webpush-help"
        stateOffLabel={tMisc('off')}
        stateOnLabel={tMisc('on')}
      />

      <Divider withSpacing />

      <SettingsSection>
        <h3 className={styles.preferencesHeading}>
          {tSettings('notifications.media_notifications_section')}
        </h3>
        <p className={styles.preferencesSubheading}>
          {tSettings('notifications.media_notifications_section_help')}
        </p>
        {renderPreferenceRows(MEDIA_PREFERENCE_ROWS)}
      </SettingsSection>

      <Divider withSpacing />

      <SettingsSection>
        <h3 className={styles.preferencesHeading}>
          {tSettings('notifications.system_notifications_section')}
        </h3>
        <p className={styles.preferencesSubheading}>
          {tSettings('notifications.system_notifications_section_help')}
        </p>
        {renderPreferenceRows(SYSTEM_PREFERENCE_ROWS)}
        {pushMethodRegistered ? null : (
          <p className={styles.pushRequirement} id={PUSH_REQUIREMENT_ID}>
            <span aria-hidden="true">* </span>
            {tSettings('notifications.preference_push_requirement')}
          </p>
        )}
      </SettingsSection>

      <Modal
        ariaLabel={
          applyDialog === 'type_default'
            ? tSettings('notifications.type_default_apply_title')
            : tSettings('notifications.auto_enable_apply_title')
        }
        closeButtonAriaLabel={tMisc('close_modal')}
        header={
          applyDialog === 'type_default'
            ? tSettings('notifications.type_default_apply_title')
            : tSettings('notifications.auto_enable_apply_title')
        }
        isOpen={applyDialog !== null}
        onClose={() => {
          setApplyDialog(null);
        }}
      >
        <Modal.Body>
          <p>
            {applyDialog === 'type_default'
              ? tSettings('notifications.type_default_apply_body', { count: affectedCount })
              : tSettings('notifications.auto_enable_apply_body', { count: affectedCount })}
          </p>
        </Modal.Body>
        <Modal.Actions>
          <Button
            onClick={() => {
              setApplyDialog(null);
            }}
            type="button"
            variant="secondary"
          >
            {applyDialog === 'type_default'
              ? tSettings('notifications.type_default_apply_new_only')
              : tSettings('notifications.auto_enable_apply_new_only')}
          </Button>
          <Button
            onClick={() => {
              void confirmApplyDialog();
            }}
            type="button"
            variant="primary"
          >
            {applyDialog === 'type_default'
              ? tSettings('notifications.type_default_apply_all')
              : tSettings('notifications.auto_enable_apply_all')}
          </Button>
        </Modal.Actions>
      </Modal>
    </>
  );
}
