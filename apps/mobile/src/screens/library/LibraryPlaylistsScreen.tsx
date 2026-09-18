import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshControl, StyleSheet, View } from 'react-native';

import type { DTOPlaylist } from '@podverse/helpers';
import type {
  QueryParamsStatsRange,
  QueryParamsSubscribedFullSort,
} from '@podverse/helpers-requests';

import { useAuthPrompt } from '../../auth/AuthPromptContext';
import { useAuth } from '../../auth/AuthProvider';
import type { MenuSelectChipOption, OptionChipOption } from '../../components/form';
import { MenuSelectChip, OptionChipGroup } from '../../components/form';
import { Button, Card, FillList, ListRow, VerticalCenter } from '../../components/primitives';
import { MobileScreenContainer } from '../../components/screen/MobileScreenContainer';
import { CallToActionSection } from '../../components/state/CallToActionSection';
import { ListEmpty } from '../../components/state/ListEmpty';
import { ListError } from '../../components/state/ListError';
import { LoadingSection } from '../../components/state/LoadingSection';
import { playlistRepository } from '../../data';
import { OFFLINE_UNAVAILABLE_MESSAGE_KEY } from '../../lib/offlineModeViews';
import { useMembershipGate } from '../../membership/MembershipGateProvider';
import { useAccessTier } from '../../membership/useAccessTier';
import type { LibraryStackParamList } from '../../navigation';
import { LIBRARY_STACK_ROUTES } from '../../navigation';
import { useOfflineMode } from '../../prefs/offlineMode';
import {
  DEFAULT_PLAYLIST_LIST_RANGE,
  DEFAULT_PLAYLIST_LIST_SORT,
  DEFAULT_PLAYLIST_LIST_TYPE,
  PLAYLIST_LIST_RANGE_OPTIONS,
  PLAYLIST_LIST_SORT_OPTIONS,
  readPlaylistListPrefs,
  writePlaylistListRange,
  writePlaylistListSort,
  writePlaylistListType,
} from '../../prefs/playlistListPrefs';
import { useTheme } from '../../theme/useTheme';

type LibraryPlaylistsScreenProps = NativeStackScreenProps<
  LibraryStackParamList,
  'LibraryPlaylists'
>;

type PlaylistListType = 'private' | 'private_followed';

const SORT_LABEL_KEYS: Record<QueryParamsSubscribedFullSort, string> = {
  a_z: 'filters.sort.a_z',
  oldest: 'filters.sort.oldest',
  recent: 'filters.sort.recent',
  top: 'filters.sort.top',
};

const RANGE_LABEL_KEYS: Record<QueryParamsStatsRange, string> = {
  'all-time': 'filters.range.all_time',
  day: 'filters.range.day',
  month: 'filters.range.month',
  week: 'filters.range.week',
};

const FIRST_PAGE = 1;

export function LibraryPlaylistsScreen({ navigation }: LibraryPlaylistsScreenProps) {
  const { t } = useTranslation();
  const { styles: themeStyles, tokens } = useTheme();
  const { status, accessToken, clearSession, refreshToken, setTokens } = useAuth();
  const { enabled: offlineModeEnabled } = useOfflineMode();
  const { onRequestLogin } = useAuthPrompt();
  const { evaluateFeature, isTierKnown } = useAccessTier();
  const { openGate } = useMembershipGate();
  const [playlists, setPlaylists] = useState<DTOPlaylist[]>([]);
  const [selectedType, setSelectedType] = useState<PlaylistListType>(DEFAULT_PLAYLIST_LIST_TYPE);
  const [selectedSort, setSelectedSort] = useState<QueryParamsSubscribedFullSort>(
    DEFAULT_PLAYLIST_LIST_SORT
  );
  const [selectedRange, setSelectedRange] = useState<QueryParamsStatsRange>(
    DEFAULT_PLAYLIST_LIST_RANGE
  );
  const [isPrefsReady, setIsPrefsReady] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [hasNextPage, setHasNextPage] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(FIRST_PAGE);
  const [hasCachedList, setHasCachedList] = useState<boolean>(false);
  const [errorKey, setErrorKey] = useState<string | null>(null);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        createButton: {
          marginBottom: tokens.spacing.md,
        },
        rowSpacing: {
          marginTop: tokens.spacing.sm,
        },
        sortRow: {
          alignItems: 'center',
          flexDirection: 'row',
          flexWrap: 'wrap',
        },
        stateFill: {
          flex: 1,
        },
      }),
    [themeStyles, tokens]
  );

  const authContext = useMemo(
    () => ({
      accessToken,
      clearSession,
      refreshToken,
      setTokens,
    }),
    [accessToken, clearSession, refreshToken, setTokens]
  );

  const listKind = selectedType === 'private' ? 'owned' : 'followed';

  const listTypeOptions = useMemo<readonly OptionChipOption<PlaylistListType>[]>(
    () => [
      {
        label: t('features.playlist.my_playlists'),
        testID: 'library-playlists-type-private',
        value: 'private',
      },
      {
        label: t('filters.type.subscribed'),
        testID: 'library-playlists-type-followed',
        value: 'private_followed',
      },
    ],
    [t]
  );

  const sortOptions = useMemo<readonly MenuSelectChipOption<QueryParamsSubscribedFullSort>[]>(
    () =>
      PLAYLIST_LIST_SORT_OPTIONS.map((sort) => ({
        label: t(SORT_LABEL_KEYS[sort]),
        testID: `library-playlists-sort-${sort}`,
        value: sort,
      })),
    [t]
  );

  const rangeOptions = useMemo<readonly MenuSelectChipOption<QueryParamsStatsRange>[]>(
    () =>
      PLAYLIST_LIST_RANGE_OPTIONS.map((range) => ({
        label: t(RANGE_LABEL_KEYS[range]),
        testID: `library-playlists-range-${range}`,
        value: range,
      })),
    [t]
  );

  const loadPlaylistsPage = useCallback(
    async (
      page: number,
      options: {
        append?: boolean;
        refresh?: boolean;
      } = {}
    ): Promise<void> => {
      if (status !== 'authenticated') {
        setPlaylists([]);
        setErrorKey(null);
        setHasCachedList(false);
        setHasNextPage(false);
        setCurrentPage(FIRST_PAGE);
        setIsLoading(false);
        setIsRefreshing(false);
        setIsLoadingMore(false);
        return;
      }

      const { append = false, refresh = false } = options;
      if (append) {
        setIsLoadingMore(true);
      } else if (refresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      setErrorKey(null);
      try {
        const params = {
          medium: 'all' as const,
          page,
          range: selectedSort === 'top' ? selectedRange : null,
          sort: selectedSort,
        };
        const response =
          selectedType === 'private'
            ? await playlistRepository.listOwned(authContext, params, {
                refresh: refresh && !offlineModeEnabled,
              })
            : await playlistRepository.listFollowed(authContext, params, {
                refresh: refresh && !offlineModeEnabled,
              });
        const cachePresent = await playlistRepository.hasListCache(listKind);
        setHasCachedList(cachePresent || response.data.length > 0);
        const previousCount = append ? playlists.length : 0;

        if (append) {
          setPlaylists((current) => {
            const byIdText = new Map(current.map((playlist) => [playlist.id_text, playlist]));
            for (const playlist of response.data) {
              byIdText.set(playlist.id_text, playlist);
            }
            return [...byIdText.values()];
          });
        } else {
          setPlaylists(response.data);
        }

        const totalCount = response.meta.count ?? 0;
        const loadedCount = previousCount + response.data.length;
        setHasNextPage(totalCount > loadedCount);
        setCurrentPage(page);
      } catch {
        if (!append || playlists.length === 0) {
          setErrorKey('errors.generic');
        }
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
        setIsLoadingMore(false);
      }
    },
    [
      authContext,
      listKind,
      offlineModeEnabled,
      playlists.length,
      selectedRange,
      selectedSort,
      selectedType,
      status,
    ]
  );

  const reloadFirstPage = useCallback(
    async (refresh: boolean): Promise<void> => {
      await loadPlaylistsPage(FIRST_PAGE, { refresh });
    },
    [loadPlaylistsPage]
  );

  useEffect(() => {
    let isMounted = true;
    void (async () => {
      const prefs = await readPlaylistListPrefs();
      if (!isMounted) {
        return;
      }
      setSelectedType(prefs.type);
      setSelectedSort(prefs.sort);
      setSelectedRange(prefs.range);
      setIsPrefsReady(true);
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isPrefsReady) {
      return;
    }
    void reloadFirstPage(false);
  }, [isPrefsReady, reloadFirstPage, selectedRange, selectedSort, selectedType, status]);

  const handleLoadMore = useCallback(() => {
    if (
      status !== 'authenticated' ||
      hasNextPage === false ||
      isLoading ||
      isLoadingMore ||
      isRefreshing ||
      errorKey !== null
    ) {
      return;
    }
    void loadPlaylistsPage(currentPage + 1, { append: true });
  }, [
    currentPage,
    errorKey,
    hasNextPage,
    isLoading,
    isLoadingMore,
    isRefreshing,
    loadPlaylistsPage,
    status,
  ]);

  const handleTypeChange = useCallback((type: PlaylistListType) => {
    setSelectedType(type);
    void writePlaylistListType(type);
  }, []);

  const handleSortChange = useCallback((sort: QueryParamsSubscribedFullSort) => {
    setSelectedSort(sort);
    void writePlaylistListSort(sort);
  }, []);

  const handleRangeChange = useCallback((range: QueryParamsStatsRange) => {
    setSelectedRange(range);
    void writePlaylistListRange(range);
  }, []);

  const handleCreatePress = useCallback(() => {
    if (isTierKnown) {
      const access = evaluateFeature('add_by_rss_add');
      if (!access.allowed) {
        openGate(access.reason);
        return;
      }
    }
    navigation.navigate(LIBRARY_STACK_ROUTES.PlaylistCreate);
  }, [evaluateFeature, isTierKnown, navigation, openGate]);

  const listRows = status === 'authenticated' ? playlists : [];
  const showSignedOut = status !== 'authenticated';
  const showLoading = !isPrefsReady || isLoading;
  const showError = errorKey !== null && listRows.length === 0 && !showSignedOut && !showLoading;
  const showOfflineUnavailable =
    !showSignedOut &&
    !showLoading &&
    !showError &&
    offlineModeEnabled &&
    !hasCachedList &&
    listRows.length === 0;
  const showEmpty =
    !showSignedOut &&
    !showLoading &&
    !showError &&
    !showOfflineUnavailable &&
    listRows.length === 0;

  const listEmpty = showLoading ? (
    <LoadingSection testID="library-playlists-loading" />
  ) : showError ? (
    <VerticalCenter>
      <ListError
        messageKey={errorKey ?? 'errors.generic'}
        onRetry={() => {
          void reloadFirstPage(false);
        }}
        testID="library-playlists-error"
      />
    </VerticalCenter>
  ) : showSignedOut ? (
    <CallToActionSection
      actionLabelKey="authentication.login"
      messageKey="authentication.login_required"
      onAction={onRequestLogin}
      testID="library-playlists-auth-required"
    />
  ) : showOfflineUnavailable ? (
    <ListEmpty
      messageKey={OFFLINE_UNAVAILABLE_MESSAGE_KEY}
      testID="library-playlists-offline-unavailable"
    />
  ) : showEmpty ? (
    <ListEmpty
      messageKey={
        selectedType === 'private'
          ? 'instructions.no_playlists_created'
          : 'instructions.no_followed_playlists'
      }
      testID="library-playlists-empty"
    />
  ) : null;

  const renderSubtitle = (playlist: DTOPlaylist): string => {
    const itemCountLabel = t('features.playlist.item_count', {
      count: playlist.item_count,
    });
    if (selectedType !== 'private_followed') {
      return itemCountLabel;
    }

    const displayName = playlist.account?.account_profile?.display_name?.trim() ?? '';
    return displayName.length > 0 ? `${itemCountLabel} · ${displayName}` : itemCountLabel;
  };

  const listHeader =
    status === 'authenticated' ? (
      <View>
        <View style={styles.createButton}>
          <Button
            label={t('features.playlist.create_playlist')}
            onPress={handleCreatePress}
            testID="library-playlists-create"
          />
        </View>
        <OptionChipGroup
          onChange={handleTypeChange}
          options={listTypeOptions}
          testID="library-playlists-type-chips"
          value={selectedType}
        />
        <View style={[styles.rowSpacing, styles.sortRow]}>
          <MenuSelectChip
            heading={t('filters.screen.sort_heading')}
            menuTitle={t('filters.screen.sort_heading')}
            onSelect={handleSortChange}
            options={sortOptions}
            testID="library-playlists-sort"
            value={selectedSort}
          />
          {selectedSort === 'top' ? (
            <MenuSelectChip
              heading={t('filters.screen.range_heading')}
              menuTitle={t('filters.screen.range_heading')}
              onSelect={handleRangeChange}
              options={rangeOptions}
              testID="library-playlists-range"
              value={selectedRange}
            />
          ) : null}
        </View>
      </View>
    ) : null;

  const loadPlaylists = useCallback(async () => {
    if (status !== 'authenticated') {
      await reloadFirstPage(false);
      return;
    }
    await reloadFirstPage(true);
  }, [reloadFirstPage, status]);

  return (
    <MobileScreenContainer
      heading={t('features.playlist.playlists')}
      testID="library-playlists-screen"
    >
      <FillList
        ListEmptyComponent={listEmpty}
        ListHeaderComponent={listHeader}
        contentContainerStyle={styles.stateFill}
        data={showLoading || showSignedOut || showError || showOfflineUnavailable ? [] : listRows}
        keyExtractor={(playlist) => playlist.id_text}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl
            onRefresh={() => {
              void loadPlaylists();
            }}
            refreshing={isRefreshing}
            tintColor={themeStyles.buttonPrimary.backgroundColor}
          />
        }
        renderItem={({ item: playlist }) => (
          <View style={styles.rowSpacing}>
            <Card>
              <ListRow
                onPress={() => {
                  navigation.navigate(LIBRARY_STACK_ROUTES.PlaylistDetail, {
                    playlistId: playlist.id_text,
                  });
                }}
                subtitle={renderSubtitle(playlist)}
                testID={`library-playlist-row-${playlist.id_text}`}
                title={playlist.title ?? playlist.id_text}
              />
            </Card>
          </View>
        )}
        testID="library-playlists-list"
      />
    </MobileScreenContainer>
  );
}
