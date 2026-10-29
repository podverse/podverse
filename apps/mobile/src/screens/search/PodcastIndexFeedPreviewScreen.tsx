import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import type { IndexProviderId } from '@podverse/helpers';
import { toNonEmptyTrimmedString } from '@podverse/helpers/guards';
import { getChannelRouteKind } from '@podverse/helpers/medium';
import type { ApiRequestService } from '@podverse/helpers-requests';

import { requestWithMobileAuthRefresh } from '../../auth';
import { useAuthPrompt } from '../../auth/AuthPromptContext';
import { useAuth } from '../../auth/AuthProvider';
import { SearchDetailView } from '../../components/searchDetail/SearchDetailView';
import { ListEmpty } from '../../components/state/ListEmpty';
import { ListLoading } from '../../components/state/ListLoading';
import { OFFLINE_UNAVAILABLE_MESSAGE_KEY } from '../../lib/offlineModeViews';
import { useMembershipGate } from '../../membership/MembershipGateProvider';
import { useAccessTier } from '../../membership/useAccessTier';
import type { ChannelBrowseStackParamList } from '../../navigation';
import {
  buildAlbumDetailParams,
  buildPodcastDetailParams,
  CHANNEL_BROWSE_STACK_ROUTES,
} from '../../navigation';
import { useOfflineMode } from '../../prefs/offlineMode';
import {
  BottomChromeScrollSpacer,
  useBottomChromeScrollIndicatorInsets,
} from '../../theme/bottomChromeOverlayInset';
import { screenBodyInsets } from '../../theme/screenLayout';
import { typography } from '../../theme/typography';
import { useTheme } from '../../theme/useTheme';
import {
  isParsedReadyChannel,
  pollUntilParsedReadyChannel,
  shouldFetchProviderFeed,
} from './podcastIndexFeedPreview';

type PodcastIndexFeedPreviewScreenProps = NativeStackScreenProps<
  ChannelBrowseStackParamList,
  typeof CHANNEL_BROWSE_STACK_ROUTES.SearchResultDetail
>;

type PreviewFeedState = {
  author: string;
  description: string;
  feedUrl: string;
  imageUrl: string | null;
  podcastIndexId: string;
  title: string;
};

type ProviderFeedSnapshot = {
  author: string;
  description: string;
  feedUrl: string;
  imageUrl: string | null;
  providerFeedId: string;
  title: string;
};

type AddErrorKey = 'features.search.add_failed' | 'features.search.add_timed_out' | null;

/** Feed, add, and parsed-channel calls for the route's index provider. */
const providerApi = (indexProvider: IndexProviderId) => {
  switch (indexProvider) {
    case 'podcast_index':
      return {
        fetchFeed: async (
          api: ApiRequestService,
          providerFeedId: string
        ): Promise<ProviderFeedSnapshot> => {
          const response = await api.reqPodcastIndexFeedById(providerFeedId);
          const piFeed = response.feed;
          return {
            author: piFeed.author,
            description: piFeed.description,
            feedUrl: piFeed.url,
            imageUrl:
              toNonEmptyTrimmedString(piFeed.image) ?? toNonEmptyTrimmedString(piFeed.artwork),
            providerFeedId: String(piFeed.id),
            title: piFeed.title,
          };
        },
        enqueueAdd: async (
          api: ApiRequestService,
          feed: { feedUrl: string; providerFeedId: string }
        ) => {
          const podcastIndexId = Number.parseInt(feed.providerFeedId, 10);
          if (Number.isNaN(podcastIndexId)) {
            throw new Error('Podcast Index feed id is not a number');
          }
          return api.reqMQRSSAddOnDemand({
            podcast_index_id: podcastIndexId,
            url: feed.feedUrl,
          });
        },
        fetchParsedChannel: (api: ApiRequestService, providerFeedId: string) =>
          api.reqChannelGetByPodcastIndexId(providerFeedId),
      };
    default: {
      const unhandled: never = indexProvider;
      return unhandled;
    }
  }
};

/** Replace the stale Add preview with channel detail on the current tab stack. */
const replaceWithSearchChannelDetail = (
  navigation: PodcastIndexFeedPreviewScreenProps['navigation'],
  mediumId: number,
  idText: string,
  preview: { imageUrl: string | null; title: string }
) => {
  const kind = getChannelRouteKind(mediumId);
  if (kind === 'artist') {
    navigation.replace(CHANNEL_BROWSE_STACK_ROUTES.ArtistDetail, { artistId: idText });
    return;
  }
  if (kind === 'album') {
    navigation.replace(
      CHANNEL_BROWSE_STACK_ROUTES.AlbumDetail,
      buildAlbumDetailParams({
        albumId: idText,
        previewImageUrl: preview.imageUrl,
        previewTitle: preview.title,
      })
    );
    return;
  }
  navigation.replace(
    CHANNEL_BROWSE_STACK_ROUTES.PodcastDetail,
    buildPodcastDetailParams({
      podcastId: idText,
      previewImageUrl: preview.imageUrl,
      previewTitle: preview.title,
    })
  );
};

export function PodcastIndexFeedPreviewScreen({
  navigation,
  route,
}: PodcastIndexFeedPreviewScreenProps) {
  const { t } = useTranslation();
  const { accessToken, clearSession, refreshToken, setTokens } = useAuth();
  const { onRequestLogin } = useAuthPrompt();
  const { styles: themeStyles, tokens } = useTheme();
  const scrollIndicatorInsets = useBottomChromeScrollIndicatorInsets();
  const { enabled: offlineModeEnabled } = useOfflineMode();
  const { handleGateError, openGate } = useMembershipGate();
  const { evaluateFeature } = useAccessTier();
  const isMountedRef = useRef(true);
  /**
   * The fetch writes `feed`, and `feed` is an effect dependency. This stops that write from
   * starting another fetch. A run cancelled before it applies may start again.
   */
  const hasFetchedRef = useRef(false);

  // Membership tier is only the floor: the server also refuses directory adds for Trial accounts,
  // which no client-side check can predict, so `handleGateError` below still matters.
  const addAccess = evaluateFeature('directory_add_by_rss');
  const indexProvider = route.params.indexProvider ?? 'podcast_index';

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
  const feedRef = useRef(feed);
  feedRef.current = feed;

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (offlineModeEnabled || hasFetchedRef.current) {
      return;
    }

    const providerFeedId = route.params.resultId;
    const hasSeed = feed !== null;

    if (providerFeedId.length === 0) {
      if (!hasSeed) {
        setHydrateErrorKey('errors.generic');
        setIsHydrating(false);
      }
      return;
    }

    if (
      !shouldFetchProviderFeed({
        description: route.params.description,
        hasSeed,
      })
    ) {
      return;
    }

    hasFetchedRef.current = true;
    const reportFailure = !hasSeed;
    let isActive = true;
    let applied = false;

    void (async () => {
      if (reportFailure) {
        setIsHydrating(true);
        setHydrateErrorKey(null);
      }
      try {
        const loaded = await requestWithMobileAuthRefresh(
          {
            accessToken,
            clearSession,
            refreshToken,
            setTokens,
          },
          async (api) => providerApi(indexProvider).fetchFeed(api, providerFeedId)
        );

        if (!isActive) {
          return;
        }

        applied = true;
        setFeed({
          author: loaded.author,
          description: loaded.description,
          feedUrl: loaded.feedUrl,
          imageUrl: loaded.imageUrl,
          podcastIndexId: loaded.providerFeedId,
          title: loaded.title,
        });
      } catch {
        if (!isActive) {
          return;
        }
        if (reportFailure) {
          setHydrateErrorKey('errors.generic');
        }
      } finally {
        if (isActive && reportFailure) {
          setIsHydrating(false);
        }
      }
    })();

    return () => {
      isActive = false;
      if (!applied) {
        hasFetchedRef.current = false;
      }
    };
  }, [
    accessToken,
    clearSession,
    feed,
    indexProvider,
    offlineModeEnabled,
    refreshToken,
    route.params.description,
    route.params.resultId,
    setTokens,
  ]);

  useEffect(() => {
    if (offlineModeEnabled) {
      return;
    }

    const providerFeedId = route.params.resultId;
    if (providerFeedId.length === 0) {
      return;
    }

    let isActive = true;
    void (async () => {
      try {
        const channel = await requestWithMobileAuthRefresh(
          {
            accessToken,
            clearSession,
            refreshToken,
            setTokens,
          },
          async (api) => providerApi(indexProvider).fetchParsedChannel(api, providerFeedId)
        );

        if (!isActive || !isParsedReadyChannel(channel)) {
          return;
        }

        const currentFeed = feedRef.current;
        replaceWithSearchChannelDetail(navigation, channel.medium_id, channel.id_text, {
          imageUrl: currentFeed?.imageUrl ?? null,
          title: currentFeed?.title ?? '',
        });
      } catch {
        // Leave the preview up when the parsed-channel check fails.
      }
    })();

    return () => {
      isActive = false;
    };
  }, [
    accessToken,
    clearSession,
    indexProvider,
    navigation,
    offlineModeEnabled,
    refreshToken,
    route.params.resultId,
    setTokens,
  ]);

  const navigateToChannelDetail = useCallback(
    (mediumId: number, idText: string) => {
      replaceWithSearchChannelDetail(navigation, mediumId, idText, {
        imageUrl: feed?.imageUrl ?? null,
        title: feed?.title ?? '',
      });
    },
    [feed?.imageUrl, feed?.title, navigation]
  );

  const handleAddPress = useCallback(async () => {
    if (feed === null || isAdding) {
      return;
    }

    if (!addAccess.allowed) {
      openGate(addAccess.reason);
      return;
    }

    if (accessToken === null) {
      onRequestLogin();
      return;
    }

    setIsAdding(true);
    setAddErrorKey(null);
    setAddNoticeKey(null);

    try {
      await requestWithMobileAuthRefresh(
        {
          accessToken,
          clearSession,
          refreshToken,
          setTokens,
        },
        async (api) =>
          providerApi(indexProvider).enqueueAdd(api, {
            feedUrl: feed.feedUrl,
            providerFeedId: feed.podcastIndexId,
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
            async (api) => providerApi(indexProvider).fetchParsedChannel(api, feed.podcastIndexId)
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
      if (handleGateError(error)) {
        return;
      }
      setAddErrorKey('features.search.add_failed');
    } finally {
      if (isMountedRef.current) {
        setIsAdding(false);
      }
    }
  }, [
    accessToken,
    addAccess,
    clearSession,
    feed,
    handleGateError,
    indexProvider,
    isAdding,
    navigateToChannelDetail,
    onRequestLogin,
    openGate,
    refreshToken,
    setTokens,
  ]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          backgroundColor: themeStyles.screen.backgroundColor,
          flex: 1,
        },
        content: {
          ...screenBodyInsets(tokens.spacing),
          gap: tokens.spacing.lg,
          paddingBottom: tokens.spacing.lg,
        },
        message: {
          ...typography.body,
          color: themeStyles.textPrimary.color,
        },
      }),
    [themeStyles, tokens]
  );

  if (offlineModeEnabled) {
    return (
      <View style={styles.container} testID="pi-feed-preview-screen">
        <ListEmpty
          messageKey={OFFLINE_UNAVAILABLE_MESSAGE_KEY}
          testID="pi-feed-preview-offline-unavailable"
        />
      </View>
    );
  }

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
        <ScrollView
          contentContainerStyle={styles.content}
          scrollIndicatorInsets={scrollIndicatorInsets}
        >
          <Text style={styles.message}>
            {t(hydrateErrorKey ?? 'features.search.not_available_yet')}
          </Text>
          <BottomChromeScrollSpacer />
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container} testID="pi-feed-preview-screen">
      <SearchDetailView
        author={feed.author.length > 0 ? feed.author : null}
        description={feed.description.length > 0 ? feed.description : null}
        errorMessage={addErrorKey !== null ? t(addErrorKey) : null}
        helperMessage={t('features.search.not_available_yet')}
        imageUrl={feed.imageUrl}
        noticeMessage={addNoticeKey !== null ? t(addNoticeKey) : null}
        primaryAction={{
          label: t('features.search.add_podcast'),
          loading: isAdding,
          onPress: () => {
            void handleAddPress();
          },
        }}
        progressMessage={isAdding ? t('features.search.adding') : null}
        testIDs={{
          actionButton: 'pi-feed-add-button',
          error: 'pi-feed-add-error',
          helper: 'pi-feed-preview-helper',
          image: 'pi-feed-preview-image',
          notice: 'pi-feed-add-notice',
          progress: 'pi-feed-adding',
          scroll: 'search-result-detail-screen',
        }}
        title={feed.title}
      />
    </View>
  );
}
