import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';

import { getErrorResponseStatus } from '@podverse/helpers/error';
import { toNonEmptyTrimmedString } from '@podverse/helpers/guards';

import { requestWithMobileAuthRefresh } from '../../auth';
import { useAuthPrompt } from '../../auth/AuthPromptContext';
import { useAuth } from '../../auth/AuthProvider';
import { Button } from '../../components/primitives';
import { ListLoading } from '../../components/state/ListLoading';
import type { SearchStackParamList } from '../../navigation';
import { SEARCH_STACK_ROUTES } from '../../navigation';
import { useTheme } from '../../theme/useTheme';
import {
  getChannelDetailRouteKind,
  isParsedReadyChannel,
  pollUntilParsedReadyChannel,
} from './podcastIndexFeedPreview';

type PodcastIndexFeedPreviewScreenProps = NativeStackScreenProps<
  SearchStackParamList,
  typeof SEARCH_STACK_ROUTES.SearchResultDetail
>;

type PreviewFeedState = {
  author: string;
  description: string;
  feedUrl: string;
  imageUrl: string | null;
  podcastIndexId: string;
  title: string;
};

type AddErrorKey =
  | 'features.search.add_failed'
  | 'features.search.add_needs_membership'
  | 'features.search.add_timed_out'
  | null;

/** Replace the stale Add preview with channel detail on the Search stack. */
const replaceWithSearchChannelDetail = (
  navigation: PodcastIndexFeedPreviewScreenProps['navigation'],
  mediumId: number,
  idText: string
) => {
  const kind = getChannelDetailRouteKind(mediumId);
  if (kind === 'artist') {
    navigation.replace(SEARCH_STACK_ROUTES.ArtistDetail, { artistId: idText });
    return;
  }
  if (kind === 'album') {
    navigation.replace(SEARCH_STACK_ROUTES.AlbumDetail, { albumId: idText });
    return;
  }
  navigation.replace(SEARCH_STACK_ROUTES.PodcastDetail, { podcastId: idText });
};

export function PodcastIndexFeedPreviewScreen({
  navigation,
  route,
}: PodcastIndexFeedPreviewScreenProps) {
  const { t } = useTranslation();
  const { accessToken, clearSession, refreshToken, setTokens, status } = useAuth();
  const { onRequestLogin } = useAuthPrompt();
  const { styles: themeStyles, tokens } = useTheme();
  const isMountedRef = useRef(true);

  const [feed, setFeed] = useState<PreviewFeedState | null>(() => {
    const params = route.params;
    const podcastIndexId = params.resultId;
    if (podcastIndexId.length === 0) {
      return null;
    }
    if (
      params.feedUrl !== undefined &&
      params.feedUrl.length > 0 &&
      params.title !== undefined &&
      params.title.length > 0
    ) {
      return {
        author: params.author ?? '',
        description: params.description ?? '',
        feedUrl: params.feedUrl,
        imageUrl: toNonEmptyTrimmedString(params.imageUrl),
        podcastIndexId,
        title: params.title,
      };
    }
    return null;
  });
  const [isHydrating, setIsHydrating] = useState(feed === null);
  const [hydrateErrorKey, setHydrateErrorKey] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [addErrorKey, setAddErrorKey] = useState<AddErrorKey>(null);
  const [addNoticeKey, setAddNoticeKey] = useState<string | null>(null);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (feed !== null) {
      return;
    }

    const podcastIndexId = route.params.resultId;
    if (podcastIndexId.length === 0) {
      setHydrateErrorKey('errors.generic');
      setIsHydrating(false);
      return;
    }

    let isActive = true;
    void (async () => {
      setIsHydrating(true);
      setHydrateErrorKey(null);
      try {
        const response = await requestWithMobileAuthRefresh(
          {
            accessToken,
            clearSession,
            refreshToken,
            setTokens,
          },
          async (api) => api.reqPodcastIndexFeedById(podcastIndexId)
        );

        if (!isActive) {
          return;
        }

        const piFeed = response.feed;
        setFeed({
          author: piFeed.author,
          description: piFeed.description,
          feedUrl: piFeed.url,
          imageUrl:
            toNonEmptyTrimmedString(piFeed.image) ?? toNonEmptyTrimmedString(piFeed.artwork),
          podcastIndexId: String(piFeed.id),
          title: piFeed.title,
        });
      } catch {
        if (!isActive) {
          return;
        }
        setHydrateErrorKey('errors.generic');
      } finally {
        if (isActive) {
          setIsHydrating(false);
        }
      }
    })();

    return () => {
      isActive = false;
    };
  }, [accessToken, clearSession, feed, refreshToken, route.params.resultId, setTokens]);

  const navigateToChannelDetail = useCallback(
    (mediumId: number, idText: string) => {
      replaceWithSearchChannelDetail(navigation, mediumId, idText);
    },
    [navigation]
  );

  const handleAddPress = useCallback(async () => {
    if (feed === null || isAdding) {
      return;
    }

    if (status !== 'authenticated' || accessToken === null) {
      onRequestLogin();
      return;
    }

    setIsAdding(true);
    setAddErrorKey(null);
    setAddNoticeKey(null);

    try {
      const podcastIndexId = Number.parseInt(feed.podcastIndexId, 10);
      if (Number.isNaN(podcastIndexId)) {
        setAddErrorKey('features.search.add_failed');
        return;
      }

      await requestWithMobileAuthRefresh(
        {
          accessToken,
          clearSession,
          refreshToken,
          setTokens,
        },
        async (api) =>
          api.reqMQRSSAddOnDemand({
            podcast_index_id: podcastIndexId,
            url: feed.feedUrl,
          })
      );

      const pollResult = await pollUntilParsedReadyChannel({
        fetchChannel: async () =>
          requestWithMobileAuthRefresh(
            {
              accessToken,
              clearSession,
              refreshToken,
              setTokens,
            },
            async (api) => api.reqChannelGetByPodcastIndexId(feed.podcastIndexId)
          ),
        shouldContinue: () => isMountedRef.current,
      });

      if (!isMountedRef.current) {
        return;
      }

      if (pollResult.outcome === 'ready' && isParsedReadyChannel(pollResult.channel)) {
        navigateToChannelDetail(pollResult.channel.medium_id, pollResult.channel.id_text);
        return;
      }

      if (pollResult.outcome === 'cancelled') {
        return;
      }

      setAddNoticeKey('features.search.add_timed_out');
    } catch (error: unknown) {
      if (!isMountedRef.current) {
        return;
      }
      if (getErrorResponseStatus(error) === 403) {
        setAddErrorKey('features.search.add_needs_membership');
      } else {
        setAddErrorKey('features.search.add_failed');
      }
    } finally {
      if (isMountedRef.current) {
        setIsAdding(false);
      }
    }
  }, [
    accessToken,
    clearSession,
    feed,
    isAdding,
    navigateToChannelDetail,
    onRequestLogin,
    refreshToken,
    setTokens,
    status,
  ]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        author: {
          color: themeStyles.textSecondary.color,
          fontSize: 15,
          marginTop: tokens.spacing.xs,
        },
        container: {
          backgroundColor: themeStyles.screen.backgroundColor,
          flex: 1,
        },
        content: {
          gap: tokens.spacing.md,
          padding: tokens.spacing.lg,
        },
        description: {
          color: themeStyles.textPrimary.color,
          fontSize: 14,
          marginTop: tokens.spacing.sm,
        },
        explanation: {
          color: themeStyles.textSecondary.color,
          fontSize: 14,
          marginBottom: tokens.spacing.sm,
        },
        image: {
          backgroundColor: tokens.background.secondary,
          borderRadius: tokens.radii.md,
          height: 160,
          width: 160,
        },
        imageFallback: {
          alignItems: 'center',
          backgroundColor: tokens.background.secondary,
          borderColor: themeStyles.border.borderColor,
          borderRadius: tokens.radii.md,
          borderWidth: 1,
          height: 160,
          justifyContent: 'center',
          width: 160,
        },
        imageFallbackText: {
          color: themeStyles.textSecondary.color,
          fontSize: 12,
          fontWeight: '600',
        },
        message: {
          color: themeStyles.textPrimary.color,
          fontSize: 14,
          marginTop: tokens.spacing.sm,
        },
        messageError: {
          color: themeStyles.textPrimary.color,
          fontSize: 14,
          marginTop: tokens.spacing.sm,
        },
        title: {
          color: themeStyles.textPrimary.color,
          fontSize: 22,
          fontWeight: '700',
          marginTop: tokens.spacing.md,
        },
      }),
    [themeStyles, tokens]
  );

  if (isHydrating) {
    return (
      <View style={styles.container} testID="pi-feed-preview-screen">
        <ListLoading testID="pi-feed-preview-loading" />
      </View>
    );
  }

  if (feed === null) {
    return (
      <View style={styles.container} testID="pi-feed-preview-screen">
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.message}>
            {t(hydrateErrorKey ?? 'features.search.not_available_yet')}
          </Text>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container} testID="pi-feed-preview-screen">
      <ScrollView contentContainerStyle={styles.content} testID="search-result-detail-screen">
        {feed.imageUrl !== null ? (
          <Image
            accessibilityIgnoresInvertColors
            source={{ uri: feed.imageUrl }}
            style={styles.image}
          />
        ) : (
          <View style={styles.imageFallback}>
            <Text style={styles.imageFallbackText}>{t('media.podcast.podcast')}</Text>
          </View>
        )}
        <Text style={styles.title}>{feed.title}</Text>
        {feed.author.length > 0 ? <Text style={styles.author}>{feed.author}</Text> : null}
        {feed.description.length > 0 ? (
          <Text style={styles.description}>{feed.description}</Text>
        ) : null}

        <Text style={styles.explanation}>{t('features.search.not_available_yet')}</Text>

        {status !== 'authenticated' ? (
          <Text style={styles.explanation} testID="pi-feed-add-needs-login">
            {t('features.search.add_needs_login')}
          </Text>
        ) : null}

        <Button
          fullWidth
          label={t('features.search.add_podcast')}
          loading={isAdding}
          onPress={() => {
            void handleAddPress();
          }}
          testID="pi-feed-add-button"
        />

        {isAdding ? (
          <Text style={styles.message} testID="pi-feed-adding">
            {t('features.search.adding')}
          </Text>
        ) : null}

        {addErrorKey !== null ? (
          <Text style={styles.messageError} testID="pi-feed-add-error">
            {t(addErrorKey)}
          </Text>
        ) : null}

        {addNoticeKey !== null ? (
          <Text style={styles.message} testID="pi-feed-add-notice">
            {t(addNoticeKey)}
          </Text>
        ) : null}
      </ScrollView>
    </View>
  );
}
