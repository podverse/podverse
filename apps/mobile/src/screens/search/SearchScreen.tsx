import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AccessibilityInfo, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import type { SearchPodcastsFeed } from '@podverse/helpers';
import { toNonEmptyTrimmedString } from '@podverse/helpers/guards';

import { requestWithMobileAuthRefresh } from '../../auth';
import { useAuth } from '../../auth/AuthProvider';
import { Card } from '../../components/primitives';
import { ListEmpty } from '../../components/state/ListEmpty';
import { ListError } from '../../components/state/ListError';
import { ListLoading } from '../../components/state/ListLoading';
import type { SearchStackParamList } from '../../navigation';
import { SEARCH_STACK_ROUTES } from '../../navigation';
import { useTheme } from '../../theme/useTheme';
import { HomeFeedRow } from '../home/HomeFeedRow';
import { getChannelDetailRouteKind } from './podcastIndexFeedPreview';

type SearchScreenProps = NativeStackScreenProps<
  SearchStackParamList,
  typeof SEARCH_STACK_ROUTES.SearchRoot
>;

const SEARCH_DEBOUNCE_MS = 450;

const feedToRow = (feed: SearchPodcastsFeed) => ({
  id: String(feed.id),
  imageUrl: toNonEmptyTrimmedString(feed.image) ?? toNonEmptyTrimmedString(feed.artwork),
  subtitle: toNonEmptyTrimmedString(feed.author),
  title: feed.title,
});

/**
 * Discovery, matching web `/search`: one debounced field against Podcast Index, results in the
 * order that API returns them. Filtering or sorting here could only reflect the fields Podcast
 * Index happens to send back, so the screen offers neither.
 */
export function SearchScreen({ navigation, route }: SearchScreenProps) {
  const { t } = useTranslation();
  const { accessToken, clearSession, refreshToken, setTokens } = useAuth();
  const { styles: themeStyles, tokens } = useTheme();
  const [query, setQuery] = useState<string>('');
  const [debouncedQuery, setDebouncedQuery] = useState<string>('');
  const [feeds, setFeeds] = useState<SearchPodcastsFeed[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [resolvingFeedId, setResolvingFeedId] = useState<string | null>(null);
  const inputRef = useRef<TextInput | null>(null);

  const wantsAutoFocus = route.params?.autoFocus === true;

  // Home's "nothing subscribed yet" button sends the user here to type something, so the field
  // starts empty and focused. The request is consumed immediately, otherwise coming back from a
  // result would wipe the query the user just ran.
  useFocusEffect(
    useCallback(() => {
      if (!wantsAutoFocus) {
        return;
      }

      navigation.setParams({ autoFocus: undefined });
      setQuery('');
      setDebouncedQuery('');
      inputRef.current?.focus();
    }, [navigation, wantsAutoFocus])
  );

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [query]);

  useEffect(() => {
    if (debouncedQuery.length === 0) {
      setFeeds([]);
      setErrorKey(null);
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    void (async () => {
      setIsLoading(true);
      setErrorKey(null);
      try {
        const response = await requestWithMobileAuthRefresh(
          {
            accessToken,
            clearSession,
            refreshToken,
            setTokens,
          },
          async (api) =>
            api.reqPodcastIndexSearchPodcasts({
              q: debouncedQuery,
            })
        );

        if (!isMounted) {
          return;
        }

        setFeeds(response.feeds);
      } catch {
        if (!isMounted) {
          return;
        }

        setErrorKey('errors.generic');
        setFeeds([]);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [accessToken, clearSession, debouncedQuery, refreshToken, setTokens]);

  // A list that silently swaps its contents tells a screen reader user nothing. The first settled
  // result set is recorded without speaking, so arriving on Search does not talk over the screen
  // title; every change after that is the user's own typing and worth reporting.
  const resultSummary = `${t('misc.items')}: ${feeds.length}`;
  const announcedCountRef = useRef<number | null>(null);
  useEffect(() => {
    if (isLoading || errorKey !== null) {
      return;
    }

    const previousCount = announcedCountRef.current;
    announcedCountRef.current = feeds.length;
    if (previousCount === null || previousCount === feeds.length) {
      return;
    }

    AccessibilityInfo.announceForAccessibility(resultSummary);
  }, [errorKey, feeds.length, isLoading, resultSummary]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          backgroundColor: themeStyles.screen.backgroundColor,
          flex: 1,
        },
        content: {
          padding: tokens.spacing.lg,
          paddingBottom: tokens.spacing['2xl'],
        },
        heading: {
          color: themeStyles.textPrimary.color,
          fontSize: 28,
          fontWeight: '700',
          marginBottom: tokens.spacing.md,
        },
        input: {
          backgroundColor: tokens.background.secondary,
          borderColor: themeStyles.border.borderColor,
          borderRadius: tokens.radii.md,
          borderWidth: 1,
          color: themeStyles.textPrimary.color,
          fontSize: 16,
          marginBottom: tokens.spacing.md,
          paddingHorizontal: tokens.spacing.md,
          paddingVertical: tokens.spacing.sm,
        },
        inputLabel: {
          color: themeStyles.textSecondary.color,
          fontSize: 13,
          marginBottom: tokens.spacing.xs,
        },
        notice: {
          color: themeStyles.textSecondary.color,
          fontSize: 13,
          marginTop: tokens.spacing.sm,
        },
        resultsSpacing: {
          marginTop: tokens.spacing.md,
        },
      }),
    [themeStyles, tokens]
  );

  const handleFeedPress = async (feed: SearchPodcastsFeed) => {
    const feedId = String(feed.id);
    if (resolvingFeedId !== null) {
      return;
    }

    setResolvingFeedId(feedId);
    setErrorKey(null);
    try {
      const channel = await requestWithMobileAuthRefresh(
        {
          accessToken,
          clearSession,
          refreshToken,
          setTokens,
        },
        async (api) => api.reqChannelGetByPodcastIndexId(feedId)
      );

      // Endpoint returns null when the channel is not parsed-ready. Mirror web: open the
      // Podcast Index preview/add screen instead of a generic "Try again" dead-end.
      if (channel === null || channel.id_text.length === 0 || !channel.medium_id) {
        const imageUrl =
          feed.image.length > 0 ? feed.image : feed.artwork.length > 0 ? feed.artwork : null;
        navigation.navigate(SEARCH_STACK_ROUTES.SearchResultDetail, {
          author: feed.author,
          description: feed.description,
          feedUrl: feed.url,
          imageUrl,
          resultId: feedId,
          title: feed.title,
        });
        return;
      }

      const kind = getChannelDetailRouteKind(channel.medium_id);
      // Stay on the Search stack (tab isolation) — do not jump to Home for detail.
      if (kind === 'artist') {
        navigation.navigate(SEARCH_STACK_ROUTES.ArtistDetail, {
          artistId: channel.id_text,
        });
      } else if (kind === 'album') {
        navigation.navigate(SEARCH_STACK_ROUTES.AlbumDetail, {
          albumId: channel.id_text,
        });
      } else {
        navigation.navigate(SEARCH_STACK_ROUTES.PodcastDetail, {
          podcastId: channel.id_text,
        });
      }
    } catch {
      setErrorKey('errors.generic');
    } finally {
      setResolvingFeedId(null);
    }
  };

  return (
    <View style={styles.container} testID="search-screen">
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        testID="search-results"
      >
        <Text style={styles.heading}>{t('features.search.search')}</Text>
        {/* Visible so the field stays labelled once typing hides the placeholder. Decorative for
            assistive technology, which reads the same name off the field itself. */}
        <Text accessibilityElementsHidden importantForAccessibility="no" style={styles.inputLabel}>
          {t('features.search.search_by_title')}
        </Text>
        <TextInput
          accessibilityLabel={t('features.search.search_by_title')}
          autoCapitalize="none"
          autoCorrect={false}
          onChangeText={setQuery}
          placeholder={t('features.search.search_by_title')}
          placeholderTextColor={themeStyles.textSecondary.color}
          ref={inputRef}
          style={styles.input}
          testID="search-input"
          value={query}
        />

        <View style={styles.resultsSpacing}>
          <Card testID="search-results-card">
            {isLoading ? <ListLoading testID="search-loading" /> : null}
            {!isLoading && errorKey !== null ? (
              <ListError
                messageKey={errorKey}
                onRetry={() => {
                  setDebouncedQuery(query.trim());
                }}
                testID="search-error"
              />
            ) : null}
            {!isLoading && errorKey === null && debouncedQuery.length === 0 ? (
              <ListEmpty messageKey="features.search.search_by_title" testID="search-empty-query" />
            ) : null}
            {!isLoading && errorKey === null && debouncedQuery.length > 0 && feeds.length === 0 ? (
              <ListEmpty messageKey="misc.info" testID="search-empty-results" />
            ) : null}
            {!isLoading && errorKey === null
              ? feeds.map((feed, index) => (
                  <HomeFeedRow
                    key={feed.id}
                    mediaType="podcasts"
                    onPlayPress={(_row) => {}}
                    onPress={() => {
                      void handleFeedPress(feed);
                    }}
                    onQueuePress={(_row) => {}}
                    row={feedToRow(feed)}
                    testID={`search-result-row-${index}`}
                  />
                ))
              : null}
            {resolvingFeedId !== null ? (
              <Text style={styles.notice}>{t('misc.loading')}</Text>
            ) : null}
          </Card>
        </View>
      </ScrollView>
    </View>
  );
}
