import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { AddByRssNeedsCredentialsSection } from '../../components/content/AddByRssNeedsCredentialsSection';
import { FormActions, TextField } from '../../components/form';
import { LIST_REMOVE_CLIPPED_SUBVIEWS } from '../../components/primitives';
import { ListEmpty } from '../../components/state/ListEmpty';
import { ListError } from '../../components/state/ListError';
import { ListLoading } from '../../components/state/ListLoading';
import { getMobileConfig } from '../../config';
import { addByRssRepository } from '../../data/repositories';
import { useAddByRssAddFlow } from '../../hooks/useAddByRssAddFlow';
import { useAddByRssFeeds } from '../../hooks/useAddByRssFeeds';
import { OFFLINE_UNAVAILABLE_MESSAGE_KEY } from '../../lib/offlineModeViews';
import type { LibraryStackParamList } from '../../navigation';
import { LIBRARY_STACK_ROUTES } from '../../navigation';
import type { MobileAddByRSSFeedRecord } from '../../prefs/addByRSSFeeds';
import { useOfflineMode } from '../../prefs/offlineMode';
import { formActionsTopGap, screenBodyInsets } from '../../theme/screenLayout';
import { useTheme } from '../../theme/useTheme';

type AddByRssRootScreenProps = NativeStackScreenProps<LibraryStackParamList, 'AddByRssRoot'>;

export function AddByRssRootScreen({ navigation }: AddByRssRootScreenProps) {
  const { t } = useTranslation();
  const { isE2e } = getMobileConfig();
  const { styles: themeStyles, tokens } = useTheme();
  const { enabled: offlineModeEnabled } = useOfflineMode();
  const [inputValue, setInputValue] = useState<string>('');
  const [noticeKey, setNoticeKey] = useState<string | null>(null);
  const [parsedFeedUrls, setParsedFeedUrls] = useState<ReadonlySet<string>>(new Set());
  const {
    errorKey,
    feeds,
    isLoading,
    needsCredentials,
    refreshLocal,
    reloadFeeds,
    removeFeed,
    removingFeedUrl,
  } = useAddByRssFeeds({
    onNotice: setNoticeKey,
  });
  const {
    addErrorKey,
    addFeed,
    handleFeedUrlChange,
    isAdding,
    password,
    setPassword,
    setUsername,
    username,
  } = useAddByRssAddFlow({
    inputValue,
    onAfterAdd: reloadFeeds,
    onNotice: setNoticeKey,
    setInputValue,
  });

  const styles = useMemo(
    () =>
      StyleSheet.create({
        addButtonDisabled: {
          opacity: 0.6,
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
        credentialFields: {
          gap: tokens.spacing.md,
          marginTop: tokens.spacing.md,
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
        submit: {
          marginTop: formActionsTopGap(tokens.spacing),
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

  // The credentials screen saves or removes feeds; returning here rereads the device's list. The
  // first focus is skipped because the initial reload is already reading it.
  const hasFocusedRef = useRef(false);
  useEffect(
    () =>
      navigation.addListener('focus', () => {
        if (!hasFocusedRef.current) {
          hasFocusedRef.current = true;
          return;
        }
        void refreshLocal();
      }),
    [navigation, refreshLocal]
  );

  const handleNeedsCredentialsPress = useCallback(
    (feed: MobileAddByRSSFeedRecord) => {
      navigation.navigate(LIBRARY_STACK_ROUTES.AddByRssCredentials, { feedIdText: feed.idText });
    },
    [navigation]
  );

  const handleReload = useCallback(() => {
    void (async () => {
      await reloadFeeds();
      await refreshParsedFeedUrls();
    })();
  }, [refreshParsedFeedUrls, reloadFeeds]);

  const listHeader = (
    <View>
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
            onChangeText={handleFeedUrlChange}
            placeholder={t('features.add_by_rss.feed_url')}
            testID="rss-url-input"
            value={inputValue}
          />
          <View style={styles.credentialFields}>
            <TextField
              accessibilityLabel={t('features.add_by_rss.basic_auth_username')}
              autoCapitalize="none"
              autoCorrect={false}
              eyebrow={t('features.add_by_rss.basic_auth_username')}
              onChangeText={setUsername}
              placeholder={t('misc.optional')}
              testID="rss-username-input"
              value={username}
            />
            <TextField
              accessibilityLabel={t('features.add_by_rss.basic_auth_password')}
              autoCapitalize="none"
              autoCorrect={false}
              eyebrow={t('features.add_by_rss.basic_auth_password')}
              onChangeText={setPassword}
              placeholder={t('misc.optional')}
              // iOS Autofill plus a secure field blocks Maestro inputText. E2E shows the password in plaintext.
              secureTextEntry={!isE2e}
              testID="rss-password-input"
              value={password}
            />
          </View>
          <FormActions
            actions={[
              {
                disabled: isAdding,
                label: t('features.add_by_rss.label'),
                loading: isAdding,
                onPress: () => {
                  void addFeed();
                },
                testID: 'rss-add-submit',
              },
            ]}
            style={styles.submit}
          />
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
      const isRemoving = removingFeedUrl === feed.feedUrl;

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
            accessibilityLabel={t('features.unsubscribe')}
            accessibilityRole="button"
            accessibilityState={{ disabled: isRemoving }}
            disabled={isRemoving}
            onPress={() => {
              void removeFeed(feed.feedUrl);
            }}
            style={[styles.feedButton, isRemoving ? styles.addButtonDisabled : null]}
            testID={index === 0 ? 'rss-feed-remove-first' : `rss-feed-remove-${feed.idText}`}
          >
            <Text style={styles.feedButtonLabel}>{t('features.unsubscribe')}</Text>
          </Pressable>
        </View>
      );
    },
    [parsedFeedUrls, removeFeed, removingFeedUrl, styles, t]
  );

  const showFeeds = !isLoading && errorKey === null;

  return (
    <View style={styles.screen} testID="rss-root-screen">
      <FlatList
        ListEmptyComponent={
          showFeeds && needsCredentials.length === 0 ? (
            <ListEmpty messageKey="features.add_by_rss.no_feeds_podcast" testID="rss-feeds-empty" />
          ) : null
        }
        ListFooterComponent={
          showFeeds ? (
            <AddByRssNeedsCredentialsSection
              items={needsCredentials}
              onPressFeed={handleNeedsCredentialsPress}
              showDivider={feeds.length > 0}
              testIDPrefix="rss"
            />
          ) : null
        }
        ListHeaderComponent={listHeader}
        contentContainerStyle={styles.content}
        data={showFeeds ? feeds : []}
        keyExtractor={(feed) => feed.idText}
        keyboardShouldPersistTaps="handled"
        removeClippedSubviews={LIST_REMOVE_CLIPPED_SUBVIEWS}
        renderItem={renderFeed}
      />
    </View>
  );
}
