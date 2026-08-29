import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AccessibilityInfo,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { matchesTitleFilter } from '@podverse/helpers';

import { useAuth } from '../../auth/AuthProvider';
import { ListEmpty } from '../../components/state/ListEmpty';
import { ListError } from '../../components/state/ListError';
import { ListLoading } from '../../components/state/ListLoading';
import { SubscriptionFilterControl } from '../../components/subscriptions/SubscriptionFilterControl';
import { channelSeenRepository } from '../../data/repositories';
import { homeFeedRefresh } from '../../lib/home/homeFeedRefresh';
import type { HomeStackParamList, MobileTabParamList } from '../../navigation';
import { HOME_STACK_ROUTES, LIBRARY_STACK_ROUTES, SEARCH_STACK_ROUTES } from '../../navigation';
import { E2ePlayVideoButton } from '../../playback/E2ePlayVideoButton';
import type { HomeSortOption, HomeViewMode } from '../../prefs/homeListPrefs';
import {
  DEFAULT_HOME_SORT,
  DEFAULT_HOME_VIEW_MODE,
  isHomeSortableMediaType,
  isHomeSubscriptionFilterMediaType,
  isHomeViewModeMediaType,
  readHomeListPrefs,
  subscribeHomeListPrefs,
  writeHomeSubscriptionFilter,
  writeHomeViewMode,
} from '../../prefs/homeListPrefs';
import {
  DEFAULT_HOME_MEDIA_TYPE,
  type HomeMediaType,
  readPreferredMediaType,
  writePreferredMediaType,
} from '../../prefs/preferredMediaType';
import {
  DEFAULT_SUBSCRIPTION_FILTER,
  type SubscriptionListFilter,
} from '../../prefs/subscriptionFilter';
import { useSync } from '../../sync';
import { resolveGridColumns } from '../../theme/resolveColumns';
import { useResponsive } from '../../theme/useResponsive';
import { useTheme } from '../../theme/useTheme';
import type { AddToPlaylistTarget } from '../library/useAddToPlaylist';
import { useAddToPlaylist } from '../library/useAddToPlaylist';
import { fetchHomeFeedRows, type HomeFeedRowData } from './homeFeedData';
import { HomeFeedGridCell } from './HomeFeedGridCell';
import { HomeFeedRow } from './HomeFeedRow';
import { readHomeFilterTerm, writeHomeFilterTerm } from './homeFilterSession';
import { HomeOverflowMenu } from './HomeOverflowMenu';
import { HomeSortRow } from './HomeSortRow';
import { MediaTypeSelector } from './MediaTypeSelector';
import { useHomeRowPlayback } from './useHomeRowPlayback';

/**
 * The remembered choices, tagged with the list they were read for.
 *
 * Tagged because each media type keeps its own, and a switch between them leaves the previous
 * type's choices in state for a moment. Reading the feed with those would order the new list by an
 * opinion the user expressed about a different one.
 */
type HomeListPrefsState = {
  filter: SubscriptionListFilter;
  mediaType: HomeMediaType;
  sort: HomeSortOption;
  viewMode: HomeViewMode;
};

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
  const { requestSync, state: syncState } = useSync();
  const { columns: rowColumns, width } = useResponsive();
  const { styles: themeStyles, tokens } = useTheme();
  const [selectedMediaType, setSelectedMediaType] =
    useState<HomeMediaType>(DEFAULT_HOME_MEDIA_TYPE);
  const [isMediaTypeHydrated, setIsMediaTypeHydrated] = useState<boolean>(false);
  const [listPrefs, setListPrefs] = useState<HomeListPrefsState | null>(null);
  const [feedRows, setFeedRows] = useState<HomeFeedRowData[]>([]);
  const [filterTerm, setFilterTerm] = useState<string>(readHomeFilterTerm);
  const [isFeedLoading, setIsFeedLoading] = useState<boolean>(true);
  const [isFeedRefreshing, setIsFeedRefreshing] = useState<boolean>(false);
  const [feedErrorKey, setFeedErrorKey] = useState<string | null>(null);
  const { playbackNoticeKey, runPlayAction, runQueueAction } = useHomeRowPlayback();
  const { addToPlaylistSheet, requestAddToPlaylist } = useAddToPlaylist();

  // The All / Add-by-RSS chip scopes the subscribed Podcasts view in every auth state, because
  // subscriptions are device-local and a signed-out user has both kinds to scope between.
  const showSubscriptionFilter = isHomeSubscriptionFilterMediaType(selectedMediaType);
  const showSortRow = isHomeSortableMediaType(selectedMediaType);

  // Both menu entries are about the subscribed channel list — how to draw it, and catching up on
  // it. On the other media types the menu would open onto nothing that applies.
  const showOverflowMenu = isHomeViewModeMediaType(selectedMediaType);

  // Null until the choices for the list actually on screen have been read. The feed waits on it, so
  // the list arrives in the remembered order rather than appearing in the default one and
  // rearranging itself a moment later.
  const activePrefs =
    listPrefs !== null && listPrefs.mediaType === selectedMediaType ? listPrefs : null;

  // Only episodes/tracks (item) and clips (clip) are playlist resources; null means the row gets no
  // add-to-playlist action.
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
      const storedMediaType = await readPreferredMediaType();
      if (!isMounted) {
        return;
      }

      if (storedMediaType !== null) {
        setSelectedMediaType(storedMediaType);
      }
      // Which list is showing settles first, so the choices are only ever read for that list and
      // the feed is never loaded for one the user is about to leave.
      setIsMediaTypeHydrated(true);
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  // Owns the choices for whichever list is showing, including changes made on the filter/sort
  // screen: that screen writes the preference and this reads it back, so neither has to hand the
  // other a value and the two cannot disagree about what is selected.
  useEffect(() => {
    if (!isMediaTypeHydrated) {
      return;
    }

    let isMounted = true;

    const readPrefs = async () => {
      const stored = await readHomeListPrefs(selectedMediaType);
      if (isMounted) {
        setListPrefs({ ...stored, mediaType: selectedMediaType });
      }
    };

    void readPrefs();
    const unsubscribe = subscribeHomeListPrefs(selectedMediaType, () => {
      void readPrefs();
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [isMediaTypeHydrated, selectedMediaType]);

  const handleMediaTypeChange = useCallback((mediaType: HomeMediaType) => {
    setSelectedMediaType(mediaType);
    void writePreferredMediaType(mediaType);
  }, []);

  const handleSubscriptionFilterChange = useCallback((filter: SubscriptionListFilter) => {
    // Applied here as well as written, so the chip responds to the tap rather than to the storage
    // round trip. The write is still what everything else reads.
    setListPrefs((current) => (current === null ? current : { ...current, filter }));
    void writeHomeSubscriptionFilter(filter);
  }, []);

  const handleSortPress = useCallback(() => {
    navigation.navigate(HOME_STACK_ROUTES.HomeFilterSort, { mediaType: selectedMediaType });
  }, [navigation, selectedMediaType]);

  const handleViewModeChange = useCallback(
    (viewMode: HomeViewMode) => {
      // Applied here as well as written, so the list redraws on the tap rather than after the
      // storage round trip. The write is still what a relaunch reads.
      setListPrefs((current) => (current === null ? current : { ...current, viewMode }));
      void writeHomeViewMode(selectedMediaType, viewMode);
    },
    [selectedMediaType]
  );

  const handleFilterTermChange = useCallback((term: string) => {
    setFilterTerm(term);
    writeHomeFilterTerm(term);
  }, []);

  const handleSearchPress = useCallback(() => {
    // Through the tab navigator rather than resetting a stack, so Home keeps its own history. The
    // user pressed this because they have nothing subscribed, so Search opens at its root with an
    // empty, focused field rather than whatever they last looked at there.
    navigation.getParent<BottomTabNavigationProp<MobileTabParamList>>()?.navigate('Search', {
      params: { autoFocus: true },
      screen: SEARCH_STACK_ROUTES.SearchRoot,
    });
  }, [navigation]);

  const loadFeed = useCallback(
    async (source: 'initial' | 'refresh' | 'retry' | 'synced') => {
      if (activePrefs === null) {
        return;
      }

      if (source === 'refresh') {
        if (isFeedRefreshing) {
          return;
        }
        setIsFeedRefreshing(true);
        // The gesture reloads this screen and also asks the queue to reconcile everything else.
        // The spinner answers "is this list current"; the sync bar answers "what is the app doing".
        requestSync('pull-to-refresh');
      } else if (source === 'synced') {
        // Re-read after the queue settled. No spinner and no new sync request: the sync bar already
        // said what was happening, and asking again from here would loop.
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
          { sort: activePrefs.sort, subscriptionFilter: activePrefs.filter }
        );
        setFeedRows(rows);
      } catch {
        // A re-read the user did not ask for keeps quiet: the rows already on screen are still
        // worth reading, and an error over the top of them would say nothing useful.
        if (source === 'synced') {
          return;
        }
        if (source === 'initial' || source === 'retry') {
          setFeedRows([]);
        }
        setFeedErrorKey('errors.generic');
      } finally {
        if (source === 'refresh') {
          setIsFeedRefreshing(false);
        } else if (source !== 'synced') {
          setIsFeedLoading(false);
        }
      }
    },
    [
      accessToken,
      activePrefs,
      clearSession,
      isFeedRefreshing,
      refreshToken,
      requestSync,
      selectedMediaType,
      setTokens,
      status,
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

  // Reconciliation lands in local storage, which this list has already read, so re-read once the
  // queue settles. Without it, episodes synced in the background would not appear until the user
  // left the screen and came back.
  const previousSyncStatusRef = useRef(syncState.status);
  useEffect(() => {
    const previousStatus = previousSyncStatusRef.current;
    previousSyncStatusRef.current = syncState.status;

    if (previousStatus === 'running' && syncState.status === 'idle') {
      void loadFeed('synced');
    }
  }, [loadFeed, syncState.status]);

  // Local, and free: the rows already carry their own badge, so whether the action would do
  // anything is answered from what is on screen rather than by asking storage again.
  const canMarkAllSeen = useMemo(() => {
    return feedRows.some((row) => (row.metadata?.unseenBadge ?? null) !== null);
  }, [feedRows]);

  /**
   * Catch up on every subscription at once.
   *
   * Written straight to the device, the same way opening a channel is, so the badges clear whatever
   * the network is doing and the action works with no account at all. The next reconciliation
   * carries the timestamps to the server, and because seen state only moves forward a failed one
   * costs nothing.
   *
   * Announced because the whole effect is badges disappearing, which a screen reader user would
   * otherwise have no way to notice.
   */
  const handleMarkAllSeen = useCallback(() => {
    void (async () => {
      await channelSeenRepository.markAllSeen();
      await loadFeed('synced');
      AccessibilityInfo.announceForAccessibility(t('subscriptions.mark_all_seen_done'));
    })();
  }, [loadFeed, t]);

  const handleRowPress = useCallback(
    (row: HomeFeedRowData) => {
      if (selectedMediaType === 'podcasts') {
        // Add-by-RSS feeds have no directory channel id; route to My Library > Add by RSS root
        // where the feed can be played/managed. Directory follows open the standard Podcast detail.
        if (row.source === 'addByRss') {
          navigation
            .getParent<BottomTabNavigationProp<MobileTabParamList>>()
            ?.navigate('My Library', { screen: LIBRARY_STACK_ROUTES.AddByRssRoot });
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

  // Runs against the rows already on screen, so it narrows whichever media type is showing and
  // needs no connection — the Podcasts and Episodes lists it matters most for are read from the
  // device to begin with.
  const visibleRows = useMemo(() => {
    return feedRows.filter((row) => matchesTitleFilter(row.title, filterTerm));
  }, [feedRows, filterTerm]);

  const resultSummary = `${t('misc.items')}: ${visibleRows.length}`;

  // A filter that silently reorders the screen tells a screen reader user nothing. Announcing the
  // same line the summary shows means both audiences learn the same thing at the same moment.
  //
  // The first settled count is recorded without speaking, so arriving on Home does not talk over
  // the screen title; every change after that is the user's own doing and worth reporting.
  const announcedCountRef = useRef<number | null>(null);
  useEffect(() => {
    if (isFeedLoading || feedErrorKey !== null) {
      return;
    }

    const previousCount = announcedCountRef.current;
    announcedCountRef.current = visibleRows.length;
    if (previousCount === null || previousCount === visibleRows.length) {
      return;
    }

    AccessibilityInfo.announceForAccessibility(resultSummary);
  }, [feedErrorKey, isFeedLoading, resultSummary, visibleRows.length]);

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
          flex: 1,
          fontSize: 20,
          fontWeight: '700',
        },
        feedTitleRow: {
          alignItems: 'center',
          flexDirection: 'row',
          gap: tokens.spacing.md,
        },
        filterClear: {
          borderColor: themeStyles.border.borderColor,
          borderRadius: tokens.radii.round,
          borderWidth: 1,
          paddingHorizontal: tokens.spacing.md,
          paddingVertical: tokens.spacing.sm,
        },
        filterClearLabel: {
          color: themeStyles.textPrimary.color,
          fontSize: 13,
          fontWeight: '600',
        },
        filterInput: {
          backgroundColor: tokens.background.secondary,
          borderColor: themeStyles.border.borderColor,
          borderRadius: tokens.radii.md,
          borderWidth: 1,
          color: themeStyles.textPrimary.color,
          flex: 1,
          fontSize: 16,
          paddingHorizontal: tokens.spacing.md,
          paddingVertical: tokens.spacing.sm,
        },
        filterRow: {
          alignItems: 'center',
          flexDirection: 'row',
          gap: tokens.spacing.sm,
          marginBottom: tokens.spacing.md,
          marginTop: tokens.spacing.sm,
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

  // A tile is a square of artwork, a row is artwork plus a title, a metadata line, and buttons, so
  // the two fit a screen at completely different densities and are counted separately.
  const isGridView = showOverflowMenu && activePrefs?.viewMode === 'grid';
  const columns = isGridView ? resolveGridColumns(width) : rowColumns;

  // Two empty lists, two different problems. Nothing subscribed is answered by Search; nothing
  // matching is answered by editing the term, and offering Search there would send the user away
  // from the subscriptions they already have.
  const showNoSubscriptions = showFeedRows && feedRows.length === 0;
  const showNoFilterMatches = showFeedRows && feedRows.length > 0 && visibleRows.length === 0;

  const listHeader = (
    <>
      <Text style={styles.heading}>{t('nav.tab.home')}</Text>
      <E2ePlayVideoButton />
      <View style={styles.feedCard}>
        <View style={styles.feedTitleRow}>
          <Text style={styles.feedTitle}>
            {t(MEDIA_TYPE_TITLE_KEYS[selectedMediaType] ?? MEDIA_TYPE_TITLE_KEYS.podcasts)}
          </Text>
          {showOverflowMenu ? (
            <HomeOverflowMenu
              canMarkAllSeen={canMarkAllSeen}
              onMarkAllSeen={handleMarkAllSeen}
              onViewModeChange={handleViewModeChange}
              viewMode={activePrefs?.viewMode ?? DEFAULT_HOME_VIEW_MODE}
            />
          ) : null}
        </View>
        {showSubscriptionFilter ? (
          <SubscriptionFilterControl
            onChange={handleSubscriptionFilterChange}
            selectedFilter={activePrefs?.filter ?? DEFAULT_SUBSCRIPTION_FILTER}
            testID="home-subscription-filter"
          />
        ) : null}
        {showSortRow ? (
          <HomeSortRow onPress={handleSortPress} sort={activePrefs?.sort ?? DEFAULT_HOME_SORT} />
        ) : null}
        <View style={styles.filterRow}>
          <TextInput
            accessibilityLabel={t('subscriptions.filter.placeholder')}
            autoCapitalize="none"
            autoCorrect={false}
            onChangeText={handleFilterTermChange}
            placeholder={t('subscriptions.filter.placeholder')}
            placeholderTextColor={themeStyles.textSecondary.color}
            style={styles.filterInput}
            testID="home-filter-input"
            value={filterTerm}
          />
          {filterTerm.length > 0 ? (
            <Pressable
              accessibilityLabel={t('subscriptions.filter.clear')}
              accessibilityRole="button"
              onPress={() => {
                handleFilterTermChange('');
              }}
              style={styles.filterClear}
              testID="home-filter-clear"
            >
              <Text style={styles.filterClearLabel}>{t('subscriptions.filter.clear')}</Text>
            </Pressable>
          ) : null}
        </View>
        <Text style={styles.feedSummary}>{resultSummary}</Text>
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
        {showNoSubscriptions ? (
          <ListEmpty
            actionLabelKey="features.search.search"
            actionTestID="home-list-empty-search"
            messageKey="subscriptions.empty_message"
            onAction={handleSearchPress}
            testID="home-list-empty"
          />
        ) : null}
        {showNoFilterMatches ? (
          <ListEmpty
            messageKey="subscriptions.no_filter_matches"
            testID="home-list-no-filter-matches"
          />
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
      {/* Intentional: keep header controls/summary inside the card via ListHeaderComponent while rows */}
      {/* render as FlatList items so tablet grid columns can virtualize with numColumns. */}
      <FlatList
        ListFooterComponent={listFooter}
        ListHeaderComponent={listHeader}
        columnWrapperStyle={columns > 1 ? styles.columnWrapper : undefined}
        contentContainerStyle={styles.content}
        data={showFeedRows ? visibleRows : []}
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
            {isGridView ? (
              <HomeFeedGridCell onPress={handleRowPress} row={row} />
            ) : (
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
            )}
          </View>
        )}
        testID="home-feed-list"
      />
      {addToPlaylistSheet}
    </View>
  );
}
