import type { RouteProp } from '@react-navigation/native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { StyleProp, ViewStyle } from 'react-native';
import { RefreshControl, StyleSheet, Text, View } from 'react-native';

import type { DTOAccount, DTOPlaylist } from '@podverse/helpers';

import { useAuth } from '../../auth/AuthProvider';
import { PlaylistListRow, ProfileListRow } from '../../components/content';
import { SectionChip } from '../../components/form';
import { FillList } from '../../components/primitives';
import { ListEmpty } from '../../components/state/ListEmpty';
import { ListError } from '../../components/state/ListError';
import { LoadingSection } from '../../components/state/LoadingSection';
import { OFFLINE_UNAVAILABLE_MESSAGE_KEY } from '../../lib/offlineModeViews';
import type { BrowseStackParamList } from '../../navigation';
import {
  BROWSE_STACK_ROUTES,
  buildAlbumDetailParams,
  buildArtistDetailParams,
  buildPodcastDetailParams,
  buildTrackDetailParams,
} from '../../navigation';
import type { HomeViewMode } from '../../prefs/homeListPrefs';
import { DEFAULT_HOME_VIEW_MODE } from '../../prefs/homeListPrefs';
import { useOfflineMode } from '../../prefs/offlineMode';
import { resolveGridCellWidth, resolveGridColumns } from '../../theme/resolveColumns';
import { screenBodyInsets } from '../../theme/screenLayout';
import { useResponsive } from '../../theme/useResponsive';
import { useTheme } from '../../theme/useTheme';
import type { HomeFeedRowData } from '../home/homeFeedData';
import { HomeFeedGridCell } from '../home/HomeFeedGridCell';
import { HomeFeedRow } from '../home/HomeFeedRow';
import { MediaTypeSelector } from '../home/MediaTypeSelector';
import type { QueueActionPosition } from '../home/useHomeRowPlayback';
import { useHomeRowPlayback } from '../home/useHomeRowPlayback';
import { useAddToPlaylist } from '../library/useAddToPlaylist';
import type { BrowseCategoryOption } from './browseCategories';
import {
  ALL_BROWSE_CATEGORIES,
  fetchBrowseCategories,
  visibleBrowseCategories,
} from './browseCategories';
import { BrowseCategoryRow } from './BrowseCategoryRow';
import type { BrowseFeedResult } from './browseFeedData';
import { emptyBrowseFeed, fetchBrowseFeedRows } from './browseFeedData';
import type { BrowseListPrefs } from './browseListPrefs';
import {
  isBrowseViewModeMediaType,
  readBrowseListPrefs,
  subscribeBrowseListPrefs,
  writeBrowseCategory,
  writeBrowseMediaType,
  writeBrowseRange,
  writeBrowseViewMode,
} from './browseListPrefs';
import { BrowseOverflowMenu } from './BrowseOverflowMenu';
import { BrowseSortChip } from './BrowseSortChip';
import type { BrowseMediaType, BrowseRangeOption } from './browseTypes';
import {
  BROWSE_MEDIA_TYPE_ORDER,
  DEFAULT_BROWSE_MEDIA_TYPE,
  DEFAULT_BROWSE_RANGE,
  isBrowseMediaType,
  MEDIA_TYPE_LABEL_KEYS,
  shouldShowBrowseCategoryChip,
  shouldShowBrowseSortChip,
} from './browseTypes';

type CategoryListRow = {
  expanded: boolean;
  hasChildren: boolean;
  id: string;
  indentDepth: number;
  mappingKey: string | null;
  title: string;
};

type BrowseListRow =
  | { id: string; kind: 'category'; row: CategoryListRow }
  | { id: string; kind: 'feed'; row: HomeFeedRowData }
  | { id: string; kind: 'playlist'; playlist: DTOPlaylist }
  | { id: string; kind: 'user'; account: DTOAccount };

type BrowsePlayMediaType = 'clips' | 'episodes' | 'tracks';

const browseListRowKeyExtractor = (item: BrowseListRow): string => `${item.kind}:${item.id}`;

function browsePlayMediaType(mediaType: BrowseMediaType): BrowsePlayMediaType {
  if (mediaType === 'clips') {
    return 'clips';
  }
  if (mediaType === 'tracks') {
    return 'tracks';
  }
  return 'episodes';
}

function BrowseCategoryItem({
  isLast,
  isSelected,
  onSelect,
  onToggleExpand,
  row,
  styles,
}: {
  isLast: boolean;
  isSelected: boolean;
  onSelect: (mappingKey: string | null) => void;
  onToggleExpand: (rootMappingKey: string) => void;
  row: CategoryListRow;
  styles: { categoryRow: ViewStyle; categoryRowLast: ViewStyle };
}) {
  const handleSelect = useCallback(() => {
    onSelect(row.mappingKey);
  }, [onSelect, row.mappingKey]);
  const handleToggle = useCallback(() => {
    if (row.mappingKey !== null) {
      onToggleExpand(row.mappingKey);
    }
  }, [onToggleExpand, row.mappingKey]);

  return (
    <View style={[styles.categoryRow, isLast ? styles.categoryRowLast : null]}>
      <BrowseCategoryRow
        expanded={row.expanded}
        hasChildren={row.hasChildren}
        indentDepth={row.indentDepth}
        onSelect={handleSelect}
        onToggleExpand={handleToggle}
        selected={isSelected}
        testID={
          row.mappingKey === null ? 'browse-category-all' : `browse-category-${row.mappingKey}`
        }
        title={row.title}
      />
    </View>
  );
}

function BrowsePlaylistItem({
  isLast,
  onPress,
  playlist,
}: {
  isLast: boolean;
  onPress: (playlistId: string) => void;
  playlist: DTOPlaylist;
}) {
  const handlePress = useCallback(() => {
    onPress(playlist.id_text);
  }, [onPress, playlist.id_text]);

  return (
    <PlaylistListRow
      isLast={isLast}
      onPress={handlePress}
      playlist={playlist}
      showCreator
      testID={`browse-playlist-row-${playlist.id_text}`}
    />
  );
}

function BrowseUserItem({
  account,
  isLast,
  onPress,
}: {
  account: DTOAccount;
  isLast: boolean;
  onPress: (accountId: string) => void;
}) {
  const handlePress = useCallback(() => {
    onPress(account.id_text);
  }, [account.id_text, onPress]);

  return (
    <ProfileListRow
      account={account}
      isLast={isLast}
      onPress={handlePress}
      testID={`browse-user-row-${account.id_text}`}
    />
  );
}

function BrowseFeedItem({
  addToPlaylistPress,
  cellStyle,
  goToChannel,
  goToTrack,
  isGridView,
  isLast,
  mediaType,
  onPlay,
  onPress,
  onQueue,
  row,
}: {
  addToPlaylistPress?: (row: HomeFeedRowData) => void;
  cellStyle: StyleProp<ViewStyle>;
  goToChannel?: (row: HomeFeedRowData) => void;
  goToTrack?: (row: HomeFeedRowData) => void;
  isGridView: boolean;
  isLast: boolean;
  mediaType: BrowseMediaType;
  onPlay: (row: HomeFeedRowData) => void;
  onPress: (row: HomeFeedRowData) => void;
  onQueue: (row: HomeFeedRowData, position: QueueActionPosition) => void;
  row: HomeFeedRowData;
}) {
  if (isGridView) {
    return (
      <View style={cellStyle}>
        <HomeFeedGridCell onPress={onPress} row={row} />
      </View>
    );
  }

  return (
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
}

export function BrowseScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<BrowseStackParamList>>();
  const route = useRoute<RouteProp<BrowseStackParamList, typeof BROWSE_STACK_ROUTES.BrowseRoot>>();
  const { accessToken, clearSession, refreshToken, setTokens, status } = useAuth();
  const { enabled: offlineModeEnabled } = useOfflineMode();
  const { columns: rowColumns, width } = useResponsive();
  const { styles: themeStyles, tokens } = useTheme();
  const [selectedMediaType, setSelectedMediaType] =
    useState<BrowseMediaType>(DEFAULT_BROWSE_MEDIA_TYPE);
  const [isHydrated, setIsHydrated] = useState<boolean>(false);
  const [listPrefs, setListPrefs] = useState<BrowseListPrefs | null>(null);
  const [isCategoryView, setIsCategoryView] = useState<boolean>(false);
  const [categoryOptions, setCategoryOptions] = useState<BrowseCategoryOption[]>([]);
  const [isCategoryLoading, setIsCategoryLoading] = useState<boolean>(false);
  const [isCategoryRefreshing, setIsCategoryRefreshing] = useState<boolean>(false);
  const [categoryErrorKey, setCategoryErrorKey] = useState<string | null>(null);
  const [expandedCategoryRoots, setExpandedCategoryRoots] = useState<ReadonlySet<string>>(
    () => new Set()
  );
  const [directoryFeed, setDirectoryFeed] = useState<BrowseFeedResult>({
    kind: 'media',
    rows: [],
  });
  const [isFeedLoading, setIsFeedLoading] = useState<boolean>(true);
  const [isFeedRefreshing, setIsFeedRefreshing] = useState<boolean>(false);
  const [feedErrorKey, setFeedErrorKey] = useState<string | null>(null);
  const feedRequestIdRef = useRef<number>(0);
  const categoryRequestIdRef = useRef<number>(0);
  const isFeedRefreshingRef = useRef(false);
  const { playbackNoticeKey, runPlayAction, runQueueAction } = useHomeRowPlayback();
  const { addToPlaylistSheet, requestAddToPlaylist } = useAddToPlaylist();

  const activePrefs = isHydrated ? listPrefs : null;
  const selectedCategory = activePrefs?.category ?? null;
  const viewMode = activePrefs?.viewMode ?? DEFAULT_HOME_VIEW_MODE;
  const viewModeEligible = !isCategoryView && isBrowseViewModeMediaType(selectedMediaType);
  const isGridView = viewModeEligible && viewMode === 'grid';
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

    const readPrefs = async () => {
      const stored = await readBrowseListPrefs();
      if (!isMounted) {
        return;
      }
      setSelectedMediaType(stored.mediaType);
      setListPrefs(stored);
      setIsHydrated(true);
    };

    void readPrefs();
    const unsubscribe = subscribeBrowseListPrefs(() => {
      void readPrefs();
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  // Home's empty Browse button can ask for a specific chip. Apply once, persist, then clear the
  // param so returning to Browse later keeps whatever the user last chose here.
  const requestedMediaType = route.params?.mediaType;
  useFocusEffect(
    useCallback(() => {
      if (requestedMediaType === undefined || !isBrowseMediaType(requestedMediaType)) {
        return;
      }

      navigation.setParams({ mediaType: undefined });
      setIsCategoryView(false);
      setDirectoryFeed(emptyBrowseFeed(requestedMediaType));
      setFeedErrorKey(null);
      setIsFeedLoading(true);
      setSelectedMediaType(requestedMediaType);
      void writeBrowseMediaType(requestedMediaType);
    }, [navigation, requestedMediaType])
  );

  const handleMediaTypeChange = useCallback(
    (mediaType: BrowseMediaType) => {
      if (mediaType === selectedMediaType && !isCategoryView) {
        return;
      }

      // Advancing here invalidates the in-flight read for the chip the user just left, rather than
      // waiting for the next loadFeed to do it.
      feedRequestIdRef.current += 1;

      // Chip, rows, and loading state commit together. A held clear leaves the previous media type's
      // rows mounted under the new chip, which reads as the wrong list loading.
      setSelectedMediaType(mediaType);
      setIsCategoryView(false);
      setDirectoryFeed(emptyBrowseFeed(mediaType));
      setFeedErrorKey(null);
      setIsFeedLoading(true);
      void writeBrowseMediaType(mediaType);
    },
    [isCategoryView, selectedMediaType]
  );

  const handleCategoriesPress = useCallback(() => {
    setIsCategoryView(true);
  }, []);

  const handleCategorySelect = useCallback((mappingKey: string | null) => {
    setIsCategoryView(false);
    void writeBrowseCategory(mappingKey);
  }, []);

  const handleCategoryExpandToggle = useCallback((rootMappingKey: string) => {
    setExpandedCategoryRoots((current) => {
      const next = new Set(current);
      if (next.has(rootMappingKey)) {
        next.delete(rootMappingKey);
      } else {
        next.add(rootMappingKey);
      }
      return next;
    });
  }, []);

  const handleRangeChange = useCallback((range: BrowseRangeOption) => {
    void writeBrowseRange(range);
  }, []);

  const handleViewModeChange = useCallback(
    (nextViewMode: HomeViewMode) => {
      setListPrefs((current) =>
        current === null ? current : { ...current, viewMode: nextViewMode }
      );
      void writeBrowseViewMode(selectedMediaType, nextViewMode);
    },
    [selectedMediaType]
  );

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <BrowseOverflowMenu onViewModeChange={handleViewModeChange} viewMode={viewMode} />
      ),
    });
  }, [handleViewModeChange, navigation, viewMode]);

  const loadCategories = useCallback(
    async (source: 'initial' | 'refresh') => {
      if (offlineModeEnabled) {
        return;
      }
      const requestId = categoryRequestIdRef.current + 1;
      categoryRequestIdRef.current = requestId;

      if (source === 'refresh') {
        if (isCategoryRefreshing) {
          return;
        }
        setIsCategoryRefreshing(true);
      } else {
        setIsCategoryLoading(true);
        setIsCategoryRefreshing(false);
      }

      if (requestId === categoryRequestIdRef.current) {
        setCategoryErrorKey(null);
      }
      try {
        const rows = await fetchBrowseCategories({
          accessToken,
          clearSession,
          refreshToken,
          setTokens,
        });
        if (requestId !== categoryRequestIdRef.current) {
          return;
        }
        setCategoryOptions(rows);
      } catch {
        if (requestId !== categoryRequestIdRef.current) {
          return;
        }
        if (source === 'initial') {
          setCategoryOptions([]);
        }
        setCategoryErrorKey('errors.generic');
      } finally {
        if (requestId === categoryRequestIdRef.current) {
          if (source === 'refresh') {
            setIsCategoryRefreshing(false);
          } else {
            setIsCategoryLoading(false);
          }
        }
      }
    },
    [accessToken, clearSession, isCategoryRefreshing, offlineModeEnabled, refreshToken, setTokens]
  );

  const loadFeed = useCallback(
    async (source: 'initial' | 'refresh' | 'retry') => {
      if (offlineModeEnabled || activePrefs === null) {
        return;
      }
      const requestId = feedRequestIdRef.current + 1;
      feedRequestIdRef.current = requestId;

      if (source === 'refresh') {
        if (isFeedRefreshingRef.current) {
          return;
        }
        isFeedRefreshingRef.current = true;
        setIsFeedRefreshing(true);
      } else {
        setIsFeedLoading(true);
        isFeedRefreshingRef.current = false;
        setIsFeedRefreshing(false);
      }

      if (requestId === feedRequestIdRef.current) {
        setFeedErrorKey(null);
      }
      try {
        const result = await fetchBrowseFeedRows(
          selectedMediaType,
          {
            accessToken,
            clearSession,
            refreshToken,
            setTokens,
          },
          { category: activePrefs.category, range: activePrefs.range }
        );
        if (requestId !== feedRequestIdRef.current) {
          return;
        }
        setDirectoryFeed(result);
      } catch {
        if (requestId !== feedRequestIdRef.current) {
          return;
        }
        if (source === 'initial' || source === 'retry') {
          setDirectoryFeed(emptyBrowseFeed(selectedMediaType));
        }
        setFeedErrorKey('errors.generic');
      } finally {
        if (source === 'refresh') {
          isFeedRefreshingRef.current = false;
          if (requestId === feedRequestIdRef.current) {
            setIsFeedRefreshing(false);
          }
        } else if (requestId === feedRequestIdRef.current) {
          setIsFeedLoading(false);
        }
      }
    },
    [
      accessToken,
      activePrefs,
      clearSession,
      offlineModeEnabled,
      refreshToken,
      selectedMediaType,
      setTokens,
    ]
  );

  const loadCategoriesRef = useRef(loadCategories);
  loadCategoriesRef.current = loadCategories;
  const loadFeedRef = useRef(loadFeed);
  loadFeedRef.current = loadFeed;

  useEffect(() => {
    if (!isCategoryView) {
      return;
    }
    void loadCategoriesRef.current('initial');
  }, [isCategoryView, loadCategories]);

  useEffect(() => {
    if (!isCategoryView || selectedCategory === null) {
      return;
    }
    const selected = categoryOptions.find((option) => option.mappingKey === selectedCategory);
    if (selected === undefined || selected.depth === 0) {
      return;
    }
    setExpandedCategoryRoots((current) => {
      if (current.has(selected.rootMappingKey)) {
        return current;
      }
      const next = new Set(current);
      next.add(selected.rootMappingKey);
      return next;
    });
  }, [categoryOptions, isCategoryView, selectedCategory]);

  useEffect(() => {
    if (isCategoryView) {
      return;
    }
    void loadFeedRef.current('initial');
  }, [
    activePrefs?.category,
    activePrefs?.range,
    isCategoryView,
    offlineModeEnabled,
    selectedMediaType,
  ]);

  const handleRowPress = useCallback(
    (row: HomeFeedRowData) => {
      if (selectedMediaType === 'podcasts') {
        navigation.navigate(
          BROWSE_STACK_ROUTES.PodcastDetail,
          buildPodcastDetailParams({
            podcastId: row.id,
            previewImageUrl: row.imageUrl,
            previewTitle: row.title,
          })
        );
        return;
      }
      if (selectedMediaType === 'episodes') {
        navigation.navigate(BROWSE_STACK_ROUTES.EpisodeDetail, { episodeId: row.id });
        return;
      }
      if (selectedMediaType === 'clips') {
        navigation.navigate(BROWSE_STACK_ROUTES.ClipDetail, { clipId: row.id });
        return;
      }
      if (selectedMediaType === 'artists') {
        navigation.navigate(
          BROWSE_STACK_ROUTES.ArtistDetail,
          buildArtistDetailParams({
            artistId: row.id,
            previewImageUrl: row.imageUrl,
            previewTitle: row.title,
          })
        );
        return;
      }
      if (selectedMediaType === 'albums') {
        navigation.navigate(
          BROWSE_STACK_ROUTES.AlbumDetail,
          buildAlbumDetailParams({
            albumId: row.id,
            previewImageUrl: row.imageUrl,
            previewTitle: row.title,
          })
        );
        return;
      }
      if (selectedMediaType === 'tracks') {
        runPlayAction(row, 'tracks');
      }
    },
    [navigation, runPlayAction, selectedMediaType]
  );

  const handleGoToTrack = useCallback(
    (row: HomeFeedRowData) => {
      navigation.navigate(
        BROWSE_STACK_ROUTES.TrackDetail,
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
          BROWSE_STACK_ROUTES.ArtistDetail,
          buildArtistDetailParams({
            artistId: row.channelId,
            previewTitle: row.subtitle,
          })
        );
        return;
      }
      navigation.navigate(
        BROWSE_STACK_ROUTES.AlbumDetail,
        buildAlbumDetailParams({
          albumId: row.channelId,
          previewTitle: row.subtitle,
        })
      );
    },
    [navigation]
  );

  const handlePlaylistPress = useCallback(
    (playlistId: string) => {
      navigation.navigate(BROWSE_STACK_ROUTES.PlaylistDetail, { playlistId });
    },
    [navigation]
  );

  const handleUserPress = useCallback(
    (accountIdText: string) => {
      navigation.navigate(BROWSE_STACK_ROUTES.Profile, { accountIdText });
    },
    [navigation]
  );

  const categoryRows = useMemo<CategoryListRow[]>(() => {
    const allRow: CategoryListRow = {
      expanded: false,
      hasChildren: false,
      id: ALL_BROWSE_CATEGORIES,
      indentDepth: 0,
      mappingKey: null,
      title: t('features.browse.category_all'),
    };
    const mapped = visibleBrowseCategories(categoryOptions, expandedCategoryRoots).map(
      (option) => ({
        expanded: expandedCategoryRoots.has(option.rootMappingKey),
        hasChildren: option.hasChildren,
        id: option.mappingKey,
        indentDepth: option.depth,
        mappingKey: option.mappingKey,
        title: t(`categories.${option.mappingKey}`),
      })
    );
    return [allRow, ...mapped];
  }, [categoryOptions, expandedCategoryRoots, t]);

  const directoryCount =
    directoryFeed.kind === 'playlists'
      ? directoryFeed.playlists.length
      : directoryFeed.kind === 'users'
        ? directoryFeed.accounts.length
        : directoryFeed.rows.length;

  const listRows = useMemo<BrowseListRow[]>(() => {
    if (isCategoryView) {
      return categoryRows.map((row) => ({ id: row.id, kind: 'category', row }));
    }
    if (directoryFeed.kind === 'playlists') {
      return directoryFeed.playlists.map((playlist) => ({
        id: playlist.id_text,
        kind: 'playlist',
        playlist,
      }));
    }
    if (directoryFeed.kind === 'users') {
      return directoryFeed.accounts.map((account) => ({
        account,
        id: account.id_text,
        kind: 'user',
      }));
    }
    return directoryFeed.rows.map((row) => ({ id: row.id, kind: 'feed', row }));
  }, [categoryRows, directoryFeed, isCategoryView]);

  const styles = useMemo(() => {
    const bodyInsets = screenBodyInsets(tokens.spacing);

    return StyleSheet.create({
      categoryRow: {
        borderBottomColor: themeStyles.border.borderColor,
        borderBottomWidth: StyleSheet.hairlineWidth,
      },
      categoryRowLast: {
        borderBottomWidth: 0,
      },
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
        paddingHorizontal: bodyInsets.paddingHorizontal,
      },
      feedNotice: {
        color: themeStyles.textSecondary.color,
        fontSize: 13,
        marginTop: tokens.spacing.sm,
      },
      selectorSection: {
        ...bodyInsets,
      },
    });
  }, [gridCellWidth, themeStyles, tokens]);

  const showFeedRows = !isCategoryView && !isFeedLoading && feedErrorKey === null;
  const isFeedBusy = isFeedLoading;
  const showEmptyDirectory = showFeedRows && directoryCount === 0;
  const showCategoryLoading = isCategoryView && isCategoryLoading && categoryOptions.length === 0;

  const categoriesChipLabel =
    selectedCategory !== null ? t(`categories.${selectedCategory}`) : t('categories.categories');

  const handlePlayPress = useCallback(
    (nextRow: HomeFeedRowData) => {
      runPlayAction(nextRow, browsePlayMediaType(selectedMediaType));
    },
    [runPlayAction, selectedMediaType]
  );

  const handleQueuePress = useCallback(
    (nextRow: HomeFeedRowData, position: QueueActionPosition) => {
      runQueueAction(nextRow, browsePlayMediaType(selectedMediaType), position);
    },
    [runQueueAction, selectedMediaType]
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

  const handleRetryCategories = useCallback(() => {
    void loadCategories('initial');
  }, [loadCategories]);

  const handleRefreshList = useCallback(() => {
    if (isCategoryView) {
      void loadCategories('refresh');
      return;
    }
    void loadFeed('refresh');
  }, [isCategoryView, loadCategories, loadFeed]);

  const listHeader = useMemo(
    () => (
      <>
        {!isCategoryView && !isFeedBusy && feedErrorKey !== null ? (
          <ListError
            messageKey={feedErrorKey}
            onRetry={handleRetryFeed}
            testID="browse-list-error"
          />
        ) : null}
        {isCategoryView && categoryErrorKey !== null ? (
          <ListError
            messageKey={categoryErrorKey}
            onRetry={handleRetryCategories}
            testID="browse-category-error"
          />
        ) : null}
      </>
    ),
    [
      categoryErrorKey,
      feedErrorKey,
      handleRetryCategories,
      handleRetryFeed,
      isCategoryView,
      isFeedBusy,
    ]
  );

  const listEmpty = useMemo(
    () =>
      showCategoryLoading ? (
        <LoadingSection testID="browse-category-loading" />
      ) : isFeedLoading && !isCategoryView ? (
        <LoadingSection testID="browse-list-loading" />
      ) : showEmptyDirectory ? (
        <ListEmpty messageKey="features.browse.empty" testID="browse-list-empty" />
      ) : null,
    [isCategoryView, isFeedLoading, showCategoryLoading, showEmptyDirectory]
  );

  const listFooter = useMemo(
    () =>
      !isCategoryView && playbackNoticeKey !== null ? (
        <Text style={styles.feedNotice}>{t(playbackNoticeKey)}</Text>
      ) : null,
    [isCategoryView, playbackNoticeKey, styles.feedNotice, t]
  );

  const refreshControl = useMemo(
    () => (
      <RefreshControl
        onRefresh={handleRefreshList}
        refreshing={isCategoryView ? isCategoryRefreshing : isFeedRefreshing}
        tintColor={themeStyles.buttonPrimary.backgroundColor}
      />
    ),
    [
      handleRefreshList,
      isCategoryRefreshing,
      isCategoryView,
      isFeedRefreshing,
      themeStyles.buttonPrimary.backgroundColor,
    ]
  );

  const listRowCount = listRows.length;
  const categoryRowCount = categoryRows.length;
  const rowAddToPlaylistPress =
    status === 'authenticated' && addToPlaylistTarget !== null
      ? handleAddToPlaylistPress
      : undefined;
  const rowGoToChannel = selectedMediaType === 'tracks' ? handleGoToChannel : undefined;
  const rowGoToTrack = selectedMediaType === 'tracks' ? handleGoToTrack : undefined;
  const feedCellStyle = columns > 1 ? styles.columnCell : undefined;
  const categoryRowStyles = useMemo(
    () => ({
      categoryRow: styles.categoryRow,
      categoryRowLast: styles.categoryRowLast,
    }),
    [styles.categoryRow, styles.categoryRowLast]
  );

  const renderItem = useCallback(
    ({ index, item }: { index: number; item: BrowseListRow }) => {
      if (item.kind === 'category') {
        const isSelected =
          item.row.mappingKey === null
            ? selectedCategory === null
            : item.row.mappingKey === selectedCategory;
        return (
          <BrowseCategoryItem
            isLast={index === categoryRowCount - 1}
            isSelected={isSelected}
            onSelect={handleCategorySelect}
            onToggleExpand={handleCategoryExpandToggle}
            row={item.row}
            styles={categoryRowStyles}
          />
        );
      }

      if (item.kind === 'playlist') {
        return (
          <BrowsePlaylistItem
            isLast={index === listRowCount - 1}
            onPress={handlePlaylistPress}
            playlist={item.playlist}
          />
        );
      }

      if (item.kind === 'user') {
        return (
          <BrowseUserItem
            account={item.account}
            isLast={index === listRowCount - 1}
            onPress={handleUserPress}
          />
        );
      }

      return (
        <BrowseFeedItem
          addToPlaylistPress={rowAddToPlaylistPress}
          cellStyle={feedCellStyle}
          goToChannel={rowGoToChannel}
          goToTrack={rowGoToTrack}
          isGridView={isGridView}
          isLast={index === listRowCount - 1}
          mediaType={selectedMediaType}
          onPlay={handlePlayPress}
          onPress={handleRowPress}
          onQueue={handleQueuePress}
          row={item.row}
        />
      );
    },
    [
      categoryRowCount,
      categoryRowStyles,
      feedCellStyle,
      handleCategoryExpandToggle,
      handleCategorySelect,
      handlePlayPress,
      handlePlaylistPress,
      handleQueuePress,
      handleRowPress,
      handleUserPress,
      isGridView,
      listRowCount,
      rowAddToPlaylistPress,
      rowGoToChannel,
      rowGoToTrack,
      selectedCategory,
      selectedMediaType,
    ]
  );

  if (offlineModeEnabled) {
    return (
      <View style={styles.container} testID="browse-screen">
        <ListEmpty
          messageKey={OFFLINE_UNAVAILABLE_MESSAGE_KEY}
          testID="browse-offline-unavailable"
        />
      </View>
    );
  }

  return (
    <View style={styles.container} testID="browse-screen">
      <View style={styles.selectorSection}>
        {isHydrated ? (
          <MediaTypeSelector
            labelKeys={MEDIA_TYPE_LABEL_KEYS}
            trailing={
              <>
                {shouldShowBrowseCategoryChip(selectedMediaType) ? (
                  <SectionChip
                    label={categoriesChipLabel}
                    onPress={handleCategoriesPress}
                    selected={isCategoryView || selectedCategory !== null}
                    testID="browse-category-button"
                    variant="filter"
                  />
                ) : null}
                {shouldShowBrowseSortChip(selectedMediaType, isCategoryView) ? (
                  <BrowseSortChip
                    onRangeChange={handleRangeChange}
                    range={activePrefs?.range ?? DEFAULT_BROWSE_RANGE}
                  />
                ) : null}
              </>
            }
            onChange={handleMediaTypeChange}
            selectedMediaType={selectedMediaType}
            testIDPrefix="browse"
            types={BROWSE_MEDIA_TYPE_ORDER}
          />
        ) : null}
      </View>
      <FillList
        ListEmptyComponent={listEmpty}
        ListFooterComponent={listFooter}
        ListHeaderComponent={listHeader}
        accessibilityLabel={isGridView ? t('layouts.grid_view') : undefined}
        accessibilityRole="list"
        columnWrapperStyle={columns > 1 ? styles.columnWrapper : undefined}
        contentContainerStyle={styles.content}
        data={isCategoryView ? (showCategoryLoading ? [] : listRows) : showFeedRows ? listRows : []}
        extraData={`${isCategoryView}:${selectedCategory ?? ''}:${[...expandedCategoryRoots].join(',')}:${isGridView}`}
        keyboardShouldPersistTaps="handled"
        key={`cols-${columns}-${isCategoryView ? 'cat' : 'feed'}`}
        keyExtractor={browseListRowKeyExtractor}
        numColumns={isCategoryView ? 1 : columns}
        refreshControl={refreshControl}
        renderItem={renderItem}
        testID="browse-feed-list"
      />
      {addToPlaylistSheet}
    </View>
  );
}
