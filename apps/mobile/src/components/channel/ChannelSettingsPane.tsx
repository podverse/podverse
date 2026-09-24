import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';

import type { DTOChannel } from '@podverse/helpers';
import { buildFeedParseStatusLines, formatDateTimeAbbrev } from '@podverse/helpers';

import { requestWithMobileAuthRefresh } from '../../auth';
import { useAuth } from '../../auth/AuthProvider';
import type { ChannelNotificationsState } from '../../hooks/useChannelNotifications';
import { resolveSupportedLocale } from '../../i18n/locale';
import { NOTIFICATION_TYPE_ROWS } from '../../lib/notifications/notificationTypeRows';
import { handleRateLimitMessage } from '../../lib/rateLimit/handleRateLimitMessage';
import { useMembershipGate } from '../../membership/MembershipGateProvider';
import { screenBodyInsets } from '../../theme/screenLayout';
import { typography } from '../../theme/typography';
import type { ThemedStylesTheme } from '../../theme/useThemedStyles';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { ConfirmDialog } from '../feedback/ConfirmDialog';
import {
  SettingsDependentGroup,
  SettingsGroup,
  SettingsRowDescription,
  SettingsSwitchRow,
} from '../form';
import { Button } from '../primitives/Button';

export type ChannelSettingsPaneProps = {
  channel: DTOChannel | null;
  notifications: ChannelNotificationsState;
  /**
   * Prefix for testIDs (`podcast-detail`, `album-detail`, `artist-detail`) so each screen keeps
   * its own Maestro locators.
   */
  testIDPrefix: string;
};

const createStyles = ({ styles: themeStyles, tokens }: ThemedStylesTheme) =>
  StyleSheet.create({
    feedInner: {
      gap: tokens.spacing.md,
      padding: tokens.spacing.lg,
    },
    feedNotice: {
      ...typography.caption,
      color: themeStyles.textSecondary.color,
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      ...screenBodyInsets(tokens.spacing),
      paddingBottom: tokens.spacing.xl,
    },
  });

/**
 * Grouped channel settings for podcast, album, and artist detail. Section titles sit above each
 * card; rows share one inset. Auto-download explains itself on tap until the feature exists.
 */
export function ChannelSettingsPane({
  channel,
  notifications,
  testIDPrefix,
}: ChannelSettingsPaneProps) {
  const { i18n, t } = useTranslation();
  const { accessToken, clearSession, refreshToken, setTokens, status } = useAuth();
  const { handleGateError, openGate } = useMembershipGate();
  const styles = useThemedStyles(createStyles);
  const [feedNotice, setFeedNotice] = useState<string | null>(null);
  const [isCheckingFeed, setIsCheckingFeed] = useState(false);
  const [autoDownloadNoticeVisible, setAutoDownloadNoticeVisible] = useState(false);

  const locale = resolveSupportedLocale(i18n.language);
  const isSignedIn = status === 'authenticated';
  const feed = channel?.feed ?? null;

  const authContext = useMemo(
    () => ({ accessToken, clearSession, refreshToken, setTokens }),
    [accessToken, clearSession, refreshToken, setTokens]
  );

  const feedStatusLines = useMemo(() => {
    const feedLog = feed?.feed_log;
    if (feedLog === undefined) {
      return [];
    }
    return buildFeedParseStatusLines(
      {
        lastFailedParseTime: feedLog.last_failed_parse_time,
        lastFinishedParseTime: feedLog.last_finished_parse_time,
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

  const showFeed = feed !== null;

  return (
    <>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        style={styles.scroll}
        testID={`${testIDPrefix}-settings`}
      >
        {showFeed ? (
          <SettingsGroup
            testID={`${testIDPrefix}-settings-feed-card`}
            title={t('info.rss_feed')}
          >
            <View style={styles.feedInner}>
              {feedStatusLines.map((line) => (
                <SettingsRowDescription key={line}>{line}</SettingsRowDescription>
              ))}
              <Button
                label={t('settings.feed.check_feed_for_updates')}
                loading={isCheckingFeed}
                onPress={() => {
                  void handleCheckFeedForUpdates();
                }}
                testID={`${testIDPrefix}-settings-check-feed`}
                variant="secondary"
              />
              {feedNotice !== null ? (
                <SettingsRowDescription testID={`${testIDPrefix}-settings-feed-notice`}>
                  {feedNotice}
                </SettingsRowDescription>
              ) : null}
            </View>
          </SettingsGroup>
        ) : null}

        <SettingsGroup
          spaced={showFeed}
          testID={`${testIDPrefix}-settings-notifications-card`}
          title={t('settings.notifications.notifications')}
        >
          <SettingsDependentGroup
            parent={
              <SettingsSwitchRow
                accessibilityLabel={t('settings.notifications.allow')}
                disabled={notifications.isSaving}
                onValueChange={(nextValue) => {
                  void notifications.setEnabled(nextValue);
                }}
                testID={`${testIDPrefix}-settings-notifications`}
                title={t('settings.notifications.allow')}
                value={notifications.isEnabled}
              />
            }
            parentLabel={t('settings.notifications.allow')}
            testID={`${testIDPrefix}-settings-notification-types`}
          >
            {notifications.isEnabled
              ? NOTIFICATION_TYPE_ROWS.map((row) => (
                  <SettingsSwitchRow
                    key={row.type}
                    accessibilityLabel={t(row.labelKey)}
                    disabled={notifications.isSaving}
                    onValueChange={(nextValue) => {
                      void notifications.setTypeEnabled(row.type, nextValue);
                    }}
                    testID={`${testIDPrefix}-settings-notification-type-${row.type}`}
                    title={t(row.labelKey)}
                    value={notifications.isTypeEnabled(row.type)}
                  />
                ))
              : null}
          </SettingsDependentGroup>
          {notifications.errorKey !== null ? (
            <View style={styles.feedInner}>
              <SettingsRowDescription testID={`${testIDPrefix}-settings-notifications-error`}>
                {t(notifications.errorKey)}
              </SettingsRowDescription>
            </View>
          ) : null}
        </SettingsGroup>

        <SettingsGroup
          spaced
          testID={`${testIDPrefix}-settings-auto-download-card`}
          title={t('nav.tab.downloads')}
        >
          <SettingsSwitchRow
            accessibilityLabel={t('features.download.auto_download')}
            onPress={() => {
              setAutoDownloadNoticeVisible(true);
            }}
            testID={`${testIDPrefix}-settings-auto-download`}
            title={t('features.download.auto_download')}
          />
        </SettingsGroup>
      </ScrollView>

      <ConfirmDialog
        body={t('misc.not_available_yet')}
        cancelLabel={t('misc.close')}
        cancelTestID={`${testIDPrefix}-settings-auto-download-close`}
        onCancel={() => {
          setAutoDownloadNoticeVisible(false);
        }}
        testID={`${testIDPrefix}-settings-auto-download-unavailable`}
        title={t('features.download.auto_download')}
        visible={autoDownloadNoticeVisible}
      />
    </>
  );
}
