import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import type { UITheme } from '@podverse/design-tokens';
import { ALL_POSSIBLE_THEMES } from '@podverse/design-tokens';
import type { MediaTypePreference } from '@podverse/helpers';

import { useAuth } from '../../auth/AuthProvider';
import {
  type SyncedNotificationType,
  syncLocaleToAccountSettings,
  syncNotificationTypeToAccountSettings,
  syncPlaybackPreferenceToAccount,
} from '../../auth/syncAccountPrefs';
import { Card } from '../../components/primitives/Card';
import { ListRow } from '../../components/primitives/ListRow';
import { MobileScreenContainer } from '../../components/screen/MobileScreenContainer';
import { getMobileConfig } from '../../config';
import { applyAccountLocaleOverride } from '../../i18n';
import { resolveSupportedLocale } from '../../i18n/locale';
import { useMembershipGate } from '../../membership/MembershipGateProvider';
import {
  readAutoQueuePrefs,
  writeAutoQueueRandomPref,
  writeAutoQueueRepeatPref,
} from '../../prefs/autoQueuePrefs';
import {
  DEFAULT_PLAYBACK_MEDIA_TYPE,
  readPlaybackMediaTypePref,
  writePlaybackMediaTypePref,
} from '../../prefs/preferredMediaType';
import { getPref, setPref } from '../../prefs/prefsStore';
import { registerFcmDeviceForAccount } from '../../push/fcmDeviceSync';
import {
  openSystemNotificationSettings,
  requestFcmPermissionAfterUserAction,
} from '../../push/fcmTransport';
import { registerUnifiedPushDeviceForAccount } from '../../push/unifiedPushDeviceSync';
import { useTheme } from '../../theme/useTheme';

const NOTIFICATION_TYPES: readonly SyncedNotificationType[] = [
  'new-item',
  'livestream-scheduled',
  'livestream-started',
];

const LOCALE_OPTIONS = ['en-US', 'es', 'fr', 'el-GR'] as const;
const PLAYBACK_MEDIA_OPTIONS: readonly MediaTypePreference[] = ['audio', 'video'];

type ToggleMap = Record<SyncedNotificationType, boolean>;

const getNotificationLabelKey = (type: SyncedNotificationType): string => {
  if (type === 'new-item') {
    return 'settings.notifications.new_item';
  }
  if (type === 'livestream-scheduled') {
    return 'settings.notifications.livestream_scheduled';
  }
  return 'settings.notifications.livestream_started';
};

const getAccountLocale = (accountLocale: string | null | undefined): string => {
  return resolveSupportedLocale(accountLocale);
};

export function MoreSettingsScreen() {
  const { t, i18n } = useTranslation();
  const { account, accessToken, setAccount, status } = useAuth();
  const { handleGateError } = useMembershipGate();
  const { setUITheme, styles: themeStyles, tokens, uiTheme } = useTheme();
  const [playbackMediaType, setPlaybackMediaType] = useState<MediaTypePreference>(
    DEFAULT_PLAYBACK_MEDIA_TYPE
  );
  const [selectedLocale, setSelectedLocale] = useState<string>(
    resolveSupportedLocale(i18n.language)
  );
  const [notificationToggles, setNotificationToggles] = useState<ToggleMap>({
    'livestream-scheduled': false,
    'livestream-started': false,
    'new-item': false,
  });
  const [autoQueueRandom, setAutoQueueRandom] = useState<boolean>(false);
  const [autoQueueRepeat, setAutoQueueRepeat] = useState<boolean>(false);
  const [errorMessageKey, setErrorMessageKey] = useState<string | null>(null);
  const [notificationPermissionBlocked, setNotificationPermissionBlocked] =
    useState<boolean>(false);
  const [showNotificationPermissionHint, setShowNotificationPermissionHint] =
    useState<boolean>(false);

  const notificationTypeSet = useMemo<Set<string>>(() => {
    const types =
      account?.account_settings?.account_settings_notification?.account_settings_notification_types;
    return new Set(types?.map((type) => type.type) ?? []);
  }, [account]);

  useEffect(() => {
    let isMounted = true;
    void (async () => {
      const [storedPlaybackMediaType, autoQueuePrefs] = await Promise.all([
        readPlaybackMediaTypePref(),
        readAutoQueuePrefs(),
      ]);

      if (!isMounted) {
        return;
      }

      setPlaybackMediaType(storedPlaybackMediaType ?? DEFAULT_PLAYBACK_MEDIA_TYPE);
      setAutoQueueRandom(autoQueuePrefs.random);
      setAutoQueueRepeat(autoQueuePrefs.repeat);
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    void (async () => {
      const accountLocale = account?.account_settings?.account_settings_locale?.locale;
      const targetLocale =
        status === 'authenticated'
          ? getAccountLocale(accountLocale)
          : resolveSupportedLocale((await getPref('locale')) ?? i18n.language);

      if (!isMounted) {
        return;
      }

      setSelectedLocale(targetLocale);
      await setPref('locale', targetLocale);
    })();

    return () => {
      isMounted = false;
    };
  }, [account, i18n.language, status]);

  useEffect(() => {
    setNotificationToggles({
      'livestream-scheduled': notificationTypeSet.has('livestream-scheduled'),
      'livestream-started': notificationTypeSet.has('livestream-started'),
      'new-item': notificationTypeSet.has('new-item'),
    });
  }, [notificationTypeSet]);

  const isAuthenticated = status === 'authenticated';

  const handleThemeChange = useCallback(
    (theme: UITheme) => {
      setUITheme(theme);
    },
    [setUITheme]
  );

  const handleLocaleChange = useCallback(
    async (locale: string) => {
      setErrorMessageKey(null);
      setSelectedLocale(locale);
      try {
        await setPref('locale', locale);
        await applyAccountLocaleOverride(locale);
        await syncLocaleToAccountSettings({
          accessToken,
          locale,
          setAccount,
        });
      } catch {
        setErrorMessageKey('errors.generic');
      }
    },
    [accessToken, setAccount]
  );

  const handlePlaybackMediaTypeChange = useCallback(
    async (mediaType: MediaTypePreference) => {
      setErrorMessageKey(null);
      setPlaybackMediaType(mediaType);
      try {
        await writePlaybackMediaTypePref(mediaType);
        await syncPlaybackPreferenceToAccount({
          accessToken,
          preferredMediaType: mediaType,
          setAccount,
        });
      } catch {
        setErrorMessageKey('errors.generic');
      }
    },
    [accessToken, setAccount]
  );

  const handleNotificationToggle = useCallback(
    async (type: SyncedNotificationType, enabled: boolean) => {
      setErrorMessageKey(null);

      if (enabled) {
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

      const previousValue = notificationToggles[type];
      setNotificationToggles((prev) => ({
        ...prev,
        [type]: enabled,
      }));

      try {
        await syncNotificationTypeToAccountSettings({
          accessToken,
          enabled,
          setAccount,
          type,
        });
      } catch (error) {
        setNotificationToggles((prev) => ({
          ...prev,
          [type]: previousValue,
        }));
        if (handleGateError(error)) {
          return;
        }
        setErrorMessageKey('errors.generic');
      }
    },
    [accessToken, handleGateError, notificationToggles, selectedLocale, setAccount]
  );

  const handleAutoQueueRandomToggle = useCallback(async (enabled: boolean) => {
    setAutoQueueRandom(enabled);
    await writeAutoQueueRandomPref(enabled);
  }, []);

  const handleAutoQueueRepeatToggle = useCallback(async (enabled: boolean) => {
    setAutoQueueRepeat(enabled);
    await writeAutoQueueRepeatPref(enabled);
  }, []);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        cardSpacing: {
          marginTop: tokens.spacing.lg,
        },
        controlRow: {
          alignItems: 'center',
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: tokens.spacing.sm,
          marginTop: tokens.spacing.sm,
        },
        optionButton: {
          borderColor: themeStyles.border.borderColor,
          borderRadius: tokens.radii.round,
          borderWidth: 1,
          paddingHorizontal: tokens.spacing.md,
          paddingVertical: tokens.spacing.sm,
        },
        optionButtonActive: {
          backgroundColor: themeStyles.buttonPrimary.backgroundColor,
          borderColor: themeStyles.buttonPrimary.backgroundColor,
        },
        optionButtonText: {
          color: themeStyles.textPrimary.color,
          fontSize: 14,
          fontWeight: '600',
        },
        optionButtonTextActive: {
          color: themeStyles.buttonPrimary.color,
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
        warningText: {
          color: themeStyles.textSecondary.color,
          fontSize: 13,
          marginTop: tokens.spacing.sm,
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
      }),
    [themeStyles, tokens]
  );

  return (
    <MobileScreenContainer heading={t('settings.settings')} testID="more-settings-screen">
      <Card padded={false} testID="more-settings-theme-card">
        <View style={styles.sectionInner}>
          <Text style={styles.sectionHeading}>{t('settings.ui_theme.theme')}</Text>
          <Text style={styles.sectionDescription}>{t('settings.ui_theme.description')}</Text>
          <View style={styles.controlRow}>
            {ALL_POSSIBLE_THEMES.map((themeOption) => {
              const isActive = uiTheme === themeOption;
              return (
                <Pressable
                  accessibilityRole="button"
                  key={themeOption}
                  onPress={() => {
                    handleThemeChange(themeOption);
                  }}
                  style={[styles.optionButton, isActive ? styles.optionButtonActive : null]}
                  testID={`more-settings-theme-${themeOption}`}
                >
                  <Text
                    style={[
                      styles.optionButtonText,
                      isActive ? styles.optionButtonTextActive : null,
                    ]}
                  >
                    {t(`settings.ui_theme.${themeOption}`)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </Card>

      <Card padded={false} testID="more-settings-locale-card">
        <View style={styles.sectionInner}>
          <Text style={styles.sectionHeading}>{t('language.select_language')}</Text>
          <Text style={styles.sectionDescription}>{t('language.description')}</Text>
          <View style={styles.controlRow}>
            {LOCALE_OPTIONS.map((localeOption) => {
              const isActive = selectedLocale === localeOption;
              return (
                <Pressable
                  accessibilityRole="button"
                  key={localeOption}
                  onPress={() => {
                    void handleLocaleChange(localeOption);
                  }}
                  style={[styles.optionButton, isActive ? styles.optionButtonActive : null]}
                  testID={`more-settings-locale-${localeOption}`}
                >
                  <Text
                    style={[
                      styles.optionButtonText,
                      isActive ? styles.optionButtonTextActive : null,
                    ]}
                  >
                    {t(`language.languages.${localeOption}`)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </Card>

      <Card padded={false} testID="more-settings-playback-card">
        <View style={styles.sectionInner}>
          <Text style={styles.sectionHeading}>{t('settings.preferred_media_type.label')}</Text>
          <Text style={styles.sectionDescription}>
            {t('settings.preferred_media_type.description')}
          </Text>
          <View style={styles.controlRow}>
            {PLAYBACK_MEDIA_OPTIONS.map((mediaTypeOption) => {
              const isActive = playbackMediaType === mediaTypeOption;
              return (
                <Pressable
                  accessibilityRole="button"
                  key={mediaTypeOption}
                  onPress={() => {
                    void handlePlaybackMediaTypeChange(mediaTypeOption);
                  }}
                  style={[styles.optionButton, isActive ? styles.optionButtonActive : null]}
                  testID={`more-settings-playback-${mediaTypeOption}`}
                >
                  <Text
                    style={[
                      styles.optionButtonText,
                      isActive ? styles.optionButtonTextActive : null,
                    ]}
                  >
                    {t(`settings.preferred_media_type.${mediaTypeOption}`)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </Card>

      <Card padded={false} testID="more-settings-auto-queue-card">
        <View style={styles.sectionInner}>
          <Text style={styles.sectionHeading}>{t('media_player.auto_queue')}</Text>
          <View style={styles.sectionStack}>
            <ListRow
              testID="more-settings-auto-queue-random"
              title={t('media_player.shuffle.toggle_shuffle')}
              trailing={
                <Switch
                  onValueChange={(nextValue) => {
                    void handleAutoQueueRandomToggle(nextValue);
                  }}
                  value={autoQueueRandom}
                />
              }
            />
          </View>
          <View style={styles.sectionStack}>
            <ListRow
              testID="more-settings-auto-queue-repeat"
              title={t('media_player.repeat.toggle_repeat')}
              trailing={
                <Switch
                  onValueChange={(nextValue) => {
                    void handleAutoQueueRepeatToggle(nextValue);
                  }}
                  value={autoQueueRepeat}
                />
              }
            />
          </View>
        </View>
      </Card>

      <Card padded={false} testID="more-settings-notifications-card">
        <View style={styles.sectionInner}>
          <Text style={styles.sectionHeading}>{t('settings.notifications.notifications')}</Text>
          <View style={styles.sectionStack}>
            {NOTIFICATION_TYPES.map((notificationType) => (
              <ListRow
                key={notificationType}
                subtitle={t(`settings.notifications.default_${notificationType}_help`)}
                testID={`more-settings-notification-${notificationType}`}
                title={t(getNotificationLabelKey(notificationType))}
                trailing={
                  <Switch
                    disabled={!isAuthenticated}
                    onValueChange={(nextValue) => {
                      void handleNotificationToggle(notificationType, nextValue);
                    }}
                    value={notificationToggles[notificationType]}
                  />
                }
              />
            ))}
          </View>
          {!isAuthenticated ? (
            <Text style={styles.warningText}>
              {t('instructions.login_to_enable_notifications')}
            </Text>
          ) : null}
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
