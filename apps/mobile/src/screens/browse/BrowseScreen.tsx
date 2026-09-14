import type { RouteProp } from '@react-navigation/native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshControl, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '../../auth/AuthProvider';
import { SectionChip } from '../../components/form';
import { FillList } from '../../components/primitives';
import { ListEmpty } from '../../components/state/ListEmpty';
import { ListError } from '../../components/state/ListError';
import { LoadingSection } from '../../components/state/LoadingSection';
import { OFFLINE_UNAVAILABLE_MESSAGE_KEY } from '../../lib/offlineModeViews';
import type { BrowseStackParamList } from '../../navigation';
import { BROWSE_STACK_ROUTES, buildPodcastDetailParams } from '../../navigation';
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
import { useHomeRowPlayback } from '../home/useHomeRowPlayback';
import type { AddToPlaylistTarget } from '../library/useAddToPlaylist';
import { useAddToPlaylist } from '../library/useAddToPlaylist';
import type { BrowseCategoryOption } from './browseCategories';
import {
  ALL_BROWSE_CATEGORIES,
  fetchBrowseCategories,
  visibleBrowseCategories,
} from './browseCategories';
import { BrowseCategoryRow } from './BrowseCategoryRow';
import { fetchBrowseFeedRows } from './browseFeedData';
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
  { kind: 'category'; row: CategoryListRow } | { kind: 'feed'; row: HomeFeedRowData };

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
  const [feedRows, setFeedRows] = useState<HomeFeedRowData[]>([]);
  const [isFeedLoading, setIsFeedLoading] = useState<boolean>(true);
  const [isFeedRefreshing, setIsFeedRefreshing] = useState<boolean>(false);
  const [feedErrorKey, setFeedErrorKey] = useState<string | null>(null);
  const feedRequestIdRef = useRef<number>(0);
  const categoryRequestIdRef = useRef<number>(0);
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
      setFeedRows([]);
      setFeedErrorKey(null);
      setIsFeedLoading(true);
      setSelectedMediaType(requestedMediaType);
      void writeBrowseMediaType(requestedMediaType);
    }, [navigation, requestedMediaType])
  );

  const handleMediaTypeChange = useCallback((mediaType: BrowseMediaType) => {
    setIsCategoryView(false);
    setFeedRows([]);
    setFeedErrorKey(null);
    setIsFeedLoading(true);
    setSelectedMediaType(mediaType);
    void writeBrowseMediaType(mediaType);
  }, []);

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

  const handleViewModeChange = useCallback((nextViewMode: HomeViewMode) => {
    setListPrefs((current) =>
      current === null ? current : { ...current, viewMode: nextViewMode }
    );
    void writeBrowseViewMode(nextViewMode);
  }, []);

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
        if (isFeedRefreshing) {
          return;
        }
        setIsFeedRefreshing(true);
      } else {
        setIsFeedLoading(true);
        setIsFeedRefreshing(false);
      }

      if (requestId === feedRequestIdRef.current) {
        setFeedErrorKey(null);
      }
      try {
        const rows = await fetchBrowseFeedRows(
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
        setFeedRows(rows);
      } catch {
        if (requestId !== feedRequestIdRef.current) {
          return;
        }
        if (source === 'initial' || source === 'retry') {
          setFeedRows([]);
        }
        setFeedErrorKey('errors.generic');
      } finally {
        if (requestId === feedRequestIdRef.current) {
          if (source === 'refresh') {
            setIsFeedRefreshing(false);
          } else {
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
  }, [isCategoryView, loadFeed]);

  const handleRowPress = useCallback(
    (row: HomeFeedRowData) => {
      if (selectedMediaType === 'podcasts' || selectedMediaType === 'videos') {
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
        navigation.navigate(BROWSE_STACK_ROUTES.ArtistDetail, { artistId: row.id });
        return;
      }
      if (selectedMediaType === 'albums') {
        navigation.navigate(BROWSE_STACK_ROUTES.AlbumDetail, { albumId: row.id });
        return;
      }
      if (selectedMediaType === 'tracks') {
        navigation.navigate(BROWSE_STACK_ROUTES.TrackDetail, { trackId: row.id });
        return;
      }
      if (selectedMediaType === 'playlists') {
        navigation.navigate(BROWSE_STACK_ROUTES.PlaylistDetail, { playlistId: row.id });
        return;
      }
      navigation.navigate(BROWSE_STACK_ROUTES.Profile, { accountIdText: row.id });
    },
    [navigation, selectedMediaType]
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

  const listRows = useMemo<BrowseListRow[]>(() => {
    if (isCategoryView) {
      return categoryRows.map((row) => ({ kind: 'category', row }));
    }
    return feedRows.map((row) => ({ kind: 'feed', row }));
  }, [categoryRows, feedRows, isCategoryView]);

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
  const showEmptyDirectory = showFeedRows && feedRows.length === 0;
  const showCategoryLoading = isCategoryView && isCategoryLoading && categoryOptions.length === 0;

  const categoriesChipLabel =
    selectedCategory !== null ? t(`categories.${selectedCategory}`) : t('categories.categories');

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

  const listHeader = (
    <>
      {!isCategoryView && !isFeedLoading && feedErrorKey !== null ? (
        <ListError
          messageKey={feedErrorKey}
          onRetry={() => {
            void loadFeed('retry');
          }}
          testID="browse-list-error"
        />
      ) : null}
      {isCategoryView && categoryErrorKey !== null ? (
        <ListError
          messageKey={categoryErrorKey}
          onRetry={() => {
            void loadCategories('initial');
          }}
          testID="browse-category-error"
        />
      ) : null}
    </>
  );

  const listEmpty = showCategoryLoading ? (
    <LoadingSection testID="browse-category-loading" />
  ) : isFeedLoading && !isCategoryView ? (
    <LoadingSection testID="browse-list-loading" />
  ) : showEmptyDirectory ? (
    <ListEmpty messageKey="features.browse.empty" testID="browse-list-empty" />
  ) : null;

  const listFooter =
    !isCategoryView && playbackNoticeKey !== null ? (
      <Text style={styles.feedNotice}>{t(playbackNoticeKey)}</Text>
    ) : null;

  return (
    <View style={styles.container} testID="browse-screen">
      <View style={styles.selectorSection}>
        {isHydrated ? (
          <MediaTypeSelector
            labelKeys={MEDIA_TYPE_LABEL_KEYS}
            leading={
              <>
                {shouldShowBrowseSortChip(selectedMediaType, isCategoryView) ? (
                  <BrowseSortChip
                    onRangeChange={handleRangeChange}
                    range={activePrefs?.range ?? DEFAULT_BROWSE_RANGE}
                  />
                ) : null}
                {shouldShowBrowseCategoryChip(selectedMediaType) ? (
                  <SectionChip
                    label={categoriesChipLabel}
                    onPress={handleCategoriesPress}
                    selected={isCategoryView || selectedCategory !== null}
                    testID="browse-category-button"
                    variant="filter"
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
        keyExtractor={(item) => `${item.kind}:${item.row.id}`}
        numColumns={isCategoryView ? 1 : columns}
        refreshControl={
          <RefreshControl
            onRefresh={() => {
              if (isCategoryView) {
                void loadCategories('refresh');
                return;
              }
              void loadFeed('refresh');
            }}
            refreshing={isCategoryView ? isCategoryRefreshing : isFeedRefreshing}
            tintColor={themeStyles.buttonPrimary.backgroundColor}
          />
        }
        renderItem={({ index, item }) => {
          if (item.kind === 'category') {
            const isSelected =
              item.row.mappingKey === null
                ? selectedCategory === null
                : item.row.mappingKey === selectedCategory;
            const isLast = index === categoryRows.length - 1;
            return (
              <View style={[styles.categoryRow, isLast ? styles.categoryRowLast : null]}>
                <BrowseCategoryRow
                  expanded={item.row.expanded}
                  hasChildren={item.row.hasChildren}
                  indentDepth={item.row.indentDepth}
                  onSelect={() => {
                    handleCategorySelect(item.row.mappingKey);
                  }}
                  onToggleExpand={() => {
                    if (item.row.mappingKey !== null) {
                      handleCategoryExpandToggle(item.row.mappingKey);
                    }
                  }}
                  selected={isSelected}
                  testID={
                    item.row.mappingKey === null
                      ? 'browse-category-all'
                      : `browse-category-${item.row.mappingKey}`
                  }
                  title={item.row.title}
                />
              </View>
            );
          }

          if (isGridView) {
            return (
              <View style={columns > 1 ? styles.columnCell : undefined}>
                <HomeFeedGridCell onPress={handleRowPress} row={item.row} />
              </View>
            );
          }

          return (
            <HomeFeedRow
              isLast={index === feedRows.length - 1}
              mediaType={selectedMediaType}
              onAddToPlaylistPress={
                status === 'authenticated' && addToPlaylistKind !== null
                  ? (nextRow) => {
                      requestAddToPlaylist({ idText: nextRow.id, kind: addToPlaylistKind });
                    }
                  : undefined
              }
              onPlayPress={(nextRow) => {
                runPlayAction(
                  nextRow,
                  selectedMediaType === 'clips'
                    ? 'clips'
                    : selectedMediaType === 'tracks'
                      ? 'tracks'
                      : 'episodes'
                );
              }}
              onPress={handleRowPress}
              onQueuePress={(nextRow, position) => {
                runQueueAction(
                  nextRow,
                  selectedMediaType === 'clips'
                    ? 'clips'
                    : selectedMediaType === 'tracks'
                      ? 'tracks'
                      : 'episodes',
                  position
                );
              }}
              row={item.row}
            />
          );
        }}
        testID="browse-feed-list"
      />
      {addToPlaylistSheet}
    </View>
  );
}
