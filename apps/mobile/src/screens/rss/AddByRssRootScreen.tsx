import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { StyleProp, ViewStyle } from 'react-native';
import { RefreshControl, StyleSheet, Text, View } from 'react-native';

import { matchesTitleFilter } from '@podverse/helpers';
import type { DTOItem } from '@podverse/helpers/dto';

import { useAuthPrompt } from '../../auth/AuthPromptContext';
import { useAuth } from '../../auth/AuthProvider';
import { AddByRssNeedsCredentialsSection } from '../../components/content/AddByRssNeedsCredentialsSection';
import type { MenuSelectChipOption } from '../../components/form';
import {
  ChipAction,
  ChipRowWithActions,
  ListFilterField,
  ListFilterHeader,
  MenuSelectChip,
} from '../../components/form';
import { FillList, SwipeActionRow } from '../../components/primitives';
import { ListEmpty } from '../../components/state/ListEmpty';
import { ListError } from '../../components/state/ListError';
import { LoadingSection } from '../../components/state/LoadingSection';
import { subscriptionsRepository } from '../../data/repositories';
import { useAddByRssPlayback } from '../../hooks/useAddByRssPlayback';
import { addByRssLiveItemKey } from '../../lib/addByRss/liveItemDetail';
import type { AddByRssLiveTarget } from '../../lib/addByRss/liveRows';
import { homeFeedRefresh } from '../../lib/home/homeFeedRefresh';
import { useMembershipGate } from '../../membership/MembershipGateProvider';
import { useAccessTier } from '../../membership/useAccessTier';
import type { LibraryStackParamList } from '../../navigation';
import { LIBRARY_STACK_ROUTES } from '../../navigation';
import type { MobileAddByRSSFeedRecord } from '../../prefs/addByRSSFeeds';
import type {
  AddByRssLibraryMediaType,
  AddByRssLibrarySortOption,
  AddByRssLibraryViewMode,
} from '../../prefs/addByRssListPrefs';
import {
  ADD_BY_RSS_LIBRARY_MEDIA_TYPES,
  ADD_BY_RSS_LIBRARY_SORT_OPTIONS,
  addByRssLibraryEmptyMessageKey,
  DEFAULT_ADD_BY_RSS_LIBRARY_MEDIA_TYPE,
  DEFAULT_ADD_BY_RSS_LIBRARY_SORT,
  DEFAULT_ADD_BY_RSS_LIBRARY_VIEW_MODE,
  isAddByRssLibraryFilterMediaType,
  isAddByRssLibrarySortableMediaType,
  isAddByRssLibraryViewModeMediaType,
  readAddByRssLibraryListPrefs,
  subscribeAddByRssLibraryListPrefs,
  writeAddByRssLibrarySort,
  writeAddByRssLibraryViewMode,
} from '../../prefs/addByRssListPrefs';
import { useSync } from '../../sync';
import { resolveGridCellWidth, resolveGridColumns } from '../../theme/resolveColumns';
import { listFilterFieldBottomMargin, screenBodyInsets } from '../../theme/screenLayout';
import { typography } from '../../theme/typography';
import { useResponsive } from '../../theme/useResponsive';
import { useTheme } from '../../theme/useTheme';
import { useArtistUnsubscribe } from '../artist/useArtistUnsubscribe';
import { MEDIA_TYPE_LABEL_KEYS } from '../browse/browseTypes';
import { useAddByRssItemActions } from '../home/addByRss/useAddByRssItemActions';
import type { AddByRssItemRow } from '../home/addByRssItemRows';
import type { HomeFeedRowData } from '../home/homeFeedData';
import type { HomeFeedGridCellRemoveAction } from '../home/HomeFeedGridCell';
import { HomeFeedGridCell } from '../home/HomeFeedGridCell';
import { HomeFeedRow } from '../home/HomeFeedRow';
import { HomeOverflowMenu } from '../home/HomeOverflowMenu';
import { MediaTypeSelector } from '../home/MediaTypeSelector';
import type { QueueActionPosition } from '../home/useHomeRowPlayback';
import { fetchAddByRssLibraryFeed } from './addByRssLibraryFeedData';

type AddByRssRootScreenProps = NativeStackScreenProps<LibraryStackParamList, 'AddByRssRoot'>;

type ListPrefsState = {
  mediaType: AddByRssLibraryMediaType;
  sort: AddByRssLibrarySortOption;
  viewMode: AddByRssLibraryViewMode;
};

const SORT_LABEL_KEYS: Record<AddByRssLibrarySortOption, string> = {
  alphabetical: 'filters.sort.a_z',
  recent: 'filters.sort.recent',
};

const EMPTY_ROWS: readonly HomeFeedRowData[] = [];
const feedRowKeyExtractor = (row: HomeFeedRowData): string => row.id;
const noopPlayPress = (_row: HomeFeedRowData): void => undefined;
const noopQueuePress = (_row: HomeFeedRowData, _position: QueueActionPosition): void => undefined;

function LibraryFeedListItem({
  artworkEdge,
  cellStyle,
  downloadItem,
  index,
  isGridView,
  mediaType,
  onAddToPlaylist,
  onGoToTrack,
  onMarkAsPlayed,
  onPlay,
  onPress,
  onQueue,
  onUnsubscribe,
  removeAction,
  row,
  unsubscribeLabel,
}: {
  artworkEdge: number;
  cellStyle: StyleProp<ViewStyle>;
  downloadItem?: DTOItem;
  index: number;
  isGridView: boolean;
  mediaType: AddByRssLibraryMediaType;
  onAddToPlaylist?: (row: HomeFeedRowData) => void;
  onGoToTrack?: (row: HomeFeedRowData) => void;
  onMarkAsPlayed?: (row: HomeFeedRowData) => void;
  onPlay?: (row: HomeFeedRowData) => void;
  onPress: (row: HomeFeedRowData) => void;
  onQueue?: (row: HomeFeedRowData, position: QueueActionPosition) => void;
  onUnsubscribe?: (row: HomeFeedRowData) => Promise<void>;
  removeAction?: HomeFeedGridCellRemoveAction;
  row: HomeFeedRowData;
  unsubscribeLabel: string;
}) {
  const handleRemove = useCallback(() => onUnsubscribe?.(row), [onUnsubscribe, row]);

  if (isGridView) {
    return (
      <View style={cellStyle}>
        <HomeFeedGridCell
          artworkEdge={artworkEdge}
          onPress={onPress}
          removeAction={removeAction}
          row={row}
        />
      </View>
    );
  }

  const feedRow = (
    <HomeFeedRow
      downloadItem={downloadItem}
      downloadTestID={downloadItem !== undefined ? `rss-item-download-${index}` : undefined}
      mediaType={mediaType}
      onAddToPlaylistPress={onAddToPlaylist}
      onGoToTrackPress={onGoToTrack}
      onMarkAsPlayedPress={onMarkAsPlayed}
      onPlayPress={onPlay ?? noopPlayPress}
      onPress={onPress}
      onQueuePress={onQueue ?? noopQueuePress}
      row={row}
    />
  );

  return (
    <View style={cellStyle}>
      {onUnsubscribe !== undefined ? (
        <SwipeActionRow
          actionTestID={`rss-feed-row-${row.id}-unsubscribe`}
          onRemove={handleRemove}
          removeLabel={unsubscribeLabel}
          testID={`rss-feed-row-${row.id}-swipe`}
        >
          {feedRow}
        </SwipeActionRow>
      ) : (
        feedRow
      )}
    </View>
  );
}

/**
 * Add by RSS library: Home-style chips for followed feeds only. Add Feed and Check for Updates
 * sit with those chips. Pull-to-refresh refreshes these feeds alone; Home pull still refreshes
 * everything.
 */
export function AddByRssRootScreen({ navigation }: AddByRssRootScreenProps) {
  const { t } = useTranslation();
  const { onRequestLogin } = useAuthPrompt();
  const { accessToken, clearSession, refreshToken, setTokens, status } = useAuth();
  const { artistUnsubscribeDialog, unsubscribeArtist } = useArtistUnsubscribe();
  const { columns: rowColumns, width } = useResponsive();
  const { styles: themeStyles, tokens } = useTheme();
  const { requestSync, state: syncState } = useSync();
  const { openGate } = useMembershipGate();
  const { evaluateFeature } = useAccessTier();
  const addAccess = evaluateFeature('add_by_rss_add');

  const [selectedMediaType, setSelectedMediaType] = useState<AddByRssLibraryMediaType>(
    DEFAULT_ADD_BY_RSS_LIBRARY_MEDIA_TYPE
  );
  const [listPrefs, setListPrefs] = useState<ListPrefsState | null>(null);
  const [feedRows, setFeedRows] = useState<HomeFeedRowData[]>([]);
  const [itemRowsById, setItemRowsById] = useState<ReadonlyMap<string, AddByRssItemRow>>(
    () => new Map()
  );
  const [liveItemsById, setLiveItemsById] = useState<ReadonlyMap<string, AddByRssLiveTarget>>(
    () => new Map()
  );
  const [needsCredentials, setNeedsCredentials] = useState<
    { feed: MobileAddByRSSFeedRecord; need: 'missing' | 'rejected' }[]
  >([]);
  const [filterTerm, setFilterTerm] = useState<string>('');
  const [feedErrorKey, setFeedErrorKey] = useState<string | null>(null);
  const [hasCompletedFeedRead, setHasCompletedFeedRead] = useState<boolean>(false);
  const [isFeedRefreshing, setIsFeedRefreshing] = useState<boolean>(false);
  const [playbackNoticeKey, setPlaybackNoticeKey] = useState<string | null>(null);
  const [actionErrorKey, setActionErrorKey] = useState<string | null>(null);
  const feedRequestIdRef = useRef(0);
  const isFeedRefreshingRef = useRef(false);
  const unsubscribingIdsRef = useRef<Set<string>>(new Set());

  const { playItem, playLiveItem } = useAddByRssPlayback({ onNotice: setPlaybackNoticeKey });
  const { actionNoticeKey, addToPlaylist, addToPlaylistSheet, markAsPlayed, queue } =
    useAddByRssItemActions();

  const resolvedPrefs: ListPrefsState =
    listPrefs !== null && listPrefs.mediaType === selectedMediaType
      ? listPrefs
      : {
          mediaType: selectedMediaType,
          sort: DEFAULT_ADD_BY_RSS_LIBRARY_SORT,
          viewMode: DEFAULT_ADD_BY_RSS_LIBRARY_VIEW_MODE,
        };

  const arePrefsHydrated = listPrefs !== null && listPrefs.mediaType === selectedMediaType;
  const viewModeEligible = isAddByRssLibraryViewModeMediaType(selectedMediaType);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const stored = await readAddByRssLibraryListPrefs(selectedMediaType);
      if (cancelled) {
        return;
      }
      setListPrefs({ ...stored, mediaType: selectedMediaType });
    })();
    const unsubscribe = subscribeAddByRssLibraryListPrefs(selectedMediaType, () => {
      void readAddByRssLibraryListPrefs(selectedMediaType).then((stored) => {
        setListPrefs({ ...stored, mediaType: selectedMediaType });
      });
    });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [selectedMediaType]);

  const loadFeed = useCallback(
    async (source: 'initial' | 'refresh' | 'retry' | 'synced') => {
      const requestId = feedRequestIdRef.current + 1;
      feedRequestIdRef.current = requestId;

      if (source === 'refresh') {
        if (isFeedRefreshingRef.current) {
          return;
        }
        isFeedRefreshingRef.current = true;
        setIsFeedRefreshing(true);
        requestSync('add-by-rss-pull-to-refresh');
      }

      if (requestId === feedRequestIdRef.current) {
        setFeedErrorKey(null);
      }

      try {
        const result = await fetchAddByRssLibraryFeed(selectedMediaType, resolvedPrefs.sort);
        if (requestId !== feedRequestIdRef.current) {
          return;
        }
        setFeedRows(result.rows);
        setItemRowsById(result.itemRowsById);
        setLiveItemsById(result.liveItemsById);
        setNeedsCredentials(result.needsCredentials);
        setHasCompletedFeedRead(true);
      } catch {
        if (requestId !== feedRequestIdRef.current) {
          return;
        }
        setFeedErrorKey('errors.generic');
        setHasCompletedFeedRead(true);
      } finally {
        if (source === 'refresh') {
          isFeedRefreshingRef.current = false;
          setIsFeedRefreshing(false);
        }
      }
    },
    [requestSync, resolvedPrefs.sort, selectedMediaType]
  );

  const handleCheckUpdates = useCallback(() => {
    if (status !== 'authenticated') {
      onRequestLogin();
      return;
    }
    void loadFeed('refresh');
  }, [loadFeed, onRequestLogin, status]);

  useEffect(() => {
    if (!arePrefsHydrated) {
      return;
    }
    setHasCompletedFeedRead(false);
    setFeedRows([]);
    setItemRowsById(new Map());
    setLiveItemsById(new Map());
    setNeedsCredentials([]);
    void loadFeed('initial');
  }, [arePrefsHydrated, loadFeed, selectedMediaType]);

  // After sync finishes a refresh, reread the local list so new titles appear.
  const previousSyncStatusRef = useRef(syncState.status);
  useEffect(() => {
    const previous = previousSyncStatusRef.current;
    previousSyncStatusRef.current = syncState.status;
    if (previous === 'running' && syncState.status === 'idle' && arePrefsHydrated) {
      void loadFeed('synced');
    }
  }, [arePrefsHydrated, loadFeed, syncState.status]);

  // Another tab or the channel page may have changed the follows while this screen was hidden.
  useEffect(() => {
    if (!arePrefsHydrated) {
      return;
    }
    return navigation.addListener('focus', () => {
      void loadFeed('synced');
    });
  }, [arePrefsHydrated, loadFeed, navigation]);

  const handleMediaTypeChange = useCallback((next: AddByRssLibraryMediaType) => {
    setSelectedMediaType(next);
    setFilterTerm('');
    setListPrefs(null);
    setHasCompletedFeedRead(false);
    setActionErrorKey(null);
  }, []);

  const handleSortChange = useCallback(
    (sort: AddByRssLibrarySortOption) => {
      setListPrefs((current) =>
        current === null || current.mediaType !== selectedMediaType
          ? { mediaType: selectedMediaType, sort, viewMode: DEFAULT_ADD_BY_RSS_LIBRARY_VIEW_MODE }
          : { ...current, sort }
      );
      void writeAddByRssLibrarySort(selectedMediaType, sort);
    },
    [selectedMediaType]
  );

  const handleViewModeChange = useCallback(
    (viewMode: AddByRssLibraryViewMode) => {
      setListPrefs((current) =>
        current === null || current.mediaType !== selectedMediaType
          ? {
              mediaType: selectedMediaType,
              sort: DEFAULT_ADD_BY_RSS_LIBRARY_SORT,
              viewMode,
            }
          : { ...current, viewMode }
      );
      void writeAddByRssLibraryViewMode(selectedMediaType, viewMode);
    },
    [selectedMediaType]
  );

  const handleAddPress = useCallback(() => {
    if (!addAccess.allowed) {
      openGate(addAccess.reason);
      return;
    }
    navigation.navigate(LIBRARY_STACK_ROUTES.AddByRssAdd);
  }, [addAccess, navigation, openGate]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: viewModeEligible
        ? () => (
            <HomeOverflowMenu
              canMarkAllSeen={false}
              onMarkAllSeen={() => undefined}
              onViewModeChange={handleViewModeChange}
              showMarkAllSeen={false}
              viewMode={resolvedPrefs.viewMode}
            />
          )
        : undefined,
    });
  }, [handleViewModeChange, navigation, resolvedPrefs.viewMode, viewModeEligible]);

  const handleRowPress = useCallback(
    (row: HomeFeedRowData) => {
      if (
        selectedMediaType === 'podcasts' ||
        selectedMediaType === 'artists' ||
        selectedMediaType === 'albums'
      ) {
        navigation.navigate(LIBRARY_STACK_ROUTES.AddByRssPodcastDetail, {
          feedIdText: row.sourceId ?? row.id,
        });
        return;
      }

      if (selectedMediaType === 'episodes') {
        const episode = itemRowsById.get(row.id);
        if (episode === undefined) {
          return;
        }
        navigation.navigate(LIBRARY_STACK_ROUTES.AddByRssEpisodeDetail, {
          feedIdText: episode.feed.idText,
          itemKey: episode.itemKey,
        });
        return;
      }

      if (selectedMediaType === 'livestreams') {
        const target = liveItemsById.get(row.id);
        if (target === undefined) {
          return;
        }
        navigation.navigate(LIBRARY_STACK_ROUTES.AddByRssLivestreamDetail, {
          feedIdText: target.feed.idText,
          liveItemKey: addByRssLiveItemKey(target.liveBundle, target.liveIndex),
        });
        return;
      }

      const item = itemRowsById.get(row.id);
      if (item === undefined) {
        return;
      }
      void playItem(item.feed, item.mappedFeed, item.itemBundle, item.itemIndex);
    },
    [itemRowsById, liveItemsById, navigation, playItem, selectedMediaType]
  );

  const handlePlayPress = useCallback(
    (row: HomeFeedRowData) => {
      if (selectedMediaType === 'livestreams') {
        const target = liveItemsById.get(row.id);
        if (target === undefined) {
          return;
        }
        void playLiveItem(target.feed, target.mappedFeed, target.liveBundle, target.liveIndex);
        return;
      }
      const item = itemRowsById.get(row.id);
      if (item === undefined) {
        return;
      }
      void playItem(item.feed, item.mappedFeed, item.itemBundle, item.itemIndex);
    },
    [itemRowsById, liveItemsById, playItem, playLiveItem, selectedMediaType]
  );

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
          const result = await unsubscribeArtist({
            feedUrl: row.id,
            source: 'addByRss',
            title: row.title,
          });
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
            source: 'addByRss',
          });
          serverError = result.serverError;
        }
        setFeedRows((prev) => prev.filter((item) => item.id !== row.id));
        // Home stays mounted under its tab, so it will not reload on its own.
        homeFeedRefresh.notify();
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
      refreshToken,
      selectedMediaType,
      setTokens,
      status,
      unsubscribeArtist,
    ]
  );

  const resolveItemTarget = useCallback(
    (row: HomeFeedRowData) => {
      const item = itemRowsById.get(row.id);
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
    [itemRowsById]
  );

  const handleQueue = useCallback(
    (row: HomeFeedRowData, position: QueueActionPosition) => {
      const target = resolveItemTarget(row);
      if (target === null) {
        return;
      }
      queue(target, position);
    },
    [queue, resolveItemTarget]
  );

  const handleAddToPlaylist = useCallback(
    (row: HomeFeedRowData) => {
      const target = resolveItemTarget(row);
      if (target === null) {
        return;
      }
      addToPlaylist(target);
    },
    [addToPlaylist, resolveItemTarget]
  );

  const handleMarkAsPlayed = useCallback(
    (row: HomeFeedRowData) => {
      const target = resolveItemTarget(row);
      if (target === null) {
        return;
      }
      markAsPlayed(target);
    },
    [markAsPlayed, resolveItemTarget]
  );

  const handleGoToTrack = useCallback(
    (row: HomeFeedRowData) => {
      const item = itemRowsById.get(row.id);
      if (item === undefined) {
        return;
      }
      navigation.navigate(LIBRARY_STACK_ROUTES.AddByRssTrackDetail, {
        feedIdText: item.feed.idText,
        itemKey: item.itemKey,
      });
    },
    [itemRowsById, navigation]
  );

  const handleNeedsCredentialsPress = useCallback(
    (feed: MobileAddByRSSFeedRecord) => {
      navigation.navigate(LIBRARY_STACK_ROUTES.AddByRssCredentials, { feedIdText: feed.idText });
    },
    [navigation]
  );

  const visibleRows = useMemo(() => {
    if (!isAddByRssLibraryFilterMediaType(selectedMediaType) || filterTerm.trim().length === 0) {
      return feedRows;
    }
    return feedRows.filter((row) => matchesTitleFilter(row.title, filterTerm));
  }, [feedRows, filterTerm, selectedMediaType]);

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

  const sortOptions = useMemo<MenuSelectChipOption<AddByRssLibrarySortOption>[]>(
    () =>
      ADD_BY_RSS_LIBRARY_SORT_OPTIONS.map((option) => ({
        label: t(SORT_LABEL_KEYS[option]),
        testID: `rss-sort-${option}`,
        value: option,
      })),
    [t]
  );

  const styles = useMemo(() => {
    const insets = screenBodyInsets(tokens.spacing);
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
      filterRow: {
        marginBottom: filterBottomMargin,
      },
      notice: {
        ...typography.body,
        color: themeStyles.textSecondary.color,
        marginTop: tokens.spacing.sm,
      },
      selectorSection: {
        paddingHorizontal: insets.paddingHorizontal,
        paddingTop: insets.paddingTop,
      },
    });
  }, [gridCellWidth, isGridView, themeStyles, tokens]);

  const showFeedRows = feedErrorKey === null;
  const isFeedBusy = !hasCompletedFeedRead;
  const showFilterField =
    showFeedRows && feedRows.length > 0 && isAddByRssLibraryFilterMediaType(selectedMediaType);
  const showEmpty =
    !isFeedBusy &&
    showFeedRows &&
    visibleRows.length === 0 &&
    needsCredentials.length === 0 &&
    filterTerm.trim().length === 0;
  const showNoFilterMatches = showFeedRows && feedRows.length > 0 && visibleRows.length === 0;

  const listHeader = useMemo(() => {
    const noticeKey = actionErrorKey ?? actionNoticeKey ?? playbackNoticeKey;
    return (
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
              onChangeTerm={setFilterTerm}
              term={filterTerm}
              testID="rss-filter"
            />
          </ListFilterHeader>
        ) : null}
        {feedErrorKey !== null ? (
          <ListError
            messageKey={feedErrorKey}
            onRetry={() => {
              void loadFeed('retry');
            }}
            testID="rss-feeds-error"
          />
        ) : null}
        {noticeKey !== null ? (
          <Text style={styles.notice} testID="rss-playback-notice">
            {t(noticeKey)}
          </Text>
        ) : null}
      </>
    );
  }, [
    actionErrorKey,
    actionNoticeKey,
    feedErrorKey,
    filterTerm,
    isGridView,
    loadFeed,
    playbackNoticeKey,
    showFilterField,
    showNoFilterMatches,
    styles.filterRow,
    styles.notice,
    t,
    visibleRows.length,
  ]);

  const listFooter = useMemo(
    () =>
      showFeedRows ? (
        <AddByRssNeedsCredentialsSection
          items={needsCredentials}
          onPressFeed={handleNeedsCredentialsPress}
          showDivider={visibleRows.length > 0}
          testIDPrefix="rss"
        />
      ) : null,
    [handleNeedsCredentialsPress, needsCredentials, showFeedRows, visibleRows.length]
  );

  const unsubscribeLabel = t('features.unsubscribe');
  const unsubscribeAction = useMemo<HomeFeedGridCellRemoveAction>(
    () => ({ label: unsubscribeLabel, onRemove: handleUnsubscribe }),
    [handleUnsubscribe, unsubscribeLabel]
  );
  const renderItem = useCallback(
    ({ index, item: row }: { index: number; item: HomeFeedRowData }) => {
      const isItemChip = selectedMediaType === 'episodes' || selectedMediaType === 'tracks';
      const isLivestreamChip = selectedMediaType === 'livestreams';
      const item = isItemChip ? itemRowsById.get(row.id) : undefined;
      return (
        <LibraryFeedListItem
          artworkEdge={gridCellWidth}
          cellStyle={isGridView ? styles.columnCell : undefined}
          downloadItem={isItemChip ? (item?.downloadItem ?? undefined) : undefined}
          index={index}
          isGridView={isGridView}
          mediaType={selectedMediaType}
          onAddToPlaylist={isItemChip ? handleAddToPlaylist : undefined}
          onGoToTrack={selectedMediaType === 'tracks' ? handleGoToTrack : undefined}
          onMarkAsPlayed={isItemChip ? handleMarkAsPlayed : undefined}
          onPlay={isItemChip || isLivestreamChip ? handlePlayPress : undefined}
          onPress={handleRowPress}
          onQueue={isItemChip ? handleQueue : undefined}
          onUnsubscribe={
            isAddByRssLibraryFilterMediaType(selectedMediaType) ? handleUnsubscribe : undefined
          }
          removeAction={
            isAddByRssLibraryFilterMediaType(selectedMediaType) ? unsubscribeAction : undefined
          }
          row={row}
          unsubscribeLabel={unsubscribeLabel}
        />
      );
    },
    [
      gridCellWidth,
      handleAddToPlaylist,
      handleGoToTrack,
      handleMarkAsPlayed,
      handlePlayPress,
      handleQueue,
      handleRowPress,
      handleUnsubscribe,
      isGridView,
      itemRowsById,
      selectedMediaType,
      styles.columnCell,
      unsubscribeAction,
      unsubscribeLabel,
    ]
  );

  const refreshControl = useMemo(
    () => (
      <RefreshControl
        onRefresh={() => {
          void loadFeed('refresh');
        }}
        refreshing={isFeedRefreshing}
        tintColor={themeStyles.buttonPrimary.backgroundColor}
      />
    ),
    [isFeedRefreshing, loadFeed, themeStyles.buttonPrimary.backgroundColor]
  );

  return (
    <View style={styles.container} testID="rss-root-screen">
      <View style={styles.selectorSection}>
        <ChipRowWithActions
          actions={
            <>
              <ChipAction
                label={t('features.add_feed.add_feed')}
                onPress={handleAddPress}
                testID="rss-add-button"
              />
              <ChipAction
                label={t('features.add_by_rss.check_updates')}
                loading={isFeedRefreshing}
                onPress={handleCheckUpdates}
                testID="rss-check-updates"
              />
            </>
          }
          actionsTestID="rss-list-actions"
        >
          <MediaTypeSelector
            labelKeys={MEDIA_TYPE_LABEL_KEYS}
            onChange={handleMediaTypeChange}
            selectedMediaType={selectedMediaType}
            testIDPrefix="rss"
            trailing={
              isAddByRssLibrarySortableMediaType(selectedMediaType) ? (
                <MenuSelectChip
                  heading={t('filters.screen.sort_heading')}
                  menuTitle={t('filters.screen.sort_heading')}
                  onSelect={handleSortChange}
                  options={sortOptions}
                  testID="rss-sort"
                  value={resolvedPrefs.sort}
                />
              ) : undefined
            }
            types={ADD_BY_RSS_LIBRARY_MEDIA_TYPES}
          />
        </ChipRowWithActions>
      </View>
      <FillList
        ListEmptyComponent={
          isFeedBusy ? (
            <LoadingSection testID="rss-feeds-loading" />
          ) : showNoFilterMatches ? (
            <ListEmpty messageKey="subscriptions.filter.no_matches" testID="rss-filter-empty" />
          ) : showEmpty ? (
            <ListEmpty
              actionLabelKey={
                selectedMediaType === 'livestreams' ? undefined : 'features.add_feed.add_feed'
              }
              messageKey={addByRssLibraryEmptyMessageKey(selectedMediaType)}
              onAction={selectedMediaType === 'livestreams' ? undefined : handleAddPress}
              testID={
                selectedMediaType === 'livestreams' ? 'rss-livestreams-empty' : 'rss-feeds-empty'
              }
            />
          ) : null
        }
        ListFooterComponent={listFooter}
        ListHeaderComponent={listHeader}
        columnWrapperStyle={isGridView ? styles.columnWrapper : undefined}
        contentContainerStyle={styles.content}
        data={showFeedRows ? visibleRows : EMPTY_ROWS}
        keyExtractor={feedRowKeyExtractor}
        keyboardShouldPersistTaps="handled"
        numColumns={isGridView ? columns : 1}
        refreshControl={refreshControl}
        renderItem={renderItem}
        testID="rss-feed-list"
      />
      {addToPlaylistSheet}
      {artistUnsubscribeDialog}
    </View>
  );
}
