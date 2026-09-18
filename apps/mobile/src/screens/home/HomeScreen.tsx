import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AccessibilityInfo, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { matchesTitleFilter } from '@podverse/helpers';

import { useAuthPrompt } from '../../auth/AuthPromptContext';
import { useAuth } from '../../auth/AuthProvider';
import { ListFilterField, ListFilterHeader } from '../../components/form';
import { FillList, SwipeActionRow } from '../../components/primitives';
import { CallToActionSection } from '../../components/state/CallToActionSection';
import { ListEmpty } from '../../components/state/ListEmpty';
import { ListError } from '../../components/state/ListError';
import { LoadingSection } from '../../components/state/LoadingSection';
import {
  channelSeenRepository,
  downloadsRepository,
  subscriptionsRepository,
} from '../../data/repositories';
import { downloadManager } from '../../downloads/downloadManager';
import { downloadStore } from '../../downloads/downloadStore';
import { homeFeedRefresh } from '../../lib/home/homeFeedRefresh';
import {
  isHomeClipsUnavailableOffline,
  isHomeDownloadedItemsOnly,
  OFFLINE_UNAVAILABLE_MESSAGE_KEY,
} from '../../lib/offlineModeViews';
import type { HomeStackParamList, MobileTabParamList } from '../../navigation';
import {
  BROWSE_STACK_ROUTES,
  buildAlbumDetailParams,
  buildPodcastDetailParams,
  HOME_STACK_ROUTES,
  SEARCH_STACK_ROUTES,
} from '../../navigation';
import type { HomeRangeOption, HomeSortOption, HomeViewMode } from '../../prefs/homeListPrefs';
import {
  DEFAULT_HOME_RANGE,
  DEFAULT_HOME_SORT,
  DEFAULT_HOME_VIEW_MODE,
  isHomeFilterMediaType,
  isHomeSortableMediaType,
  isHomeViewModeMediaType,
  readHomeListPrefs,
  subscribeHomeListPrefs,
  writeHomeRange,
  writeHomeSort,
  writeHomeViewMode,
} from '../../prefs/homeListPrefs';
import { useOfflineMode } from '../../prefs/offlineMode';
import {
  DEFAULT_HOME_MEDIA_TYPE,
  type HomeMediaType,
  readPreferredMediaType,
  writePreferredMediaType,
} from '../../prefs/preferredMediaType';
import { useSync } from '../../sync';
import { resolveGridCellWidth, resolveGridColumns } from '../../theme/resolveColumns';
import { listFilterFieldBottomMargin, screenBodyInsets } from '../../theme/screenLayout';
import { typography } from '../../theme/typography';
import { useResponsive } from '../../theme/useResponsive';
import { useTheme } from '../../theme/useTheme';
import type { BrowseMediaType } from '../browse/browseTypes';
import { HOME_MEDIA_TYPE_ORDER, MEDIA_TYPE_LABEL_KEYS } from '../browse/browseTypes';
import type { AddToPlaylistTarget } from '../library/useAddToPlaylist';
import { useAddToPlaylist } from '../library/useAddToPlaylist';
import {
  fetchDownloadedHomeFeedRows,
  fetchHomeFeedRows,
  fetchUnsubscribedDownloadHomeRows,
  type HomeFeedRowData,
} from './homeFeedData';
import { HomeFeedGridCell } from './HomeFeedGridCell';
import { HomeFeedRow } from './HomeFeedRow';
import { readHomeFilterTerm, writeHomeFilterTerm } from './homeFilterSession';
import { HomeOverflowMenu } from './HomeOverflowMenu';
import { mergeDownloadedCountsIntoHomeRows } from './homeRowMetadata';
import { HomeSortChip } from './HomeSortChip';
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
  mediaType: HomeMediaType;
  range: HomeRangeOption;
  sort: HomeSortOption;
  viewMode: HomeViewMode;
};

export function HomeScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
  const { accessToken, clearSession, refreshToken, setTokens, status } = useAuth();
  const { onRequestLogin } = useAuthPrompt();
  const { enabled: offlineModeEnabled } = useOfflineMode();
  const { requestSync, state: syncState } = useSync();
  const { columns: rowColumns, width } = useResponsive();
  const { styles: themeStyles, tokens } = useTheme();
  const [selectedMediaType, setSelectedMediaType] =
    useState<HomeMediaType>(DEFAULT_HOME_MEDIA_TYPE);
  const [isMediaTypeHydrated, setIsMediaTypeHydrated] = useState<boolean>(false);
  const [listPrefs, setListPrefs] = useState<HomeListPrefsState | null>(null);
  const [feedRows, setFeedRows] = useState<HomeFeedRowData[]>([]);
  const [unsubscribedDownloadRows, setUnsubscribedDownloadRows] = useState<HomeFeedRowData[]>([]);
  const [hasPodcastSubscriptions, setHasPodcastSubscriptions] = useState<boolean>(false);
  const [filterTerm, setFilterTerm] = useState<string>(readHomeFilterTerm);
  const [isFeedLoading, setIsFeedLoading] = useState<boolean>(true);
  const [isFeedRefreshing, setIsFeedRefreshing] = useState<boolean>(false);
  const [feedErrorKey, setFeedErrorKey] = useState<string | null>(null);
  const [actionErrorKey, setActionErrorKey] = useState<string | null>(null);
  const feedRequestIdRef = useRef<number>(0);
  const { playbackNoticeKey, runPlayAction, runQueueAction } = useHomeRowPlayback();
  const { addToPlaylistSheet, requestAddToPlaylist } = useAddToPlaylist();

  // Layout applies only on eligible chips; the overflow trigger always sits in the title bar.
  const viewModeEligible = isHomeViewModeMediaType(selectedMediaType);
  const showMarkAllSeen = selectedMediaType === 'podcasts';

  // Null until the choices for the list actually on screen have been read. The feed waits on it, so
  // the list arrives in the remembered order rather than appearing in the default one and
  // rearranging itself a moment later.
  const activePrefs =
    listPrefs !== null && listPrefs.mediaType === selectedMediaType ? listPrefs : null;

  // Only episodes/tracks (item) and clips (clip) are playlist resources; null means the row gets no
  // add-to-playlist action.
  const addToPlaylistTarget = useMemo<Pick<
    Extract<AddToPlaylistTarget, { kind: 'clip' | 'item' }>,
    'kind' | 'medium'
  > | null>(() => {
    if (selectedMediaType === 'clips') {
      return { kind: 'clip', medium: 'av' };
    }
    if (selectedMediaType === 'episodes' || selectedMediaType === 'tracks') {
      return { kind: 'item', medium: selectedMediaType === 'tracks' ? 'music' : 'av' };
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

  // Owns the choices for whichever list is showing, including changes made on the sort screen:
  // that screen writes the preference and this reads it back, so neither has to hand the other a
  // value and the two cannot disagree about what is selected.
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
    setFeedRows([]);
    setFeedErrorKey(null);
    setIsFeedLoading(true);
    setSelectedMediaType(mediaType);
    void writePreferredMediaType(mediaType);
  }, []);

  const handleSortChange = useCallback(
    (sort: HomeSortOption) => {
      // Applied here as well as written, so the list redraws on the tap rather than after the
      // storage round trip. The write is still what a relaunch reads.
      setListPrefs((current) => (current === null ? current : { ...current, sort }));
      void writeHomeSort(selectedMediaType, sort);
    },
    [selectedMediaType]
  );

  const handleRangeChange = useCallback(
    (range: HomeRangeOption) => {
      setListPrefs((current) =>
        current === null ? current : { ...current, range, sort: 'popularity' }
      );
      void writeHomeRange(selectedMediaType, range);
    },
    [selectedMediaType]
  );

  const handleViewModeChange = useCallback((viewMode: HomeViewMode) => {
    // Applied here as well as written, so the list redraws on the tap rather than after the
    // storage round trip. The write is still what a relaunch reads. One Home-wide choice covers
    // every eligible chip.
    setListPrefs((current) => (current === null ? current : { ...current, viewMode }));
    void writeHomeViewMode(viewMode);
  }, []);

  const handleFilterTermChange = useCallback((term: string) => {
    setFilterTerm(term);
    writeHomeFilterTerm(term);
  }, []);

  const handleSearchPress = useCallback(
    (medium: 'all' | 'music' = 'all') => {
      // Through the tab navigator rather than resetting a stack, so Home keeps its own history. The
      // user pressed this because they have nothing subscribed, so Search opens at its root with an
      // empty, focused field rather than whatever they last looked at there.
      navigation.getParent<BottomTabNavigationProp<MobileTabParamList>>()?.navigate('Search', {
        params: { autoFocus: true, medium },
        screen: SEARCH_STACK_ROUTES.SearchRoot,
      });
    },
    [navigation]
  );

  const handleBrowsePress = useCallback(
    (mediaType: BrowseMediaType) => {
      navigation.getParent<BottomTabNavigationProp<MobileTabParamList>>()?.navigate('Browse', {
        params: { mediaType },
        screen: BROWSE_STACK_ROUTES.BrowseRoot,
      });
    },
    [navigation]
  );
  const loadFeed = useCallback(
    async (source: 'initial' | 'refresh' | 'retry' | 'synced') => {
      if (activePrefs === null) {
        return;
      }
      const requestId = feedRequestIdRef.current + 1;
      feedRequestIdRef.current = requestId;

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
        setIsFeedRefreshing(false);
      }

      if (requestId === feedRequestIdRef.current) {
        setFeedErrorKey(null);
      }
      try {
        if (offlineModeEnabled && isHomeClipsUnavailableOffline(selectedMediaType)) {
          if (requestId !== feedRequestIdRef.current) {
            return;
          }
          setFeedRows([]);
          setUnsubscribedDownloadRows([]);
        } else {
          const rows =
            offlineModeEnabled && isHomeDownloadedItemsOnly(selectedMediaType)
              ? await fetchDownloadedHomeFeedRows(selectedMediaType)
              : await fetchHomeFeedRows(
                  selectedMediaType,
                  {
                    accessToken,
                    clearSession,
                    refreshToken,
                    setTokens,
                    status,
                  },
                  { range: activePrefs.range, sort: activePrefs.sort }
                );
          if (requestId !== feedRequestIdRef.current) {
            return;
          }
          setFeedRows(rows);
          if (selectedMediaType === 'podcasts') {
            const unsubscribed = await fetchUnsubscribedDownloadHomeRows();
            if (requestId !== feedRequestIdRef.current) {
              return;
            }
            setUnsubscribedDownloadRows(unsubscribed);
            setHasPodcastSubscriptions(rows.length > 0);
          } else {
            setUnsubscribedDownloadRows([]);
            if (selectedMediaType === 'clips') {
              try {
                const podcasts = await subscriptionsRepository.list({ kind: 'podcasts' });
                if (requestId !== feedRequestIdRef.current) {
                  return;
                }
                setHasPodcastSubscriptions(podcasts.length > 0);
              } catch {
                if (requestId === feedRequestIdRef.current) {
                  setHasPodcastSubscriptions(false);
                }
              }
            }
          }
        }
      } catch {
        if (requestId !== feedRequestIdRef.current) {
          return;
        }
        // A re-read the user did not ask for keeps quiet: the rows already on screen are still
        // worth reading, and an error over the top of them would say nothing useful.
        if (source === 'synced') {
          return;
        }
        if (source === 'initial' || source === 'retry') {
          setFeedRows([]);
          setUnsubscribedDownloadRows([]);
        }
        setFeedErrorKey('errors.generic');
      } finally {
        if (requestId === feedRequestIdRef.current) {
          if (source === 'refresh') {
            setIsFeedRefreshing(false);
          } else if (source !== 'synced') {
            setIsFeedLoading(false);
          }
        }
      }
    },
    [
      accessToken,
      activePrefs,
      clearSession,
      isFeedRefreshing,
      offlineModeEnabled,
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

  // Downloaded counts change only when a transfer finishes or a file is deleted, so this reads the
  // status channel and never wakes for byte progress. The debounce coalesces a burst of completions
  // into one pass over local SQLite — no spinner, no feed rebuild, just badges on rows already shown.
  useEffect(() => {
    if (selectedMediaType !== 'podcasts') {
      return;
    }

    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const refreshDownloadDerived = (): void => {
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }
      timeoutId = setTimeout(() => {
        void (async () => {
          try {
            const [counts, unsubscribed] = await Promise.all([
              downloadsRepository.countCompletedByChannel(),
              fetchUnsubscribedDownloadHomeRows(),
            ]);
            if (cancelled) {
              return;
            }
            setFeedRows((prev) => mergeDownloadedCountsIntoHomeRows(prev, counts));
            setUnsubscribedDownloadRows(unsubscribed);
          } catch {
            // Keep what is already on screen; a failed refresh is quieter than clearing it.
          }
        })();
      }, 200);
    };

    const unsubscribe = downloadStore.subscribe(refreshDownloadDerived);
    return () => {
      cancelled = true;
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }
      unsubscribe();
    };
  }, [selectedMediaType]);

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

  const handleUnsubscribe = useCallback(
    async (row: HomeFeedRowData) => {
      setActionErrorKey(null);
      try {
        const result = await subscriptionsRepository.unsubscribe({
          accountSync:
            status === 'authenticated'
              ? { accessToken, clearSession, refreshToken, setTokens }
              : undefined,
          idText: row.id,
          source: row.source ?? 'directory',
        });
        setFeedRows((prev) => prev.filter((item) => item.id !== row.id));
        if (selectedMediaType === 'podcasts') {
          setHasPodcastSubscriptions(feedRows.length > 1);
          try {
            setUnsubscribedDownloadRows(await fetchUnsubscribedDownloadHomeRows());
          } catch {
            // The follow is already gone; the downloads footer can catch up on the next refresh.
          }
        }
        if (result.serverError) {
          setActionErrorKey('errors.generic');
        }
      } catch {
        setActionErrorKey('errors.generic');
        throw new Error('Unsubscribe failed');
      }
    },
    [accessToken, clearSession, feedRows.length, refreshToken, selectedMediaType, setTokens, status]
  );

  const handleDeleteUnsubscribedDownloads = useCallback(async (row: HomeFeedRowData) => {
    setActionErrorKey(null);
    try {
      await downloadManager.removeAllForChannel(row.id);
      setUnsubscribedDownloadRows((prev) => prev.filter((item) => item.id !== row.id));
    } catch {
      setActionErrorKey('errors.generic');
      throw new Error('Delete all failed');
    }
  }, []);

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
      setActionErrorKey(null);
      try {
        await channelSeenRepository.markAllSeen();
        await loadFeed('synced');
        AccessibilityInfo.announceForAccessibility(t('subscriptions.mark_all_seen_done'));
      } catch {
        setActionErrorKey('errors.generic');
      }
    })();
  }, [loadFeed, t]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <HomeOverflowMenu
          canMarkAllSeen={canMarkAllSeen}
          onMarkAllSeen={handleMarkAllSeen}
          onViewModeChange={handleViewModeChange}
          showMarkAllSeen={showMarkAllSeen}
          viewMode={activePrefs?.viewMode ?? DEFAULT_HOME_VIEW_MODE}
        />
      ),
    });
  }, [
    activePrefs?.viewMode,
    canMarkAllSeen,
    handleMarkAllSeen,
    handleViewModeChange,
    navigation,
    showMarkAllSeen,
  ]);

  const handleRowPress = useCallback(
    (row: HomeFeedRowData) => {
      if (selectedMediaType === 'podcasts') {
        if (row.source === 'addByRss') {
          navigation.navigate(HOME_STACK_ROUTES.AddByRssPodcastDetail, {
            feedIdText: row.sourceId ?? row.id,
          });
          return;
        }
        navigation.navigate(
          HOME_STACK_ROUTES.PodcastDetail,
          buildPodcastDetailParams({
            podcastId: row.id,
            previewImageUrl: row.imageUrl,
            previewTitle: row.title,
          })
        );
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
        navigation.navigate(
          HOME_STACK_ROUTES.AlbumDetail,
          buildAlbumDetailParams({
            albumId: row.id,
            previewImageUrl: row.imageUrl,
            previewTitle: row.title,
          })
        );
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
    if (!isHomeFilterMediaType(selectedMediaType) || filterTerm.trim().length === 0) {
      return feedRows;
    }
    return feedRows.filter((row) => matchesTitleFilter(row.title, filterTerm));
  }, [feedRows, filterTerm, selectedMediaType]);

  // A tile is a square of artwork, a row is artwork plus a title, a metadata line, and buttons, so
  // the two fit a screen at completely different densities and are counted separately. Cell width is
  // measured rather than flexed: flex:1 stretches a short last row (or a single subscription) to
  // full width and the grid looks like one column.
  const isGridView = viewModeEligible && activePrefs?.viewMode === 'grid';
  const columns = isGridView ? resolveGridColumns(width) : rowColumns;
  const horizontalInset = tokens.spacing.lg;
  const gridGap = tokens.spacing.md;
  const gridCellWidth = isGridView
    ? resolveGridCellWidth({
        columns,
        contentWidth: width - 2 * horizontalInset,
        gap: gridGap,
      })
    : 0;

  const styles = useMemo(() => {
    const insets = screenBodyInsets(tokens.spacing);
    // List rows already carry `spacing.base` top padding; grid tiles do not — compensate so the
    // filter→content seam matches `listFilterContentGap` in both view modes.
    const filterBottomMargin = listFilterFieldBottomMargin(
      tokens.spacing,
      isGridView ? 0 : tokens.spacing.base
    );

    return StyleSheet.create({
      columnCell: {
        width: gridCellWidth,
      },
      columnWrapper: {
        gap: tokens.spacing.md,
      },
      container: {
        backgroundColor: themeStyles.screen.backgroundColor,
        flex: 1,
      },
      content: {
        flexGrow: 1,
        paddingBottom: tokens.spacing.lg,
        paddingHorizontal: insets.paddingHorizontal,
      },
      selectorSection: {
        ...insets,
      },
      feedNotice: {
        color: themeStyles.textSecondary.color,
        fontSize: 13,
        marginTop: tokens.spacing.sm,
      },
      filterRow: {
        marginBottom: filterBottomMargin,
      },
      unsubscribedGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: tokens.spacing.md,
      },
      unsubscribedDivider: {
        backgroundColor: themeStyles.border.borderColor,
        height: StyleSheet.hairlineWidth,
        marginBottom: tokens.spacing.lg,
        marginTop: tokens.spacing.lg,
      },
      unsubscribedSection: {
        marginTop: tokens.spacing.xl,
      },
      unsubscribedSectionAfterList: {
        marginTop: 0,
      },
      unsubscribedSectionTitle: {
        ...typography.heading,
        color: themeStyles.textPrimary.color,
        marginBottom: tokens.spacing.sm,
      },
    });
  }, [gridCellWidth, isGridView, themeStyles, tokens]);

  const showFeedRows = !isFeedLoading && feedErrorKey === null;
  const showFilterField =
    showFeedRows && feedRows.length > 0 && isHomeFilterMediaType(selectedMediaType);
  const showActionError = showFeedRows && feedRows.length > 0 && actionErrorKey !== null;

  // Two empty lists, two different problems. Nothing subscribed is answered by Search and/or
  // Browse; nothing matching is answered by editing the term. Offline-only download channels still
  // count as content on Podcasts, so they suppress the empty discovery CTA. Clips with local
  // podcast follows while signed out need Login — the subscribed clip list is account-backed.
  // Offline Mode parks Clips entirely (account-backed network list).
  const showClipsOfflineUnavailable =
    offlineModeEnabled && isHomeClipsUnavailableOffline(selectedMediaType);
  const showClipsLogin =
    !showClipsOfflineUnavailable &&
    selectedMediaType === 'clips' &&
    status !== 'authenticated' &&
    hasPodcastSubscriptions;
  const showNoSubscriptions =
    !showClipsOfflineUnavailable &&
    showFeedRows &&
    feedRows.length === 0 &&
    (selectedMediaType !== 'podcasts' || unsubscribedDownloadRows.length === 0);
  const showNoFilterMatches = showFeedRows && feedRows.length > 0 && visibleRows.length === 0;

  const listHeader = (
    <>
      {showFilterField ? (
        <ListFilterHeader hasItemsBelow={visibleRows.length > 0} style={styles.filterRow}>
          <ListFilterField
            clearLabel={t('subscriptions.filter.clear')}
            label={t('subscriptions.filter.placeholder')}
            onChangeTerm={handleFilterTermChange}
            term={filterTerm}
            testID="home-filter"
          />
        </ListFilterHeader>
      ) : null}
      {showActionError && actionErrorKey !== null ? (
        <Text style={styles.feedNotice} testID="home-action-error">
          {t(actionErrorKey)}
        </Text>
      ) : null}
      {!isFeedLoading && feedErrorKey !== null ? (
        <ListError
          messageKey={feedErrorKey}
          onRetry={() => {
            void loadFeed('retry');
          }}
          testID="home-list-error"
        />
      ) : null}
      {showNoFilterMatches ? (
        <ListEmpty
          messageKey="subscriptions.no_filter_matches"
          testID="home-list-no-filter-matches"
        />
      ) : null}
    </>
  );

  const emptyBrowseMediaType: BrowseMediaType = selectedMediaType;
  const showSearchOnEmpty =
    selectedMediaType === 'podcasts' ||
    selectedMediaType === 'artists' ||
    selectedMediaType === 'albums' ||
    selectedMediaType === 'tracks';
  const searchMediumOnEmpty = selectedMediaType === 'podcasts' ? 'all' : ('music' as const);

  const listEmpty = isFeedLoading ? (
    <LoadingSection testID="home-list-loading" />
  ) : showClipsOfflineUnavailable ? (
    <ListEmpty
      messageKey={OFFLINE_UNAVAILABLE_MESSAGE_KEY}
      testID="home-clips-offline-unavailable"
    />
  ) : showNoSubscriptions && showClipsLogin ? (
    <CallToActionSection
      actionLabelKey="authentication.login"
      actionTestID="home-list-empty-login"
      messageKey="authentication.login_required"
      onAction={onRequestLogin}
      testID="home-list-empty"
    />
  ) : showNoSubscriptions && showSearchOnEmpty ? (
    <CallToActionSection
      actionLabelKey="features.search.search"
      actionTestID="home-list-empty-search"
      messageKey="subscriptions.empty_message"
      onAction={() => {
        handleSearchPress(searchMediumOnEmpty);
      }}
      onSecondaryAction={() => {
        handleBrowsePress(emptyBrowseMediaType);
      }}
      secondaryActionLabelKey="nav.tab.browse"
      secondaryActionTestID="home-list-empty-browse"
      testID="home-list-empty"
    />
  ) : showNoSubscriptions ? (
    <CallToActionSection
      actionLabelKey="nav.tab.browse"
      actionTestID="home-list-empty-browse"
      messageKey="subscriptions.empty_message"
      onAction={() => {
        handleBrowsePress(emptyBrowseMediaType);
      }}
      testID="home-list-empty"
    />
  ) : null;

  const listFooter = (
    <>
      {showFeedRows && selectedMediaType === 'podcasts' && unsubscribedDownloadRows.length > 0 ? (
        <View
          style={[
            styles.unsubscribedSection,
            feedRows.length > 0 ? styles.unsubscribedSectionAfterList : null,
          ]}
          testID="home-unsubscribed-downloads"
        >
          {feedRows.length > 0 ? (
            <View style={styles.unsubscribedDivider} testID="home-unsubscribed-downloads-divider" />
          ) : null}
          <Text
            accessibilityRole="header"
            style={styles.unsubscribedSectionTitle}
            testID="home-unsubscribed-downloads-title"
          >
            {t('subscriptions.downloaded_only')}
          </Text>
          {isGridView ? (
            <View style={styles.unsubscribedGrid}>
              {unsubscribedDownloadRows.map((row) => (
                <View key={row.id} style={styles.columnCell}>
                  <HomeFeedGridCell
                    onPress={handleRowPress}
                    row={row}
                    testID={`home-unsubscribed-download-cell-${row.id}`}
                  />
                </View>
              ))}
            </View>
          ) : (
            unsubscribedDownloadRows.map((row, index) => (
              <SwipeActionRow
                actionTestID={`home-unsubscribed-download-row-${row.id}-delete-all`}
                key={row.id}
                onRemove={() => handleDeleteUnsubscribedDownloads(row)}
                removeLabel={t('features.download.delete_all')}
                testID={`home-unsubscribed-download-row-${row.id}-swipe`}
              >
                <HomeFeedRow
                  isLast={index === unsubscribedDownloadRows.length - 1}
                  mediaType="podcasts"
                  onPlayPress={(nextRow) => {
                    runPlayAction(nextRow, 'podcasts');
                  }}
                  onPress={handleRowPress}
                  onQueuePress={(nextRow, position) => {
                    runQueueAction(nextRow, 'podcasts', position);
                  }}
                  row={row}
                  testID={`home-unsubscribed-download-row-${row.id}`}
                />
              </SwipeActionRow>
            ))
          )}
        </View>
      ) : null}
      {playbackNoticeKey !== null ? (
        <Text style={styles.feedNotice}>{t(playbackNoticeKey)}</Text>
      ) : null}
    </>
  );

  return (
    <View style={styles.container} testID="home-screen">
      <View style={styles.selectorSection}>
        {isMediaTypeHydrated ? (
          <MediaTypeSelector
            labelKeys={MEDIA_TYPE_LABEL_KEYS}
            leading={
              isHomeSortableMediaType(selectedMediaType) ? (
                <HomeSortChip
                  onRangeChange={handleRangeChange}
                  onSortChange={handleSortChange}
                  range={activePrefs?.range ?? DEFAULT_HOME_RANGE}
                  sort={activePrefs?.sort ?? DEFAULT_HOME_SORT}
                />
              ) : undefined
            }
            onChange={handleMediaTypeChange}
            selectedMediaType={selectedMediaType}
            testIDPrefix="home"
            types={HOME_MEDIA_TYPE_ORDER}
          />
        ) : null}
      </View>
      {/* Keep controls and summary in ListHeaderComponent while rows render as FlatList items, so */}
      {/* tablet grid columns can virtualize with numColumns. */}
      <FillList
        ListEmptyComponent={listEmpty}
        ListFooterComponent={listFooter}
        ListHeaderComponent={listHeader}
        accessibilityLabel={isGridView ? t('layouts.grid_view') : undefined}
        accessibilityRole="list"
        columnWrapperStyle={columns > 1 ? styles.columnWrapper : undefined}
        contentContainerStyle={styles.content}
        data={showFeedRows ? visibleRows : []}
        keyboardShouldPersistTaps="handled"
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
        renderItem={({ index, item: row }) => {
          const feedRow = isGridView ? (
            <HomeFeedGridCell onPress={handleRowPress} row={row} />
          ) : (
            <HomeFeedRow
              isLast={index === visibleRows.length - 1}
              mediaType={selectedMediaType}
              onAddToPlaylistPress={
                status === 'authenticated' && addToPlaylistTarget !== null
                  ? (nextRow) => {
                      requestAddToPlaylist({
                        idText: nextRow.id,
                        kind: addToPlaylistTarget.kind,
                        medium: addToPlaylistTarget.medium,
                      });
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
          );

          return (
            <View style={columns > 1 ? styles.columnCell : undefined}>
              {!isGridView && isHomeFilterMediaType(selectedMediaType) ? (
                <SwipeActionRow
                  actionTestID={`home-feed-row-${row.id}-unsubscribe`}
                  onRemove={() => handleUnsubscribe(row)}
                  removeLabel={t('features.unsubscribe')}
                  testID={`home-feed-row-${row.id}-swipe`}
                >
                  {feedRow}
                </SwipeActionRow>
              ) : (
                feedRow
              )}
            </View>
          );
        }}
        testID="home-feed-list"
      />
      {addToPlaylistSheet}
    </View>
  );
}
