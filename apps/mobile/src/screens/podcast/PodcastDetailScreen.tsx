import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { DTOChannel, DTOItem } from '@podverse/helpers';
import { LiveItemStatusEnum } from '@podverse/helpers/dto';
import type { ApiListResponse } from '@podverse/helpers-requests';

import { requestWithMobileAuthRefresh } from '../../auth';
import { useAuth } from '../../auth/AuthProvider';
import { ListEmpty } from '../../components/state/ListEmpty';
import { ListError } from '../../components/state/ListError';
import { ListLoading } from '../../components/state/ListLoading';
import { homeFeedRefresh } from '../../lib/home/homeFeedRefresh';
import type { ChannelBrowseStackParamList } from '../../navigation';
import { CHANNEL_BROWSE_STACK_ROUTES } from '../../navigation';
import { useTheme } from '../../theme/useTheme';
import type { HomeFeedRowData } from '../home/homeFeedData';
import { HomeFeedRow } from '../home/HomeFeedRow';
import { useHomeRowPlayback } from '../home/useHomeRowPlayback';

type PodcastDetailScreenProps = NativeStackScreenProps<
  ChannelBrowseStackParamList,
  'PodcastDetail'
>;

type PodcastLiveRow = HomeFeedRowData & {
  liveStatusId: LiveItemStatusEnum | null;
};

const FIRST_PAGE = 1;

const getPrimaryImageUrl = (item: DTOItem): string | null => {
  const firstItemImage = item.item_images[0];
  if (firstItemImage) {
    return firstItemImage.url;
  }

  const firstChannelImage = item.channel?.channel_images?.[0];
  if (firstChannelImage) {
    return firstChannelImage.url;
  }

  return null;
};

const toEpisodeRows = (items: DTOItem[]): HomeFeedRowData[] => {
  return items
    .map((item) => {
      const title = item.title ?? item.id_text;
      const subtitle = item.channel?.title ?? null;
      return {
        id: item.id_text,
        imageUrl: getPrimaryImageUrl(item),
        subtitle,
        title,
      };
    })
    .filter((row) => row.id.length > 0);
};

const toLiveRows = (items: DTOItem[]): PodcastLiveRow[] => {
  return items
    .map((item) => {
      const title = item.title ?? item.id_text;
      const subtitle = item.channel?.title ?? null;
      return {
        id: item.id_text,
        imageUrl: getPrimaryImageUrl(item),
        liveStatusId: item.live_item?.live_item_status_id ?? null,
        subtitle,
        title,
      };
    })
    .filter((row) => row.id.length > 0);
};

const getHasMorePages = (response: ApiListResponse<DTOItem>): boolean => {
  const nextCount = (response.meta.page ?? FIRST_PAGE) * response.meta.limit;
  if (response.meta.count === null) {
    return response.data.length >= response.meta.limit && response.meta.limit > 0;
  }

  return nextCount < response.meta.count;
};

const LIVE_STATUS_KEYS: Record<LiveItemStatusEnum, string> = {
  [LiveItemStatusEnum.Ended]: 'media.livestream.ended',
  [LiveItemStatusEnum.Live]: 'media.livestream.live',
  [LiveItemStatusEnum.Pending]: 'media.livestream.pending',
};

export function PodcastDetailScreen({ navigation, route }: PodcastDetailScreenProps) {
  const { t } = useTranslation();
  const { styles: themeStyles, tokens } = useTheme();
  const { accessToken, clearSession, refreshToken, setTokens, status } = useAuth();
  const [channel, setChannel] = useState<DTOChannel | null>(null);
  const [episodeRows, setEpisodeRows] = useState<HomeFeedRowData[]>([]);
  const [liveRows, setLiveRows] = useState<PodcastLiveRow[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(FIRST_PAGE);
  const [hasMorePages, setHasMorePages] = useState<boolean>(false);
  const [isSubscribed, setIsSubscribed] = useState<boolean>(false);
  const [isSavingSubscription, setIsSavingSubscription] = useState<boolean>(false);
  const [subscriptionNoticeKey, setSubscriptionNoticeKey] = useState<string | null>(null);
  const { playbackNoticeKey, runPlayAction, runQueueAction } = useHomeRowPlayback();
  const { podcastId } = route.params;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        content: {
          padding: tokens.spacing.lg,
          paddingBottom: tokens.spacing['2xl'],
        },
        feedHeading: {
          color: themeStyles.textPrimary.color,
          fontSize: 20,
          fontWeight: '700',
          marginBottom: tokens.spacing.sm,
          marginTop: tokens.spacing.lg,
        },
        headerCard: {
          backgroundColor: tokens.background.secondary,
          borderColor: themeStyles.border.borderColor,
          borderRadius: tokens.radii.md,
          borderWidth: 1,
          padding: tokens.spacing.lg,
        },
        headerDescription: {
          color: themeStyles.textSecondary.color,
          fontSize: 14,
          marginTop: tokens.spacing.sm,
        },
        headerTitle: {
          color: themeStyles.textPrimary.color,
          fontSize: 24,
          fontWeight: '700',
        },
        heading: {
          color: themeStyles.textPrimary.color,
          fontSize: 28,
          fontWeight: '700',
          marginBottom: tokens.spacing.md,
        },
        rowSurface: {
          backgroundColor: tokens.background.secondary,
          borderColor: themeStyles.border.borderColor,
          borderRadius: tokens.radii.md,
          borderWidth: 1,
          marginTop: tokens.spacing.sm,
          paddingHorizontal: tokens.spacing.md,
        },
        statusNotice: {
          color: themeStyles.textSecondary.color,
          fontSize: 13,
          marginTop: tokens.spacing.sm,
        },
        subscribeButton: {
          alignSelf: 'flex-start',
          backgroundColor: themeStyles.buttonPrimary.backgroundColor,
          borderRadius: tokens.radii.round,
          marginTop: tokens.spacing.md,
          opacity: isSavingSubscription ? 0.65 : 1,
          paddingHorizontal: tokens.spacing.lg,
          paddingVertical: tokens.spacing.sm,
        },
        subscribeButtonLabel: {
          color: themeStyles.buttonPrimary.color,
          fontSize: 14,
          fontWeight: '700',
        },
      }),
    [isSavingSubscription, themeStyles, tokens]
  );

  const loadPodcastData = useCallback(
    async ({
      page,
      source,
    }: {
      page: number;
      source: 'initial' | 'refresh' | 'retry' | 'loadMore';
    }) => {
      if (source === 'loadMore') {
        setIsLoadingMore(true);
      } else if (source === 'refresh') {
        setIsRefreshing(true);
      } else {
        setIsInitialLoading(true);
      }

      setErrorKey(null);
      try {
        const channelResponse = await requestWithMobileAuthRefresh(
          {
            accessToken,
            clearSession,
            refreshToken,
            setTokens,
          },
          async (api) => api.reqChannelGetByIdOrIdText(podcastId)
        );

        const itemResponse = await requestWithMobileAuthRefresh(
          {
            accessToken,
            clearSession,
            refreshToken,
            setTokens,
          },
          async (api) =>
            api.reqItemGetManyByChannel({
              idOrIdText: podcastId,
              page,
              range: null,
              sort: 'recent',
            })
        );

        const liveResponse = await requestWithMobileAuthRefresh(
          {
            accessToken,
            clearSession,
            refreshToken,
            setTokens,
          },
          async (api) => api.reqLiveItemGetManyByChannel(podcastId)
        );

        setChannel(channelResponse);
        if (status === 'authenticated') {
          const account = await requestWithMobileAuthRefresh(
            {
              accessToken,
              clearSession,
              refreshToken,
              setTokens,
            },
            async (api) => api.reqAuthMe()
          );
          const nextSubscribed =
            account.account_following_channels?.some(
              (followingChannel) => followingChannel.channel_id === channelResponse.id
            ) === true;
          setIsSubscribed(nextSubscribed);
        }
        setLiveRows(toLiveRows(liveResponse));
        setCurrentPage(page);
        setHasMorePages(getHasMorePages(itemResponse));

        const normalizedEpisodes = toEpisodeRows(itemResponse.data);
        if (source === 'loadMore') {
          setEpisodeRows((previousRows) => [...previousRows, ...normalizedEpisodes]);
        } else {
          setEpisodeRows(normalizedEpisodes);
        }
      } catch {
        setErrorKey('errors.generic');
        if (source !== 'loadMore') {
          setEpisodeRows([]);
          setLiveRows([]);
        }
      } finally {
        if (source === 'loadMore') {
          setIsLoadingMore(false);
        } else if (source === 'refresh') {
          setIsRefreshing(false);
        } else {
          setIsInitialLoading(false);
        }
      }
    },
    [accessToken, clearSession, podcastId, refreshToken, setTokens, status]
  );

  useEffect(() => {
    void loadPodcastData({
      page: FIRST_PAGE,
      source: 'initial',
    });
  }, [loadPodcastData]);

  const handleEpisodePress = useCallback(
    (row: HomeFeedRowData) => {
      navigation.navigate(CHANNEL_BROWSE_STACK_ROUTES.EpisodeDetail, {
        episodeId: row.id,
      });
    },
    [navigation]
  );

  const handleSubscriptionToggle = useCallback(async () => {
    if (status !== 'authenticated') {
      setSubscriptionNoticeKey('authentication.login_required');
      return;
    }

    if (isSavingSubscription) {
      return;
    }

    setIsSavingSubscription(true);
    setSubscriptionNoticeKey(null);
    try {
      const account = await requestWithMobileAuthRefresh(
        {
          accessToken,
          clearSession,
          refreshToken,
          setTokens,
        },
        async (api) => {
          if (isSubscribed) {
            return api.reqAccountUnfollowChannel({ channel_id_text: podcastId });
          }

          return api.reqAccountFollowChannel({ channel_id_text: podcastId });
        }
      );
      const nextSubscribed =
        channel?.id === undefined
          ? !isSubscribed
          : account.account_following_channels?.some(
              (followingChannel) => followingChannel.channel_id === channel.id
            ) === true;
      setIsSubscribed(nextSubscribed);
      homeFeedRefresh.notify();
    } catch {
      setSubscriptionNoticeKey('errors.generic');
    } finally {
      setIsSavingSubscription(false);
    }
  }, [
    accessToken,
    clearSession,
    channel?.id,
    isSavingSubscription,
    isSubscribed,
    podcastId,
    refreshToken,
    setTokens,
    status,
  ]);

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          onRefresh={() => {
            void loadPodcastData({ page: FIRST_PAGE, source: 'refresh' });
          }}
          refreshing={isRefreshing}
          tintColor={themeStyles.buttonPrimary.backgroundColor}
        />
      }
      style={{ backgroundColor: themeStyles.screen.backgroundColor }}
      testID="podcast-detail-screen"
    >
      <Text style={styles.heading}>{channel?.title ?? t('media.podcast.podcast')}</Text>
      <View style={styles.headerCard}>
        <Text style={styles.headerTitle}>{channel?.title ?? t('media.podcast.podcast')}</Text>
        {channel?.channel_description?.value ? (
          <Text style={styles.headerDescription} numberOfLines={4}>
            {channel.channel_description.value}
          </Text>
        ) : null}
        <View>
          <Text style={styles.statusNotice}>
            {t('misc.items')}: {episodeRows.length}
          </Text>
        </View>
        <Pressable
          onPress={() => {
            void handleSubscriptionToggle();
          }}
          style={styles.subscribeButton}
          testID="podcast-detail-subscribe-toggle"
        >
          <Text style={styles.subscribeButtonLabel}>
            {t(isSubscribed ? 'features.unsubscribe' : 'features.subscribe')}
          </Text>
        </Pressable>
        {subscriptionNoticeKey !== null ? (
          <Text style={styles.statusNotice}>{t(subscriptionNoticeKey)}</Text>
        ) : null}
      </View>

      {isInitialLoading ? <ListLoading testID="podcast-detail-loading" /> : null}
      {!isInitialLoading && errorKey !== null ? (
        <ListError
          messageKey={errorKey}
          onRetry={() => {
            void loadPodcastData({ page: FIRST_PAGE, source: 'retry' });
          }}
          testID="podcast-detail-error"
        />
      ) : null}
      {!isInitialLoading && errorKey === null && episodeRows.length === 0 ? (
        <ListEmpty messageKey="misc.info" testID="podcast-detail-empty" />
      ) : null}

      {liveRows.length > 0 ? (
        <View style={styles.rowSurface}>
          <Text style={styles.feedHeading}>{t('media.livestream.livestreams')}</Text>
          {liveRows.map((liveRow) => {
            const liveStatusLabel =
              liveRow.liveStatusId !== null ? t(LIVE_STATUS_KEYS[liveRow.liveStatusId]) : null;
            const subtitle =
              liveStatusLabel === null
                ? liveRow.subtitle
                : liveRow.subtitle === null
                  ? liveStatusLabel
                  : `${liveStatusLabel} • ${liveRow.subtitle}`;
            return (
              <HomeFeedRow
                key={`live-${liveRow.id}`}
                mediaType="episodes"
                onPlayPress={(row) => {
                  runPlayAction(row, 'episodes');
                }}
                onPress={handleEpisodePress}
                onQueuePress={(row, position) => {
                  runQueueAction(row, 'episodes', position);
                }}
                row={{
                  id: liveRow.id,
                  imageUrl: liveRow.imageUrl,
                  subtitle,
                  title: liveRow.title,
                }}
              />
            );
          })}
        </View>
      ) : null}

      {!isInitialLoading && errorKey === null ? (
        <View style={styles.rowSurface}>
          <Text style={styles.feedHeading}>{t('media.podcast.episodes')}</Text>
          {episodeRows.map((row, index) => (
            <HomeFeedRow
              key={row.id}
              mediaType="episodes"
              onPlayPress={(episodeRow) => {
                runPlayAction(episodeRow, 'episodes');
              }}
              onPress={handleEpisodePress}
              onQueuePress={(episodeRow, position) => {
                runQueueAction(episodeRow, 'episodes', position);
              }}
              row={row}
              testID={`podcast-episode-row-${index}`}
            />
          ))}
          {hasMorePages ? (
            <Pressable
              onPress={() => {
                if (isLoadingMore) {
                  return;
                }
                void loadPodcastData({
                  page: currentPage + 1,
                  source: 'loadMore',
                });
              }}
              style={styles.subscribeButton}
              testID="podcast-detail-load-more"
            >
              <Text style={styles.subscribeButtonLabel}>
                {isLoadingMore ? t('misc.loading') : t('info.show_more')}
              </Text>
            </Pressable>
          ) : null}
          {playbackNoticeKey !== null ? (
            <Text style={styles.statusNotice}>{t(playbackNoticeKey)}</Text>
          ) : null}
        </View>
      ) : null}
    </ScrollView>
  );
}
