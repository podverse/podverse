import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, AppState, StyleSheet, Text, View } from 'react-native';

import type { DTOAccountNotificationPreference } from '@podverse/helpers';
import {
  getDefaultNotificationCategoryPreference,
  NotificationCategoryEnum,
} from '@podverse/helpers';
import type { DevicePushState } from '@podverse/helpers/notificationPush';
import { shouldShowDevicePushBanner } from '@podverse/helpers/notificationPush';

import { requestWithMobileAuthRefresh } from '../../auth';
import { useAuth } from '../../auth/AuthProvider';
import type { SyncedNotificationType } from '../../auth/syncAccountPrefs';
import {
  syncAutoEnableOnSubscribeToAccountSettings,
  syncNotificationTypeToAccountSettings,
} from '../../auth/syncAccountPrefs';
import { ConfirmDialog } from '../../components/feedback/ConfirmDialog';
import { WarningBanner } from '../../components/feedback/WarningBanner';
import { SettingsRowDescription, SettingsSwitchRow } from '../../components/form';
import { Card } from '../../components/primitives/Card';
import { MobileScreenContainer } from '../../components/screen/MobileScreenContainer';
import { getMobileConfig } from '../../config';
import { notificationsRepository } from '../../data/repositories';
import { subscriptionsRepository } from '../../data/repositories/subscriptionsRepository';
import { resolveSupportedLocale } from '../../i18n/locale';
import { accountHasAnyPushDevice } from '../../lib/notifications/applyFirstSubscribePushChoice';
import { NOTIFICATION_TYPE_ROWS } from '../../lib/notifications/notificationTypeRows';
import { useMembershipGate } from '../../membership/MembershipGateProvider';
import {
  getBannerNotificationCategoryEnabled,
  getBannerNotificationEnabled,
  hydrateBannerNotificationPrefs,
  setBannerNotificationCategoryEnabled,
  subscribeBannerNotificationPrefs,
} from '../../prefs/bannerNotificationPrefs';
import { readDevicePushState } from '../../push/devicePushState.read';
import { enablePushOnThisDevice } from '../../push/enablePushOnThisDevice';
import { openSystemNotificationSettings } from '../../push/fcmTransport';
import { settingsCardGap, settingsCardInnerGap } from '../../theme/screenLayout';
import { typography } from '../../theme/typography';
import { useTheme } from '../../theme/useTheme';

type NotificationPreferenceRow = {
  category: NotificationCategoryEnum;
  descriptionKey: string;
  forceInAppEnabled: boolean;
  labelKey: string;
};

const MEDIA_NOTIFICATION_PREFERENCE_ROWS: readonly NotificationPreferenceRow[] = [
  {
    category: NotificationCategoryEnum.NewContent,
    descriptionKey: 'settings.notifications.category_new_content_description',
    forceInAppEnabled: false,
    labelKey: 'settings.notifications.category_new_content',
  },
  {
    category: NotificationCategoryEnum.Livestream,
    descriptionKey: 'settings.notifications.category_livestream_description',
    forceInAppEnabled: false,
    labelKey: 'settings.notifications.category_livestream',
  },
];

const SYSTEM_NOTIFICATION_PREFERENCE_ROWS: readonly NotificationPreferenceRow[] = [
  {
    category: NotificationCategoryEnum.ProductUpdate,
    descriptionKey: 'settings.notifications.category_product_update_description',
    forceInAppEnabled: false,
    labelKey: 'settings.notifications.category_product_update',
  },
  {
    category: NotificationCategoryEnum.Maintenance,
    descriptionKey: 'settings.notifications.category_maintenance_description',
    forceInAppEnabled: true,
    labelKey: 'settings.notifications.category_maintenance',
  },
  {
    category: NotificationCategoryEnum.TermsOfService,
    descriptionKey: 'settings.notifications.category_terms_of_service_description',
    forceInAppEnabled: true,
    labelKey: 'settings.notifications.category_terms_of_service',
  },
  {
    category: NotificationCategoryEnum.General,
    descriptionKey: 'settings.notifications.category_general_description',
    forceInAppEnabled: true,
    labelKey: 'settings.notifications.category_general',
  },
];

export function MoreSettingsNotificationsScreen() {
  const { t, i18n } = useTranslation();
  const { accessToken, account, clearSession, refreshToken, setAccount, setTokens, status } =
    useAuth();
  const isAuthenticated = status === 'authenticated';
  const { handleGateError } = useMembershipGate();
  const { styles: themeStyles, tokens } = useTheme();
  const [notificationPreferences, setNotificationPreferences] = useState<
    DTOAccountNotificationPreference[]
  >([]);
  const [errorMessageKey, setErrorMessageKey] = useState<string | null>(null);
  /** Null until this device's push permission or Unified Push registration has been read. */
  const [devicePushState, setDevicePushState] = useState<DevicePushState | null>(null);
  /** Null until the account's push devices have been checked. */
  const [accountHasPushDevice, setAccountHasPushDevice] = useState<boolean | null>(null);
  const [blockedGuidanceVisible, setBlockedGuidanceVisible] = useState(false);
  const [devicePushBannerBusy, setDevicePushBannerBusy] = useState(false);
  const devicePushStateRef = useRef<DevicePushState | null>(null);
  devicePushStateRef.current = devicePushState;
  const [applyDialog, setApplyDialog] = useState<null | 'auto_enable' | 'type_default'>(null);
  const [pendingDefault, setPendingDefault] = useState<boolean>(false);
  const [pendingType, setPendingType] = useState<SyncedNotificationType | null>(null);
  const [affectedCount, setAffectedCount] = useState(0);
  useSyncExternalStore(subscribeBannerNotificationPrefs, getBannerNotificationEnabled);

  const selectedLocale = resolveSupportedLocale(i18n.language);
  const pushProvider = getMobileConfig().pushProvider;
  const pushDeliveryReady = devicePushState === null ? null : devicePushState === 'enabled';
  const showPushRequirement = pushDeliveryReady === false;
  const pushRequirementKey =
    pushProvider === 'fcm'
      ? 'settings.notifications.preference_push_requirement_device'
      : 'settings.notifications.preference_push_requirement_unified_push';
  const showDevicePushBanner =
    isAuthenticated &&
    accountHasPushDevice !== null &&
    devicePushState !== null &&
    shouldShowDevicePushBanner({
      accountHasPushDevice,
      devicePushState,
      preferences: notificationPreferences,
    });

  const requestContext = useMemo(
    () => ({
      accessToken,
      clearSession,
      refreshToken,
      setTokens,
    }),
    [accessToken, clearSession, refreshToken, setTokens]
  );

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      void readDevicePushState()
        .then((next) => {
          if (!cancelled) {
            setDevicePushState(next);
          }
        })
        .catch((error: unknown) => {
          console.warn("Could not read this device's push state", error);
        });
      return () => {
        cancelled = true;
      };
    }, [])
  );

  useEffect(() => {
    let appIsActive = AppState.currentState !== 'background';
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        const returnedFromBackground = !appIsActive;
        appIsActive = true;
        if (!returnedFromBackground) {
          return;
        }
        const previous = devicePushStateRef.current;
        void readDevicePushState()
          .then(async (next) => {
            setDevicePushState(next);
            if (previous === 'blocked' && next === 'enabled') {
              await enablePushOnThisDevice({ auth: requestContext, locale: selectedLocale });
            }
          })
          .catch((error: unknown) => {
            console.warn("Could not refresh this device's push state", error);
          });
        return;
      }
      // `inactive` (Control Center, an incoming-call sheet) keeps the previous value.
      if (nextAppState === 'background') {
        appIsActive = false;
      }
    });
    return () => {
      subscription.remove();
    };
  }, [requestContext, selectedLocale]);

  useEffect(() => {
    void hydrateBannerNotificationPrefs();
  }, []);

  useEffect(() => {
    let isMounted = true;
    void (async () => {
      if (!isAuthenticated) {
        setNotificationPreferences([]);
        return;
      }

      try {
        const rows = await notificationsRepository.listPreferences(requestContext);
        if (!isMounted) {
          return;
        }
        setNotificationPreferences(rows);
      } catch (error) {
        if (!isMounted) {
          return;
        }
        console.warn('Could not load notification preferences', error);
        setNotificationPreferences([]);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, requestContext]);

  useEffect(() => {
    let isMounted = true;
    void (async () => {
      if (!isAuthenticated) {
        setAccountHasPushDevice(null);
        return;
      }

      try {
        const hasDevice = await accountHasAnyPushDevice(requestContext);
        if (isMounted) {
          setAccountHasPushDevice(hasDevice);
        }
      } catch (error) {
        if (!isMounted) {
          return;
        }
        console.warn('Could not check the account for push devices', error);
        setAccountHasPushDevice(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, requestContext]);

  const showNotificationLoginAlert = useCallback(() => {
    Alert.alert(
      t('settings.notifications.login_required_title'),
      t('settings.notifications.login_required_message'),
      [{ text: t('misc.ok') }]
    );
  }, [t]);

  const settingsNotification = account?.account_settings?.account_settings_notification;
  const autoEnableOnSubscribe = settingsNotification?.auto_enable_on_subscribe ?? false;
  const enabledDefaultTypes = new Set<string>(
    (settingsNotification?.account_settings_notification_types ?? []).map((row) => row.type)
  );

  const handleAutoEnableOnSubscribeToggle = useCallback(
    async (nextValue: boolean) => {
      setErrorMessageKey(null);

      if (!isAuthenticated) {
        showNotificationLoginAlert();
        return;
      }

      try {
        await syncAutoEnableOnSubscribeToAccountSettings({
          auth: requestContext,
          enabled: nextValue,
          setAccount,
        });

        const count = nextValue
          ? (await subscriptionsRepository.list()).length
          : (
              await requestWithMobileAuthRefresh(requestContext, (api) =>
                api.reqAccountNotificationChannelsGetAll()
              )
            ).length;

        if (count === 0) {
          return;
        }

        setPendingDefault(nextValue);
        setAffectedCount(count);
        setApplyDialog('auto_enable');
      } catch (error) {
        if (handleGateError(error)) {
          return;
        }
        setErrorMessageKey('errors.generic');
      }
    },
    [handleGateError, isAuthenticated, requestContext, setAccount, showNotificationLoginAlert]
  );

  const handleNotificationTypeDefaultToggle = useCallback(
    async (type: SyncedNotificationType, nextValue: boolean) => {
      setErrorMessageKey(null);

      if (!isAuthenticated) {
        showNotificationLoginAlert();
        return;
      }

      try {
        await syncNotificationTypeToAccountSettings({
          auth: requestContext,
          enabled: nextValue,
          setAccount,
          type,
        });

        const channels = await requestWithMobileAuthRefresh(requestContext, (api) =>
          api.reqAccountNotificationChannelsGetAll()
        );
        if (channels.length === 0) {
          return;
        }

        setPendingType(type);
        setPendingDefault(nextValue);
        setAffectedCount(channels.length);
        setApplyDialog('type_default');
      } catch (error) {
        if (handleGateError(error)) {
          return;
        }
        setErrorMessageKey('errors.generic');
      }
    },
    [handleGateError, isAuthenticated, requestContext, setAccount, showNotificationLoginAlert]
  );

  const confirmApplyDialog = useCallback(async () => {
    const dialog = applyDialog;
    setApplyDialog(null);
    if (dialog === null) {
      return;
    }

    try {
      if (dialog === 'auto_enable') {
        if (pendingDefault) {
          await requestWithMobileAuthRefresh(requestContext, (api) =>
            api.reqAccountNotificationChannelsBulkEnable()
          );
        } else {
          await requestWithMobileAuthRefresh(requestContext, (api) =>
            api.reqAccountNotificationChannelsBulkDisable()
          );
        }
        return;
      }

      if (dialog === 'type_default' && pendingType !== null) {
        await requestWithMobileAuthRefresh(requestContext, (api) =>
          api.reqAccountNotificationChannelsBulkType({
            enabled: pendingDefault,
            type: pendingType,
          })
        );
      }
    } catch (error) {
      if (handleGateError(error)) {
        return;
      }
      setErrorMessageKey('errors.generic');
    }
  }, [applyDialog, handleGateError, pendingDefault, pendingType, requestContext]);

  const handleDevicePushBannerAction = useCallback(async () => {
    if (devicePushState === 'blocked') {
      setBlockedGuidanceVisible(true);
      return;
    }
    setDevicePushBannerBusy(true);
    setErrorMessageKey(null);
    try {
      const result = await enablePushOnThisDevice({
        auth: requestContext,
        locale: selectedLocale,
      });
      setDevicePushState(await readDevicePushState());
      if (result.outcome === 'not_registered') {
        setErrorMessageKey('errors.generic');
      }
    } catch (error) {
      console.warn('Could not enable push from the notification settings banner', error);
      setErrorMessageKey('errors.generic');
    } finally {
      setDevicePushBannerBusy(false);
    }
  }, [devicePushState, requestContext, selectedLocale]);

  const handleNotificationPreferenceToggle = useCallback(
    async (params: {
      category: NotificationCategoryEnum;
      channel: 'in_app' | 'push';
      enabled: boolean;
      forceInAppEnabled: boolean;
    }) => {
      setErrorMessageKey(null);

      if (!isAuthenticated) {
        showNotificationLoginAlert();
        return;
      }

      const existing = notificationPreferences.find((row) => row.category === params.category);
      if (existing === undefined) {
        return;
      }

      const nextInAppEnabled =
        params.forceInAppEnabled || params.channel === 'in_app'
          ? params.forceInAppEnabled
            ? true
            : params.enabled
          : existing.in_app_enabled;
      const nextPushEnabled = params.channel === 'push' ? params.enabled : existing.push_enabled;

      if (params.channel === 'push' && params.enabled) {
        const result = await enablePushOnThisDevice({
          auth: requestContext,
          locale: selectedLocale,
        });
        setDevicePushState(await readDevicePushState());
        if (result.outcome === 'denied') {
          setErrorMessageKey('settings.notifications.permission_required');
          return;
        }
        if (result.outcome === 'enabled') {
          setAccountHasPushDevice(true);
        }
      }

      const optimisticPreferences = notificationPreferences.map((row) => {
        if (row.category !== params.category) {
          return row;
        }
        return {
          ...row,
          in_app_enabled: nextInAppEnabled,
          push_enabled: nextPushEnabled,
        };
      });
      setNotificationPreferences(optimisticPreferences);

      try {
        const updated = await notificationsRepository.updatePreferences(requestContext, {
          preferences: [
            {
              category: params.category,
              in_app_enabled: nextInAppEnabled,
              push_enabled: nextPushEnabled,
            },
          ],
        });
        setNotificationPreferences(updated);
      } catch (error) {
        setNotificationPreferences(notificationPreferences);
        if (handleGateError(error)) {
          return;
        }
        setErrorMessageKey('errors.generic');
      }
    },
    [
      handleGateError,
      isAuthenticated,
      notificationPreferences,
      requestContext,
      selectedLocale,
      showNotificationLoginAlert,
    ]
  );

  const styles = useMemo(
    () =>
      StyleSheet.create({
        cardIntro: {
          gap: settingsCardInnerGap(tokens.spacing),
          paddingHorizontal: tokens.spacing.lg,
          paddingTop: tokens.spacing.lg,
        },
        cardStack: {
          gap: settingsCardGap(tokens.spacing),
        },
        insetCopy: {
          paddingHorizontal: tokens.spacing.lg,
        },
        optionalPreferenceRows: {
          gap: 0,
          paddingLeft: tokens.spacing.md,
        },
        pushRequirement: {
          ...typography.caption,
          color: themeStyles.textSecondary.color,
          paddingBottom: tokens.spacing.lg,
          paddingHorizontal: tokens.spacing.lg,
          paddingTop: tokens.spacing.md,
        },
        preferenceDescription: {
          ...typography.body,
          color: themeStyles.textSecondary.color,
          paddingHorizontal: tokens.spacing.lg,
        },
        preferenceGroupFirst: {
          paddingTop: tokens.spacing.lg,
        },
        preferenceGroupLast: {
          paddingBottom: tokens.spacing.lg,
        },
        preferenceGroupRest: {
          borderTopColor: themeStyles.border.borderColor,
          borderTopWidth: StyleSheet.hairlineWidth,
          marginTop: tokens.spacing.lg,
          paddingTop: tokens.spacing.lg,
        },
        preferenceHint: {
          ...typography.caption,
          color: themeStyles.textSecondary.color,
          paddingHorizontal: tokens.spacing.lg,
          paddingTop: tokens.spacing.xs,
        },

        sectionDescription: {
          ...typography.body,
          color: themeStyles.textSecondary.color,
        },
        sectionHeading: {
          color: themeStyles.textPrimary.color,
          fontSize: 16,
          fontWeight: '700',
        },
        typeDefaults: {
          gap: settingsCardInnerGap(tokens.spacing),
          paddingBottom: tokens.spacing.lg,
          paddingHorizontal: tokens.spacing.lg,
          paddingTop: tokens.spacing.lg,
        },
        screenError: {
          marginTop: tokens.spacing.sm,
        },
        warningText: {
          ...typography.body,
          color: themeStyles.textSecondary.color,
        },
      }),
    [themeStyles, tokens]
  );

  const renderPreferenceRows = (
    rows: readonly NotificationPreferenceRow[],
    options: { showFooterHints: boolean }
  ) => {
    return rows.map((row, index) => {
      const preference =
        notificationPreferences.find((candidate) => candidate.category === row.category) ?? null;
      const defaultInApp = getDefaultNotificationCategoryPreference(row.category).in_app_enabled;
      // Signed out, every switch stays off. Product defaults apply only after login.
      const categoryEnabled = !isAuthenticated
        ? false
        : row.forceInAppEnabled
          ? true
          : (preference?.in_app_enabled ?? defaultInApp);
      const showOptionalChannels = categoryEnabled;
      const accountPushEnabled = preference?.push_enabled ?? false;
      const pushSwitchValue = accountPushEnabled && pushDeliveryReady === true;
      const pushDeliveryBlocksToggle = pushProvider !== 'fcm' && pushDeliveryReady !== true;
      const showPushAsterisk = showOptionalChannels && showPushRequirement;
      const isFirst = index === 0;
      const isLast = index === rows.length - 1;
      const showFooter = options.showFooterHints && isLast && !showPushRequirement;

      return (
        <View
          key={row.category}
          style={[
            isFirst ? styles.preferenceGroupFirst : styles.preferenceGroupRest,
            showFooter ? styles.preferenceGroupLast : null,
            isLast && !options.showFooterHints ? styles.preferenceGroupLast : null,
          ]}
        >
          <Text style={styles.preferenceDescription}>{t(row.descriptionKey)}</Text>
          <SettingsSwitchRow
            disabled={row.forceInAppEnabled}
            onValueChange={(nextValue) => {
              void handleNotificationPreferenceToggle({
                category: row.category,
                channel: 'in_app',
                enabled: nextValue,
                forceInAppEnabled: row.forceInAppEnabled,
              });
            }}
            testID={`more-settings-notification-${row.category}`}
            title={t(row.labelKey)}
            value={categoryEnabled}
          />
          {row.category === NotificationCategoryEnum.ProductUpdate ? (
            <Text style={styles.preferenceHint}>
              {t('settings.notifications.product_update_enable_hint')}
            </Text>
          ) : null}
          {showOptionalChannels ? (
            <View style={styles.optionalPreferenceRows}>
              <SettingsSwitchRow
                accessibilityHint={showPushAsterisk ? t(pushRequirementKey) : undefined}
                disabled={!isAuthenticated || pushDeliveryBlocksToggle}
                onValueChange={(nextValue) => {
                  void handleNotificationPreferenceToggle({
                    category: row.category,
                    channel: 'push',
                    enabled: nextValue,
                    forceInAppEnabled: row.forceInAppEnabled,
                  });
                }}
                testID={`more-settings-notification-${row.category}-push`}
                title={t('settings.notifications.preference_push')}
                titleMarker={showPushAsterisk ? '*' : undefined}
                value={pushSwitchValue}
              />
              <SettingsSwitchRow
                onValueChange={(next) => {
                  if (!isAuthenticated) {
                    showNotificationLoginAlert();
                    return;
                  }
                  void setBannerNotificationCategoryEnabled(row.category, next);
                }}
                switchTestID={`more-settings-banner-notification-${row.category}-switch`}
                testID={`more-settings-banner-notification-${row.category}`}
                title={t('settings.notifications.preference_banner')}
                value={getBannerNotificationCategoryEnabled(row.category)}
              />
            </View>
          ) : null}
        </View>
      );
    });
  };

  return (
    <MobileScreenContainer testID="more-settings-notifications-screen">
      <ConfirmDialog
        body={
          applyDialog === 'type_default'
            ? t('settings.notifications.type_default_apply_body', { count: affectedCount })
            : t('settings.notifications.auto_enable_apply_body', { count: affectedCount })
        }
        cancelLabel={
          applyDialog === 'type_default'
            ? t('settings.notifications.type_default_apply_new_only')
            : t('settings.notifications.auto_enable_apply_new_only')
        }
        cancelTestID="more-settings-notifications-apply-new-only"
        confirmLabel={
          applyDialog === 'type_default'
            ? t('settings.notifications.type_default_apply_all')
            : t('settings.notifications.auto_enable_apply_all')
        }
        confirmTestID="more-settings-notifications-apply-all"
        onCancel={() => {
          setApplyDialog(null);
        }}
        onConfirm={() => {
          void confirmApplyDialog();
        }}
        testID="more-settings-notifications-apply-dialog"
        title={
          applyDialog === 'type_default'
            ? t('settings.notifications.type_default_apply_title')
            : t('settings.notifications.auto_enable_apply_title')
        }
        visible={applyDialog !== null}
      />
      <ConfirmDialog
        body={t('settings.notifications.device_push_blocked_mobile_body')}
        cancelLabel={t('misc.cancel')}
        cancelTestID="more-settings-device-push-blocked-cancel"
        confirmLabel={t('settings.notifications.open_system_settings')}
        confirmTestID="more-settings-device-push-blocked-open-settings"
        onCancel={() => {
          setBlockedGuidanceVisible(false);
        }}
        onConfirm={() => {
          setBlockedGuidanceVisible(false);
          void openSystemNotificationSettings().catch(() => {
            setErrorMessageKey('errors.generic');
          });
        }}
        testID="more-settings-device-push-blocked-dialog"
        title={t('settings.notifications.device_push_blocked_title')}
        visible={blockedGuidanceVisible}
      />
      <View style={styles.cardStack}>
        {showDevicePushBanner ? (
          <WarningBanner
            actionLabel={t('settings.notifications.device_push_banner_action')}
            actionLoading={devicePushBannerBusy}
            actionTestID="more-settings-device-push-banner-action"
            message={t('settings.notifications.device_push_banner_message')}
            onAction={() => {
              void handleDevicePushBannerAction();
            }}
            testID="more-settings-device-push-banner"
          />
        ) : null}
        <Card padded={false} testID="more-settings-notification-when-subscribe-card">
          <View style={styles.cardIntro}>
            <Text style={styles.sectionHeading}>
              {t('settings.notifications.when_i_subscribe_section')}
            </Text>
          </View>
          <SettingsSwitchRow
            onValueChange={(nextValue) => {
              void handleAutoEnableOnSubscribeToggle(nextValue);
            }}
            switchTestID="more-settings-notification-auto-enable-on-subscribe-switch"
            testID="more-settings-notification-auto-enable-on-subscribe"
            title={t('settings.notifications.auto_enable_on_subscribe')}
            value={autoEnableOnSubscribe}
          >
            <SettingsRowDescription>
              {t('settings.notifications.auto_enable_on_subscribe_help')}
            </SettingsRowDescription>
          </SettingsSwitchRow>
        </Card>

        <Card padded={false} testID="more-settings-notification-types-card">
          <View style={styles.typeDefaults}>
            <Text style={styles.sectionHeading}>
              {t('settings.notifications.type_defaults_section')}
            </Text>
            <Text style={styles.sectionDescription}>
              {t('settings.notifications.type_defaults_section_help')}
            </Text>
          </View>
          {NOTIFICATION_TYPE_ROWS.map((row) => (
            <SettingsSwitchRow
              key={row.type}
              onValueChange={(nextValue) => {
                void handleNotificationTypeDefaultToggle(row.type, nextValue);
              }}
              testID={`more-settings-notification-type-default-${row.type}`}
              title={t(row.labelKey)}
              value={enabledDefaultTypes.has(row.type)}
            />
          ))}
        </Card>

        <Card padded={false} testID="more-settings-media-notifications-card">
          <View style={styles.cardIntro}>
            <Text style={styles.sectionHeading}>
              {t('settings.notifications.media_notifications_section')}
            </Text>
            <Text style={styles.sectionDescription}>
              {t('settings.notifications.media_notifications_section_help')}
            </Text>
          </View>
          {renderPreferenceRows(MEDIA_NOTIFICATION_PREFERENCE_ROWS, { showFooterHints: false })}
        </Card>

        <Card padded={false} testID="more-settings-system-notifications-card">
          <View style={styles.cardIntro}>
            <Text style={styles.sectionHeading}>
              {t('settings.notifications.system_notifications_section')}
            </Text>
            <Text style={styles.sectionDescription}>
              {t('settings.notifications.system_notifications_section_help')}
            </Text>
          </View>
          {renderPreferenceRows(SYSTEM_NOTIFICATION_PREFERENCE_ROWS, { showFooterHints: true })}
          {showPushRequirement ? (
            <Text
              style={styles.pushRequirement}
              testID="more-settings-notification-push-requirement"
            >
              {`* ${t(pushRequirementKey)}`}
            </Text>
          ) : null}
        </Card>
      </View>
      {errorMessageKey !== null ? (
        <Text style={[styles.warningText, styles.screenError]} testID="more-settings-error">
          {t(errorMessageKey)}
        </Text>
      ) : null}
    </MobileScreenContainer>
  );
}
