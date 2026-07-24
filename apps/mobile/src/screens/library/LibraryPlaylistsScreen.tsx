import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import type { DTOPlaylist } from '@podverse/helpers';

import { requestWithMobileAuthRefresh } from '../../auth';
import { useAuth } from '../../auth/AuthProvider';
import { Button, Card, ListRow } from '../../components/primitives';
import { MobileScreenContainer } from '../../components/screen/MobileScreenContainer';
import { AuthAwareLoadState } from '../../components/state/AuthAwareLoadState';
import type { LibraryStackParamList } from '../../navigation';
import { LIBRARY_STACK_ROUTES } from '../../navigation';
import { useTheme } from '../../theme/useTheme';

type LibraryPlaylistsScreenProps = NativeStackScreenProps<
  LibraryStackParamList,
  'LibraryPlaylists'
>;

const FIRST_PAGE = 1;

export function LibraryPlaylistsScreen({ navigation }: LibraryPlaylistsScreenProps) {
  const { t } = useTranslation();
  const { tokens } = useTheme();
  const { accessToken, clearSession, refreshToken, setTokens, status } = useAuth();
  const [playlists, setPlaylists] = useState<DTOPlaylist[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
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
      }),
    [tokens]
  );

  const loadPlaylists = useCallback(async () => {
    if (status !== 'authenticated') {
      setPlaylists([]);
      setErrorKey(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setErrorKey(null);
    try {
      const response = await requestWithMobileAuthRefresh(
        {
          accessToken,
          clearSession,
          refreshToken,
          setTokens,
        },
        async (api) =>
          api.reqPlaylistGetMany({
            medium: 'all',
            page: FIRST_PAGE,
            range: null,
            sort: 'recent',
            type: 'private',
          })
      );
      setPlaylists(response.data);
    } catch {
      setErrorKey('errors.generic');
      setPlaylists([]);
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, clearSession, refreshToken, setTokens, status]);

  useEffect(() => {
    void loadPlaylists();
  }, [loadPlaylists]);

  return (
    <MobileScreenContainer
      heading={t('features.playlist.playlists')}
      testID="library-playlists-screen"
    >
      {status === 'authenticated' ? (
        <View style={styles.createButton}>
          <Button
            label={t('features.playlist.create_playlist')}
            onPress={() => {
              navigation.navigate(LIBRARY_STACK_ROUTES.PlaylistCreate);
            }}
            testID="library-playlists-create"
          />
        </View>
      ) : null}
      <AuthAwareLoadState
        emptyTestID={
          status !== 'authenticated' ? 'library-playlists-auth-required' : 'library-playlists-empty'
        }
        errorKey={errorKey}
        errorTestID="library-playlists-error"
        isLoading={isLoading}
        loadingTestID="library-playlists-loading"
        onRetry={() => {
          void loadPlaylists();
        }}
        showAuthRequired={status !== 'authenticated'}
        showEmpty={status === 'authenticated' && playlists.length === 0}
      >
        {playlists.map((playlist) => {
          const itemCountLabel = t('features.playlist.item_count', {
            count: playlist.item_count,
          });
          const displayName = playlist.account?.account_profile?.display_name;
          const subtitle =
            displayName !== undefined && displayName.length > 0
              ? `${itemCountLabel} · ${displayName}`
              : itemCountLabel;

          return (
            <View key={playlist.id_text} style={styles.rowSpacing}>
              <Card>
                <ListRow
                  onPress={() => {
                    navigation.navigate(LIBRARY_STACK_ROUTES.PlaylistDetail, {
                      playlistId: playlist.id_text,
                    });
                  }}
                  subtitle={subtitle}
                  testID={`library-playlist-row-${playlist.id_text}`}
                  title={playlist.title ?? playlist.id_text}
                />
              </Card>
            </View>
          );
        })}
      </AuthAwareLoadState>
    </MobileScreenContainer>
  );
}
