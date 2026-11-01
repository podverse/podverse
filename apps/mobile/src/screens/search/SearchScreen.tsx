import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TextInputInstance } from 'react-native';
import { AccessibilityInfo, StyleSheet, Text, View } from 'react-native';

import type { QueryParamsPodcastIndexSearchMedium, SearchPodcastsFeed } from '@podverse/helpers';
import { toNonEmptyTrimmedString } from '@podverse/helpers/guards';

import { requestWithMobileAuthRefresh } from '../../auth';
import { useAuth } from '../../auth/AuthProvider';
import { OptionChipGroup } from '../../components/form/OptionChipGroup';
import { SearchField } from '../../components/form/SearchField';
import { FillList } from '../../components/primitives';
import { ListEmpty } from '../../components/state/ListEmpty';
import { ListError } from '../../components/state/ListError';
import { LoadingSection } from '../../components/state/LoadingSection';
import { subscriptionsRepository } from '../../data/repositories';
import { OFFLINE_UNAVAILABLE_MESSAGE_KEY } from '../../lib/offlineModeViews';
import type { SearchStackParamList } from '../../navigation';
import { openParsedSearchChannel, SEARCH_STACK_ROUTES } from '../../navigation';
import { useTabLayout } from '../../navigation/TabLayoutProvider';
import { useOfflineMode } from '../../prefs/offlineMode';
import { readSearchListMedium, writeSearchListMedium } from '../../prefs/searchListPrefs';
import { listChipRowBottomGap, screenBodyInsets } from '../../theme/screenLayout';
import { useTheme } from '../../theme/useTheme';
import type { HomeFeedRowData } from '../home/homeFeedData';
import { HomeFeedRow } from '../home/HomeFeedRow';
import {
  clearSearchSession,
  readSearchSession,
  searchFetchKey,
  writeSearchSession,
} from './searchSession';

type SearchScreenProps = NativeStackScreenProps<
  SearchStackParamList,
  typeof SEARCH_STACK_ROUTES.SearchRoot
>;

const SEARCH_DEBOUNCE_MS = 450;

const searchResultKeyExtractor = (feed: SearchPodcastsFeed): string => String(feed.id);

const feedToRow = (feed: SearchPodcastsFeed): HomeFeedRowData => ({
  id: String(feed.id),
  imageUrl: toNonEmptyTrimmedString(feed.image) ?? toNonEmptyTrimmedString(feed.artwork),
  subtitle: toNonEmptyTrimmedString(feed.author),
  title: feed.title,
  updatedAt: feed.newestItemPubdate > 0 ? feed.newestItemPubdate : null,
});

const noopPlayPress = (_row: HomeFeedRowData): void => undefined;

type SearchResultRowProps = {
  feed: SearchPodcastsFeed;
  onPress: (feed: SearchPodcastsFeed) => void;
  testID: string;
};

function SearchResultRow({ feed, onPress, testID }: SearchResultRowProps) {
  const row = useMemo(() => feedToRow(feed), [feed]);
  const handlePress = useCallback(() => {
    onPress(feed);
  }, [feed, onPress]);

  // Channel-level search results: tap opens the feed. No More menu and no queue actions.
  return (
    <HomeFeedRow
      mediaType="podcasts"
      onPlayPress={noopPlayPress}
      onPress={handlePress}
      row={row}
      testID={testID}
    />
  );
}

/**
 * Discovery, matching web `/search`: a filled field, All / Music chips, then an unboxed list of
 * Podcast Index feeds in the order that API returns them.
 */
export function SearchScreen({ navigation, route }: SearchScreenProps) {
  const { t } = useTranslation();
  const { accessToken, clearSession, refreshToken, setTokens } = useAuth();
  const { visibleTabIds } = useTabLayout();
  const { enabled: offlineModeEnabled } = useOfflineMode();
  const { styles: themeStyles, tokens } = useTheme();
  const restoredSessionRef = useRef(readSearchSession());
  const restoredSession = restoredSessionRef.current;
  const skipFetchKeyRef = useRef<string | null>(
    restoredSession !== null && restoredSession.query.length > 0
      ? searchFetchKey(restoredSession.medium, restoredSession.query)
      : null
  );
  const [query, setQuery] = useState<string>(restoredSession?.query ?? '');
  const [debouncedQuery, setDebouncedQuery] = useState<string>(restoredSession?.query ?? '');
  const [medium, setMedium] = useState<QueryParamsPodcastIndexSearchMedium>(
    restoredSession?.medium ?? 'all'
  );
  const [isMediumReady, setIsMediumReady] = useState<boolean>(restoredSession !== null);
  const [feeds, setFeeds] = useState<SearchPodcastsFeed[]>(restoredSession?.feeds ?? []);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [resolvingFeedId, setResolvingFeedId] = useState<string | null>(null);
  const inputRef = useRef<TextInputInstance | null>(null);
  const searchRequestIdRef = useRef(0);

  const wantsAutoFocus = route.params?.autoFocus === true;
  const requestedMedium = route.params?.medium;

  useEffect(() => {
    if (restoredSessionRef.current !== null) {
      return;
    }

    let isMounted = true;
    void (async () => {
      const stored = await readSearchListMedium();
      if (!isMounted) {
        return;
      }

      setMedium(stored);
      setIsMediumReady(true);
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  // The Home search control and the Home empty-state button send the listener here to type.
  // With nothing saved, the field starts empty and focused. An optional medium selects All / Music
  // first. Both params are consumed on focus. A saved query and its rows stay on screen.
  useFocusEffect(
    useCallback(() => {
      if (requestedMedium === 'all' || requestedMedium === 'music') {
        setMedium(requestedMedium);
        void writeSearchListMedium(requestedMedium);
        navigation.setParams({ medium: undefined });
      }

      if (!wantsAutoFocus) {
        return;
      }

      navigation.setParams({ autoFocus: undefined });
      if (readSearchSession() !== null) {
        return;
      }
      setQuery('');
      setDebouncedQuery('');
      inputRef.current?.focus();
    }, [navigation, requestedMedium, wantsAutoFocus])
  );

  const debouncedQueryRef = useRef(debouncedQuery);
  debouncedQueryRef.current = debouncedQuery;

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const nextQuery = query.trim();
      if (nextQuery === debouncedQueryRef.current) {
        return;
      }
      setDebouncedQuery(nextQuery);
      // Loading in the same turn as the query that triggers the fetch, so the next paint cannot
      // show the previous empty result under the new term.
      if (nextQuery.length > 0) {
        setIsLoading(true);
      }
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [query]);

  useEffect(() => {
    if (!isMediumReady || offlineModeEnabled) {
      return;
    }

    if (debouncedQuery.length === 0) {
      searchRequestIdRef.current += 1;
      setFeeds([]);
      setErrorKey(null);
      setIsLoading(false);
      clearSearchSession();
      return;
    }

    const fetchKey = searchFetchKey(medium, debouncedQuery);
    if (skipFetchKeyRef.current === fetchKey) {
      skipFetchKeyRef.current = null;
      return;
    }

    const requestId = searchRequestIdRef.current + 1;
    searchRequestIdRef.current = requestId;
    // Set loading in this commit so a medium or query change cannot paint the previous empty
    // result as "no results" for the new selection.
    setIsLoading(true);
    setErrorKey(null);
    let isMounted = true;
    void (async () => {
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
              medium,
              q: debouncedQuery,
            })
        );

        if (!isMounted || requestId !== searchRequestIdRef.current) {
          return;
        }

        setFeeds(response.feeds);
        writeSearchSession({
          feeds: response.feeds,
          medium,
          query: debouncedQuery,
        });
      } catch {
        if (!isMounted || requestId !== searchRequestIdRef.current) {
          return;
        }

        setErrorKey('errors.generic');
        setFeeds([]);
      } finally {
        if (isMounted && requestId === searchRequestIdRef.current) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [
    accessToken,
    clearSession,
    debouncedQuery,
    isMediumReady,
    medium,
    offlineModeEnabled,
    refreshToken,
    setTokens,
  ]);

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

  const styles = useMemo(() => {
    const bodyInsets = screenBodyInsets(tokens.spacing);

    return StyleSheet.create({
      container: {
        backgroundColor: themeStyles.screen.backgroundColor,
        flex: 1,
      },
      headerSection: {
        ...bodyInsets,
        gap: tokens.spacing.base,
        paddingBottom: listChipRowBottomGap(tokens.spacing),
      },
      notice: {
        color: themeStyles.textSecondary.color,
        fontSize: 13,
        paddingHorizontal: tokens.spacing.md,
        paddingVertical: tokens.spacing.sm,
      },
      resultsContent: {
        flexGrow: 1,
        paddingHorizontal: bodyInsets.paddingHorizontal,
      },
      resultsList: {
        flex: 1,
      },
    });
  }, [themeStyles, tokens]);

  const showResultRows = !isLoading && errorKey === null && feeds.length > 0;

  const handleMediumChange = useCallback(
    (next: QueryParamsPodcastIndexSearchMedium) => {
      setMedium(next);
      if (debouncedQuery.length > 0) {
        setIsLoading(true);
      }
      void writeSearchListMedium(next);
    },
    [debouncedQuery.length]
  );

  const handleSubmitSearch = useCallback(() => {
    setDebouncedQuery(query.trim());
  }, [query]);

  const handleFeedPress = useCallback(
    async (feed: SearchPodcastsFeed) => {
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

        // Endpoint returns null when the channel is not parsed-ready. Open the add page on this
        // stack so the listener can add it. A parsed channel leaves Search for Home or Browse.
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

        if (!navigation.isFocused()) {
          return;
        }

        const isSubscribed = await subscriptionsRepository.isSubscribed(channel.id_text);
        if (!navigation.isFocused()) {
          return;
        }

        openParsedSearchChannel(navigation, {
          idText: channel.id_text,
          imageUrl:
            toNonEmptyTrimmedString(feed.image) ?? toNonEmptyTrimmedString(feed.artwork) ?? null,
          isSubscribed,
          mediumId: channel.medium_id,
          title: toNonEmptyTrimmedString(channel.title) ?? feed.title,
          visibleTabIds,
        });
      } catch {
        setErrorKey('errors.generic');
      } finally {
        setResolvingFeedId(null);
      }
    },
    [accessToken, clearSession, navigation, refreshToken, resolvingFeedId, setTokens, visibleTabIds]
  );

  const handleResultPress = useCallback(
    (feed: SearchPodcastsFeed) => {
      void handleFeedPress(feed);
    },
    [handleFeedPress]
  );

  const handleRetrySearch = useCallback(() => {
    setDebouncedQuery(query.trim());
  }, [query]);

  const listEmpty = useMemo(() => {
    if (isLoading) {
      return <LoadingSection testID="search-loading" />;
    }
    if (errorKey !== null) {
      return <ListError messageKey={errorKey} onRetry={handleRetrySearch} testID="search-error" />;
    }
    if (debouncedQuery.length === 0) {
      return null;
    }
    return <ListEmpty messageKey="features.search.no_results" testID="search-empty-results" />;
  }, [debouncedQuery.length, errorKey, handleRetrySearch, isLoading]);

  const listFooter = useMemo(
    () =>
      resolvingFeedId !== null ? <Text style={styles.notice}>{t('misc.loading')}</Text> : null,
    [resolvingFeedId, styles.notice, t]
  );

  const mediumOptions = useMemo(
    () =>
      [
        { label: t('filters.type.all'), testID: 'search-medium-all', value: 'all' },
        { label: t('media.music.music'), testID: 'search-medium-music', value: 'music' },
      ] as const,
    [t]
  );

  const renderItem = useCallback(
    ({ index, item: feed }: { index: number; item: SearchPodcastsFeed }) => (
      <SearchResultRow
        feed={feed}
        onPress={handleResultPress}
        testID={`search-result-row-${index}`}
      />
    ),
    [handleResultPress]
  );

  if (offlineModeEnabled) {
    return (
      <View style={styles.container} testID="search-screen">
        <ListEmpty
          messageKey={OFFLINE_UNAVAILABLE_MESSAGE_KEY}
          testID="search-offline-unavailable"
        />
      </View>
    );
  }

  return (
    <View style={styles.container} testID="search-screen">
      <View style={styles.headerSection}>
        <SearchField
          accessibilityLabel={t('features.search.search_by_title')}
          inputRef={inputRef}
          onChangeText={setQuery}
          onSubmit={handleSubmitSearch}
          placeholder={t('features.search.search_by_title')}
          testID="search-input"
          value={query}
        />
        <OptionChipGroup
          onChange={handleMediumChange}
          options={mediumOptions}
          testID="search-medium-chips"
          value={medium}
        />
      </View>
      <FillList
        ListEmptyComponent={listEmpty}
        ListFooterComponent={listFooter}
        contentContainerStyle={styles.resultsContent}
        data={showResultRows ? feeds : []}
        keyboardShouldPersistTaps="handled"
        keyExtractor={searchResultKeyExtractor}
        renderItem={renderItem}
        style={styles.resultsList}
        testID="search-results"
      />
    </View>
  );
}
