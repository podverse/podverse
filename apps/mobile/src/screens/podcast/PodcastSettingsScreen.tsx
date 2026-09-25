import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Switch, Text, View } from 'react-native';

import type { DTOChannel } from '@podverse/helpers';
import { buildFeedParseStatusLines, formatDateTimeAbbrev } from '@podverse/helpers';

import { requestWithMobileAuthRefresh } from '../../auth';
import { useAuth } from '../../auth/AuthProvider';
import { Button } from '../../components/primitives/Button';
import { Card } from '../../components/primitives/Card';
import { ListRow } from '../../components/primitives/ListRow';
import { MobileScreenContainer } from '../../components/screen/MobileScreenContainer';
import { autoDownloadRepository } from '../../data/repositories/autoDownloadRepository';
import { syncAutoDownloadRegistrationNow } from '../../downloads/autoDownloadRegistrationSync';
import { useChannelNotifications } from '../../hooks/useChannelNotifications';
import { resolveSupportedLocale } from '../../i18n/locale';
import { NOTIFICATION_TYPE_ROWS } from '../../lib/notifications/notificationTypeRows';
import { handleRateLimitMessage } from '../../lib/rateLimit/handleRateLimitMessage';
import { useMembershipGate } from '../../membership/MembershipGateProvider';
import { useAccessTier } from '../../membership/useAccessTier';
import type { ChannelBrowseStackParamList } from '../../navigation';
import { readAutoDownloadCellularDefaultEnabled } from '../../prefs/downloadPrefs';
import { useTheme } from '../../theme/useTheme';

type PodcastSettingsScreenProps = NativeStackScreenProps<
  ChannelBrowseStackParamList,
  'PodcastSettings'
>;

/**
 * Everything about a podcast that is a setting rather than an action.
 *
 * Reached from the podcast header's gear, which only appears to a signed-in subscriber — but the
 * screen still assumes nothing about who arrives. A lapsed member sees the same controls a current
 * one does and meets the gate on write, because hiding the screen would leave them unable to see
 * what they had configured.
 *
 * Unsubscribing is deliberately absent: it stays on the podcast itself, where a user who wants out
 * is already looking, and it is the one channel action no tier or membership state may block.
 */
export function PodcastSettingsScreen({ route }: PodcastSettingsScreenProps) {
  const { podcastId } = route.params;
  const { i18n, t } = useTranslation();
  const { accessToken, clearSession, refreshToken, setTokens, status } = useAuth();
  const { handleGateError, openGate } = useMembershipGate();
  const { evaluateFeature } = useAccessTier();
  const { styles: themeStyles, tokens } = useTheme();
  const [channel, setChannel] = useState<DTOChannel | null>(null);
  const [feedNotice, setFeedNotice] = useState<string | null>(null);
  const [isCheckingFeed, setIsCheckingFeed] = useState<boolean>(false);
  const [autoDownloadEnabled, setAutoDownloadEnabled] = useState(false);
  const [allowCellular, setAllowCellular] = useState(false);
  const [autoDownloadSaving, setAutoDownloadSaving] = useState(false);

  const locale = resolveSupportedLocale(i18n.language);
  const isSignedIn = status === 'authenticated';

  const notifications = useChannelNotifications({
    channelId: channel?.id ?? null,
    channelIdText: podcastId,
  });

  const authContext = useMemo(
    () => ({ accessToken, clearSession, refreshToken, setTokens }),
    [accessToken, clearSession, refreshToken, setTokens]
  );

  useEffect(() => {
    let isMounted = true;

    void (async () => {
      try {
        const response = await requestWithMobileAuthRefresh(authContext, async (api) =>
          api.reqChannelGetByIdOrIdText(podcastId)
        );
        if (isMounted) {
          setChannel(response);
        }
      } catch {
        // The notification switches read from the account, so they still work without the channel.
        // The feed section reports its own absence rather than the screen failing whole.
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [authContext, podcastId]);

  useEffect(() => {
    let isMounted = true;
    void (async () => {
      const row = await autoDownloadRepository.getByChannelIdText(podcastId);
      const cellularDefault = await readAutoDownloadCellularDefaultEnabled();
      if (!isMounted) {
        return;
      }
      setAutoDownloadEnabled(row?.enabled ?? false);
      setAllowCellular(row?.allowCellular ?? cellularDefault);
    })();
    return () => {
      isMounted = false;
    };
  }, [podcastId]);

  const feed = channel?.feed ?? null;

  const feedStatusLines = useMemo(() => {
    const feedLog = feed?.feed_log;
    if (feedLog === undefined) {
      return [];
    }
    return buildFeedParseStatusLines(
      {
        lastFinishedParseTime: feedLog.last_finished_parse_time,
        lastFailedParseTime: feedLog.last_failed_parse_time,
      },
      (iso) => formatDateTimeAbbrev(iso, locale),
      {
        lastFailedParse: (date) => t('settings.feed.last_failed_parse', { date }),
        lastParsed: (date) => t('settings.feed.last_parsed', { date }),
        neverFullyParsed: t('settings.feed.never_fully_parsed'),
      }
    ).lines;
  }, [feed?.feed_log, locale, t]);

  const handleCheckFeedForUpdates = useCallback(async () => {
    if (isCheckingFeed) {
      return;
    }

    if (!isSignedIn) {
      openGate('needs_account');
      return;
    }

    if (feed === null) {
      setFeedNotice(t('errors.generic'));
      return;
    }

    setIsCheckingFeed(true);
    setFeedNotice(null);
    try {
      await requestWithMobileAuthRefresh(authContext, async (api) =>
        api.reqMQRSSRefreshOnDemand({
          podcast_index_id: feed.podcast_index_id,
          url: feed.url,
        })
      );
      setFeedNotice(t('settings.feed.check_feed_added_to_queue'));
    } catch (error) {
      if (handleGateError(error)) {
        return;
      }
      const rateLimitMessage = handleRateLimitMessage(error, t);
      setFeedNotice(rateLimitMessage ?? t('errors.generic'));
    } finally {
      setIsCheckingFeed(false);
    }
  }, [authContext, feed, handleGateError, isCheckingFeed, isSignedIn, openGate, t]);

  const requireAutoDownloadAccess = useCallback((): boolean => {
    const access = evaluateFeature('auto_download');
    if (!access.allowed) {
      openGate(access.reason);
      return false;
    }
    return true;
  }, [evaluateFeature, openGate]);

  const handleAutoDownloadToggle = useCallback(
    async (next: boolean) => {
      if (autoDownloadSaving) {
        return;
      }
      if (!requireAutoDownloadAccess()) {
        return;
      }
      setAutoDownloadSaving(true);
      try {
        const cellularDefault = await readAutoDownloadCellularDefaultEnabled();
        await autoDownloadRepository.upsertChannel({
          allowCellular: next ? allowCellular || cellularDefault : allowCellular,
          channelIdText: podcastId,
          enabled: next,
          source: 'directory',
        });
        setAutoDownloadEnabled(next);
        if (next && !allowCellular) {
          setAllowCellular(cellularDefault);
        }
        void syncAutoDownloadRegistrationNow();
      } finally {
        setAutoDownloadSaving(false);
      }
    },
    [allowCellular, autoDownloadSaving, podcastId, requireAutoDownloadAccess]
  );

  const handleCellularToggle = useCallback(
    async (next: boolean) => {
      if (autoDownloadSaving) {
        return;
      }
      if (!requireAutoDownloadAccess()) {
        return;
      }
      setAutoDownloadSaving(true);
      try {
        await autoDownloadRepository.upsertChannel({
          allowCellular: next,
          channelIdText: podcastId,
          enabled: autoDownloadEnabled,
          source: 'directory',
        });
        setAllowCellular(next);
      } finally {
        setAutoDownloadSaving(false);
      }
    },
    [autoDownloadEnabled, autoDownloadSaving, podcastId, requireAutoDownloadAccess]
  );

  const styles = useMemo(
    () =>
      StyleSheet.create({
        cardSpacing: {
          marginBottom: tokens.spacing.xl,
        },
        notice: {
          color: themeStyles.textSecondary.color,
          fontSize: 13,
          marginTop: tokens.spacing.sm,
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
      }),
    [themeStyles, tokens]
  );

  return (
    <MobileScreenContainer testID="podcast-settings-screen">
      <Card padded={false} style={styles.cardSpacing} testID="podcast-settings-feed-card">
        <View style={styles.sectionInner}>
          <Text style={styles.sectionHeading}>{t('info.rss_feed')}</Text>
          {feedStatusLines.map((line) => (
            <Text key={line} style={styles.sectionDescription}>
              {line}
            </Text>
          ))}
          <View style={styles.sectionStack}>
            <Button
              label={t('settings.feed.check_feed_for_updates')}
              loading={isCheckingFeed}
              onPress={() => {
                void handleCheckFeedForUpdates();
              }}
              testID="podcast-settings-check-feed"
              variant="secondary"
            />
          </View>
          {feedNotice !== null ? (
            <Text style={styles.notice} testID="podcast-settings-feed-notice">
              {feedNotice}
            </Text>
          ) : null}
        </View>
      </Card>

      <Card padded={false} style={styles.cardSpacing} testID="podcast-settings-notifications-card">
        <View style={styles.sectionInner}>
          <Text style={styles.sectionHeading}>{t('settings.notifications.notifications')}</Text>
          <ListRow
            testID="podcast-settings-notifications-row"
            title={t('features.notifications.enable_notifications_for_this_podcast')}
            trailing={
              <Switch
                accessibilityLabel={t(
                  'features.notifications.enable_notifications_for_this_podcast'
                )}
                accessibilityRole="switch"
                accessibilityState={{ checked: notifications.isEnabled }}
                disabled={notifications.isSaving}
                onValueChange={(nextValue) => {
                  void notifications.setEnabled(nextValue);
                }}
                testID="podcast-settings-notifications-toggle"
                value={notifications.isEnabled}
              />
            }
          />
          {notifications.isEnabled ? (
            <View style={styles.sectionStack} testID="podcast-settings-notification-types">
              <Text style={styles.sectionHeading}>
                {t('settings.notifications.type_defaults_section')}
              </Text>
              {NOTIFICATION_TYPE_ROWS.map((row) => (
                <ListRow
                  key={row.type}
                  testID={`podcast-settings-notification-type-${row.type}`}
                  title={t(row.labelKey)}
                  trailing={
                    <Switch
                      accessibilityLabel={t(row.labelKey)}
                      disabled={notifications.isSaving}
                      onValueChange={(nextValue) => {
                        void notifications.setTypeEnabled(row.type, nextValue);
                      }}
                      value={notifications.isTypeEnabled(row.type)}
                    />
                  }
                />
              ))}
            </View>
          ) : null}
          {notifications.errorKey !== null ? (
            <Text style={styles.notice} testID="podcast-settings-notifications-error">
              {t(notifications.errorKey)}
            </Text>
          ) : null}
        </View>
      </Card>

      <Card padded={false} testID="podcast-settings-auto-download-card">
        <View style={styles.sectionInner}>
          <ListRow
            testID="podcast-settings-auto-download"
            title={t('features.download.auto_download')}
            trailing={
              <Switch
                accessibilityLabel={t('features.download.auto_download')}
                accessibilityRole="switch"
                accessibilityState={{ checked: autoDownloadEnabled, busy: autoDownloadSaving }}
                disabled={autoDownloadSaving}
                onValueChange={(nextValue) => {
                  void handleAutoDownloadToggle(nextValue);
                }}
                testID="podcast-settings-auto-download-toggle"
                value={autoDownloadEnabled}
              />
            }
          />
          <Text style={styles.sectionDescription}>{t('features.download.auto_download_help')}</Text>
          {autoDownloadEnabled ? (
            <View style={styles.sectionStack}>
              <ListRow
                testID="podcast-settings-auto-download-cellular"
                title={t('features.download.auto_download_cellular')}
                trailing={
                  <Switch
                    accessibilityLabel={t('features.download.auto_download_cellular')}
                    accessibilityRole="switch"
                    accessibilityState={{ checked: allowCellular, busy: autoDownloadSaving }}
                    disabled={autoDownloadSaving}
                    onValueChange={(nextValue) => {
                      void handleCellularToggle(nextValue);
                    }}
                    testID="podcast-settings-auto-download-cellular-toggle"
                    value={allowCellular}
                  />
                }
              />
              <Text style={styles.sectionDescription}>
                {t('features.download.auto_download_cellular_help')}
              </Text>
            </View>
          ) : null}
        </View>
      </Card>
    </MobileScreenContainer>
  );
}
