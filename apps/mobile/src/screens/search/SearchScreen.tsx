import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import type { SearchPodcastsFeed } from '@podverse/helpers';

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

type SearchFilterMedium = 'all' | 'music';
type SearchSort = 'a_z' | 'recent' | 'relevance';

const SEARCH_DEBOUNCE_MS = 450;

const SEARCH_MEDIUMS: SearchFilterMedium[] = ['all', 'music'];
const SEARCH_SORTS: SearchSort[] = ['relevance', 'recent', 'a_z'];

const SEARCH_MEDIUM_LABEL_KEYS: Record<SearchFilterMedium, string> = {
  all: 'filters.type.all',
  music: 'media.music.music',
};

const SEARCH_SORT_LABEL_KEYS: Record<SearchSort, string> = {
  a_z: 'filters.sort.a_z',
  recent: 'filters.sort.recent',
  relevance: 'features.search.search',
};

const feedToRow = (feed: SearchPodcastsFeed) => ({
  id: String(feed.id),
  imageUrl: feed.image.length > 0 ? feed.image : feed.artwork.length > 0 ? feed.artwork : null,
  subtitle: feed.author.length > 0 ? feed.author : null,
  title: feed.title,
});

const sortFeeds = (feeds: SearchPodcastsFeed[], sort: SearchSort): SearchPodcastsFeed[] => {
  if (sort === 'relevance') {
    return feeds;
  }

  if (sort === 'recent') {
    return [...feeds].sort((a, b) => b.newestItemPubdate - a.newestItemPubdate);
  }

  return [...feeds].sort((a, b) => a.title.localeCompare(b.title));
};

export function SearchScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<SearchStackParamList, 'SearchRoot'>>();
  const { accessToken, clearSession, refreshToken, setTokens } = useAuth();
  const { styles: themeStyles, tokens } = useTheme();
  const [query, setQuery] = useState<string>('');
  const [debouncedQuery, setDebouncedQuery] = useState<string>('');
  const [mediumFilter, setMediumFilter] = useState<SearchFilterMedium>('all');
  const [sort, setSort] = useState<SearchSort>('relevance');
  const [feeds, setFeeds] = useState<SearchPodcastsFeed[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [resolvingFeedId, setResolvingFeedId] = useState<string | null>(null);

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
              medium: mediumFilter,
              q: debouncedQuery,
            })
        );

        if (!isMounted) {
          return;
        }

        setFeeds(sortFeeds(response.feeds, sort));
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
  }, [accessToken, clearSession, debouncedQuery, mediumFilter, refreshToken, setTokens, sort]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        chip: {
          borderColor: themeStyles.border.borderColor,
          borderRadius: tokens.radii.round,
          borderWidth: 1,
          marginRight: tokens.spacing.sm,
          paddingHorizontal: tokens.spacing.md,
          paddingVertical: tokens.spacing.xs,
        },
        chipActive: {
          backgroundColor: themeStyles.buttonPrimary.backgroundColor,
          borderColor: themeStyles.buttonPrimary.backgroundColor,
        },
        chipLabel: {
          color: themeStyles.textPrimary.color,
          fontSize: 12,
          fontWeight: '600',
        },
        chipLabelActive: {
          color: themeStyles.buttonPrimary.color,
        },
        chipsRow: {
          flexDirection: 'row',
          marginBottom: tokens.spacing.sm,
        },
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
        <Text style={styles.inputLabel}>{t('features.search.search_by_title')}</Text>
        <TextInput
          autoCapitalize="none"
          autoCorrect={false}
          onChangeText={setQuery}
          placeholder={t('features.search.search_by_title')}
          placeholderTextColor={themeStyles.textSecondary.color}
          style={styles.input}
          testID="search-input"
          value={query}
        />

        <Text style={styles.inputLabel}>{t('filters.type.all')}</Text>
        <View style={styles.chipsRow}>
          {SEARCH_MEDIUMS.map((nextMedium) => {
            const isActive = nextMedium === mediumFilter;
            return (
              <Pressable
                key={nextMedium}
                onPress={() => {
                  setMediumFilter(nextMedium);
                }}
                style={[styles.chip, isActive ? styles.chipActive : null]}
                testID={`search-medium-${nextMedium}`}
              >
                <Text style={[styles.chipLabel, isActive ? styles.chipLabelActive : null]}>
                  {t(SEARCH_MEDIUM_LABEL_KEYS[nextMedium])}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.inputLabel}>{t('filters.sort.recent')}</Text>
        <View style={styles.chipsRow}>
          {SEARCH_SORTS.map((nextSort) => {
            const isActive = nextSort === sort;
            return (
              <Pressable
                key={nextSort}
                onPress={() => {
                  setSort(nextSort);
                }}
                style={[styles.chip, isActive ? styles.chipActive : null]}
                testID={`search-sort-${nextSort}`}
              >
                <Text style={[styles.chipLabel, isActive ? styles.chipLabelActive : null]}>
                  {t(SEARCH_SORT_LABEL_KEYS[nextSort])}
                </Text>
              </Pressable>
            );
          })}
        </View>

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
