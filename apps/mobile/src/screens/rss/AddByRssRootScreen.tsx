import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { StyleProp, ViewStyle } from 'react-native';
import { RefreshControl, StyleSheet, Text, View } from 'react-native';

import { matchesTitleFilter } from '@podverse/helpers';

import { AddByRssNeedsCredentialsSection } from '../../components/content/AddByRssNeedsCredentialsSection';
import { ListFilterField, ListFilterHeader, MenuSelectChip } from '../../components/form';
import type { MenuSelectChipOption } from '../../components/form';
import { FillList, VerticalCenter } from '../../components/primitives';
import { HeaderBarAction } from '../../components/screen/HeaderBarAction';
import { ListEmpty } from '../../components/state/ListEmpty';
import { ListError } from '../../components/state/ListError';
import { ListLoading } from '../../components/state/ListLoading';
import { useAddByRssPlayback } from '../../hooks/useAddByRssPlayback';
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
  DEFAULT_ADD_BY_RSS_LIBRARY_MEDIA_TYPE,
  DEFAULT_ADD_BY_RSS_LIBRARY_SORT,
  DEFAULT_ADD_BY_RSS_LIBRARY_VIEW_MODE,
  isAddByRssLibraryFilterMediaType,
  isAddByRssLibraryViewModeMediaType,
  readAddByRssLibraryListPrefs,
  subscribeAddByRssLibraryListPrefs,
  writeAddByRssLibrarySort,
  writeAddByRssLibraryViewMode,
} from '../../prefs/addByRssListPrefs';
import { useSync } from '../../sync';
import { resolveGridCellWidth, resolveGridColumns } from '../../theme/resolveColumns';
import { listFilterFieldBottomMargin, screenBodyInsets } from '../../theme/screenLayout';
import { useResponsive } from '../../theme/useResponsive';
import { useTheme } from '../../theme/useTheme';
import { MEDIA_TYPE_LABEL_KEYS } from '../browse/browseTypes';
import type { HomeFeedRowData } from '../home/homeFeedData';
import { HomeFeedGridCell } from '../home/HomeFeedGridCell';
import { HomeFeedRow } from '../home/HomeFeedRow';
import { HomeOverflowMenu } from '../home/HomeOverflowMenu';
import { MediaTypeSelector } from '../home/MediaTypeSelector';
import type { AddByRssLibraryItemRow } from './addByRssLibraryFeedData';
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

function LibraryFeedListItem({
  artworkEdge,
  cellStyle,
  isGridView,
  isLast,
  mediaType,
  onPlay,
  onPress,
  row,
}: {
  artworkEdge: number;
  cellStyle: StyleProp<ViewStyle>;
  isGridView: boolean;
  isLast: boolean;
  mediaType: AddByRssLibraryMediaType;
  onPlay?: (row: HomeFeedRowData) => void;
  onPress: (row: HomeFeedRowData) => void;
  row: HomeFeedRowData;
}) {
  if (isGridView) {
    return (
      <View style={cellStyle}>
        <HomeFeedGridCell artworkEdge={artworkEdge} onPress={onPress} row={row} />
      </View>
    );
  }

  return (
    <View style={cellStyle}>
      <HomeFeedRow
        isLast={isLast}
        mediaType={mediaType}
        onPlayPress={onPlay}
        onPress={onPress}
        row={row}
      />
    </View>
  );
}

/**
 * Add by RSS library: Home-style chips for followed feeds only. Adding a feed is a plus in the
 * title bar. Pull-to-refresh refreshes these feeds alone; Home pull still refreshes everything.
 */
export function AddByRssRootScreen({ navigation }: AddByRssRootScreenProps) {
  const { t } = useTranslation();
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
  const [itemRowsById, setItemRowsById] = useState<ReadonlyMap<string, AddByRssLibraryItemRow>>(
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
  const feedRequestIdRef = useRef(0);
  const isFeedRefreshingRef = useRef(false);

  const { playItem } = useAddByRssPlayback({ onNotice: setPlaybackNoticeKey });

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

  useEffect(() => {
    if (!arePrefsHydrated) {
      return;
    }
    setHasCompletedFeedRead(false);
    setFeedRows([]);
    setItemRowsById(new Map());
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

  const handleMediaTypeChange = useCallback((next: AddByRssLibraryMediaType) => {
    setSelectedMediaType(next);
    setFilterTerm('');
    setListPrefs(null);
    setHasCompletedFeedRead(false);
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
      headerRight: () => (
        <View style={{ alignItems: 'center', flexDirection: 'row', gap: 4 }}>
          <HeaderBarAction
            accessibilityLabel={t('features.add_feed.add_feed')}
            icon="add"
            onPress={handleAddPress}
            testID="rss-add-button"
          />
          {viewModeEligible ? (
            <HomeOverflowMenu
              canMarkAllSeen={false}
              onMarkAllSeen={() => undefined}
              onViewModeChange={handleViewModeChange}
              showMarkAllSeen={false}
              viewMode={resolvedPrefs.viewMode}
            />
          ) : null}
        </View>
      ),
    });
  }, [
    handleAddPress,
    handleViewModeChange,
    navigation,
    resolvedPrefs.viewMode,
    t,
    viewModeEligible,
  ]);

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

      const item = itemRowsById.get(row.id);
      if (item === undefined) {
        return;
      }
      void playItem(item.feed, item.mappedFeed, item.itemBundle, item.itemIndex);
    },
    [itemRowsById, navigation, playItem, selectedMediaType]
  );

  const handlePlayPress = useCallback(
    (row: HomeFeedRowData) => {
      const item = itemRowsById.get(row.id);
      if (item === undefined) {
        return;
      }
      void playItem(item.feed, item.mappedFeed, item.itemBundle, item.itemIndex);
    },
    [itemRowsById, playItem]
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
        color: themeStyles.textSecondary.color,
        fontSize: 13,
        marginTop: tokens.spacing.sm,
      },
      selectorSection: {
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

  const listHeader = useMemo(
    () => (
      <>
        {showFilterField ? (
          <ListFilterHeader hasItemsBelow={visibleRows.length > 0} style={styles.filterRow}>
            <ListFilterField
              clearLabel={t('subscriptions.filter.clear')}
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
        {playbackNoticeKey !== null ? (
          <Text style={styles.notice} testID="rss-playback-notice">
            {t(playbackNoticeKey)}
          </Text>
        ) : null}
      </>
    ),
    [
      feedErrorKey,
      filterTerm,
      loadFeed,
      playbackNoticeKey,
      showFilterField,
      styles.filterRow,
      styles.notice,
      t,
      visibleRows.length,
    ]
  );

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

  const renderItem = useCallback(
    ({ index, item: row }: { index: number; item: HomeFeedRowData }) => {
      const isItemChip = selectedMediaType === 'episodes' || selectedMediaType === 'tracks';
      return (
        <LibraryFeedListItem
          artworkEdge={gridCellWidth}
          cellStyle={isGridView ? styles.columnCell : undefined}
          isGridView={isGridView}
          isLast={index === visibleRows.length - 1}
          mediaType={selectedMediaType}
          onPlay={isItemChip ? handlePlayPress : undefined}
          onPress={handleRowPress}
          row={row}
        />
      );
    },
    [
      gridCellWidth,
      handlePlayPress,
      handleRowPress,
      isGridView,
      selectedMediaType,
      styles.columnCell,
      visibleRows.length,
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
        <MediaTypeSelector
          labelKeys={MEDIA_TYPE_LABEL_KEYS}
          onChange={handleMediaTypeChange}
          selectedMediaType={selectedMediaType}
          testIDPrefix="rss"
          trailing={
            <MenuSelectChip
              heading={t('filters.screen.sort_heading')}
              menuTitle={t('filters.screen.sort_heading')}
              onSelect={handleSortChange}
              options={sortOptions}
              testID="rss-sort"
              value={resolvedPrefs.sort}
            />
          }
          types={ADD_BY_RSS_LIBRARY_MEDIA_TYPES}
        />
      </View>
      <FillList
        ListEmptyComponent={
          isFeedBusy ? (
            <VerticalCenter>
              <ListLoading testID="rss-feeds-loading" />
            </VerticalCenter>
          ) : showNoFilterMatches ? (
            <ListEmpty messageKey="subscriptions.filter.no_matches" testID="rss-filter-empty" />
          ) : showEmpty ? (
            <ListEmpty
              actionLabelKey="features.add_feed.add_feed"
              messageKey="features.add_by_rss.no_feeds"
              onAction={handleAddPress}
              testID="rss-feeds-empty"
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
    </View>
  );
}
