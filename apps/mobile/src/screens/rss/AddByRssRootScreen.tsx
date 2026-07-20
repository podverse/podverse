import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { useAuth } from '../../auth/AuthProvider';
import { MobileScreenContainer } from '../../components/screen/MobileScreenContainer';
import { AuthAwareLoadState } from '../../components/state/AuthAwareLoadState';
import { isMobileE2eFromEnv } from '../../config/env';
import { useAddByRssAddFlow } from '../../hooks/useAddByRssAddFlow';
import { useAddByRssFeeds } from '../../hooks/useAddByRssFeeds';
import { useAddByRssPlayback } from '../../hooks/useAddByRssPlayback';
import type { RssStackParamList } from '../../navigation';
import { RSS_STACK_ROUTES } from '../../navigation';
import { useTheme } from '../../theme/useTheme';

type AddByRssRootScreenProps = NativeStackScreenProps<RssStackParamList, 'AddByRssRoot'>;

export function AddByRssRootScreen({ navigation }: AddByRssRootScreenProps) {
  const { t } = useTranslation();
  const { styles: themeStyles, tokens } = useTheme();
  const { status } = useAuth();
  const [inputValue, setInputValue] = useState<string>('');
  const [noticeKey, setNoticeKey] = useState<string | null>(null);
  const { errorKey, feeds, isLoading, reloadFeeds, removeFeed } = useAddByRssFeeds({
    onNotice: setNoticeKey,
  });
  const { addErrorKey, addFeed, isAdding } = useAddByRssAddFlow({
    inputValue,
    onAfterAdd: reloadFeeds,
    onNotice: setNoticeKey,
    setInputValue,
  });
  const { playFeed, isPlaybackActive } = useAddByRssPlayback({
    onNotice: setNoticeKey,
  });

  const styles = useMemo(
    () =>
      StyleSheet.create({
        addButton: {
          alignItems: 'center',
          backgroundColor: tokens.text.action,
          borderRadius: tokens.radii.round,
          marginTop: tokens.spacing.sm,
          paddingHorizontal: tokens.spacing.md,
          paddingVertical: tokens.spacing.sm,
        },
        addButtonDisabled: {
          opacity: 0.6,
        },
        addButtonLabel: {
          color: tokens.text.inverse,
          fontSize: 14,
          fontWeight: '600',
        },
        card: {
          backgroundColor: tokens.background.secondary,
          borderColor: themeStyles.border.borderColor,
          borderRadius: tokens.radii.md,
          borderWidth: 1,
          marginTop: tokens.spacing.md,
          padding: tokens.spacing.lg,
        },
        feedActions: {
          flexDirection: 'row',
          marginTop: tokens.spacing.sm,
        },
        feedButton: {
          borderColor: themeStyles.border.borderColor,
          borderRadius: tokens.radii.round,
          borderWidth: 1,
          marginRight: tokens.spacing.sm,
          paddingHorizontal: tokens.spacing.sm,
          paddingVertical: tokens.spacing.xs,
        },
        feedButtonLabel: {
          color: themeStyles.textPrimary.color,
          fontSize: 12,
          fontWeight: '600',
        },
        feedRow: {
          borderColor: themeStyles.border.borderColor,
          borderRadius: tokens.radii.md,
          borderWidth: 1,
          marginTop: tokens.spacing.sm,
          padding: tokens.spacing.md,
        },
        feedSubtitle: {
          color: themeStyles.textSecondary.color,
          fontSize: 13,
          marginTop: tokens.spacing.xs,
        },
        feedTitle: {
          color: themeStyles.textPrimary.color,
          fontSize: 16,
          fontWeight: '600',
        },
        input: {
          backgroundColor: themeStyles.screen.backgroundColor,
          borderColor: themeStyles.border.borderColor,
          borderRadius: tokens.radii.md,
          borderWidth: 1,
          color: themeStyles.textPrimary.color,
          fontSize: 14,
          paddingHorizontal: tokens.spacing.md,
          paddingVertical: tokens.spacing.sm,
        },
        notice: {
          color: themeStyles.textSecondary.color,
          fontSize: 13,
          marginTop: tokens.spacing.sm,
        },
      }),
    [themeStyles, tokens]
  );

  return (
    <MobileScreenContainer heading={t('features.add_by_rss.label')} testID="rss-root-screen">
      <View style={styles.card}>
        <TextInput
          autoCapitalize="none"
          autoCorrect={false}
          onChangeText={setInputValue}
          placeholder={t('features.add_by_rss.feed_url')}
          style={styles.input}
          testID="rss-url-input"
          value={inputValue}
        />
        <Pressable
          disabled={isAdding}
          onPress={() => {
            void addFeed();
          }}
          style={[styles.addButton, isAdding ? styles.addButtonDisabled : null]}
          testID="rss-add-submit"
        >
          <Text style={styles.addButtonLabel}>{t('features.add_by_rss.label')}</Text>
        </Pressable>
        {addErrorKey !== null ? (
          <Text style={styles.notice} testID="rss-add-error">
            {t(addErrorKey)}
          </Text>
        ) : null}
      </View>

      <View style={styles.card}>
        <Pressable
          onPress={() => {
            navigation.navigate(RSS_STACK_ROUTES.AddByRssFeedList);
          }}
          style={styles.feedButton}
          testID="rss-nav-feed-list"
        >
          <Text style={styles.feedButtonLabel}>{t('nav.menu.view_rss_feeds')}</Text>
        </Pressable>

        <AuthAwareLoadState
          emptyMessageKey={
            status !== 'authenticated'
              ? 'authentication.login_required'
              : 'features.add_by_rss.no_feeds_podcast'
          }
          emptyTestID={status !== 'authenticated' ? 'rss-feeds-auth-required' : 'rss-feeds-empty'}
          errorKey={errorKey}
          errorTestID="rss-feeds-error"
          isLoading={isLoading}
          loadingTestID="rss-feeds-loading"
          onRetry={() => {
            void reloadFeeds();
          }}
          showEmpty={status !== 'authenticated' || feeds.length === 0}
        >
          {feeds.map((feed, index) => (
            <View key={feed.idText} style={styles.feedRow}>
              <Text style={styles.feedTitle}>{feed.title ?? feed.feedUrl}</Text>
              <Text style={styles.feedSubtitle}>{feed.feedUrl}</Text>
              <View style={styles.feedActions}>
                <Pressable
                  onPress={() => {
                    void playFeed(feed);
                  }}
                  style={styles.feedButton}
                  testID={index === 0 ? 'rss-feed-play-first' : `rss-feed-play-${feed.idText}`}
                >
                  <Text style={styles.feedButtonLabel}>{t('media_player.play')}</Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    void removeFeed(feed.feedUrl);
                  }}
                  style={styles.feedButton}
                  testID={index === 0 ? 'rss-feed-remove-first' : `rss-feed-remove-${feed.idText}`}
                >
                  <Text style={styles.feedButtonLabel}>
                    {t('features.queue.remove_from_queue')}
                  </Text>
                </Pressable>
              </View>
            </View>
          ))}
        </AuthAwareLoadState>
        {noticeKey !== null ? <Text style={styles.notice}>{t(noticeKey)}</Text> : null}
        {isMobileE2eFromEnv() && isPlaybackActive ? (
          <Text
            accessibilityLabel="rss-playback-active"
            style={styles.notice}
            testID="rss-playback-active"
          >
            {t('media_player.play')}
          </Text>
        ) : null}
      </View>
    </MobileScreenContainer>
  );
}
