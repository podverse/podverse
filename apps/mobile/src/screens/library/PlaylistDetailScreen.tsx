import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text } from 'react-native';

import type { DTOPlaylist } from '@podverse/helpers';

import { requestWithMobileAuthRefresh } from '../../auth';
import { useAuth } from '../../auth/AuthProvider';
import { MobileScreenContainer } from '../../components/screen/MobileScreenContainer';
import { ListSection } from '../../components/section/ListSection';
import { SectionCard } from '../../components/section/SectionCard';
import { AuthAwareLoadState } from '../../components/state/AuthAwareLoadState';
import { playlistResourceToHomeRow } from '../../lib/rows/homeRowMappers';
import type { LibraryStackParamList } from '../../navigation';
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

type PlaylistDetailScreenProps = NativeStackScreenProps<LibraryStackParamList, 'PlaylistDetail'>;

type PlaylistResourceRow = HomeFeedRowData & {
  mediaType: 'clips' | 'episodes' | 'tracks';
};

export function PlaylistDetailScreen({ route }: PlaylistDetailScreenProps) {
  const { t } = useTranslation();
  const { styles: themeStyles, tokens } = useTheme();
  const { accessToken, clearSession, refreshToken, setTokens, status } = useAuth();
  const [playlist, setPlaylist] = useState<DTOPlaylist | null>(null);
  const [resourceRows, setResourceRows] = useState<PlaylistResourceRow[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const { playbackNoticeKey, runPlayAction, runQueueAction } = useHomeRowPlayback();
  const { playPlaylistRowById } = usePlayback();
  const { playlistId } = route.params;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        cardText: {
          color: themeStyles.textSecondary.color,
          fontSize: 14,
          marginTop: tokens.spacing.sm,
        },
        notice: {
          color: themeStyles.textSecondary.color,
          fontSize: 13,
          marginTop: tokens.spacing.sm,
        },
      }),
    [themeStyles, tokens]
  );

  const loadPlaylist = useCallback(async () => {
    if (status !== 'authenticated') {
      setPlaylist(null);
      setResourceRows([]);
      setErrorKey(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setErrorKey(null);
    try {
      const playlistResponse = await requestWithMobileAuthRefresh(
        {
          accessToken,
          clearSession,
          refreshToken,
          setTokens,
        },
        async (api) => api.reqPlaylistGet(playlistId)
      );
      setPlaylist(playlistResponse);

      const resources = await requestWithMobileAuthRefresh(
        {
          accessToken,
          clearSession,
          refreshToken,
          setTokens,
        },
        async (api) => api.reqPlaylistResourceGetAllByPlaylistIdTextPrivate(playlistId)
      );

      const nextRows = resources
        .map((resource) => playlistResourceToHomeRow(resource))
        .filter((row): row is PlaylistResourceRow => row !== null);
      setResourceRows(nextRows);
    } catch {
      setErrorKey('errors.generic');
      setPlaylist(null);
      setResourceRows([]);
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, clearSession, playlistId, refreshToken, setTokens, status]);

  useEffect(() => {
    void loadPlaylist();
  }, [loadPlaylist]);

  return (
    <MobileScreenContainer
      heading={playlist?.title ?? t('features.playlist.playlist')}
      testID="library-playlist-detail-screen"
    >
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
        <>
          <SectionCard heading={playlist?.title ?? t('features.playlist.playlist')}>
            <Text style={styles.cardText}>
              {t('features.playlist.item_count', {
                count: playlist?.item_count ?? resourceRows.length,
              })}
            </Text>
            {playlist?.account?.account_profile?.display_name ? (
              <Text style={styles.cardText}>{playlist.account.account_profile.display_name}</Text>
            ) : null}
          </SectionCard>
          <SectionCard>
            <ListSection
              emptyTestID="library-playlist-detail-empty"
              items={resourceRows}
              renderItem={(row: PlaylistResourceRow) => (
                <HomeFeedRow
                  key={row.id}
                  mediaType={row.mediaType}
                  onPlayPress={(nextRow) => {
                    const playlistTarget = resolvePlaylistRowTarget(nextRow.id);
                    if (playlistTarget !== null) {
                      void playPlaylistRowById(
                        playlistTarget.idText,
                        playlistTarget.kind,
                        playlistId
                      );
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
            {playbackNoticeKey !== null ? (
              <Text style={styles.notice}>{t(playbackNoticeKey)}</Text>
            ) : null}
          </SectionCard>
        </>
      </AuthAwareLoadState>
    </MobileScreenContainer>
  );
}
