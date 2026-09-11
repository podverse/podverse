import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshControl, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '../../auth/AuthProvider';
import { FillList, ListRow } from '../../components/primitives';
import { ListEmpty } from '../../components/state/ListEmpty';
import { ListError } from '../../components/state/ListError';
import { LoadingSection } from '../../components/state/LoadingSection';
import type { BrowseStackParamList } from '../../navigation';
import { BROWSE_STACK_ROUTES } from '../../navigation';
import { screenBodyInsets } from '../../theme/screenLayout';
import { useTheme } from '../../theme/useTheme';
import type { HomeFeedRowData } from '../home/homeFeedData';
import { HomeFeedRow } from '../home/HomeFeedRow';
import { MediaTypeChip, MediaTypeSelector } from '../home/MediaTypeSelector';
import { useHomeRowPlayback } from '../home/useHomeRowPlayback';
import type { AddToPlaylistTarget } from '../library/useAddToPlaylist';
import { useAddToPlaylist } from '../library/useAddToPlaylist';
import type { BrowseCategoryOption } from './browseCategories';
import { ALL_BROWSE_CATEGORIES, fetchBrowseCategories } from './browseCategories';
import { fetchBrowseFeedRows } from './browseFeedData';
import type { BrowseListPrefs } from './browseListPrefs';
import {
  readBrowseListPrefs,
  subscribeBrowseListPrefs,
  writeBrowseCategory,
  writeBrowseMediaType,
  writeBrowseRange,
} from './browseListPrefs';
import { BrowseSortChip } from './BrowseSortChip';
import type { BrowseMediaType, BrowseRangeOption } from './browseTypes';
import {
  BROWSE_MEDIA_TYPE_ORDER,
  DEFAULT_BROWSE_MEDIA_TYPE,
  DEFAULT_BROWSE_RANGE,
  MEDIA_TYPE_LABEL_KEYS,
} from './browseTypes';

type CategoryListRow = {
  id: string;
  mappingKey: string | null;
  title: string;
};

type BrowseListRow =
  { kind: 'category'; row: CategoryListRow } | { kind: 'feed'; row: HomeFeedRowData };

export function BrowseScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<BrowseStackParamList>>();
  const { accessToken, clearSession, refreshToken, setTokens, status } = useAuth();
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
  const [feedRows, setFeedRows] = useState<HomeFeedRowData[]>([]);
  const [isFeedLoading, setIsFeedLoading] = useState<boolean>(true);
  const [isFeedRefreshing, setIsFeedRefreshing] = useState<boolean>(false);
  const [feedErrorKey, setFeedErrorKey] = useState<string | null>(null);
  const feedRequestIdRef = useRef<number>(0);
  const categoryRequestIdRef = useRef<number>(0);
  const { playbackNoticeKey, runPlayAction, runQueueAction } = useHomeRowPlayback();
  const { addToPlaylistSheet, requestAddToPlaylist } = useAddToPlaylist();

  const activePrefs = isHydrated ? listPrefs : null;

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

  const handleRangeChange = useCallback((range: BrowseRangeOption) => {
    void writeBrowseRange(range);
  }, []);

  const loadCategories = useCallback(
    async (source: 'initial' | 'refresh') => {
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
    [accessToken, clearSession, isCategoryRefreshing, refreshToken, setTokens]
  );

  const loadFeed = useCallback(
    async (source: 'initial' | 'refresh' | 'retry') => {
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
  }, [isCategoryView]);

  useEffect(() => {
    if (isCategoryView) {
      return;
    }
    void loadFeedRef.current('initial');
  }, [isCategoryView, loadFeed]);

  const handleRowPress = useCallback(
    (row: HomeFeedRowData) => {
      if (selectedMediaType === 'podcasts' || selectedMediaType === 'videos') {
        navigation.navigate(BROWSE_STACK_ROUTES.PodcastDetail, { podcastId: row.id });
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
      id: ALL_BROWSE_CATEGORIES,
      mappingKey: null,
      title: t('features.browse.category_all'),
    };
    const mapped = categoryOptions.map((option) => {
      const prefix = option.depth > 0 ? `${'  '.repeat(option.depth)}` : '';
      return {
        id: option.mappingKey,
        mappingKey: option.mappingKey,
        title: `${prefix}${t(`categories.${option.mappingKey}`)}`,
      };
    });
    return [allRow, ...mapped];
  }, [categoryOptions, t]);

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
        paddingBottom: tokens.spacing.md,
      },
    });
  }, [themeStyles, tokens]);

  const showFeedRows = !isCategoryView && !isFeedLoading && feedErrorKey === null;
  const showEmptyDirectory = showFeedRows && feedRows.length === 0;
  const showCategoryLoading = isCategoryView && isCategoryLoading && categoryOptions.length === 0;
  const selectedCategory = activePrefs?.category ?? null;

  const categoriesChipLabel =
    selectedCategory !== null
      ? t('features.browse.categories_selected', { name: t(`categories.${selectedCategory}`) })
      : t('categories.categories');

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
        <MediaTypeSelector
          labelKeys={MEDIA_TYPE_LABEL_KEYS}
          leading={
            <>
              <BrowseSortChip
                onRangeChange={handleRangeChange}
                range={activePrefs?.range ?? DEFAULT_BROWSE_RANGE}
              />
              <MediaTypeChip
                label={categoriesChipLabel}
                onPress={handleCategoriesPress}
                selected={isCategoryView}
                testID="browse-category-button"
              />
            </>
          }
          onChange={handleMediaTypeChange}
          selectedMediaType={isCategoryView ? null : selectedMediaType}
          testIDPrefix="browse"
          types={BROWSE_MEDIA_TYPE_ORDER}
        />
      </View>
      <FillList
        ListEmptyComponent={listEmpty}
        ListFooterComponent={listFooter}
        ListHeaderComponent={listHeader}
        contentContainerStyle={styles.content}
        data={isCategoryView ? (showCategoryLoading ? [] : listRows) : showFeedRows ? listRows : []}
        extraData={`${isCategoryView}:${selectedCategory ?? ''}`}
        keyboardShouldPersistTaps="handled"
        keyExtractor={(item) => `${item.kind}:${item.row.id}`}
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
                <ListRow
                  onPress={() => {
                    handleCategorySelect(item.row.mappingKey);
                  }}
                  testID={
                    item.row.mappingKey === null
                      ? 'browse-category-all'
                      : `browse-category-${item.row.mappingKey}`
                  }
                  title={item.row.title}
                  trailing={
                    isSelected ? (
                      <Ionicons
                        accessibilityElementsHidden
                        color={themeStyles.buttonPrimary.backgroundColor}
                        importantForAccessibility="no"
                        name="checkmark"
                        size={20}
                      />
                    ) : undefined
                  }
                />
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
