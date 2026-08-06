import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import type { DTOPlaylist, DTOPlaylistResource } from '@podverse/helpers';

import { requestWithMobileAuthRefresh } from '../../auth';
import { useAuth } from '../../auth/AuthProvider';
import { Button } from '../../components/primitives';
import { SectionCard } from '../../components/section/SectionCard';
import { AuthAwareLoadState } from '../../components/state/AuthAwareLoadState';
import { ListEmpty } from '../../components/state/ListEmpty';
import { playlistResourceToHomeRow } from '../../lib/rows/homeRowMappers';
import { buildPublicShareUrl, shareResolvedUrl } from '../../lib/share/shareNowPlaying';
import type { LibraryStackParamList } from '../../navigation';
import { LIBRARY_STACK_ROUTES } from '../../navigation';
import { usePlayback } from '../../playback/PlaybackProvider';
import { useTheme } from '../../theme/useTheme';
import type { HomeFeedRowData } from '../home/homeFeedData';
import { HomeFeedRow } from '../home/HomeFeedRow';
import { useHomeRowPlayback } from '../home/useHomeRowPlayback';

// Playlist rows are prefixed by `playlistResourceToHomeRow` (`item-<id>` / `clip-<id>`); resolve the
// underlying kind + id so playing seeds the auto-queue with this playlist (web list-row parity).
const resolvePlaylistRowTarget = (
  rowId: string
): { idText: string; kind: 'item' | 'clip' } | null => {
  if (rowId.startsWith('clip-')) {
    return { idText: rowId.slice('clip-'.length), kind: 'clip' };
  }
  if (rowId.startsWith('item-')) {
    return { idText: rowId.slice('item-'.length), kind: 'item' };
  }
  return null;
};

// Reorder kind → the playlist-resource API family used to persist a new position (9d.3). add-by-RSS
// resources aren't rendered by `playlistResourceToHomeRow`, so they're excluded from reorder here
// (operator polish / Track 23 if ever needed).
type ReorderKind = 'clip' | 'item' | 'item_soundbite';

const reorderKind = (resource: DTOPlaylistResource): ReorderKind | null => {
  if (resource.clip !== undefined) {
    return 'clip';
  }
  if (resource.item_soundbite !== undefined) {
    return 'item_soundbite';
  }
  if (resource.item !== undefined) {
    return 'item';
  }
  return null;
};

const reorderIdText = (resource: DTOPlaylistResource): string | null => {
  if (resource.clip !== undefined) {
    return resource.clip.id_text;
  }
  if (resource.item_soundbite !== undefined) {
    return resource.item_soundbite.id_text;
  }
  if (resource.item !== undefined) {
    return resource.item.id_text;
  }
  return null;
};

type PlaylistDetailScreenProps = NativeStackScreenProps<LibraryStackParamList, 'PlaylistDetail'>;

type PlaylistResourceRow = HomeFeedRowData & {
  mediaType: 'clips' | 'episodes' | 'tracks';
};

type ReorderableResource = {
  idText: string;
  kind: ReorderKind;
  listPosition: string;
  resource: DTOPlaylistResource;
  title: string;
};

export function PlaylistDetailScreen({ navigation, route }: PlaylistDetailScreenProps) {
  const { t } = useTranslation();
  const { styles: themeStyles, tokens } = useTheme();
  const { account, accessToken, clearSession, refreshToken, setTokens, status } = useAuth();
  const [playlist, setPlaylist] = useState<DTOPlaylist | null>(null);
  const [resourceRows, setResourceRows] = useState<PlaylistResourceRow[]>([]);
  const [resources, setResources] = useState<DTOPlaylistResource[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [isReordering, setIsReordering] = useState<boolean>(false);
  const [isSavingOrder, setIsSavingOrder] = useState<boolean>(false);
  const [reorderErrorKey, setReorderErrorKey] = useState<string | null>(null);
  const { playbackNoticeKey, runPlayAction, runQueueAction } = useHomeRowPlayback();
  const { playPlaylistRowById } = usePlayback();
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
        reorderControls: {
          flexDirection: 'row',
          gap: tokens.spacing.sm,
        },
        reorderRow: {
          alignItems: 'center',
          borderBottomColor: themeStyles.border.borderColor,
          borderBottomWidth: 1,
          flexDirection: 'row',
          gap: tokens.spacing.md,
          paddingVertical: tokens.spacing.md,
        },
        reorderTitle: {
          color: themeStyles.textPrimary.color,
          flex: 1,
          fontSize: 15,
          fontWeight: '600',
        },
      }),
    [themeStyles, tokens]
  );

  const loadPlaylist = useCallback(async () => {
    if (status !== 'authenticated') {
      setPlaylist(null);
      setResourceRows([]);
      setResources([]);
      setErrorKey(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setErrorKey(null);
    try {
      const playlistResponse = await requestWithMobileAuthRefresh(authArgs, async (api) =>
        api.reqPlaylistGet(playlistId)
      );
      setPlaylist(playlistResponse);

      const fetchedResources = await requestWithMobileAuthRefresh(authArgs, async (api) =>
        api.reqPlaylistResourceGetAllByPlaylistIdTextPrivate(playlistId)
      );
      setResources(fetchedResources);

      const nextRows = fetchedResources
        .map((resource) => playlistResourceToHomeRow(resource))
        .filter((row): row is PlaylistResourceRow => row !== null);
      setResourceRows(nextRows);
    } catch {
      setErrorKey('errors.generic');
      setPlaylist(null);
      setResourceRows([]);
      setResources([]);
    } finally {
      setIsLoading(false);
    }
  }, [authArgs, playlistId, status]);

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

  // Only resources that render as a row (item/clip/soundbite) participate in reorder; keep their
  // list_position + kind so persistence mirrors the web first/last/between logic.
  const reorderableResources = useMemo<ReorderableResource[]>(() => {
    return resources.flatMap((resource) => {
      const kind = reorderKind(resource);
      const idText = reorderIdText(resource);
      const row = playlistResourceToHomeRow(resource);
      if (kind === null || idText === null || row === null) {
        return [];
      }
      return [
        {
          idText,
          kind,
          listPosition: resource.list_position,
          resource,
          title: row.title,
        },
      ];
    });
  }, [resources]);

  // Persist a single-step move by re-inserting the moved resource relative to its new neighbors
  // (first/last/between), then reloading so server list_position is canonical. Web parity:
  // apps/web/src/components/List/Playlists/ListPlaylistResources.tsx.
  const moveResource = useCallback(
    async (fromIndex: number, direction: 'up' | 'down') => {
      if (isSavingOrder) {
        return;
      }
      const toIndex = direction === 'up' ? fromIndex - 1 : fromIndex + 1;
      if (toIndex < 0 || toIndex >= reorderableResources.length) {
        return;
      }
      const moved = reorderableResources[fromIndex];
      if (moved === undefined) {
        return;
      }

      const reordered = [...reorderableResources];
      reordered.splice(fromIndex, 1);
      reordered.splice(toIndex, 0, moved);
      const previous = reordered[toIndex - 1];
      const next = reordered[toIndex + 1];

      setIsSavingOrder(true);
      setReorderErrorKey(null);
      try {
        await requestWithMobileAuthRefresh(authArgs, async (api) => {
          if (toIndex === 0) {
            if (moved.kind === 'clip') {
              return api.reqPlaylistResourceClipAddFirst(playlistId, moved.idText);
            }
            if (moved.kind === 'item_soundbite') {
              return api.reqPlaylistResourceItemSoundbiteAddFirst(playlistId, moved.idText);
            }
            return api.reqPlaylistResourceItemAddFirst(playlistId, moved.idText);
          }
          if (toIndex === reordered.length - 1) {
            if (moved.kind === 'clip') {
              return api.reqPlaylistResourceClipAddLast(playlistId, moved.idText);
            }
            if (moved.kind === 'item_soundbite') {
              return api.reqPlaylistResourceItemSoundbiteAddLast(playlistId, moved.idText);
            }
            return api.reqPlaylistResourceItemAddLast(playlistId, moved.idText);
          }
          const params = {
            position1: previous?.listPosition ?? moved.listPosition,
            position2: next?.listPosition ?? moved.listPosition,
          };
          if (moved.kind === 'clip') {
            return api.reqPlaylistResourceClipAddBetween(playlistId, moved.idText, params);
          }
          if (moved.kind === 'item_soundbite') {
            return api.reqPlaylistResourceItemSoundbiteAddBetween(playlistId, moved.idText, params);
          }
          return api.reqPlaylistResourceItemAddBetween(playlistId, moved.idText, params);
        });
        await loadPlaylist();
      } catch {
        setReorderErrorKey('errors.generic');
      } finally {
        setIsSavingOrder(false);
      }
    },
    [authArgs, isSavingOrder, loadPlaylist, playlistId, reorderableResources]
  );

  const handleShare = useCallback(() => {
    shareResolvedUrl(buildPublicShareUrl('playlist', playlistId));
  }, [playlistId]);

  const listHeader = (
    <>
      <Text style={styles.heading}>{playlist?.title ?? t('features.playlist.playlist')}</Text>
      <SectionCard heading={playlist?.title ?? t('features.playlist.playlist')}>
        <Text style={styles.cardText}>
          {t('features.playlist.item_count', {
            count: playlist?.item_count ?? resourceRows.length,
          })}
        </Text>
        {playlist?.account?.account_profile?.display_name ? (
          <Text style={styles.cardText}>{playlist.account.account_profile.display_name}</Text>
        ) : null}
        <View style={styles.headerActions}>
          <Button
            label={t('features.share')}
            onPress={handleShare}
            size="sm"
            testID="library-playlist-detail-share"
            variant="secondary"
          />
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
            {reorderableResources.length > 1 ? (
              <Button
                label={isReordering ? t('misc.done') : t('features.playlist.reorder')}
                onPress={() => {
                  setReorderErrorKey(null);
                  setIsReordering((previous) => !previous);
                }}
                size="sm"
                testID="library-playlist-detail-reorder-toggle"
                variant="secondary"
              />
            ) : null}
          </View>
        ) : null}
      </SectionCard>
      {isReordering && isOwner ? (
        <SectionCard>
          <View testID="library-playlist-reorder-list">
            {reorderableResources.map((entry, index) => (
              <View
                key={entry.resource.id}
                style={styles.reorderRow}
                testID={`playlist-reorder-row-${index}`}
              >
                <Text numberOfLines={2} style={styles.reorderTitle}>
                  {entry.title}
                </Text>
                <View style={styles.reorderControls}>
                  <Button
                    accessibilityLabel={t('misc.move_up')}
                    disabled={index === 0 || isSavingOrder}
                    label={t('misc.move_up')}
                    onPress={() => {
                      void moveResource(index, 'up');
                    }}
                    size="sm"
                    testID={`playlist-reorder-up-${index}`}
                    variant="secondary"
                  />
                  <Button
                    accessibilityLabel={t('misc.move_down')}
                    disabled={index === reorderableResources.length - 1 || isSavingOrder}
                    label={t('misc.move_down')}
                    onPress={() => {
                      void moveResource(index, 'down');
                    }}
                    size="sm"
                    testID={`playlist-reorder-down-${index}`}
                    variant="secondary"
                  />
                </View>
              </View>
            ))}
            {reorderErrorKey !== null ? (
              <Text style={styles.notice} testID="library-playlist-reorder-error">
                {t(reorderErrorKey)}
              </Text>
            ) : null}
          </View>
        </SectionCard>
      ) : null}
    </>
  );

  const listFooter =
    !isReordering && playbackNoticeKey !== null ? (
      <Text style={styles.notice}>{t(playbackNoticeKey)}</Text>
    ) : null;

  return (
    <View style={styles.container} testID="library-playlist-detail-screen">
      <AuthAwareLoadState
        emptyTestID="library-playlist-detail-auth-required"
        errorKey={errorKey}
        errorTestID="library-playlist-detail-error"
        isLoading={isLoading}
        loadingTestID="library-playlist-detail-loading"
        onRetry={() => {
          void loadPlaylist();
        }}
        showAuthRequired={status !== 'authenticated'}
      >
        <FlatList
          ListEmptyComponent={
            !isReordering ? <ListEmpty messageKey="misc.info" testID="library-playlist-detail-empty" /> : null
          }
          ListFooterComponent={listFooter}
          ListHeaderComponent={listHeader}
          contentContainerStyle={styles.content}
          data={isReordering ? [] : resourceRows}
          keyExtractor={(row) => row.id}
          renderItem={({ item: row }) => (
            <HomeFeedRow
              mediaType={row.mediaType}
              onPlayPress={(nextRow) => {
                const playlistTarget = resolvePlaylistRowTarget(nextRow.id);
                if (playlistTarget !== null) {
                  void playPlaylistRowById(playlistTarget.idText, playlistTarget.kind, playlistId);
                  return;
                }
                runPlayAction(nextRow, row.mediaType);
              }}
              onPress={() => {}}
              onQueuePress={(nextRow, position) => {
                runQueueAction(nextRow, row.mediaType, position);
              }}
              row={row}
            />
          )}
        />
      </AuthAwareLoadState>
    </View>
  );
}
