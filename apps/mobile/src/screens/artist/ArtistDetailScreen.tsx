import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

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

type ArtistDetailScreenProps = NativeStackScreenProps<HomeStackParamList, 'ArtistDetail'>;

const toTrackRows = (items: DTOItem[]): HomeFeedRowData[] => {
  return items
    .map((item) => ({
      id: item.id_text,
      imageUrl: item.item_images[0]?.url ?? item.channel?.channel_images?.[0]?.url ?? null,
      subtitle: item.channel?.title ?? null,
      title: item.title ?? item.id_text,
    }))
    .filter((row) => row.id.length > 0);
};

export function ArtistDetailScreen({ navigation, route }: ArtistDetailScreenProps) {
  const { t } = useTranslation();
  const { styles: themeStyles, tokens } = useTheme();
  const { accessToken, clearSession, refreshToken, setTokens } = useAuth();
  const [artist, setArtist] = useState<DTOChannel | null>(null);
  const [albums, setAlbums] = useState<DTOChannel[]>([]);
  const [trackRows, setTrackRows] = useState<HomeFeedRowData[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const { playbackNoticeKey, runPlayAction, runQueueAction } = useHomeRowPlayback();
  const { artistId } = route.params;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        albumCard: {
          backgroundColor: themeStyles.screen.backgroundColor,
          borderColor: themeStyles.border.borderColor,
          borderRadius: tokens.radii.md,
          borderWidth: 1,
          marginTop: tokens.spacing.sm,
          padding: tokens.spacing.md,
        },
        albumSubtitle: {
          color: themeStyles.textSecondary.color,
          fontSize: 13,
          marginTop: tokens.spacing.xs,
        },
        albumTitle: {
          color: themeStyles.textPrimary.color,
          fontSize: 16,
          fontWeight: '600',
        },
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

  const loadArtist = useCallback(async () => {
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
        async (api) => api.reqPublisherFeedGetRemoteItemsForChannel(artistId)
      );

      setArtist(response.channel);
      setAlbums(response.channelsAdded);
      setTrackRows(toTrackRows(response.itemsAdded));
    } catch {
      setErrorKey('errors.generic');
      setArtist(null);
      setAlbums([]);
      setTrackRows([]);
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, artistId, clearSession, refreshToken, setTokens]);

  useEffect(() => {
    void loadArtist();
  }, [loadArtist]);

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      style={{ backgroundColor: themeStyles.screen.backgroundColor }}
      testID="artist-detail-screen"
    >
      <Text style={styles.heading}>{artist?.title ?? t('media.music.artist')}</Text>
      {isLoading ? <ListLoading testID="artist-detail-loading" /> : null}
      {!isLoading && errorKey !== null ? (
        <ListError
          messageKey={errorKey}
          onRetry={() => {
            void loadArtist();
          }}
          testID="artist-detail-error"
        />
      ) : null}
      {!isLoading && errorKey === null ? (
        <>
          <View style={styles.card}>
            <Text style={styles.cardHeading}>{artist?.title ?? t('media.music.artist')}</Text>
            {artist?.channel_description?.value ? (
              <Text style={styles.cardDescription}>{artist.channel_description.value}</Text>
            ) : null}
          </View>

          <View style={styles.card}>
            <Text style={styles.cardHeading}>{t('media.music.albums')}</Text>
            {albums.length === 0 ? (
              <ListEmpty messageKey="misc.info" testID="artist-detail-albums-empty" />
            ) : (
              albums.map((album) => (
                <Pressable
                  key={album.id_text}
                  onPress={() => {
                    navigation.navigate(HOME_STACK_ROUTES.AlbumDetail, {
                      albumId: album.id_text,
                    });
                  }}
                  style={styles.albumCard}
                  testID={`artist-album-row-${album.id_text}`}
                >
                  <Text style={styles.albumTitle}>{album.title ?? album.id_text}</Text>
                  {album.channel_publisher?.name ? (
                    <Text style={styles.albumSubtitle}>{album.channel_publisher.name}</Text>
                  ) : null}
                </Pressable>
              ))
            )}
          </View>

          <View style={styles.card}>
            <Text style={styles.cardHeading}>{t('media.music.tracks')}</Text>
            {trackRows.length === 0 ? (
              <ListEmpty messageKey="misc.info" testID="artist-detail-tracks-empty" />
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
