import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import type { DTOAccountNotificationPreference } from '@podverse/helpers';
import { NotificationCategoryEnum } from '@podverse/helpers';

import { useAuth } from '../../auth/AuthProvider';
import { Card } from '../../components/primitives/Card';
import { ListRow } from '../../components/primitives/ListRow';
import { MobileScreenContainer } from '../../components/screen/MobileScreenContainer';
import { getMobileConfig } from '../../config';
import { notificationsRepository } from '../../data/repositories';
import { resolveSupportedLocale } from '../../i18n/locale';
import { useMembershipGate } from '../../membership/MembershipGateProvider';
import { registerFcmDeviceForAccount } from '../../push/fcmDeviceSync';
import {
  openSystemNotificationSettings,
  requestFcmPermissionAfterUserAction,
} from '../../push/fcmTransport';
import { registerUnifiedPushDeviceForAccount } from '../../push/unifiedPushDeviceSync';
import { useTheme } from '../../theme/useTheme';

type NotificationPreferenceRow = {
  category: NotificationCategoryEnum;
  descriptionKey: string;
  forceInAppEnabled: boolean;
  labelKey: string;
};

const NOTIFICATION_PREFERENCE_ROWS: readonly NotificationPreferenceRow[] = [
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
  const { accessToken, clearSession, refreshToken, setTokens, status } = useAuth();
  const isAuthenticated = status === 'authenticated';
  const { handleGateError } = useMembershipGate();
  const { styles: themeStyles, tokens } = useTheme();
  const [notificationPreferences, setNotificationPreferences] = useState<
    DTOAccountNotificationPreference[]
  >([]);
  const [errorMessageKey, setErrorMessageKey] = useState<string | null>(null);
  const [notificationPermissionBlocked, setNotificationPermissionBlocked] =
    useState<boolean>(false);
  const [showNotificationPermissionHint, setShowNotificationPermissionHint] =
    useState<boolean>(false);

  const selectedLocale = resolveSupportedLocale(i18n.language);

  const requestContext = useMemo(
    () => ({
      accessToken,
      clearSession,
      refreshToken,
      setTokens,
    }),
    [accessToken, clearSession, refreshToken, setTokens]
  );

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

  const showNotificationLoginAlert = useCallback(() => {
    Alert.alert(
      t('settings.notifications.login_required_title'),
      t('settings.notifications.login_required_message'),
      [{ text: t('misc.ok') }]
    );
  }, [t]);

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
        const pushProvider = getMobileConfig().pushProvider;
        if (pushProvider === 'fcm') {
          const permissionResult = await requestFcmPermissionAfterUserAction();
          if (!permissionResult.granted) {
            setShowNotificationPermissionHint(true);
            setNotificationPermissionBlocked(!permissionResult.canAskAgain);
            setErrorMessageKey('settings.notifications.permission_required');
            return;
          }

          setShowNotificationPermissionHint(false);
          try {
            await registerFcmDeviceForAccount({ accessToken, locale: selectedLocale });
          } catch (error) {
            console.warn('Failed to register FCM device after permission grant', error);
          }
        } else if (pushProvider === 'unifiedpush') {
          setShowNotificationPermissionHint(false);
          try {
            await registerUnifiedPushDeviceForAccount({ accessToken, locale: selectedLocale });
          } catch (error) {
            console.warn('Failed to register UnifiedPush device after notification enable', error);
          }
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
      accessToken,
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
        preferenceDescription: {
          color: themeStyles.textSecondary.color,
          fontSize: 12,
          marginBottom: tokens.spacing.sm,
        },
        preferenceRow: {
          borderColor: themeStyles.border.borderColor,
          borderRadius: tokens.radii.sm,
          borderWidth: 1,
          marginBottom: tokens.spacing.sm,
          padding: tokens.spacing.sm,
        },
        sectionDescription: {
          color: themeStyles.textSecondary.color,
          fontSize: 13,
          marginTop: tokens.spacing.xs,
        },
        sectionHeading: {
          color: themeStyles.textPrimary.color,
          fontSize: 16,
          fontWeight: '700',
          marginBottom: tokens.spacing.xs,
        },
        sectionInner: {
          padding: tokens.spacing.lg,
        },
        sectionStack: {
          marginTop: tokens.spacing.md,
        },
        warningLinkButton: {
          borderColor: themeStyles.border.borderColor,
          borderRadius: tokens.radii.sm,
          borderWidth: 1,
          marginTop: tokens.spacing.sm,
          paddingHorizontal: tokens.spacing.md,
          paddingVertical: tokens.spacing.sm,
          width: 'auto',
        },
        warningLinkButtonText: {
          color: themeStyles.textPrimary.color,
          fontSize: 13,
          fontWeight: '600',
        },
        warningText: {
          color: themeStyles.textSecondary.color,
          fontSize: 13,
          marginTop: tokens.spacing.sm,
        },
      }),
    [themeStyles, tokens]
  );

  return (
    <MobileScreenContainer testID="more-settings-notifications-screen">
      <Card padded={false} testID="more-settings-notifications-card">
        <View style={styles.sectionInner}>
          <Text style={styles.sectionHeading}>{t('settings.notifications.notifications')}</Text>
          <Text style={styles.sectionDescription}>
            {t('settings.notifications.preference_section_help')}
          </Text>
          <View style={styles.sectionStack}>
            {NOTIFICATION_PREFERENCE_ROWS.map((row) => {
              const preference =
                notificationPreferences.find((candidate) => candidate.category === row.category) ??
                null;
              const inAppEnabled = row.forceInAppEnabled
                ? true
                : (preference?.in_app_enabled ?? true);
              const pushEnabled = preference?.push_enabled ?? false;
              const canTogglePush = isAuthenticated;

              return (
                <View key={row.category} style={styles.preferenceRow}>
                  <Text style={styles.preferenceDescription}>{t(row.descriptionKey)}</Text>
                  <ListRow
                    testID={`more-settings-notification-${row.category}-in-app`}
                    title={t(row.labelKey)}
                    trailing={
                      <Switch
                        disabled={row.forceInAppEnabled}
                        onValueChange={(nextValue) => {
                          void handleNotificationPreferenceToggle({
                            category: row.category,
                            channel: 'in_app',
                            enabled: nextValue,
                            forceInAppEnabled: row.forceInAppEnabled,
                          });
                        }}
                        value={inAppEnabled}
                      />
                    }
                  />
                  <ListRow
                    testID={`more-settings-notification-${row.category}-push`}
                    title={
                      canTogglePush
                        ? t('settings.notifications.preference_push')
                        : t('settings.notifications.preference_push_disabled')
                    }
                    trailing={
                      <Switch
                        disabled={!canTogglePush}
                        onValueChange={(nextValue) => {
                          void handleNotificationPreferenceToggle({
                            category: row.category,
                            channel: 'push',
                            enabled: nextValue,
                            forceInAppEnabled: row.forceInAppEnabled,
                          });
                        }}
                        value={pushEnabled}
                      />
                    }
                  />
                  {row.category === NotificationCategoryEnum.ProductUpdate ? (
                    <Text style={styles.warningText}>
                      {t('settings.notifications.product_update_disable_hint')}
                    </Text>
                  ) : null}
                </View>
              );
            })}
          </View>
          {showNotificationPermissionHint ? (
            <View style={styles.sectionStack}>
              <Text style={styles.warningText} testID="more-settings-notification-permission-hint">
                {t('settings.notifications.permission_required')}
              </Text>
              {notificationPermissionBlocked ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    void openSystemNotificationSettings().catch(() => {
                      setErrorMessageKey('errors.generic');
                    });
                  }}
                  style={styles.warningLinkButton}
                  testID="more-settings-open-notification-settings"
                >
                  <Text style={styles.warningLinkButtonText}>
                    {t('settings.notifications.open_system_settings')}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}
        </View>
      </Card>
      {errorMessageKey !== null ? (
        <Text style={styles.warningText} testID="more-settings-error">
          {t(errorMessageKey)}
        </Text>
      ) : null}
    </MobileScreenContainer>
  );
}
