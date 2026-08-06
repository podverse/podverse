import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '../../auth/AuthProvider';
import { ListEmpty } from '../../components/state/ListEmpty';
import { ListError } from '../../components/state/ListError';
import { ListLoading } from '../../components/state/ListLoading';
import { SubscriptionFilterControl } from '../../components/subscriptions/SubscriptionFilterControl';
import { homeFeedRefresh } from '../../lib/home/homeFeedRefresh';
import type { HomeStackParamList, MobileTabParamList } from '../../navigation';
import { HOME_STACK_ROUTES } from '../../navigation';
import { E2ePlayVideoButton } from '../../playback/E2ePlayVideoButton';
import {
  DEFAULT_HOME_MEDIA_TYPE,
  type HomeMediaType,
  readPreferredMediaType,
  writePreferredMediaType,
} from '../../prefs/preferredMediaType';
import {
  DEFAULT_SUBSCRIPTION_FILTER,
  readHomeSubscriptionFilter,
  type SubscriptionListFilter,
  writeHomeSubscriptionFilter,
} from '../../prefs/subscriptionFilter';
import { useResponsive } from '../../theme/useResponsive';
import { useTheme } from '../../theme/useTheme';
import type { AddToPlaylistTarget } from '../library/useAddToPlaylist';
import { useAddToPlaylist } from '../library/useAddToPlaylist';
import { fetchHomeFeedRows, type HomeFeedRowData } from './homeFeedData';
import { HomeFeedRow } from './HomeFeedRow';
import { MediaTypeSelector } from './MediaTypeSelector';
import { useHomeRowPlayback } from './useHomeRowPlayback';

const MEDIA_TYPE_TITLE_KEYS: Record<HomeMediaType, string> = {
  albums: 'media.music.albums',
  artists: 'media.music.artists',
  clips: 'features.clip.clips',
  episodes: 'media.podcast.episodes',
  podcasts: 'media.podcast.podcasts',
  tracks: 'media.music.tracks',
};

export function HomeScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
  const { accessToken, clearSession, refreshToken, setTokens, status } = useAuth();
  const { columns } = useResponsive();
  const { styles: themeStyles, tokens } = useTheme();
  const [selectedMediaType, setSelectedMediaType] =
    useState<HomeMediaType>(DEFAULT_HOME_MEDIA_TYPE);
  const [subscriptionFilter, setSubscriptionFilter] = useState<SubscriptionListFilter>(
    DEFAULT_SUBSCRIPTION_FILTER
  );
  const [feedRows, setFeedRows] = useState<HomeFeedRowData[]>([]);
  const [isFeedLoading, setIsFeedLoading] = useState<boolean>(true);
  const [isFeedRefreshing, setIsFeedRefreshing] = useState<boolean>(false);
  const [feedErrorKey, setFeedErrorKey] = useState<string | null>(null);
  const { playbackNoticeKey, runPlayAction, runQueueAction } = useHomeRowPlayback();
  const { addToPlaylistSheet, requestAddToPlaylist } = useAddToPlaylist();

  // The All / Add-by-RSS filter only applies to the authenticated Podcasts subscribed view.
  const isSubscribedPodcastsView = selectedMediaType === 'podcasts' && status === 'authenticated';

  // Only episodes/tracks (item) and clips (clip) can be appended to a playlist today; other media
  // types are not playlist resources (9d.4). null means the row gets no add-to-playlist action.
  const addToPlaylistKind = useMemo<AddToPlaylistTarget['kind'] | null>(() => {
    if (selectedMediaType === 'clips') {
      return 'clip';
    }
    if (selectedMediaType === 'episodes' || selectedMediaType === 'tracks') {
      return 'item';
    }
    return null;
  }, [selectedMediaType]);

  useEffect(() => {
    let isMounted = true;

    void (async () => {
      const [storedMediaType, storedFilter] = await Promise.all([
        readPreferredMediaType(),
        readHomeSubscriptionFilter(),
      ]);
      if (!isMounted) {
        return;
      }

      if (storedMediaType !== null) {
        setSelectedMediaType(storedMediaType);
      }
      if (storedFilter !== null) {
        setSubscriptionFilter(storedFilter);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleMediaTypeChange = useCallback((mediaType: HomeMediaType) => {
    setSelectedMediaType(mediaType);
    void writePreferredMediaType(mediaType);
  }, []);

  const handleSubscriptionFilterChange = useCallback((filter: SubscriptionListFilter) => {
    setSubscriptionFilter(filter);
    void writeHomeSubscriptionFilter(filter);
  }, []);

  const loadFeed = useCallback(
    async (source: 'initial' | 'refresh' | 'retry') => {
      if (source === 'refresh') {
        if (isFeedRefreshing) {
          return;
        }
        setIsFeedRefreshing(true);
      } else {
        setIsFeedLoading(true);
      }

      setFeedErrorKey(null);
      try {
        const rows = await fetchHomeFeedRows(
          selectedMediaType,
          {
            accessToken,
            clearSession,
            refreshToken,
            setTokens,
            status,
          },
          { subscriptionFilter }
        );
        setFeedRows(rows);
      } catch {
        if (source === 'initial' || source === 'retry') {
          setFeedRows([]);
        }
        setFeedErrorKey('errors.generic');
      } finally {
        if (source === 'refresh') {
          setIsFeedRefreshing(false);
        } else {
          setIsFeedLoading(false);
        }
      }
    },
    [
      accessToken,
      clearSession,
      isFeedRefreshing,
      refreshToken,
      selectedMediaType,
      setTokens,
      status,
      subscriptionFilter,
    ]
  );

  useEffect(() => {
    void loadFeed('initial');
  }, [loadFeed]);

  useEffect(() => {
    return homeFeedRefresh.subscribe(() => {
      void loadFeed('refresh');
    });
  }, [loadFeed]);

  const handleRowPress = useCallback(
    (row: HomeFeedRowData) => {
      if (selectedMediaType === 'podcasts') {
        // Add-by-RSS feeds have no directory channel id; route to the RSS tab (its initial
        // AddByRssRoot screen) where the feed can be played/managed. Directory follows open
        // the standard Podcast detail.
        if (row.source === 'addByRss') {
          navigation.getParent<BottomTabNavigationProp<MobileTabParamList>>()?.navigate('RSS');
          return;
        }
        navigation.navigate(HOME_STACK_ROUTES.PodcastDetail, {
          podcastId: row.id,
        });
        return;
      }

      if (selectedMediaType === 'episodes') {
        navigation.navigate(HOME_STACK_ROUTES.EpisodeDetail, {
          episodeId: row.id,
        });
        return;
      }

      if (selectedMediaType === 'clips') {
        navigation.navigate(HOME_STACK_ROUTES.ClipDetail, {
          clipId: row.id,
        });
        return;
      }

      if (selectedMediaType === 'artists') {
        navigation.navigate(HOME_STACK_ROUTES.ArtistDetail, {
          artistId: row.id,
        });
        return;
      }

      if (selectedMediaType === 'albums') {
        navigation.navigate(HOME_STACK_ROUTES.AlbumDetail, {
          albumId: row.id,
        });
        return;
      }

      navigation.navigate(HOME_STACK_ROUTES.TrackDetail, {
        trackId: row.id,
      });
    },
    [navigation, selectedMediaType]
  );

  const styles = useMemo(
    () =>
      StyleSheet.create({
        columnCell: {
          flex: 1,
        },
        columnWrapper: {
          gap: tokens.spacing.md,
        },
        container: {
          backgroundColor: themeStyles.screen.backgroundColor,
          flex: 1,
        },
        content: {
          padding: tokens.spacing.lg,
        },
        feedCard: {
          backgroundColor: tokens.background.secondary,
          borderColor: themeStyles.border.borderColor,
          borderRadius: tokens.radii.md,
          borderWidth: 1,
          marginTop: tokens.spacing.lg,
          padding: tokens.spacing.lg,
        },
        feedNotice: {
          color: themeStyles.textSecondary.color,
          fontSize: 13,
          marginTop: tokens.spacing.sm,
        },
        feedSummary: {
          color: themeStyles.textSecondary.color,
          fontSize: 13,
          marginBottom: tokens.spacing.md,
        },
        feedTitle: {
          color: themeStyles.textPrimary.color,
          fontSize: 20,
          fontWeight: '700',
        },
        heading: {
          color: themeStyles.textPrimary.color,
          fontSize: 28,
          fontWeight: '700',
          marginBottom: tokens.spacing.md,
        },
      }),
    [themeStyles, tokens]
  );

  const showFeedRows = !isFeedLoading && feedErrorKey === null;

  const listHeader = (
    <>
      <Text style={styles.heading}>{t('nav.tab.home')}</Text>
      <E2ePlayVideoButton />
      <View style={styles.feedCard}>
        <Text style={styles.feedTitle}>
          {t(MEDIA_TYPE_TITLE_KEYS[selectedMediaType] ?? MEDIA_TYPE_TITLE_KEYS.podcasts)}
        </Text>
        {isSubscribedPodcastsView ? (
          <SubscriptionFilterControl
            onChange={handleSubscriptionFilterChange}
            selectedFilter={subscriptionFilter}
            testID="home-subscription-filter"
          />
        ) : null}
        <Text style={styles.feedSummary}>
          {t('misc.items')}: {feedRows.length}
        </Text>
        {isFeedLoading ? <ListLoading testID="home-list-loading" /> : null}
        {!isFeedLoading && feedErrorKey !== null ? (
          <ListError
            messageKey={feedErrorKey}
            onRetry={() => {
              void loadFeed('retry');
            }}
            testID="home-list-error"
          />
        ) : null}
        {!isFeedLoading && feedErrorKey === null && feedRows.length === 0 ? (
          <ListEmpty messageKey="misc.info" testID="home-list-empty" />
        ) : null}
      </View>
    </>
  );

  const listFooter =
    playbackNoticeKey !== null ? (
      <Text style={styles.feedNotice}>{t(playbackNoticeKey)}</Text>
    ) : null;

  return (
    <View style={styles.container} testID="home-screen">
      <MediaTypeSelector onChange={handleMediaTypeChange} selectedMediaType={selectedMediaType} />
      <FlatList
        ListFooterComponent={listFooter}
        ListHeaderComponent={listHeader}
        columnWrapperStyle={columns > 1 ? styles.columnWrapper : undefined}
        contentContainerStyle={styles.content}
        data={showFeedRows ? feedRows : []}
        key={`cols-${columns}`}
        keyExtractor={(row) => row.id}
        numColumns={columns}
        refreshControl={
          <RefreshControl
            onRefresh={() => {
              void loadFeed('refresh');
            }}
            refreshing={isFeedRefreshing}
            tintColor={themeStyles.buttonPrimary.backgroundColor}
          />
        }
        renderItem={({ item: row }) => (
          <View style={columns > 1 ? styles.columnCell : undefined}>
            <HomeFeedRow
              mediaType={selectedMediaType}
              onAddToPlaylistPress={
                status === 'authenticated' && addToPlaylistKind !== null
                  ? (nextRow) => {
                      requestAddToPlaylist({ idText: nextRow.id, kind: addToPlaylistKind });
                    }
                  : undefined
              }
              onPlayPress={(nextRow) => {
                runPlayAction(nextRow, selectedMediaType);
              }}
              onPress={handleRowPress}
              onQueuePress={(nextRow, position) => {
                runQueueAction(nextRow, selectedMediaType, position);
              }}
              row={row}
            />
          </View>
        )}
        testID="home-feed-list"
      />
      {addToPlaylistSheet}
    </View>
  );
}
