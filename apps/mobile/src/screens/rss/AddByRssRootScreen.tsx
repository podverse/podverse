import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { TextField } from '../../components/form';
import { ListEmpty } from '../../components/state/ListEmpty';
import { ListError } from '../../components/state/ListError';
import { ListLoading } from '../../components/state/ListLoading';
import { addByRssRepository } from '../../data/repositories';
import { useAddByRssAddFlow } from '../../hooks/useAddByRssAddFlow';
import { useAddByRssFeeds } from '../../hooks/useAddByRssFeeds';
import { OFFLINE_UNAVAILABLE_MESSAGE_KEY } from '../../lib/offlineModeViews';
import type { LibraryStackParamList } from '../../navigation';
import type { MobileAddByRSSFeedRecord } from '../../prefs/addByRSSFeeds';
import { useOfflineMode } from '../../prefs/offlineMode';
import { screenBodyInsets } from '../../theme/screenLayout';
import { useTheme } from '../../theme/useTheme';

type AddByRssRootScreenProps = NativeStackScreenProps<LibraryStackParamList, 'AddByRssRoot'>;

export function AddByRssRootScreen(_props: AddByRssRootScreenProps) {
  const { t } = useTranslation();
  const { styles: themeStyles, tokens } = useTheme();
  const { enabled: offlineModeEnabled } = useOfflineMode();
  const [inputValue, setInputValue] = useState<string>('');
  const [noticeKey, setNoticeKey] = useState<string | null>(null);
  const [parsedFeedUrls, setParsedFeedUrls] = useState<ReadonlySet<string>>(new Set());
  const { errorKey, feeds, isLoading, reloadFeeds, removeFeed } = useAddByRssFeeds({
    onNotice: setNoticeKey,
  });
  const { addErrorKey, addFeed, isAdding } = useAddByRssAddFlow({
    inputValue,
    onAfterAdd: reloadFeeds,
    onNotice: setNoticeKey,
    setInputValue,
  });

  const styles = useMemo(
    () =>
      StyleSheet.create({
        addButton: {
          alignItems: 'center',
          backgroundColor: tokens.button.primaryBg,
          borderRadius: tokens.radii.round,
          marginTop: tokens.spacing.sm,
          paddingHorizontal: tokens.spacing.md,
          paddingVertical: tokens.spacing.sm,
        },
        addButtonDisabled: {
          opacity: 0.6,
        },
        addButtonLabel: {
          color: tokens.button.primaryColor,
          fontSize: 14,
          fontWeight: '600',
        },
        card: {
          backgroundColor: tokens.background.secondary,
          borderColor: themeStyles.border.borderColor,
          borderRadius: tokens.radii.md,
          borderWidth: 1,
          marginBottom: tokens.spacing.md,
          padding: tokens.spacing.lg,
        },
        content: {
          ...screenBodyInsets(tokens.spacing),
          flexGrow: 1,
          paddingBottom: tokens.spacing['2xl'],
        },
        feedButton: {
          borderColor: themeStyles.border.borderColor,
          borderRadius: tokens.radii.round,
          borderWidth: 1,
          marginTop: tokens.spacing.sm,
          paddingHorizontal: tokens.spacing.sm,
          paddingVertical: tokens.spacing.xs,
          alignSelf: 'flex-start',
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
          marginBottom: tokens.spacing.sm,
          padding: tokens.spacing.md,
        },
        feedStatus: {
          color: themeStyles.textSecondary.color,
          fontSize: 13,
          marginTop: tokens.spacing.xs,
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
        heading: {
          color: themeStyles.textPrimary.color,
          fontSize: 28,
          fontWeight: '700',
          marginBottom: tokens.spacing.lg,
        },
        notice: {
          color: themeStyles.textSecondary.color,
          fontSize: 13,
          marginTop: tokens.spacing.sm,
        },
        screen: {
          backgroundColor: themeStyles.screen.backgroundColor,
          flex: 1,
        },
        sectionTitle: {
          color: themeStyles.textPrimary.color,
          fontSize: 16,
          fontWeight: '600',
          marginBottom: tokens.spacing.sm,
        },
      }),
    [themeStyles, tokens]
  );

  const refreshParsedFeedUrls = useCallback(async () => {
    const urls = await addByRssRepository.listParsedFeedUrls();
    setParsedFeedUrls(new Set(urls));
  }, []);

  useEffect(() => {
    void refreshParsedFeedUrls();
  }, [feeds, refreshParsedFeedUrls]);

  const handleReload = useCallback(() => {
    void (async () => {
      await reloadFeeds();
      await refreshParsedFeedUrls();
    })();
  }, [refreshParsedFeedUrls, reloadFeeds]);

  const listHeader = (
    <View>
      <Text style={styles.heading}>{t('features.add_by_rss.label')}</Text>
      {offlineModeEnabled ? (
        <View style={styles.card} testID="rss-add-offline-unavailable">
          <ListEmpty
            messageKey={OFFLINE_UNAVAILABLE_MESSAGE_KEY}
            testID="rss-add-offline-unavailable-message"
          />
        </View>
      ) : (
        <View style={styles.card}>
          <TextField
            accessibilityLabel={t('features.add_by_rss.feed_url')}
            autoCapitalize="none"
            autoCorrect={false}
            eyebrow={t('features.add_by_rss.feed_url')}
            keyboardType="url"
            onChangeText={setInputValue}
            placeholder={t('features.add_by_rss.feed_url')}
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
      )}
      <Text style={styles.sectionTitle}>{t('nav.menu.view_rss_feeds')}</Text>
      {isLoading ? <ListLoading testID="rss-feeds-loading" /> : null}
      {errorKey !== null ? (
        <ListError messageKey={errorKey} onRetry={handleReload} testID="rss-feeds-error" />
      ) : null}
      {noticeKey !== null ? <Text style={styles.notice}>{t(noticeKey)}</Text> : null}
    </View>
  );

  const renderFeed = useCallback(
    ({ item: feed, index }: { item: MobileAddByRSSFeedRecord; index: number }) => {
      const isParsed = parsedFeedUrls.has(feed.feedUrl);
      const statusKey = isParsed
        ? 'features.add_by_rss.status_parsed'
        : 'features.add_by_rss.status_processing';

      return (
        <View
          style={styles.feedRow}
          testID={index === 0 ? 'rss-feed-row-first' : `rss-feed-row-${feed.idText}`}
        >
          <Text style={styles.feedTitle}>{feed.title ?? feed.feedUrl}</Text>
          <Text style={styles.feedSubtitle}>{feed.feedUrl}</Text>
          <Text
            style={styles.feedStatus}
            testID={index === 0 ? 'rss-feed-status-first' : `rss-feed-status-${feed.idText}`}
          >
            {t(statusKey)}
          </Text>
          <Pressable
            onPress={() => {
              void removeFeed(feed.feedUrl);
            }}
            style={styles.feedButton}
            testID={index === 0 ? 'rss-feed-remove-first' : `rss-feed-remove-${feed.idText}`}
          >
            <Text style={styles.feedButtonLabel}>{t('features.unsubscribe')}</Text>
          </Pressable>
        </View>
      );
    },
    [parsedFeedUrls, removeFeed, styles, t]
  );

  return (
    <View style={styles.screen} testID="rss-root-screen">
      <FlatList
        ListEmptyComponent={
          !isLoading && errorKey === null ? (
            <ListEmpty messageKey="features.add_by_rss.no_feeds_podcast" testID="rss-feeds-empty" />
          ) : null
        }
        ListHeaderComponent={listHeader}
        contentContainerStyle={styles.content}
        data={isLoading || errorKey !== null ? [] : feeds}
        keyExtractor={(feed) => feed.idText}
        keyboardShouldPersistTaps="handled"
        renderItem={renderFeed}
      />
    </View>
  );
}
