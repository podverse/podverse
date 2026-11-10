import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { StyleProp, ViewStyle } from 'react-native';
import { AccessibilityInfo, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { matchesTitleFilter } from '@podverse/helpers';
import type { DTOItem } from '@podverse/helpers/dto';

import { useAuthPrompt } from '../../auth/AuthPromptContext';
import { useAuth } from '../../auth/AuthProvider';
import { ListFilterField, ListFilterHeader } from '../../components/form';
import { FillList, SwipeActionRow } from '../../components/primitives';
import { CallToActionSection } from '../../components/state/CallToActionSection';
import { ListEmpty } from '../../components/state/ListEmpty';
import { ListError } from '../../components/state/ListError';
import { ListLoading } from '../../components/state/ListLoading';
import { LoadingSection } from '../../components/state/LoadingSection';
import {
  channelSeenRepository,
  downloadsRepository,
  homeClipsCacheRepository,
  subscriptionsRepository,
} from '../../data/repositories';
import { downloadManager } from '../../downloads/downloadManager';
import { downloadStore } from '../../downloads/downloadStore';
import { useAddByRssPlayback } from '../../hooks/useAddByRssPlayback';
import { useLoadMoreOnEndReached } from '../../hooks/useLoadMoreOnEndReached';
import { addByRssLiveItemKey } from '../../lib/addByRss/liveItemDetail';
import { homeFeedRefresh } from '../../lib/home/homeFeedRefresh';
import {
  isHomeClipsUnavailableOffline,
  isHomeDownloadedItemsOnly,
  isHomeLivestreamsUnavailableOffline,
  OFFLINE_UNAVAILABLE_MESSAGE_KEY,
} from '../../lib/offlineModeViews';
import { canLoadNextPage, LIST_END_REACHED_THRESHOLD } from '../../lib/pagination/pagedList';
import { beginPerfChipSample, endPerfChipSample, stampPerfFrame } from '../../lib/perf/perfFrames';
import { perfMark } from '../../lib/perf/perfSpans';
import { buildPublicShareUrl, shareResolvedUrl } from '../../lib/share/shareNowPlaying';
import type { HomeStackParamList } from '../../navigation';
import {
  BROWSE_STACK_ROUTES,
  buildAlbumDetailParams,
  buildArtistDetailParams,
  buildPodcastDetailParams,
  buildTrackDetailParams,
  HOME_STACK_ROUTES,
  navigateToContentTab,
  navigateToSearchScreen,
} from '../../navigation';
import { useTabLayout } from '../../navigation/TabLayoutProvider';
import type {
  HomeClipsQuery,
  HomeListPrefs,
  HomeRangeOption,
  HomeSortOption,
  HomeViewMode,
} from '../../prefs/homeListPrefs';
import {
  DEFAULT_HOME_RANGE,
  DEFAULT_HOME_VIEW_MODE,
  defaultHomeSortFor,
  homeClipsPrefsChangeRefetches,
  homeClipsQueryFromPrefs,
  homeSortOptionsFor,
  isHomeFilterMediaType,
  isHomeSortableMediaType,
  isHomeViewModeMediaType,
  readHomeListPrefs,
  resolveHomeSort,
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
import { listFilterFieldBottomMargin, screenBodyInsets } from '../../theme/screenLayout';
import { typography } from '../../theme/typography';
import { useFeedListColumns } from '../../theme/useFeedListColumns';
import { useTheme } from '../../theme/useTheme';
import { useArtistUnsubscribe } from '../artist/useArtistUnsubscribe';
import type { BrowseMediaType } from '../browse/browseTypes';
import { HOME_MEDIA_TYPE_ORDER, MEDIA_TYPE_LABEL_KEYS } from '../browse/browseTypes';
import { useAddToPlaylist } from '../library/useAddToPlaylist';
import type { AddByRssItemActionTarget } from './addByRss/useAddByRssItemActions';
import { useAddByRssItemActions } from './addByRss/useAddByRssItemActions';
import type { HomeFeedRowData } from './homeFeedData';
import {
  EMPTY_HOME_ADD_BY_RSS_ITEMS,
  EMPTY_HOME_ADD_BY_RSS_LIVE_ITEMS,
  EMPTY_HOME_DIRECTORY_ITEMS,
  extendHomeFeed,
  fetchHomeFeed,
  fetchUnsubscribedDownloadHomeRows,
  isHomeFeedStaleRead,
  readDownloadedHomeItemFeed,
} from './homeFeedData';
import type { HomeFeedGridCellRemoveAction } from './HomeFeedGridCell';
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
import { homeItemDownloadItem, homeItemShareResource } from './homeItemRowActions';
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
  addByRssItemsById,
  addToPlaylistPress,
  artworkEdge,
  cellStyle,
  directoryItemsById,
  goToChannel,
  goToTrack,
  isGridView,
  mediaType,
  onMarkAsPlayed,
  onPlay,
  onPress,
  onQueue,
  onShare,
  onUnsubscribe,
  row,
  unsubscribeAction,
  unsubscribeLabel,
}: {
  addByRssItemsById: ReadonlyMap<string, { downloadItem: DTOItem | null }>;
  addToPlaylistPress?: (row: HomeFeedRowData) => void;
  artworkEdge: number;
  cellStyle: StyleProp<ViewStyle>;
  directoryItemsById: ReadonlyMap<string, DTOItem>;
  goToChannel?: (row: HomeFeedRowData) => void;
  goToTrack?: (row: HomeFeedRowData) => void;
  isGridView: boolean;
  mediaType: HomeMediaType;
  onMarkAsPlayed: (row: HomeFeedRowData) => void;
  onPlay: (row: HomeFeedRowData) => void;
  onPress: (row: HomeFeedRowData) => void;
  onQueue?: (row: HomeFeedRowData, position: QueueActionPosition) => void;
  onShare: (row: HomeFeedRowData) => void;
  onUnsubscribe: (row: HomeFeedRowData) => void;
  row: HomeFeedRowData;
  unsubscribeAction: HomeFeedGridCellRemoveAction;
  unsubscribeLabel: string;
}) {
  const handleRemove = useCallback(() => {
    onUnsubscribe(row);
  }, [onUnsubscribe, row]);

  let downloadItem: DTOItem | undefined;
  let shareResource: 'episode' | 'track' | null = null;
  const itemMediaType = mediaType === 'episodes' || mediaType === 'tracks' ? mediaType : null;
  const isItemListRow = !isGridView && itemMediaType !== null;
  const isLivestreamListRow = !isGridView && mediaType === 'livestreams';
  if (itemMediaType !== null && isItemListRow) {
    downloadItem = homeItemDownloadItem(row, { addByRssItemsById, directoryItemsById });
    shareResource = homeItemShareResource(row, itemMediaType);
  } else if (isLivestreamListRow) {
    shareResource = homeItemShareResource(row, 'livestreams');
  }

  const feedRow = isGridView ? (
    <HomeFeedGridCell
      artworkEdge={artworkEdge}
      onPress={onPress}
      removeAction={isHomeFilterMediaType(mediaType) ? unsubscribeAction : undefined}
      row={row}
    />
  ) : (
    <HomeFeedRow
      mediaType={mediaType}
      onAddToPlaylistPress={addToPlaylistPress}
      onGoToChannelPress={goToChannel}
      onGoToTrackPress={goToTrack}
      onPlayPress={onPlay}
      onPress={onPress}
      onQueuePress={onQueue}
      row={row}
      {...(isLivestreamListRow
        ? {
            onSharePress: shareResource !== null ? onShare : undefined,
          }
        : isItemListRow
          ? {
              onMarkAsPlayedPress: onMarkAsPlayed,
              onSharePress: shareResource !== null ? onShare : undefined,
              ...(downloadItem !== undefined
                ? {
                    downloadItem,
                    downloadTestID: `home-item-download-${row.id}`,
                  }
                : {}),
            }
          : {})}
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
  onDelete,
  onPlay,
  onPress,
  onQueue,
  row,
}: {
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
  const { visibleTabIds } = useTabLayout();
  const { accessToken, clearSession, refreshToken, setTokens, status } = useAuth();
  const { artistUnsubscribeDialog, unsubscribeArtist } = useArtistUnsubscribe();
  const { onRequestLogin } = useAuthPrompt();
  const { enabled: offlineModeEnabled } = useOfflineMode();
  const { requestSync, state: syncState } = useSync();
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
  const [feedHasMore, setFeedHasMore] = useState<boolean>(false);
  const [isFeedExtending, setIsFeedExtending] = useState<boolean>(false);
  const [feedExtendErrorKey, setFeedExtendErrorKey] = useState<string | null>(null);
  const [addByRssItemsById, setAddByRssItemsById] = useState(EMPTY_HOME_ADD_BY_RSS_ITEMS);
  const [addByRssLiveItemsById, setAddByRssLiveItemsById] = useState(
    EMPTY_HOME_ADD_BY_RSS_LIVE_ITEMS
  );
  const [directoryItemsById, setDirectoryItemsById] = useState(EMPTY_HOME_DIRECTORY_ITEMS);
  const [addByRssPlaybackNoticeKey, setAddByRssPlaybackNoticeKey] = useState<string | null>(null);
  const [unsubscribedDownloadRows, setUnsubscribedDownloadRows] = useState<HomeFeedRowData[]>([]);
  const [hasPodcastSubscriptions, setHasPodcastSubscriptions] = useState<boolean>(false);
  const [filterTerm, setFilterTerm] = useState<string>(readHomeFilterTerm);
  const [isFeedRefreshing, setIsFeedRefreshing] = useState<boolean>(false);
  const [hasCompletedFeedRead, setHasCompletedFeedRead] = useState<boolean>(false);
  const [feedErrorKey, setFeedErrorKey] = useState<string | null>(null);
  const [actionErrorKey, setActionErrorKey] = useState<string | null>(null);
  const feedRequestIdRef = useRef<number>(0);
  // Advanced by each extend and by a chip change, so a superseded extend does not set the loading
  // row, the end of the list, or an error on the list that replaced it.
  const extendRequestIdRef = useRef<number>(0);
  // Set when a Clips sort or window change leaves the saved list in an order the user turned away
  // from. Every Clips read fetches page 1 first while it is set, so Retry and returning to the chip
  // both finish the job.
  const pendingClipsRefetchRef = useRef<{
    prefsWritten: Promise<void>;
    query: HomeClipsQuery;
  } | null>(null);
  const hasLoadedFeedOnceRef = useRef(false);
  const isFeedRefreshingRef = useRef(false);
  const unsubscribingIdsRef = useRef<Set<string>>(new Set());
  const { playbackNoticeKey, runMarkAsPlayedAction, runPlayAction, runQueueAction } =
    useHomeRowPlayback();
  const { playItem: playAddByRssItem, playLiveItem: playAddByRssLiveItem } = useAddByRssPlayback({
    onNotice: setAddByRssPlaybackNoticeKey,
  });
  const {
    actionNoticeKey: addByRssActionNoticeKey,
    addToPlaylist: addAddByRssToPlaylist,
    addToPlaylistSheet: addByRssAddToPlaylistSheet,
    markAsPlayed: markAddByRssAsPlayed,
    queue: queueAddByRssItem,
  } = useAddByRssItemActions();
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
          sort: defaultHomeSortFor(selectedMediaType),
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
            sort: defaultHomeSortFor(selectedMediaType),
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
    extendRequestIdRef.current += 1;

    // Tearing down the old rows is the expensive part of a switch; it runs under the pending
    // spinner, and the pending state hands off to the busy spinner in this same commit.
    setPendingMediaType(null);
    setSelectedMediaType(mediaType);
    setFeedRows([]);
    setFeedHasMore(false);
    setIsFeedExtending(false);
    setFeedExtendErrorKey(null);
    setAddByRssItemsById(EMPTY_HOME_ADD_BY_RSS_ITEMS);
    setAddByRssLiveItemsById(EMPTY_HOME_ADD_BY_RSS_LIVE_ITEMS);
    setDirectoryItemsById(EMPTY_HOME_DIRECTORY_ITEMS);
    setAddByRssPlaybackNoticeKey(null);
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

  // The saved clips are in the order the user just turned away from, so they leave with the tap
  // and the list spins until loadFeed has fetched page 1 in the new order and read it back.
  const startClipsRefetchIfNeeded = useCallback(
    (next: Pick<HomeListPrefs, 'range' | 'sort'>, prefsWritten: Promise<void>) => {
      if (
        !homeClipsPrefsChangeRefetches({
          isAuthenticated: status === 'authenticated',
          mediaType: selectedMediaType,
          next,
          offlineModeEnabled,
          previous: { range: resolvedPrefs.range, sort: resolvedPrefs.sort },
        })
      ) {
        return;
      }
      feedRequestIdRef.current += 1;
      extendRequestIdRef.current += 1;
      // A failed preference write costs only the remembered choice on relaunch; the refetch uses
      // the query in hand.
      pendingClipsRefetchRef.current = {
        prefsWritten: prefsWritten.catch(() => undefined),
        query: homeClipsQueryFromPrefs(next),
      };
      setFeedRows([]);
      setFeedErrorKey(null);
      setHasCompletedFeedRead(false);
      setFeedHasMore(false);
      setIsFeedExtending(false);
      setFeedExtendErrorKey(null);
    },
    [offlineModeEnabled, resolvedPrefs.range, resolvedPrefs.sort, selectedMediaType, status]
  );

  const handleSortChange = useCallback(
    (sort: HomeSortOption) => {
      // Applied here as well as written, so the list redraws on the tap rather than after the
      // storage round trip. The write is still what a relaunch reads.
      setListPrefs((current) => (current === null ? current : { ...current, sort }));
      const prefsWritten = writeHomeSort(selectedMediaType, sort);
      startClipsRefetchIfNeeded({ range: resolvedPrefs.range, sort }, prefsWritten);
    },
    [resolvedPrefs.range, selectedMediaType, startClipsRefetchIfNeeded]
  );

  const handleRangeChange = useCallback(
    (range: HomeRangeOption) => {
      setListPrefs((current) =>
        current === null ? current : { ...current, range, sort: 'popularity' }
      );
      const prefsWritten = writeHomeRange(selectedMediaType, range);
      startClipsRefetchIfNeeded({ range, sort: 'popularity' }, prefsWritten);
    },
    [selectedMediaType, startClipsRefetchIfNeeded]
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

  const handleSearchPress = useCallback((medium: 'all' | 'music' = 'all') => {
    navigateToSearchScreen({ autoFocus: true, medium });
  }, []);

  const handleBrowsePress = useCallback(
    (mediaType: BrowseMediaType) => {
      navigateToContentTab(navigation, visibleTabIds, {
        params: {
          params: { mediaType },
          screen: BROWSE_STACK_ROUTES.BrowseRoot,
        },
        tabId: 'Browse',
      });
    },
    [navigation, visibleTabIds]
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
        if (
          offlineModeEnabled &&
          (isHomeClipsUnavailableOffline(selectedMediaType) ||
            isHomeLivestreamsUnavailableOffline(selectedMediaType))
        ) {
          if (requestId !== feedRequestIdRef.current) {
            return;
          }
          setFeedRows([]);
          setFeedHasMore(false);
          setAddByRssItemsById(EMPTY_HOME_ADD_BY_RSS_ITEMS);
          setAddByRssLiveItemsById(EMPTY_HOME_ADD_BY_RSS_LIVE_ITEMS);
          setDirectoryItemsById(EMPTY_HOME_DIRECTORY_ITEMS);
          setUnsubscribedDownloadRows([]);
          setHasCompletedFeedRead(true);
        } else {
          // The refetch is a network request, so it runs outside the local read budget under the
          // request helper's own timeout. A failure shows the error for every source: the rows
          // left with the tap, and an empty list without the error would read as "no clips".
          // `'stale'` keeps the entry, so the next Clips read fetches again if this query is still
          // the one waiting.
          const pendingClipsRefetch = pendingClipsRefetchRef.current;
          if (selectedMediaType === 'clips' && pendingClipsRefetch !== null) {
            if (status !== 'authenticated') {
              pendingClipsRefetchRef.current = null;
            } else {
              let outcome: 'replaced' | 'stale';
              try {
                await pendingClipsRefetch.prefsWritten;
                outcome = await homeClipsCacheRepository.refreshFromAccount(
                  { accessToken, clearSession, refreshToken, setTokens },
                  pendingClipsRefetch.query
                );
              } catch (error) {
                if (requestId !== feedRequestIdRef.current) {
                  return;
                }
                appendHomeFeedReadFailure({
                  error,
                  mediaType: selectedMediaType,
                  source: `${source}-clips-refetch`,
                });
                setFeedRows([]);
                setFeedHasMore(false);
                setAddByRssItemsById(EMPTY_HOME_ADD_BY_RSS_ITEMS);
                setAddByRssLiveItemsById(EMPTY_HOME_ADD_BY_RSS_LIVE_ITEMS);
                setDirectoryItemsById(EMPTY_HOME_DIRECTORY_ITEMS);
                setHasCompletedFeedRead(true);
                setFeedErrorKey('errors.generic');
                return;
              }
              if (
                outcome === 'replaced' &&
                pendingClipsRefetchRef.current === pendingClipsRefetch
              ) {
                pendingClipsRefetchRef.current = null;
              }
              if (requestId !== feedRequestIdRef.current) {
                return;
              }
            }
          }
          const read = await withHomeFeedReadBudget(
            offlineModeEnabled && isHomeDownloadedItemsOnly(selectedMediaType)
              ? readDownloadedHomeItemFeed(selectedMediaType)
              : fetchHomeFeed(selectedMediaType, {
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
          setFeedRows(read.rows);
          setFeedHasMore(read.hasMore);
          setAddByRssItemsById(read.addByRssItemsById);
          setAddByRssLiveItemsById(read.addByRssLiveItemsById);
          setDirectoryItemsById(read.directoryItemsById);
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
            setHasPodcastSubscriptions(read.rows.length > 0);
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
        setFeedHasMore(false);
        setAddByRssItemsById(EMPTY_HOME_ADD_BY_RSS_ITEMS);
        setAddByRssLiveItemsById(EMPTY_HOME_ADD_BY_RSS_LIVE_ITEMS);
        setDirectoryItemsById(EMPTY_HOME_DIRECTORY_ITEMS);
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
    [
      accessToken,
      clearSession,
      offlineModeEnabled,
      refreshToken,
      requestSync,
      resolvedPrefs.range,
      resolvedPrefs.sort,
      selectedMediaType,
      setTokens,
      status,
    ]
  );

  const loadFeedRef = useRef(loadFeed);
  loadFeedRef.current = loadFeed;

  // Scrolling near the bottom deepens the stored snapshot, then rereads it. The network page never
  // goes into screen state, so the deeper list is the same one Home shows offline.
  const extendFeed = useCallback(async () => {
    if (
      status !== 'authenticated' ||
      offlineModeEnabled ||
      (selectedMediaType !== 'clips' && selectedMediaType !== 'livestreams')
    ) {
      return;
    }
    const mediaType = selectedMediaType;
    const extendRequestId = extendRequestIdRef.current + 1;
    extendRequestIdRef.current = extendRequestId;
    setIsFeedExtending(true);
    setFeedExtendErrorKey(null);
    try {
      const outcome = await extendHomeFeed(mediaType, {
        accessToken,
        clearSession,
        refreshToken,
        setTokens,
      });
      if (outcome === 'end') {
        if (extendRequestId === extendRequestIdRef.current) {
          setFeedHasMore(false);
        }
        return;
      }
      // A stale outcome means a sync or sign-out rewrote the snapshot; the reread shows that.
      // loadFeed checks its own request id, so it reads whichever chip is selected by then.
      await loadFeedRef.current('synced');
    } catch {
      if (extendRequestId === extendRequestIdRef.current) {
        setFeedExtendErrorKey('errors.generic');
      }
    } finally {
      if (extendRequestId === extendRequestIdRef.current) {
        setIsFeedExtending(false);
      }
    }
  }, [
    accessToken,
    clearSession,
    offlineModeEnabled,
    refreshToken,
    selectedMediaType,
    setTokens,
    status,
  ]);

  const handleFeedEndReached = useLoadMoreOnEndReached({
    canLoadMore:
      (selectedMediaType === 'clips' || selectedMediaType === 'livestreams') &&
      status === 'authenticated' &&
      !offlineModeEnabled &&
      pendingMediaType === null &&
      canLoadNextPage({
        hasError: feedErrorKey !== null || feedExtendErrorKey !== null,
        hasMore: feedHasMore,
        isLoading: isFeedRefreshing,
        isLoadingMore: isFeedExtending,
      }),
    loadMore: extendFeed,
  });

  const handleRetryExtend = useCallback(() => {
    void extendFeed();
  }, [extendFeed]);

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
        let serverError: boolean;
        if (selectedMediaType === 'artists') {
          const result = await unsubscribeArtist(
            row.source === 'addByRss'
              ? { feedUrl: row.id, source: 'addByRss', title: row.title }
              : { idText: row.id, source: 'directory', title: row.title }
          );
          if (result.status === 'cancelled') {
            return;
          }
          serverError = result.serverError;
        } else {
          const result = await subscriptionsRepository.unsubscribe({
            accountSync:
              status === 'authenticated'
                ? { accessToken, clearSession, refreshToken, setTokens }
                : undefined,
            idText: row.id,
            source: row.source ?? 'directory',
          });
          serverError = result.serverError;
        }
        setFeedRows((prev) => prev.filter((item) => item.id !== row.id));
        if (selectedMediaType === 'podcasts') {
          setHasPodcastSubscriptions(feedRows.length > 1);
          try {
            setUnsubscribedDownloadRows(await fetchUnsubscribedDownloadHomeRows());
          } catch {
            // The follow is already gone; the downloads footer can catch up on the next refresh.
          }
        }
        if (serverError) {
          setActionErrorKey('errors.generic');
        }
      } catch {
        setActionErrorKey('errors.generic');
        throw new Error('Unsubscribe failed');
      } finally {
        unsubscribingIdsRef.current.delete(row.id);
      }
    },
    [
      accessToken,
      clearSession,
      feedRows.length,
      refreshToken,
      selectedMediaType,
      setTokens,
      status,
      unsubscribeArtist,
    ]
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
      if (
        row.source === 'addByRss' &&
        (selectedMediaType === 'podcasts' ||
          selectedMediaType === 'artists' ||
          selectedMediaType === 'albums')
      ) {
        navigation.navigate(HOME_STACK_ROUTES.AddByRssPodcastDetail, {
          feedIdText: row.sourceId ?? row.id,
        });
        return;
      }

      if (
        row.source === 'addByRss' &&
        (selectedMediaType === 'episodes' || selectedMediaType === 'tracks')
      ) {
        const item = addByRssItemsById.get(row.id);
        if (item === undefined) {
          return;
        }
        if (selectedMediaType === 'episodes') {
          navigation.navigate(HOME_STACK_ROUTES.AddByRssEpisodeDetail, {
            feedIdText: item.feed.idText,
            itemKey: item.itemKey,
          });
          return;
        }
        void playAddByRssItem(item.feed, item.mappedFeed, item.itemBundle, item.itemIndex);
        return;
      }

      if (selectedMediaType === 'podcasts') {
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

      if (selectedMediaType === 'livestreams') {
        if (row.source !== 'addByRss') {
          navigation.navigate(HOME_STACK_ROUTES.EpisodeDetail, { episodeId: row.id });
          return;
        }
        const target = addByRssLiveItemsById.get(row.id);
        if (target === undefined) {
          return;
        }
        navigation.navigate(HOME_STACK_ROUTES.AddByRssLivestreamDetail, {
          feedIdText: target.feed.idText,
          liveItemKey: addByRssLiveItemKey(target.liveBundle, target.liveIndex),
        });
        return;
      }

      runPlayAction(row, 'tracks');
    },
    [
      addByRssItemsById,
      addByRssLiveItemsById,
      navigation,
      playAddByRssItem,
      runPlayAction,
      selectedMediaType,
    ]
  );

  const findAddByRssTarget = useCallback(
    (row: HomeFeedRowData): AddByRssItemActionTarget | null => {
      if (row.source !== 'addByRss') {
        return null;
      }
      const item = addByRssItemsById.get(row.id);
      if (item === undefined) {
        return null;
      }
      return {
        feed: item.feed,
        itemBundle: item.itemBundle,
        itemIndex: item.itemIndex,
        mappedFeed: item.mappedFeed,
      };
    },
    [addByRssItemsById]
  );

  const handleGoToTrack = useCallback(
    (row: HomeFeedRowData) => {
      if (row.source === 'addByRss') {
        const item = addByRssItemsById.get(row.id);
        if (item === undefined) {
          return;
        }
        navigation.navigate(HOME_STACK_ROUTES.AddByRssTrackDetail, {
          feedIdText: item.feed.idText,
          itemKey: item.itemKey,
        });
        return;
      }
      navigation.navigate(
        HOME_STACK_ROUTES.TrackDetail,
        buildTrackDetailParams({
          previewImageUrl: row.imageUrl,
          previewTitle: row.title,
          trackId: row.id,
        })
      );
    },
    [addByRssItemsById, navigation]
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
      if (selectedMediaType === 'livestreams') {
        if (nextRow.source === 'addByRss') {
          const target = addByRssLiveItemsById.get(nextRow.id);
          if (target !== undefined) {
            void playAddByRssLiveItem(
              target.feed,
              target.mappedFeed,
              target.liveBundle,
              target.liveIndex
            );
          }
          return;
        }
        runPlayAction(nextRow, 'episodes');
        return;
      }
      if (nextRow.source === 'addByRss') {
        const target = findAddByRssTarget(nextRow);
        if (target !== null) {
          void playAddByRssItem(
            target.feed,
            target.mappedFeed,
            target.itemBundle,
            target.itemIndex
          );
        }
        return;
      }
      runPlayAction(nextRow, selectedMediaType);
    },
    [
      addByRssLiveItemsById,
      findAddByRssTarget,
      playAddByRssItem,
      playAddByRssLiveItem,
      runPlayAction,
      selectedMediaType,
    ]
  );

  const handleMarkAsPlayedPress = useCallback(
    (row: HomeFeedRowData) => {
      if (selectedMediaType !== 'episodes' && selectedMediaType !== 'tracks') {
        return;
      }
      if (row.source === 'addByRss') {
        const target = findAddByRssTarget(row);
        if (target !== null) {
          markAddByRssAsPlayed(target);
        }
        return;
      }
      runMarkAsPlayedAction(row, selectedMediaType);
    },
    [findAddByRssTarget, markAddByRssAsPlayed, runMarkAsPlayedAction, selectedMediaType]
  );

  const handleSharePress = useCallback(
    (row: HomeFeedRowData) => {
      if (
        selectedMediaType !== 'episodes' &&
        selectedMediaType !== 'tracks' &&
        selectedMediaType !== 'livestreams'
      ) {
        return;
      }
      const resource = homeItemShareResource(row, selectedMediaType);
      if (resource === null) {
        return;
      }
      shareResolvedUrl(buildPublicShareUrl(resource, row.id));
    },
    [selectedMediaType]
  );

  const handleQueuePress = useCallback(
    (nextRow: HomeFeedRowData, position: QueueActionPosition) => {
      if (nextRow.source === 'addByRss') {
        const target = findAddByRssTarget(nextRow);
        if (target !== null) {
          queueAddByRssItem(target, position);
        }
        return;
      }
      runQueueAction(nextRow, selectedMediaType, position);
    },
    [findAddByRssTarget, queueAddByRssItem, runQueueAction, selectedMediaType]
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
      if (nextRow.source === 'addByRss') {
        const target = findAddByRssTarget(nextRow);
        if (target !== null) {
          addAddByRssToPlaylist(target);
        }
        return;
      }
      if (addToPlaylistTarget === null) {
        return;
      }
      requestAddToPlaylist({
        idText: nextRow.id,
        kind: addToPlaylistTarget.kind,
        medium: addToPlaylistTarget.medium,
      });
    },
    [addAddByRssToPlaylist, addToPlaylistTarget, findAddByRssTarget, requestAddToPlaylist]
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
  const { cellWidth, columns, onListLayout } = useFeedListColumns({
    gap: tokens.spacing.md,
    horizontalInset: tokens.spacing.lg,
    isGridView,
  });

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
        width: cellWidth,
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
        ...StyleSheet.absoluteFill,
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
        fontWeight: '400',
        marginBottom: tokens.spacing.sm,
      },
    });
  }, [cellWidth, isGridView, themeStyles, tokens]);

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
  // Offline Mode parks Clips and Livestreams (account-backed network lists).
  const showNetworkListOfflineUnavailable =
    offlineModeEnabled &&
    (isHomeClipsUnavailableOffline(selectedMediaType) ||
      isHomeLivestreamsUnavailableOffline(selectedMediaType));
  const showClipsLogin =
    !showNetworkListOfflineUnavailable &&
    selectedMediaType === 'clips' &&
    status !== 'authenticated' &&
    hasPodcastSubscriptions;
  const showNoSubscriptions =
    !isFeedBusy &&
    !showNetworkListOfflineUnavailable &&
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
          <ListFilterHeader
            hasItemsBelow={
              !isGridView && (visibleRows.length > 0 || showNoFilterMatches)
            }
            style={styles.filterRow}
          >
            <ListFilterField
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
      isGridView,
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
      // Centered loading lives in the list-area overlay for the whole showsLoading interval.
      isFeedBusy ? null : showNetworkListOfflineUnavailable ? (
        <ListEmpty
          messageKey={OFFLINE_UNAVAILABLE_MESSAGE_KEY}
          testID={
            selectedMediaType === 'livestreams'
              ? 'home-livestreams-offline-unavailable'
              : 'home-clips-offline-unavailable'
          }
        />
      ) : showNoSubscriptions &&
        selectedMediaType === 'livestreams' &&
        status === 'authenticated' ? (
        <ListEmpty
          messageKey="media.livestream.no_livestreams_found"
          testID="home-livestreams-empty"
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
      selectedMediaType,
      showClipsLogin,
      showNetworkListOfflineUnavailable,
      showNoSubscriptions,
      showSearchOnEmpty,
      status,
    ]
  );

  const unsubscribedDownloadCount = unsubscribedDownloadRows.length;
  const homeNoticeKey = addByRssActionNoticeKey ?? addByRssPlaybackNoticeKey ?? playbackNoticeKey;
  const deleteAllAction = useMemo<HomeFeedGridCellRemoveAction>(
    () => ({
      label: t('features.download.delete_all'),
      onRemove: handleDeleteUnsubscribedDownloads,
    }),
    [handleDeleteUnsubscribedDownloads, t]
  );

  const listFooter = useMemo(
    () => (
      <>
        {isFeedExtending ? (
          <ListLoading testID="home-feed-loading-more" />
        ) : feedExtendErrorKey !== null ? (
          <ListError
            messageKey={feedExtendErrorKey}
            onRetry={handleRetryExtend}
            testID="home-feed-load-more-error"
          />
        ) : null}
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
                      artworkEdge={cellWidth}
                      onPress={handleRowPress}
                      removeAction={deleteAllAction}
                      row={row}
                      testID={`home-unsubscribed-download-cell-${row.id}`}
                    />
                  </View>
                ))}
              </View>
            ) : (
              unsubscribedDownloadRows.map((row) => (
                <HomeUnsubscribedDownloadRow
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
        {homeNoticeKey !== null ? <Text style={styles.feedNotice}>{t(homeNoticeKey)}</Text> : null}
      </>
    ),
    [
      deleteAllAction,
      feedExtendErrorKey,
      feedRows.length,
      handleDeleteUnsubscribedDownloads,
      handlePodcastPlayPress,
      handlePodcastQueuePress,
      handleRetryExtend,
      handleRowPress,
      homeNoticeKey,
      isFeedExtending,
      isGridView,
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

  const rowAddToPlaylistPress =
    status === 'authenticated' && addToPlaylistTarget !== null
      ? handleAddToPlaylistPress
      : undefined;
  const rowGoToChannel = selectedMediaType === 'tracks' ? handleGoToChannel : undefined;
  const rowGoToTrack = selectedMediaType === 'tracks' ? handleGoToTrack : undefined;
  const unsubscribeLabel = t('features.unsubscribe');
  const unsubscribeAction = useMemo<HomeFeedGridCellRemoveAction>(
    () => ({ label: unsubscribeLabel, onRemove: handleUnsubscribe }),
    [handleUnsubscribe, unsubscribeLabel]
  );
  const feedCellStyle = columns > 1 ? styles.columnCell : undefined;

  const renderItem = useCallback(
    ({ item: row }: { item: HomeFeedRowData }) => (
      <HomeFeedListItem
        addByRssItemsById={addByRssItemsById}
        addToPlaylistPress={rowAddToPlaylistPress}
        artworkEdge={cellWidth}
        cellStyle={feedCellStyle}
        directoryItemsById={directoryItemsById}
        goToChannel={rowGoToChannel}
        goToTrack={rowGoToTrack}
        isGridView={isGridView}
        mediaType={selectedMediaType}
        onMarkAsPlayed={handleMarkAsPlayedPress}
        onPlay={handlePlayPress}
        onPress={handleRowPress}
        onQueue={selectedMediaType === 'livestreams' ? undefined : handleQueuePress}
        onShare={handleSharePress}
        onUnsubscribe={handleUnsubscribe}
        row={row}
        unsubscribeAction={unsubscribeAction}
        unsubscribeLabel={unsubscribeLabel}
      />
    ),
    [
      addByRssItemsById,
      cellWidth,
      directoryItemsById,
      feedCellStyle,
      handleMarkAsPlayedPress,
      handlePlayPress,
      handleQueuePress,
      handleRowPress,
      handleSharePress,
      handleUnsubscribe,
      isGridView,
      rowAddToPlaylistPress,
      rowGoToChannel,
      rowGoToTrack,
      selectedMediaType,
      unsubscribeAction,
      unsubscribeLabel,
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
        onEndReached={handleFeedEndReached}
        onEndReachedThreshold={LIST_END_REACHED_THRESHOLD}
        onLayout={onListLayout}
        refreshControl={refreshControl}
        renderItem={renderItem}
        testID="home-feed-list"
      />
    ),
    [
      columns,
      gridViewLabel,
      handleFeedEndReached,
      listData,
      listEmpty,
      listFooter,
      listHeader,
      onListLayout,
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
                  options={homeSortOptionsFor(displayedMediaType)}
                  range={resolvedPrefs.range}
                  sort={resolveHomeSort(displayedMediaType, resolvedPrefs.sort)}
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
          importantForAccessibility={showsLoading ? 'no-hide-descendants' : 'auto'}
          pointerEvents={showsLoading ? 'none' : 'auto'}
          style={[styles.listArea, showsLoading ? styles.listAreaHidden : null]}
        >
          {feedList}
        </View>
        {showsLoading ? (
          <View style={styles.pendingOverlay}>
            <LoadingSection testID="home-feed-loading" />
          </View>
        ) : null}
      </View>
      {addToPlaylistSheet}
      {addByRssAddToPlaylistSheet}
      {artistUnsubscribeDialog}
    </View>
  );
}
