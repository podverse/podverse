import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '../../auth/AuthProvider';
import { ListEmpty } from '../../components/state/ListEmpty';
import { ListError } from '../../components/state/ListError';
import { ListLoading } from '../../components/state/ListLoading';
import type { HomeStackParamList } from '../../navigation';
import { HOME_STACK_ROUTES } from '../../navigation';
import { E2ePlayVideoButton } from '../../playback/E2ePlayVideoButton';
import {
  DEFAULT_HOME_MEDIA_TYPE,
  type HomeMediaType,
  readPreferredMediaType,
  writePreferredMediaType,
} from '../../prefs/preferredMediaType';
import { useTheme } from '../../theme/useTheme';
import { fetchHomeFeedRows, type HomeFeedRowData } from './homeFeedData';
import { HomeFeedRow } from './HomeFeedRow';
import { MediaTypeSelector } from './MediaTypeSelector';
import { useHomeRowPlayback } from './useHomeRowPlayback';

const MEDIA_TYPE_TITLE_KEYS: Record<HomeMediaType, string> = {
  albums: 'media.music.albums',
  artists: 'media.music.artists',
  clips: 'features.clip.clips',
  episodes: 'media.podcast.episodes',
  podcasts: 'media.podcast.podcasts',
  tracks: 'media.music.tracks',
};

export function HomeScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
  const { accessToken, clearSession, refreshToken, setTokens, status } = useAuth();
  const { styles: themeStyles, tokens } = useTheme();
  const [selectedMediaType, setSelectedMediaType] =
    useState<HomeMediaType>(DEFAULT_HOME_MEDIA_TYPE);
  const [feedRows, setFeedRows] = useState<HomeFeedRowData[]>([]);
  const [isFeedLoading, setIsFeedLoading] = useState<boolean>(true);
  const [isFeedRefreshing, setIsFeedRefreshing] = useState<boolean>(false);
  const [feedErrorKey, setFeedErrorKey] = useState<string | null>(null);
  const { playbackNoticeKey, runPlayAction, runQueueAction } = useHomeRowPlayback();

  useEffect(() => {
    let isMounted = true;

    void (async () => {
      const storedMediaType = await readPreferredMediaType();
      if (!isMounted || storedMediaType === null) {
        return;
      }

      setSelectedMediaType(storedMediaType);
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleMediaTypeChange = useCallback((mediaType: HomeMediaType) => {
    setSelectedMediaType(mediaType);
    void writePreferredMediaType(mediaType);
  }, []);

  const loadFeed = useCallback(
    async (source: 'initial' | 'refresh' | 'retry') => {
      if (source === 'refresh') {
        if (isFeedRefreshing) {
          return;
        }
        setIsFeedRefreshing(true);
      } else {
        setIsFeedLoading(true);
      }

      setFeedErrorKey(null);
      try {
        const rows = await fetchHomeFeedRows(selectedMediaType, {
          accessToken,
          clearSession,
          refreshToken,
          setTokens,
          status,
        });
        setFeedRows(rows);
      } catch {
        if (source === 'initial' || source === 'retry') {
          setFeedRows([]);
        }
        setFeedErrorKey('errors.generic');
      } finally {
        if (source === 'refresh') {
          setIsFeedRefreshing(false);
        } else {
          setIsFeedLoading(false);
        }
      }
    },
    [
      accessToken,
      clearSession,
      isFeedRefreshing,
      refreshToken,
      selectedMediaType,
      setTokens,
      status,
    ]
  );

  useEffect(() => {
    void loadFeed('initial');
  }, [loadFeed]);

  const handleRowPress = useCallback(
    (row: HomeFeedRowData) => {
      if (selectedMediaType === 'podcasts') {
        navigation.navigate(HOME_STACK_ROUTES.PodcastDetail, {
          podcastId: row.id,
        });
        return;
      }

      if (selectedMediaType === 'episodes') {
        navigation.navigate(HOME_STACK_ROUTES.EpisodeDetail, {
          episodeId: row.id,
        });
        return;
      }

      if (selectedMediaType === 'clips') {
        navigation.navigate(HOME_STACK_ROUTES.ClipDetail, {
          clipId: row.id,
        });
        return;
      }

      if (selectedMediaType === 'artists') {
        navigation.navigate(HOME_STACK_ROUTES.ArtistDetail, {
          artistId: row.id,
        });
        return;
      }

      if (selectedMediaType === 'albums') {
        navigation.navigate(HOME_STACK_ROUTES.AlbumDetail, {
          albumId: row.id,
        });
        return;
      }

      navigation.navigate(HOME_STACK_ROUTES.TrackDetail, {
        trackId: row.id,
      });
    },
    [navigation, selectedMediaType]
  );

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          backgroundColor: themeStyles.screen.backgroundColor,
          flex: 1,
        },
        content: {
          padding: tokens.spacing.lg,
        },
        feedCard: {
          backgroundColor: tokens.background.secondary,
          borderColor: themeStyles.border.borderColor,
          borderRadius: tokens.radii.md,
          borderWidth: 1,
          marginTop: tokens.spacing.lg,
          padding: tokens.spacing.lg,
        },
        feedTitle: {
          color: themeStyles.textPrimary.color,
          fontSize: 20,
          fontWeight: '700',
        },
        feedSubtitle: {
          color: themeStyles.textSecondary.color,
          fontSize: 14,
          marginTop: tokens.spacing.sm,
        },
        feedSummary: {
          color: themeStyles.textSecondary.color,
          fontSize: 13,
          marginBottom: tokens.spacing.md,
        },
        feedNotice: {
          color: themeStyles.textSecondary.color,
          fontSize: 13,
          marginTop: tokens.spacing.sm,
        },
        heading: {
          color: themeStyles.textPrimary.color,
          fontSize: 28,
          fontWeight: '700',
          marginBottom: tokens.spacing.md,
        },
      }),
    [themeStyles, tokens]
  );

  return (
    <View style={styles.container} testID="home-screen">
      <MediaTypeSelector onChange={handleMediaTypeChange} selectedMediaType={selectedMediaType} />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            onRefresh={() => {
              void loadFeed('refresh');
            }}
            refreshing={isFeedRefreshing}
            tintColor={themeStyles.buttonPrimary.backgroundColor}
          />
        }
        testID="home-feed-list"
      >
        <Text style={styles.heading}>{t('nav.tab.home')}</Text>
        <E2ePlayVideoButton />
        <View style={styles.feedCard}>
          <Text style={styles.feedTitle}>{t(MEDIA_TYPE_TITLE_KEYS[selectedMediaType])}</Text>
          <Text style={styles.feedSummary}>
            {t('misc.items')}: {feedRows.length}
          </Text>
          {isFeedLoading ? <ListLoading testID="home-list-loading" /> : null}
          {!isFeedLoading && feedErrorKey !== null ? (
            <ListError
              messageKey={feedErrorKey}
              onRetry={() => {
                void loadFeed('retry');
              }}
              testID="home-list-error"
            />
          ) : null}
          {!isFeedLoading && feedErrorKey === null && feedRows.length === 0 ? (
            <ListEmpty messageKey="misc.info" testID="home-list-empty" />
          ) : null}
          {!isFeedLoading && feedErrorKey === null
            ? feedRows.map((row) => (
                <HomeFeedRow
                  key={row.id}
                  mediaType={selectedMediaType}
                  onPlayPress={(nextRow) => {
                    runPlayAction(nextRow, selectedMediaType);
                  }}
                  onPress={handleRowPress}
                  onQueuePress={(nextRow, position) => {
                    runQueueAction(nextRow, selectedMediaType, position);
                  }}
                  row={row}
                />
              ))
            : null}
          {playbackNoticeKey !== null ? (
            <Text style={styles.feedNotice}>{t(playbackNoticeKey)}</Text>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}
