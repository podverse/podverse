import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { formatDateAbbrev, getErrorCode, getErrorResponseStatus, MediumEnum } from '@podverse/helpers';
import type { AddByRSSResourceData, DTOPlaylist, DTOPlaylistResource } from '@podverse/helpers';

import { useAuth } from '../../auth/AuthProvider';
import { Button, FillList, SwipeActionRow } from '../../components/primitives';
import type { ReorderDropEvent } from '../../components/reorder/ReorderableSections';
import { ReorderableSections } from '../../components/reorder/ReorderableSections';
import { SectionCard } from '../../components/section/SectionCard';
import { AuthAwareLoadState } from '../../components/state/AuthAwareLoadState';
import { ListEmpty } from '../../components/state/ListEmpty';
import { playlistRepository } from '../../data';
import { OFFLINE_UNAVAILABLE_MESSAGE_KEY } from '../../lib/offlineModeViews';
import type { PlaylistReorderMutation } from '../../lib/reorder/resolvePlaylistDrop';
import { resolvePlaylistDrop } from '../../lib/reorder/resolvePlaylistDrop';
import { playlistResourceToHomeRow } from '../../lib/rows/homeRowMappers';
import { buildPublicShareUrl, shareResolvedUrl } from '../../lib/share/shareNowPlaying';
import { LIBRARY_STACK_ROUTES } from '../../navigation';
import { useMembershipGate } from '../../membership/MembershipGateProvider';
import { useAccessTier } from '../../membership/useAccessTier';
import { usePlaybackSession } from '../../playback/PlaybackProvider';
import { useTheme } from '../../theme/useTheme';
import type { HomeFeedRowData } from '../home/homeFeedData';
import { HomeFeedRow } from '../home/HomeFeedRow';
import { useHomeRowPlayback } from '../home/useHomeRowPlayback';

const FIRST_PAGE = 1;
const ACTION_MOVE_DOWN = 'moveDown';
const ACTION_MOVE_UP = 'moveUp';
const PLAYLIST_REORDER_SECTION_ID = 'playlist';

const mediumLabelFromId = (
  mediumId: number | undefined,
  tMedia: (key: string, params?: Record<string, unknown>) => string
): string => {
  if (mediumId === MediumEnum.Music) {
    return tMedia('music.music');
  }
  if (mediumId === MediumEnum.Video) {
    return tMedia('video.videos');
  }
  return tMedia('podcast.podcasts');
};

const shareUrlFromResource = (resource: DTOPlaylistResource): string | null => {
  if (resource.clip?.id_text) {
    return buildPublicShareUrl('clip', resource.clip.id_text);
  }
  if (resource.item?.id_text) {
    return buildPublicShareUrl('episode', resource.item.id_text);
  }
  if (resource.item_soundbite?.item?.id_text) {
    return buildPublicShareUrl('episode', resource.item_soundbite.item.id_text);
  }
  return null;
};

const isAddByRssResourceData = (value: unknown): value is AddByRSSResourceData => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

type PlaylistDetailParams = {
  PlaylistDetail: { playlistId: string };
  PlaylistEdit: { playlistId: string };
};

type PlaylistDetailScreenProps = NativeStackScreenProps<PlaylistDetailParams, 'PlaylistDetail'>;

type PlaylistResourceRow = HomeFeedRowData & {
  mediaType: 'clips' | 'episodes' | 'tracks';
};

type PlaylistRowEntry = {
  id: string;
  index: number;
  row: PlaylistResourceRow;
  resource: DTOPlaylistResource;
};

export function PlaylistDetailScreen({ navigation, route }: PlaylistDetailScreenProps) {
  const { i18n, t } = useTranslation();
  const { styles: themeStyles, tokens } = useTheme();
  const { account, accessToken, clearSession, refreshToken, setTokens, status } = useAuth();
  const { evaluateFeature, isTierKnown } = useAccessTier();
  const { handleGateError, openGate } = useMembershipGate();
  const dragTapBlockUntilRef = useRef<number>(0);
  const [playlist, setPlaylist] = useState<DTOPlaylist | null>(null);
  const [resources, setResources] = useState<DTOPlaylistResource[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [hasMorePages, setHasMorePages] = useState<boolean>(false);
  const [nextPage, setNextPage] = useState<number>(FIRST_PAGE);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [showAuthRequired, setShowAuthRequired] = useState<boolean>(false);
  const [showOfflineUnavailable, setShowOfflineUnavailable] = useState<boolean>(false);
  const [isReordering, setIsReordering] = useState<boolean>(false);
  const [isDragActive, setIsDragActive] = useState<boolean>(false);
  const [isSavingOrder, setIsSavingOrder] = useState<boolean>(false);
  const [isFollowSaving, setIsFollowSaving] = useState<boolean>(false);
  const [reorderErrorKey, setReorderErrorKey] = useState<string | null>(null);
  const [followOverride, setFollowOverride] = useState<boolean | null>(null);
  const { playbackNoticeKey, runPlayAction, runQueueAction } = useHomeRowPlayback();
  const { playAddByRssResourceData, playPlaylistRowById, playSoundbite } = usePlaybackSession();
  const { playlistId } = route.params;

  const authArgs = useMemo(
    () => ({ accessToken, clearSession, refreshToken, setTokens }),
    [accessToken, clearSession, refreshToken, setTokens]
  );

  const styles = useMemo(
    () =>
      StyleSheet.create({
        cardText: {
          color: themeStyles.textSecondary.color,
          fontSize: 14,
          marginTop: tokens.spacing.sm,
        },
        container: {
          backgroundColor: themeStyles.screen.backgroundColor,
          flex: 1,
        },
        content: {
          padding: tokens.spacing.lg,
          paddingBottom: tokens.spacing['2xl'],
        },
        headerActions: {
          flexDirection: 'row',
          gap: tokens.spacing.sm,
          marginTop: tokens.spacing.md,
        },
        heading: {
          color: themeStyles.textPrimary.color,
          fontSize: 28,
          fontWeight: '700',
          marginBottom: tokens.spacing.md,
        },
        notice: {
          color: themeStyles.textSecondary.color,
          fontSize: 13,
          marginTop: tokens.spacing.sm,
        },
      }),
    [themeStyles, tokens]
  );

  const loadResourcesPage = useCallback(
    async (params: { append: boolean; page: number; refresh: boolean }): Promise<void> => {
      const response = await playlistRepository.getResourcesPage(authArgs, playlistId, params.page, {
        refresh: params.refresh,
      });
      const pageRows = response.data;
      const previousCount = params.append ? resources.length : 0;
      const nextRows = params.append ? [...resources, ...pageRows] : pageRows;
      const byId = new Map(nextRows.map((resource) => [resource.id, resource]));
      const merged = [...byId.values()];
      setResources(merged);

      const count = response.meta?.count ?? merged.length;
      const loadedCount = params.append ? previousCount + pageRows.length : pageRows.length;
      setHasMorePages(loadedCount < count);
      setNextPage(params.page + 1);
    },
    [authArgs, playlistId, resources]
  );

  const loadPlaylist = useCallback(
    async (options: { refresh?: boolean } = {}) => {
      const refresh = options.refresh === true;
      if (!refresh) {
        setIsLoading(true);
      } else {
        setIsRefreshing(true);
      }
      setErrorKey(null);
      setShowAuthRequired(false);
      setShowOfflineUnavailable(false);
      setFollowOverride(null);

      try {
        const playlistResponse = await playlistRepository.getByIdText(authArgs, playlistId, {
          refresh,
        });
        setPlaylist(playlistResponse);
        await loadResourcesPage({ append: false, page: FIRST_PAGE, refresh });
      } catch (error) {
        const errorCode = getErrorCode(error);
        if (errorCode === 'ERR_OFFLINE_MODE') {
          setShowOfflineUnavailable(true);
          setPlaylist(null);
          setResources([]);
          setHasMorePages(false);
          setNextPage(FIRST_PAGE);
          return;
        }

        const statusCode = getErrorResponseStatus(error);
        if ((statusCode === 401 || statusCode === 403) && status !== 'authenticated') {
          setShowAuthRequired(true);
        } else {
          setErrorKey('errors.generic');
        }
        setPlaylist(null);
        setResources([]);
        setHasMorePages(false);
        setNextPage(FIRST_PAGE);
      } finally {
        setIsRefreshing(false);
        setIsLoading(false);
      }
    },
    [authArgs, loadResourcesPage, playlistId, status]
  );

  useEffect(() => {
    void loadPlaylist();
  }, [loadPlaylist]);

  // Reload when returning to the detail (e.g. after editing metadata on PlaylistEdit) so updated
  // title / privacy are reflected without a manual refresh.
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      void loadPlaylist();
    });
    return unsubscribe;
  }, [navigation, loadPlaylist]);

  const ownerIdText = playlist?.account?.id_text;
  const isOwner = ownerIdText !== undefined && ownerIdText === account?.id_text;
  const isFollowingFromAccount =
    playlist !== null &&
    account?.account_following_playlists?.some(
      (followingPlaylist) => followingPlaylist.playlist_id === playlist.id
    ) === true;
  const isFollowing = followOverride ?? isFollowingFromAccount;

  const rowEntries = useMemo<PlaylistRowEntry[]>(() => {
    const entries: PlaylistRowEntry[] = [];
    for (const resource of resources) {
      const row = playlistResourceToHomeRow(resource, {
        addByRssPrivateTitle: t('features.add_by_rss.private_item_placeholder'),
      });
      if (row === null) {
        continue;
      }
      entries.push({
        id: String(resource.id),
        index: entries.length,
        resource,
        row,
      });
    }
    return entries;
  }, [resources, t]);
  const resourceRows = rowEntries.map((entry) => entry.row);

  const loadNextPage = useCallback(async () => {
    if (isLoading || isRefreshing || isLoadingMore || isReordering || !hasMorePages) {
      return;
    }
    setIsLoadingMore(true);
    try {
      await loadResourcesPage({ append: true, page: nextPage, refresh: false });
    } catch (error) {
      const errorCode = getErrorCode(error);
      if (errorCode === 'ERR_OFFLINE_MODE') {
        return;
      }
      setErrorKey('errors.generic');
    } finally {
      setIsLoadingMore(false);
    }
  }, [hasMorePages, isLoading, isLoadingMore, isRefreshing, isReordering, loadResourcesPage, nextPage]);

  const loadReorderResourcesFromServer = useCallback(async (): Promise<void> => {
    const allResources = await playlistRepository.getResourcesPrivateAll(authArgs, playlistId, {
      refresh: true,
    });
    setResources(allResources);
    setHasMorePages(false);
  }, [authArgs, playlistId]);

  const toggleReorder = useCallback(async () => {
    if (isReordering) {
      setIsReordering(false);
      setIsDragActive(false);
      await loadPlaylist({ refresh: true });
      return;
    }
    setReorderErrorKey(null);
    try {
      await loadReorderResourcesFromServer();
      setIsReordering(true);
    } catch {
      setReorderErrorKey('errors.generic');
    }
  }, [isReordering, loadPlaylist, loadReorderResourcesFromServer]);

  const handleFollowToggle = useCallback(async () => {
    if (playlist === null || isFollowSaving) {
      return;
    }
    if (status !== 'authenticated') {
      setShowAuthRequired(true);
      return;
    }
    if (isTierKnown) {
      const access = evaluateFeature('queue_history_sync');
      if (!access.allowed) {
        openGate(access.reason);
        return;
      }
    }

    setIsFollowSaving(true);
    setErrorKey(null);
    try {
      if (isFollowing) {
        await playlistRepository.unfollow(authArgs, playlist.id_text);
        setFollowOverride(false);
      } else {
        await playlistRepository.follow(authArgs, playlist.id_text);
        setFollowOverride(true);
      }
    } catch (error) {
      if (handleGateError(error)) {
        return;
      }
      setErrorKey('errors.generic');
    } finally {
      setIsFollowSaving(false);
    }
  }, [
    authArgs,
    evaluateFeature,
    handleGateError,
    isFollowSaving,
    isFollowing,
    isTierKnown,
    openGate,
    playlist,
    status,
  ]);

  const applyPlaylistReorderMutation = useCallback(
    async (mutation: PlaylistReorderMutation): Promise<void> => {
      if (mutation.type === 'addFirst') {
        if (mutation.target.kind === 'clip') {
          await playlistRepository.addClipFirst(authArgs, playlistId, mutation.target.idText);
          return;
        }
        if (mutation.target.kind === 'soundbite') {
          await playlistRepository.addSoundbiteFirst(authArgs, playlistId, mutation.target.idText);
          return;
        }
        if (mutation.target.kind === 'add_by_rss') {
          await playlistRepository.addAddByRssFirst(authArgs, playlistId, mutation.target.resourceData);
          return;
        }
        await playlistRepository.addItemFirst(authArgs, playlistId, mutation.target.idText);
        return;
      }

      if (mutation.type === 'addLast') {
        if (mutation.target.kind === 'clip') {
          await playlistRepository.addClipLast(authArgs, playlistId, mutation.target.idText);
          return;
        }
        if (mutation.target.kind === 'soundbite') {
          await playlistRepository.addSoundbiteLast(authArgs, playlistId, mutation.target.idText);
          return;
        }
        if (mutation.target.kind === 'add_by_rss') {
          await playlistRepository.addAddByRssLast(authArgs, playlistId, mutation.target.resourceData);
          return;
        }
        await playlistRepository.addItemLast(authArgs, playlistId, mutation.target.idText);
        return;
      }

      if (mutation.target.kind === 'clip') {
        await playlistRepository.addClipBetween(
          authArgs,
          playlistId,
          mutation.target.idText,
          mutation.position1,
          mutation.position2
        );
        return;
      }
      if (mutation.target.kind === 'soundbite') {
        await playlistRepository.addSoundbiteBetween(
          authArgs,
          playlistId,
          mutation.target.idText,
          mutation.position1,
          mutation.position2
        );
        return;
      }
      if (mutation.target.kind === 'add_by_rss') {
        await playlistRepository.addAddByRssBetween(
          authArgs,
          playlistId,
          mutation.target.resourceData,
          mutation.position1,
          mutation.position2
        );
        return;
      }
      await playlistRepository.addItemBetween(
        authArgs,
        playlistId,
        mutation.target.idText,
        mutation.position1,
        mutation.position2
      );
    },
    [authArgs, playlistId]
  );

  const handleReorder = useCallback(
    async (fromIndex: number, toIndex: number): Promise<void> => {
      if (isSavingOrder) {
        return;
      }

      const resolved = resolvePlaylistDrop(
        rowEntries.map((entry) => entry.resource),
        fromIndex,
        toIndex
      );
      if (resolved.kind === 'none') {
        return;
      }

      setResources(resolved.reordered);
      setIsSavingOrder(true);
      setReorderErrorKey(null);

      try {
        await applyPlaylistReorderMutation(resolved.mutation);
      } catch (error) {
        if (!handleGateError(error)) {
          setReorderErrorKey('errors.generic');
        }
      } finally {
        try {
          await loadReorderResourcesFromServer();
        } catch {
          // Best-effort reload keeps server order authoritative after failures.
        }
        setIsSavingOrder(false);
      }
    },
    [
      applyPlaylistReorderMutation,
      handleGateError,
      isSavingOrder,
      loadReorderResourcesFromServer,
      rowEntries,
    ]
  );

  const handleDrop = useCallback(
    (event: ReorderDropEvent) => {
      if (
        event.fromSection !== PLAYLIST_REORDER_SECTION_ID ||
        event.toSection !== PLAYLIST_REORDER_SECTION_ID
      ) {
        return;
      }
      void handleReorder(event.fromIndex, event.toIndex);
    },
    [handleReorder]
  );

  const handleDragActiveChange = useCallback((isActive: boolean) => {
    setIsDragActive(isActive);
    if (!isActive) {
      dragTapBlockUntilRef.current = Date.now() + 300;
    }
  }, []);

  const removePlaylistResource = useCallback(
    async (resource: DTOPlaylistResource): Promise<DTOPlaylistResource[]> => {
      if (
        typeof resource.add_by_rss_hash_id === 'string' &&
        resource.add_by_rss_hash_id.length > 0
      ) {
        return playlistRepository.deleteAddByRss(authArgs, playlistId, resource.add_by_rss_hash_id);
      }
      if (resource.item_soundbite?.id_text) {
        return playlistRepository.deleteSoundbite(authArgs, playlistId, resource.item_soundbite.id_text);
      }
      if (resource.clip?.id_text) {
        return playlistRepository.deleteClip(authArgs, playlistId, resource.clip.id_text);
      }
      if (resource.item?.id_text) {
        return playlistRepository.deleteItem(authArgs, playlistId, resource.item.id_text);
      }
      throw new Error('Playlist row is missing a removable resource id');
    },
    [authArgs, playlistId]
  );

  const handleSwipeRemove = useCallback(
    (resource: DTOPlaylistResource): Promise<void> => {
      if (isDragActive || isSavingOrder) {
        return Promise.resolve();
      }
      setReorderErrorKey(null);
      return (async () => {
        try {
          const nextResources = await removePlaylistResource(resource);
          setResources(nextResources);
        } catch (error) {
          if (!handleGateError(error)) {
            setReorderErrorKey('errors.generic');
          }
          throw error;
        }
      })();
    },
    [handleGateError, isDragActive, isSavingOrder, removePlaylistResource]
  );

  const handleShare = useCallback(() => {
    shareResolvedUrl(buildPublicShareUrl('playlist', playlistId));
  }, [playlistId]);

  const handleResourcePlay = useCallback(
    (resource: DTOPlaylistResource, row: PlaylistResourceRow) => {
      if (isDragActive || isSavingOrder || Date.now() < dragTapBlockUntilRef.current) {
        return;
      }
      const resourceData = resource.add_by_rss_resource_data;
      if (isAddByRssResourceData(resourceData)) {
        void playAddByRssResourceData(resourceData);
        return;
      }
      if (resource.add_by_rss_hash_id !== undefined && resource.add_by_rss_hash_id !== null) {
        return;
      }
      if (resource.clip?.id_text) {
        void playPlaylistRowById(resource.clip.id_text, 'clip', playlistId);
        return;
      }
      if (resource.item?.id_text) {
        void playPlaylistRowById(resource.item.id_text, 'item', playlistId);
        return;
      }
      if (
        resource.item_soundbite !== undefined &&
        resource.item_soundbite.item !== undefined &&
        resource.item_soundbite.item.channel !== undefined
      ) {
        void playSoundbite(
          resource.item_soundbite,
          resource.item_soundbite.item,
          resource.item_soundbite.item.channel
        );
        return;
      }
      runPlayAction(row, row.mediaType);
    },
    [isDragActive, isSavingOrder, playAddByRssResourceData, playPlaylistRowById, playSoundbite, playlistId, runPlayAction]
  );

  const renderResourceRow = useCallback(
    ({ index, item }: { index: number; item: PlaylistResourceRow }) => {
      const entry = rowEntries[index];
      if (entry === undefined) {
        return null;
      }
      const shareUrl = shareUrlFromResource(entry.resource);
      return (
        <HomeFeedRow
          isLast={index === resourceRows.length - 1}
          mediaType={item.mediaType}
          onPlayPress={() => {
            handleResourcePlay(entry.resource, item);
          }}
          onPress={() => {
            handleResourcePlay(entry.resource, item);
          }}
          onQueuePress={(nextRow, position) => {
            runQueueAction(nextRow, item.mediaType, position);
          }}
          onSharePress={
            shareUrl === null
              ? undefined
              : () => {
                  shareResolvedUrl(shareUrl);
                }
          }
          row={item}
        />
      );
    },
    [handleResourcePlay, resourceRows.length, rowEntries, runQueueAction]
  );

  const renderReorderRow = useCallback(
    (entry: PlaylistRowEntry) => {
      return (
        <SwipeActionRow
          onRemove={() => handleSwipeRemove(entry.resource)}
          removeLabel={t('features.playlist.remove_from_playlist')}
          testID={`playlist-row-${entry.resource.id}-swipe`}
        >
          <HomeFeedRow
            customActions={null}
            isLast={entry.index === rowEntries.length - 1}
            mediaType={entry.row.mediaType}
            onPlayPress={() => {
              handleResourcePlay(entry.resource, entry.row);
            }}
            onPress={() => {
              handleResourcePlay(entry.resource, entry.row);
            }}
            onQueuePress={() => {}}
            row={entry.row}
          />
        </SwipeActionRow>
      );
    },
    [handleResourcePlay, handleSwipeRemove, rowEntries.length, t]
  );

  const reorderList = useMemo(
    () => (
      <SectionCard>
        <ReorderableSections
          dragActivation="row-long-press"
          keyExtractor={(entry) => entry.id}
          onDragActiveChange={handleDragActiveChange}
          onDrop={handleDrop}
          renderItem={(entry) => renderReorderRow(entry)}
          renderSection={(_sectionId, children) => <View>{children}</View>}
          rowAccessibility={
            rowEntries.length > 1
              ? (entry) => {
                  const actions = [
                    ...(entry.index > 0 ? [{ label: t('misc.move_up'), name: ACTION_MOVE_UP }] : []),
                    ...(entry.index < rowEntries.length - 1
                      ? [{ label: t('misc.move_down'), name: ACTION_MOVE_DOWN }]
                      : []),
                  ];
                  return {
                    actions,
                    label: entry.row.title,
                    onAction: (name) => {
                      if (name === ACTION_MOVE_UP) {
                        void handleReorder(entry.index, entry.index - 1);
                        return;
                      }
                      if (name === ACTION_MOVE_DOWN) {
                        void handleReorder(entry.index, entry.index + 1);
                      }
                    },
                  };
                }
              : undefined
          }
          rowContainerVariant="plain"
          sections={[{ id: PLAYLIST_REORDER_SECTION_ID, items: rowEntries }]}
          showHandle={false}
        />
      </SectionCard>
    ),
    [
      handleDragActiveChange,
      handleDrop,
      handleReorder,
      renderReorderRow,
      rowEntries,
      t,
    ]
  );

  const creator = playlist?.account?.account_profile?.display_name ?? t('misc.anonymous');
  const mediumLabel = mediumLabelFromId(playlist?.medium_id, t);
  const updatedLabel =
    playlist?.last_updated !== undefined && playlist.last_updated.length > 0
      ? t('media.updated_with_date', {
          date: formatDateAbbrev(playlist.last_updated, i18n.language),
        })
      : null;

  const listHeader = (
    <>
      <Text style={styles.heading}>{playlist?.title ?? t('features.playlist.playlist')}</Text>
      <SectionCard heading={playlist?.title ?? t('features.playlist.playlist')}>
        {playlist?.description ? <Text style={styles.cardText}>{playlist.description}</Text> : null}
        <Text style={styles.cardText}>
          {t('features.playlist.item_count', {
            count: playlist?.item_count ?? resourceRows.length,
          })}
        </Text>
        {updatedLabel !== null ? <Text style={styles.cardText}>{updatedLabel}</Text> : null}
        <Text style={styles.cardText}>{mediumLabel}</Text>
        <Text style={styles.cardText}>{creator}</Text>
        <View style={styles.headerActions}>
          <Button
            label={t('features.share')}
            onPress={handleShare}
            size="sm"
            testID="library-playlist-detail-share"
            variant="secondary"
          />
          {!isOwner && status === 'authenticated' ? (
            <Button
              disabled={isFollowSaving}
              label={isFollowing ? t('features.unsubscribe') : t('features.subscribe')}
              onPress={() => {
                void handleFollowToggle();
              }}
              size="sm"
              testID="library-playlist-detail-follow-toggle"
              variant="secondary"
            />
          ) : null}
        </View>
        {isOwner ? (
          <View style={styles.headerActions}>
            <Button
              disabled={isReordering}
              label={t('features.playlist.edit_playlist')}
              onPress={() => {
                navigation.navigate(LIBRARY_STACK_ROUTES.PlaylistEdit, { playlistId });
              }}
              size="sm"
              testID="library-playlist-detail-edit"
              variant="secondary"
            />
            {rowEntries.length > 1 ? (
              <Button
                label={isReordering ? t('misc.done') : t('features.playlist.reorder')}
                onPress={() => {
                  void toggleReorder();
                }}
                size="sm"
                testID="library-playlist-detail-reorder-toggle"
                variant="secondary"
              />
            ) : null}
          </View>
        ) : null}
      </SectionCard>
      {isReordering && isOwner ? <View testID="library-playlist-reorder-list">{reorderList}</View> : null}
      {isReordering && reorderErrorKey !== null ? (
        <Text style={styles.notice} testID="library-playlist-reorder-error">
          {t(reorderErrorKey)}
        </Text>
      ) : null}
    </>
  );

  const listFooter =
    !isReordering && (playbackNoticeKey !== null || isLoadingMore) ? (
      <View>
        {playbackNoticeKey !== null ? <Text style={styles.notice}>{t(playbackNoticeKey)}</Text> : null}
        {isLoadingMore ? <ActivityIndicator size="small" /> : null}
      </View>
    ) : null;

  const showEmpty =
    !isLoading &&
    !isRefreshing &&
    !showAuthRequired &&
    !showOfflineUnavailable &&
    playlist !== null &&
    !isReordering &&
    resourceRows.length === 0;

  if (showOfflineUnavailable) {
    return (
      <View style={styles.container} testID="library-playlist-detail-screen">
        <ListEmpty
          messageKey={OFFLINE_UNAVAILABLE_MESSAGE_KEY}
          testID="library-playlist-detail-offline-unavailable"
        />
      </View>
    );
  }

  return (
    <View style={styles.container} testID="library-playlist-detail-screen">
      <AuthAwareLoadState
        emptyTestID="library-playlist-detail-auth-required"
        emptyMessageKey="misc.info"
        errorKey={errorKey}
        errorTestID="library-playlist-detail-error"
        isLoading={isLoading}
        loadingTestID="library-playlist-detail-loading"
        onRetry={() => {
          void loadPlaylist();
        }}
        showAuthRequired={showAuthRequired}
        showEmpty={showEmpty}
      >
        <FillList
          ListFooterComponent={listFooter}
          ListHeaderComponent={listHeader}
          contentContainerStyle={styles.content}
          data={isReordering ? [] : resourceRows}
          onEndReached={() => {
            void loadNextPage();
          }}
          onEndReachedThreshold={0.6}
          keyExtractor={(row) => row.id}
          refreshControl={
            <RefreshControl
              onRefresh={() => {
                void loadPlaylist({ refresh: true });
              }}
              refreshing={isRefreshing}
              tintColor={tokens.text.accent}
            />
          }
          renderItem={renderResourceRow}
        />
      </AuthAwareLoadState>
    </View>
  );
}
