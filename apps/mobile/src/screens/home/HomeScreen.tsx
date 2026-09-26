import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { StyleProp, ViewStyle } from 'react-native';
import { AccessibilityInfo, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { matchesTitleFilter } from '@podverse/helpers';

import { useAuthPrompt } from '../../auth/AuthPromptContext';
import { useAuth } from '../../auth/AuthProvider';
import { ListFilterField, ListFilterHeader } from '../../components/form';
import { FillList, SwipeActionRow, VerticalCenter } from '../../components/primitives';
import { CallToActionSection } from '../../components/state/CallToActionSection';
import { ListEmpty } from '../../components/state/ListEmpty';
import { ListError } from '../../components/state/ListError';
import { ListLoading } from '../../components/state/ListLoading';
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
import { beginPerfChipSample, endPerfChipSample, stampPerfFrame } from '../../lib/perf/perfFrames';
import { perfMark } from '../../lib/perf/perfSpans';
import type { HomeStackParamList, MobileTabParamList } from '../../navigation';
import {
  BROWSE_STACK_ROUTES,
  buildAlbumDetailParams,
  buildArtistDetailParams,
  buildPodcastDetailParams,
  buildTrackDetailParams,
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
import { useAddToPlaylist } from '../library/useAddToPlaylist';
import type { HomeFeedRowData } from './homeFeedData';
import {
  fetchDownloadedHomeFeedRows,
  fetchHomeFeedRows,
  fetchUnsubscribedDownloadHomeRows,
  isHomeFeedStaleRead,
} from './homeFeedData';
import { HomeFeedGridCell } from './HomeFeedGridCell';
import type { HomeFeedLoadSource } from './homeFeedLoadPolicy';
import { homeFeedKeepsVisibleRowsOnError, homeFeedShowsRefreshControl } from './homeFeedLoadPolicy';
import {
  appendHomeFeedReadFailure,
  HOME_FEED_PREFS_TIMEOUT_CODE,
  HOME_FEED_READ_TIMEOUT_MS,
  withHomeFeedReadBudget,
} from './homeFeedReadLog';
import { HomeFeedRow } from './HomeFeedRow';
import { readHomeFilterTerm, writeHomeFilterTerm } from './homeFilterSession';
import { HomeOverflowMenu } from './HomeOverflowMenu';
import { mergeDownloadedCountsIntoHomeRows } from './homeRowMetadata';
import { HomeSortChip } from './HomeSortChip';
import { MediaTypeSelector } from './MediaTypeSelector';
import type { QueueActionPosition } from './useHomeRowPlayback';
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

const homeFeedRowKeyExtractor = (row: HomeFeedRowData): string => row.id;
const EMPTY_HOME_FEED_ROWS: readonly HomeFeedRowData[] = [];

function HomeFeedListItem({
  addToPlaylistPress,
  artworkEdge,
  cellStyle,
  goToChannel,
  goToTrack,
  isGridView,
  isLast,
  mediaType,
  onPlay,
  onPress,
  onQueue,
  onUnsubscribe,
  row,
  unsubscribeLabel,
}: {
  addToPlaylistPress?: (row: HomeFeedRowData) => void;
  artworkEdge: number;
  cellStyle: StyleProp<ViewStyle>;
  goToChannel?: (row: HomeFeedRowData) => void;
  goToTrack?: (row: HomeFeedRowData) => void;
  isGridView: boolean;
  isLast: boolean;
  mediaType: HomeMediaType;
  onPlay: (row: HomeFeedRowData) => void;
  onPress: (row: HomeFeedRowData) => void;
  onQueue: (row: HomeFeedRowData, position: QueueActionPosition) => void;
  onUnsubscribe: (row: HomeFeedRowData) => void;
  row: HomeFeedRowData;
  unsubscribeLabel: string;
}) {
  const handleRemove = useCallback(() => {
    onUnsubscribe(row);
  }, [onUnsubscribe, row]);

  const feedRow = isGridView ? (
    <HomeFeedGridCell artworkEdge={artworkEdge} onPress={onPress} row={row} />
  ) : (
    <HomeFeedRow
      isLast={isLast}
      mediaType={mediaType}
      onAddToPlaylistPress={addToPlaylistPress}
      onGoToChannelPress={goToChannel}
      onGoToTrackPress={goToTrack}
      onPlayPress={onPlay}
      onPress={onPress}
      onQueuePress={onQueue}
      row={row}
    />
  );

  return (
    <View style={cellStyle}>
      {!isGridView && isHomeFilterMediaType(mediaType) ? (
        <SwipeActionRow
          actionTestID={`home-feed-row-${row.id}-unsubscribe`}
          onRemove={handleRemove}
          removeLabel={unsubscribeLabel}
          testID={`home-feed-row-${row.id}-swipe`}
        >
          {feedRow}
        </SwipeActionRow>
      ) : (
        feedRow
      )}
    </View>
  );
}

function HomeUnsubscribedDownloadRow({
  isLast,
  onDelete,
  onPlay,
  onPress,
  onQueue,
  row,
}: {
  isLast: boolean;
  onDelete: (row: HomeFeedRowData) => void;
  onPlay: (row: HomeFeedRowData) => void;
  onPress: (row: HomeFeedRowData) => void;
  onQueue: (row: HomeFeedRowData, position: QueueActionPosition) => void;
  row: HomeFeedRowData;
}) {
  const { t } = useTranslation();
  const handleRemove = useCallback(() => {
    onDelete(row);
  }, [onDelete, row]);

  return (
    <SwipeActionRow
      actionTestID={`home-unsubscribed-download-row-${row.id}-delete-all`}
      onRemove={handleRemove}
      removeLabel={t('features.download.delete_all')}
      testID={`home-unsubscribed-download-row-${row.id}-swipe`}
    >
      <HomeFeedRow
        isLast={isLast}
        mediaType="podcasts"
        onPlayPress={onPlay}
        onPress={onPress}
        onQueuePress={onQueue}
        row={row}
        testID={`home-unsubscribed-download-row-${row.id}`}
      />
    </SwipeActionRow>
  );
}

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
  // The chip the user just tapped, before the list switches. Drives the active chip and a spinner
  // over the still-mounted old list for one small commit; the switch itself runs a frame later.
  const [pendingMediaType, setPendingMediaType] = useState<HomeMediaType | null>(null);
  const pendingSwitchFrameRef = useRef<number | null>(null);
  const [listPrefs, setListPrefs] = useState<HomeListPrefsState | null>(null);
  const [feedRows, setFeedRows] = useState<HomeFeedRowData[]>([]);
  const [unsubscribedDownloadRows, setUnsubscribedDownloadRows] = useState<HomeFeedRowData[]>([]);
  const [hasPodcastSubscriptions, setHasPodcastSubscriptions] = useState<boolean>(false);
  const [filterTerm, setFilterTerm] = useState<string>(readHomeFilterTerm);
  const [isFeedRefreshing, setIsFeedRefreshing] = useState<boolean>(false);
  const [hasCompletedFeedRead, setHasCompletedFeedRead] = useState<boolean>(false);
  const [feedErrorKey, setFeedErrorKey] = useState<string | null>(null);
  const [actionErrorKey, setActionErrorKey] = useState<string | null>(null);
  const feedRequestIdRef = useRef<number>(0);
  const hasLoadedFeedOnceRef = useRef(false);
  const isFeedRefreshingRef = useRef(false);
  const unsubscribingIdsRef = useRef<Set<string>>(new Set());
  const { playbackNoticeKey, runPlayAction, runQueueAction } = useHomeRowPlayback();
  const { addToPlaylistSheet, requestAddToPlaylist } = useAddToPlaylist();

  // Layout applies only on eligible chips; the overflow trigger always sits in the title bar.
  const viewModeEligible = isHomeViewModeMediaType(selectedMediaType);
  const showMarkAllSeen = selectedMediaType === 'podcasts';

  // Defaults until AsyncStorage catches up, so the list can paint from SQLite on the first frame.
  // Remembered sort applies when it arrives and the list rereads locally — never behind a spinner.
  const resolvedPrefs: HomeListPrefsState =
    listPrefs !== null && listPrefs.mediaType === selectedMediaType
      ? listPrefs
      : {
          mediaType: selectedMediaType,
          range: DEFAULT_HOME_RANGE,
          sort: DEFAULT_HOME_SORT,
          viewMode: listPrefs?.viewMode ?? DEFAULT_HOME_VIEW_MODE,
        };

  const arePrefsHydrated = listPrefs !== null && listPrefs.mediaType === selectedMediaType;

  // Only episodes/tracks (item) and clips (clip) are playlist resources; null means the row gets no
  // add-to-playlist action.
  const addToPlaylistTarget = useMemo<{
    kind: 'clip' | 'item';
    medium: 'av' | 'music';
  } | null>(() => {
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
      try {
        const storedMediaType = await withHomeFeedReadBudget(
          readPreferredMediaType(),
          HOME_FEED_READ_TIMEOUT_MS,
          'preferred-media-type',
          HOME_FEED_PREFS_TIMEOUT_CODE
        );
        if (!isMounted) {
          return;
        }
        perfMark('home.chip.initial', storedMediaType ?? DEFAULT_HOME_MEDIA_TYPE);

        if (storedMediaType !== null) {
          setSelectedMediaType(storedMediaType);
        }
      } catch (error) {
        appendHomeFeedReadFailure({
          error,
          mediaType: DEFAULT_HOME_MEDIA_TYPE,
          source: 'prefs',
        });
        perfMark('home.chip.initial', DEFAULT_HOME_MEDIA_TYPE);
      } finally {
        if (isMounted) {
          setIsMediaTypeHydrated(true);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  // One animation frame after the pending chip and spinner commit.
  useEffect(() => {
    if (pendingMediaType === null) {
      return;
    }
    const handle = requestAnimationFrame(() => {
      perfMark('home.chip.pending', pendingMediaType);
    });
    return () => cancelAnimationFrame(handle);
  }, [pendingMediaType]);

  // One animation frame after the selected chip and cleared list commit.
  useEffect(() => {
    if (!isMediaTypeHydrated) {
      return;
    }
    const mediaType = selectedMediaType;
    const handle = requestAnimationFrame(() => {
      perfMark('home.chip.frame', mediaType);
    });
    return () => cancelAnimationFrame(handle);
  }, [isMediaTypeHydrated, selectedMediaType]);

  useEffect(() => {
    return () => {
      if (pendingSwitchFrameRef.current !== null) {
        cancelAnimationFrame(pendingSwitchFrameRef.current);
      }
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
      perfMark('home.prefs.start', selectedMediaType);
      try {
        const stored = await withHomeFeedReadBudget(
          readHomeListPrefs(selectedMediaType),
          HOME_FEED_READ_TIMEOUT_MS,
          `${selectedMediaType}-list-prefs`,
          HOME_FEED_PREFS_TIMEOUT_CODE
        );
        if (isMounted) {
          perfMark('home.prefs.end', selectedMediaType);
          setListPrefs({ ...stored, mediaType: selectedMediaType });
        }
      } catch (error) {
        appendHomeFeedReadFailure({
          error,
          mediaType: selectedMediaType,
          source: 'prefs',
        });
        if (isMounted) {
          perfMark('home.prefs.end', 'fallback');
          setListPrefs({
            mediaType: selectedMediaType,
            range: DEFAULT_HOME_RANGE,
            sort: DEFAULT_HOME_SORT,
            viewMode: DEFAULT_HOME_VIEW_MODE,
          });
        }
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

  const commitMediaTypeChange = useCallback((mediaType: HomeMediaType) => {
    pendingSwitchFrameRef.current = null;

    // Advancing here rather than in loadFeed is what makes rapid taps coalesce: the read for the
    // chip the user just left is abandoned mid-flight instead of finishing and being discarded.
    feedRequestIdRef.current += 1;

    // Tearing down the old rows is the expensive part of a switch; it runs under the pending
    // spinner, and the pending state hands off to the busy spinner in this same commit.
    setPendingMediaType(null);
    setSelectedMediaType(mediaType);
    setFeedRows([]);
    setUnsubscribedDownloadRows([]);
    setFeedErrorKey(null);
    setHasCompletedFeedRead(false);
    void writePreferredMediaType(mediaType);
  }, []);

  const handleMediaTypeChange = useCallback(
    (mediaType: HomeMediaType) => {
      perfMark('home.chip.tap', mediaType);
      if (pendingSwitchFrameRef.current !== null) {
        cancelAnimationFrame(pendingSwitchFrameRef.current);
        pendingSwitchFrameRef.current = null;
      }
      if (mediaType === selectedMediaType) {
        setPendingMediaType(null);
        return;
      }

      // This commit only touches the chip row and the spinner overlay, so it paints on the next
      // frame; the switch that clears the list waits for that frame.
      beginPerfChipSample();
      setPendingMediaType(mediaType);
      pendingSwitchFrameRef.current = requestAnimationFrame(() => {
        commitMediaTypeChange(mediaType);
      });
    },
    [commitMediaTypeChange, selectedMediaType]
  );

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
    async (source: HomeFeedLoadSource) => {
      perfMark('home.load.start', source);
      const requestId = feedRequestIdRef.current + 1;
      feedRequestIdRef.current = requestId;

      if (homeFeedShowsRefreshControl(source)) {
        if (isFeedRefreshingRef.current) {
          return;
        }
        isFeedRefreshingRef.current = true;
        setIsFeedRefreshing(true);
        // The gesture rereads this list and also asks the queue to reconcile everything else.
        // The refresh control answers "is this list current"; the sync bar answers the rest.
        requestSync('pull-to-refresh');
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
          setHasCompletedFeedRead(true);
        } else {
          const rows = await withHomeFeedReadBudget(
            offlineModeEnabled && isHomeDownloadedItemsOnly(selectedMediaType)
              ? fetchDownloadedHomeFeedRows(selectedMediaType)
              : fetchHomeFeedRows(selectedMediaType, {
                  isCurrent: () => requestId === feedRequestIdRef.current,
                  range: resolvedPrefs.range,
                  sort: resolvedPrefs.sort,
                }),
            HOME_FEED_READ_TIMEOUT_MS,
            `${source}-${selectedMediaType}`
          );
          perfMark('home.repo.end', selectedMediaType);
          if (requestId !== feedRequestIdRef.current) {
            return;
          }
          perfMark('home.rows.set', selectedMediaType);
          setFeedRows(rows);
          setHasCompletedFeedRead(true);
          if (selectedMediaType === 'podcasts') {
            const unsubscribed = await withHomeFeedReadBudget(
              fetchUnsubscribedDownloadHomeRows(),
              HOME_FEED_READ_TIMEOUT_MS,
              `${source}-unsubscribed-downloads`
            );
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
      } catch (error) {
        if (isHomeFeedStaleRead(error) || requestId !== feedRequestIdRef.current) {
          perfMark('home.load.abandoned', selectedMediaType);
          return;
        }
        appendHomeFeedReadFailure({
          error,
          mediaType: selectedMediaType,
          source,
        });
        setHasCompletedFeedRead(true);
        if (homeFeedKeepsVisibleRowsOnError(source)) {
          return;
        }
        setFeedRows([]);
        setUnsubscribedDownloadRows([]);
        setFeedErrorKey('errors.generic');
      } finally {
        if (homeFeedShowsRefreshControl(source)) {
          isFeedRefreshingRef.current = false;
          if (requestId === feedRequestIdRef.current) {
            setIsFeedRefreshing(false);
          }
        }
      }
    },
    [offlineModeEnabled, requestSync, resolvedPrefs.range, resolvedPrefs.sort, selectedMediaType]
  );

  const loadFeedRef = useRef(loadFeed);
  loadFeedRef.current = loadFeed;

  useEffect(() => {
    if (hasLoadedFeedOnceRef.current && !arePrefsHydrated) {
      return;
    }
    hasLoadedFeedOnceRef.current = true;
    void loadFeedRef.current('initial');
  }, [
    arePrefsHydrated,
    offlineModeEnabled,
    resolvedPrefs.range,
    resolvedPrefs.sort,
    selectedMediaType,
  ]);

  // One animation frame after the new rows commit, not a true paint callback. Closes the chip
  // frame sample for that switch.
  useEffect(() => {
    if (feedRows.length === 0) {
      return;
    }
    const handle = requestAnimationFrame(() => {
      perfMark('home.paint', selectedMediaType);
      endPerfChipSample();
    });
    return () => cancelAnimationFrame(handle);
  }, [feedRows, selectedMediaType]);

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
      if (unsubscribingIdsRef.current.has(row.id)) {
        return;
      }
      unsubscribingIdsRef.current.add(row.id);
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
      } finally {
        unsubscribingIdsRef.current.delete(row.id);
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
          viewMode={resolvedPrefs.viewMode}
        />
      ),
    });
  }, [
    resolvedPrefs.viewMode,
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
            previewIsSubscribed: row.isSubscribed,
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
        navigation.navigate(
          HOME_STACK_ROUTES.ArtistDetail,
          buildArtistDetailParams({
            artistId: row.id,
            previewImageUrl: row.imageUrl,
            previewIsSubscribed: row.isSubscribed,
            previewTitle: row.title,
          })
        );
        return;
      }

      if (selectedMediaType === 'albums') {
        navigation.navigate(
          HOME_STACK_ROUTES.AlbumDetail,
          buildAlbumDetailParams({
            albumId: row.id,
            previewImageUrl: row.imageUrl,
            previewIsSubscribed: row.isSubscribed,
            previewTitle: row.title,
          })
        );
        return;
      }

      runPlayAction(row, 'tracks');
    },
    [navigation, runPlayAction, selectedMediaType]
  );

  const handleGoToTrack = useCallback(
    (row: HomeFeedRowData) => {
      navigation.navigate(
        HOME_STACK_ROUTES.TrackDetail,
        buildTrackDetailParams({
          previewImageUrl: row.imageUrl,
          previewTitle: row.title,
          trackId: row.id,
        })
      );
    },
    [navigation]
  );

  const handleGoToChannel = useCallback(
    (row: HomeFeedRowData) => {
      if (row.channelId === undefined) {
        return;
      }
      if (row.channelKind === 'artists') {
        navigation.navigate(
          HOME_STACK_ROUTES.ArtistDetail,
          buildArtistDetailParams({
            artistId: row.channelId,
            previewTitle: row.subtitle,
          })
        );
        return;
      }
      navigation.navigate(
        HOME_STACK_ROUTES.AlbumDetail,
        buildAlbumDetailParams({
          albumId: row.channelId,
          previewTitle: row.subtitle,
        })
      );
    },
    [navigation]
  );

  const handlePlayPress = useCallback(
    (nextRow: HomeFeedRowData) => {
      perfMark('home.play.tap', selectedMediaType);
      runPlayAction(nextRow, selectedMediaType);
    },
    [runPlayAction, selectedMediaType]
  );

  const handleQueuePress = useCallback(
    (nextRow: HomeFeedRowData, position: QueueActionPosition) => {
      runQueueAction(nextRow, selectedMediaType, position);
    },
    [runQueueAction, selectedMediaType]
  );

  const handlePodcastPlayPress = useCallback(
    (nextRow: HomeFeedRowData) => {
      runPlayAction(nextRow, 'podcasts');
    },
    [runPlayAction]
  );

  const handlePodcastQueuePress = useCallback(
    (nextRow: HomeFeedRowData, position: QueueActionPosition) => {
      runQueueAction(nextRow, 'podcasts', position);
    },
    [runQueueAction]
  );

  const handleAddToPlaylistPress = useCallback(
    (nextRow: HomeFeedRowData) => {
      if (addToPlaylistTarget === null) {
        return;
      }
      requestAddToPlaylist({
        idText: nextRow.id,
        kind: addToPlaylistTarget.kind,
        medium: addToPlaylistTarget.medium,
      });
    },
    [addToPlaylistTarget, requestAddToPlaylist]
  );

  const handleRetryFeed = useCallback(() => {
    void loadFeed('retry');
  }, [loadFeed]);

  const handleRefreshFeed = useCallback(() => {
    void loadFeed('refresh');
  }, [loadFeed]);

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
  const isGridView = viewModeEligible && resolvedPrefs.viewMode === 'grid';
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
      listArea: {
        flex: 1,
      },
      listAreaHidden: {
        opacity: 0,
      },
      pendingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: themeStyles.screen.backgroundColor,
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

  const showFeedRows = feedErrorKey === null;
  const isFeedBusy = !hasCompletedFeedRead;

  // One animation frame while the list is the loading spinner.
  useEffect(() => {
    if (!isFeedBusy || feedRows.length > 0) {
      return;
    }
    const handle = requestAnimationFrame(() => {
      perfMark('home.spinner', selectedMediaType);
    });
    return () => cancelAnimationFrame(handle);
  }, [feedRows.length, isFeedBusy, selectedMediaType]);

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
    !isFeedBusy &&
    !showClipsOfflineUnavailable &&
    showFeedRows &&
    feedRows.length === 0 &&
    (selectedMediaType !== 'podcasts' || unsubscribedDownloadRows.length === 0);
  const showNoFilterMatches = showFeedRows && feedRows.length > 0 && visibleRows.length === 0;

  const emptyBrowseMediaType: BrowseMediaType = selectedMediaType;
  const showSearchOnEmpty =
    selectedMediaType === 'podcasts' ||
    selectedMediaType === 'artists' ||
    selectedMediaType === 'albums' ||
    selectedMediaType === 'tracks';
  const searchMediumOnEmpty = selectedMediaType === 'podcasts' ? 'all' : ('music' as const);

  const handleEmptySearch = useCallback(() => {
    handleSearchPress(searchMediumOnEmpty);
  }, [handleSearchPress, searchMediumOnEmpty]);

  const handleEmptyBrowse = useCallback(() => {
    handleBrowsePress(emptyBrowseMediaType);
  }, [emptyBrowseMediaType, handleBrowsePress]);

  const listHeader = useMemo(
    () => (
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
        {feedErrorKey !== null ? (
          <ListError messageKey={feedErrorKey} onRetry={handleRetryFeed} testID="home-list-error" />
        ) : null}
        {showNoFilterMatches ? (
          <ListEmpty
            messageKey="subscriptions.no_filter_matches"
            testID="home-list-no-filter-matches"
          />
        ) : null}
      </>
    ),
    [
      actionErrorKey,
      feedErrorKey,
      filterTerm,
      handleFilterTermChange,
      handleRetryFeed,
      showActionError,
      showFilterField,
      showNoFilterMatches,
      styles.feedNotice,
      styles.filterRow,
      t,
      visibleRows.length,
    ]
  );

  const listEmpty = useMemo(
    () =>
      isFeedBusy ? (
        <VerticalCenter testID="home-feed-loading">
          <ListLoading testID="home-feed-loading-indicator" />
        </VerticalCenter>
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
          onAction={handleEmptySearch}
          onSecondaryAction={handleEmptyBrowse}
          secondaryActionLabelKey="nav.tab.browse"
          secondaryActionTestID="home-list-empty-browse"
          testID="home-list-empty"
        />
      ) : showNoSubscriptions ? (
        <CallToActionSection
          actionLabelKey="nav.tab.browse"
          actionTestID="home-list-empty-browse"
          messageKey="subscriptions.empty_message"
          onAction={handleEmptyBrowse}
          testID="home-list-empty"
        />
      ) : null,
    [
      handleEmptyBrowse,
      handleEmptySearch,
      isFeedBusy,
      onRequestLogin,
      showClipsLogin,
      showClipsOfflineUnavailable,
      showNoSubscriptions,
      showSearchOnEmpty,
    ]
  );

  const unsubscribedDownloadCount = unsubscribedDownloadRows.length;

  const listFooter = useMemo(
    () => (
      <>
        {showFeedRows && selectedMediaType === 'podcasts' && unsubscribedDownloadCount > 0 ? (
          <View
            style={[
              styles.unsubscribedSection,
              feedRows.length > 0 ? styles.unsubscribedSectionAfterList : null,
            ]}
            testID="home-unsubscribed-downloads"
          >
            {feedRows.length > 0 ? (
              <View
                style={styles.unsubscribedDivider}
                testID="home-unsubscribed-downloads-divider"
              />
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
                      artworkEdge={gridCellWidth}
                      onPress={handleRowPress}
                      row={row}
                      testID={`home-unsubscribed-download-cell-${row.id}`}
                    />
                  </View>
                ))}
              </View>
            ) : (
              unsubscribedDownloadRows.map((row, index) => (
                <HomeUnsubscribedDownloadRow
                  isLast={index === unsubscribedDownloadCount - 1}
                  key={row.id}
                  onDelete={handleDeleteUnsubscribedDownloads}
                  onPlay={handlePodcastPlayPress}
                  onPress={handleRowPress}
                  onQueue={handlePodcastQueuePress}
                  row={row}
                />
              ))
            )}
          </View>
        ) : null}
        {playbackNoticeKey !== null ? (
          <Text style={styles.feedNotice}>{t(playbackNoticeKey)}</Text>
        ) : null}
      </>
    ),
    [
      feedRows.length,
      handleDeleteUnsubscribedDownloads,
      handlePodcastPlayPress,
      handlePodcastQueuePress,
      handleRowPress,
      isGridView,
      playbackNoticeKey,
      selectedMediaType,
      showFeedRows,
      styles.columnCell,
      styles.feedNotice,
      styles.unsubscribedDivider,
      styles.unsubscribedGrid,
      styles.unsubscribedSection,
      styles.unsubscribedSectionAfterList,
      styles.unsubscribedSectionTitle,
      t,
      unsubscribedDownloadCount,
      unsubscribedDownloadRows,
    ]
  );

  const refreshControl = useMemo(
    () => (
      <RefreshControl
        onRefresh={handleRefreshFeed}
        refreshing={isFeedRefreshing}
        tintColor={themeStyles.buttonPrimary.backgroundColor}
      />
    ),
    [handleRefreshFeed, isFeedRefreshing, themeStyles.buttonPrimary.backgroundColor]
  );

  const visibleRowCount = visibleRows.length;
  const rowAddToPlaylistPress =
    status === 'authenticated' && addToPlaylistTarget !== null
      ? handleAddToPlaylistPress
      : undefined;
  const rowGoToChannel = selectedMediaType === 'tracks' ? handleGoToChannel : undefined;
  const rowGoToTrack = selectedMediaType === 'tracks' ? handleGoToTrack : undefined;
  const unsubscribeLabel = t('features.unsubscribe');
  const feedCellStyle = columns > 1 ? styles.columnCell : undefined;

  const renderItem = useCallback(
    ({ index, item: row }: { index: number; item: HomeFeedRowData }) => (
      <HomeFeedListItem
        addToPlaylistPress={rowAddToPlaylistPress}
        artworkEdge={gridCellWidth}
        cellStyle={feedCellStyle}
        goToChannel={rowGoToChannel}
        goToTrack={rowGoToTrack}
        isGridView={isGridView}
        isLast={index === visibleRowCount - 1}
        mediaType={selectedMediaType}
        onPlay={handlePlayPress}
        onPress={handleRowPress}
        onQueue={handleQueuePress}
        onUnsubscribe={handleUnsubscribe}
        row={row}
        unsubscribeLabel={unsubscribeLabel}
      />
    ),
    [
      feedCellStyle,
      gridCellWidth,
      handlePlayPress,
      handleQueuePress,
      handleRowPress,
      handleUnsubscribe,
      isGridView,
      rowAddToPlaylistPress,
      rowGoToChannel,
      rowGoToTrack,
      selectedMediaType,
      unsubscribeLabel,
      visibleRowCount,
    ]
  );

  const gridViewLabel = isGridView ? t('layouts.grid_view') : undefined;
  const listData = showFeedRows ? visibleRows : EMPTY_HOME_FEED_ROWS;

  // Memoized so a pending chip tap re-renders only the chip row and the overlay; the list props
  // do not depend on `pendingMediaType`, and FillList itself is not memoized.
  // Keep controls and summary in ListHeaderComponent while rows render as FlatList items, so
  // tablet grid columns can virtualize with numColumns.
  const feedList = useMemo(
    () => (
      <FillList
        ListEmptyComponent={listEmpty}
        ListFooterComponent={listFooter}
        ListHeaderComponent={listHeader}
        accessibilityLabel={gridViewLabel}
        accessibilityRole="list"
        columnWrapperStyle={columns > 1 ? styles.columnWrapper : undefined}
        contentContainerStyle={styles.content}
        data={listData}
        keyboardShouldPersistTaps="handled"
        key={`cols-${columns}`}
        keyExtractor={homeFeedRowKeyExtractor}
        numColumns={columns}
        refreshControl={refreshControl}
        renderItem={renderItem}
        testID="home-feed-list"
      />
    ),
    [
      columns,
      gridViewLabel,
      listData,
      listEmpty,
      listFooter,
      listHeader,
      refreshControl,
      renderItem,
      styles.columnWrapper,
      styles.content,
    ]
  );

  const displayedMediaType = pendingMediaType ?? selectedMediaType;
  const isSwitchPending = pendingMediaType !== null;

  const showsLoading = isSwitchPending || (isFeedBusy && feedRows.length === 0);

  useLayoutEffect(() => {
    if (showsLoading) {
      stampPerfFrame('spinner.visible');
    }
  }, [showsLoading]);

  useLayoutEffect(() => {
    if (!isSwitchPending && hasCompletedFeedRead) {
      stampPerfFrame('list.visible');
    }
  }, [feedRows, hasCompletedFeedRead, isSwitchPending]);

  return (
    <View style={styles.container} testID="home-screen">
      <View style={styles.selectorSection}>
        {isMediaTypeHydrated ? (
          <MediaTypeSelector
            labelKeys={MEDIA_TYPE_LABEL_KEYS}
            trailing={
              isHomeSortableMediaType(displayedMediaType) ? (
                <HomeSortChip
                  onRangeChange={handleRangeChange}
                  onSortChange={handleSortChange}
                  range={resolvedPrefs.range}
                  sort={resolvedPrefs.sort}
                />
              ) : undefined
            }
            onChange={handleMediaTypeChange}
            selectedMediaType={displayedMediaType}
            testIDPrefix="home"
            types={HOME_MEDIA_TYPE_ORDER}
          />
        ) : null}
      </View>
      <View style={styles.listArea}>
        <View
          importantForAccessibility={isSwitchPending ? 'no-hide-descendants' : 'auto'}
          pointerEvents={isSwitchPending ? 'none' : 'auto'}
          style={[styles.listArea, isSwitchPending ? styles.listAreaHidden : null]}
        >
          {feedList}
        </View>
        {isSwitchPending ? (
          <View style={styles.pendingOverlay}>
            <VerticalCenter testID="home-feed-loading">
              <ListLoading testID="home-feed-loading-indicator" />
            </VerticalCenter>
          </View>
        ) : null}
      </View>
      {addToPlaylistSheet}
    </View>
  );
}
