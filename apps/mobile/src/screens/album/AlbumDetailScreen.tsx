import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import type { DTOChannel, DTOItem } from '@podverse/helpers';

import { requestWithMobileAuthRefresh } from '../../auth';
import { useAuth } from '../../auth/AuthProvider';
import { ListEmpty } from '../../components/state/ListEmpty';
import { ListError } from '../../components/state/ListError';
import { ListLoading } from '../../components/state/ListLoading';
import type { HomeStackParamList } from '../../navigation';
import { HOME_STACK_ROUTES } from '../../navigation';
import { useTheme } from '../../theme/useTheme';
import type { HomeFeedRowData } from '../home/homeFeedData';
import { HomeFeedRow } from '../home/HomeFeedRow';
import { useHomeRowPlayback } from '../home/useHomeRowPlayback';

type AlbumDetailScreenProps = NativeStackScreenProps<HomeStackParamList, 'AlbumDetail'>;

const FIRST_PAGE = 1;

const toTrackRows = (items: DTOItem[], albumTitle: string | null): HomeFeedRowData[] => {
  return items
    .map((item) => ({
      id: item.id_text,
      imageUrl: item.item_images[0]?.url ?? item.channel?.channel_images?.[0]?.url ?? null,
      subtitle: albumTitle,
      title: item.title ?? item.id_text,
    }))
    .filter((row) => row.id.length > 0);
};

export function AlbumDetailScreen({ navigation, route }: AlbumDetailScreenProps) {
  const { t } = useTranslation();
  const { styles: themeStyles, tokens } = useTheme();
  const { accessToken, clearSession, refreshToken, setTokens } = useAuth();
  const [album, setAlbum] = useState<DTOChannel | null>(null);
  const [trackRows, setTrackRows] = useState<HomeFeedRowData[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const { playbackNoticeKey, runPlayAction, runQueueAction } = useHomeRowPlayback();
  const { albumId } = route.params;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        card: {
          backgroundColor: tokens.background.secondary,
          borderColor: themeStyles.border.borderColor,
          borderRadius: tokens.radii.md,
          borderWidth: 1,
          marginTop: tokens.spacing.md,
          padding: tokens.spacing.lg,
        },
        cardDescription: {
          color: themeStyles.textSecondary.color,
          fontSize: 14,
          marginTop: tokens.spacing.sm,
        },
        cardHeading: {
          color: themeStyles.textPrimary.color,
          fontSize: 20,
          fontWeight: '700',
        },
        content: {
          padding: tokens.spacing.lg,
          paddingBottom: tokens.spacing['2xl'],
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

  const loadAlbum = useCallback(async () => {
    setIsLoading(true);
    setErrorKey(null);
    try {
      const channelResponse = await requestWithMobileAuthRefresh(
        {
          accessToken,
          clearSession,
          refreshToken,
          setTokens,
        },
        async (api) => api.reqChannelGetByIdOrIdText(albumId)
      );

      const itemResponse = await requestWithMobileAuthRefresh(
        {
          accessToken,
          clearSession,
          refreshToken,
          setTokens,
        },
        async (api) =>
          api.reqItemGetManyByChannelBySeason({
            idOrIdText: albumId,
            page: FIRST_PAGE,
            range: null,
            sort: 'forward',
          })
      );

      setAlbum(channelResponse);
      setTrackRows(toTrackRows(itemResponse.data, channelResponse.title));
    } catch {
      setErrorKey('errors.generic');
      setAlbum(null);
      setTrackRows([]);
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, albumId, clearSession, refreshToken, setTokens]);

  useEffect(() => {
    void loadAlbum();
  }, [loadAlbum]);

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      style={{ backgroundColor: themeStyles.screen.backgroundColor }}
      testID="album-detail-screen"
    >
      <Text style={styles.heading}>{album?.title ?? t('media.music.album')}</Text>
      {isLoading ? <ListLoading testID="album-detail-loading" /> : null}
      {!isLoading && errorKey !== null ? (
        <ListError
          messageKey={errorKey}
          onRetry={() => {
            void loadAlbum();
          }}
          testID="album-detail-error"
        />
      ) : null}
      {!isLoading && errorKey === null ? (
        <>
          <View style={styles.card}>
            <Text style={styles.cardHeading}>{album?.title ?? t('media.music.album')}</Text>
            {album?.channel_description?.value ? (
              <Text style={styles.cardDescription}>{album.channel_description.value}</Text>
            ) : null}
          </View>

          <View style={styles.card}>
            <Text style={styles.cardHeading}>{t('media.music.tracks')}</Text>
            {trackRows.length === 0 ? (
              <ListEmpty messageKey="misc.info" testID="album-detail-empty" />
            ) : (
              trackRows.map((row) => (
                <HomeFeedRow
                  key={row.id}
                  mediaType="tracks"
                  onPlayPress={(nextRow) => {
                    runPlayAction(nextRow, 'tracks');
                  }}
                  onPress={(nextRow) => {
                    navigation.navigate(HOME_STACK_ROUTES.TrackDetail, {
                      trackId: nextRow.id,
                    });
                  }}
                  onQueuePress={(nextRow, position) => {
                    runQueueAction(nextRow, 'tracks', position);
                  }}
                  row={row}
                />
              ))
            )}
            {playbackNoticeKey !== null ? (
              <Text style={styles.notice}>{t(playbackNoticeKey)}</Text>
            ) : null}
          </View>
        </>
      ) : null}
    </ScrollView>
  );
}
