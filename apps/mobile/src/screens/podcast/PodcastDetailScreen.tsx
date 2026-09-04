import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { breakpoints } from '@podverse/design-tokens';
import type { DTOChannel, DTOItem, FeatureAccess } from '@podverse/helpers';
import { LiveItemStatusEnum } from '@podverse/helpers/dto';

import { requestWithMobileAuthRefresh } from '../../auth';
import { useAuthPrompt } from '../../auth/AuthPromptContext';
import { useAuth } from '../../auth/AuthProvider';
import { GatedFeatureNotice } from '../../components/feedback/GatedFeatureNotice';
import type { OptionListItem } from '../../components/form/OptionListGroup';
import { SortSelectRow } from '../../components/form/SortSelectRow';
import { Button } from '../../components/primitives/Button';
import { ListEmpty } from '../../components/state/ListEmpty';
import { ListError } from '../../components/state/ListError';
import { ListLoading } from '../../components/state/ListLoading';
import { channelItemsRepository } from '../../data/repositories/channelItemsRepository';
import { channelSeenRepository } from '../../data/repositories/channelSeenRepository';
import { mapDirectoryChannelToSubscribed } from '../../data/repositories/subscriptionsMerge';
import { subscriptionsRepository } from '../../data/repositories/subscriptionsRepository';
import { homeFeedRefresh } from '../../lib/home/homeFeedRefresh';
import { buildPublicShareUrl, shareResolvedUrl } from '../../lib/share/shareNowPlaying';
import { useMembershipGate } from '../../membership/MembershipGateProvider';
import { useAccessTier } from '../../membership/useAccessTier';
import type { ChannelBrowseStackParamList } from '../../navigation';
import { CHANNEL_BROWSE_STACK_ROUTES } from '../../navigation';
import type { PodcastEpisodeSort } from '../../prefs/detailListPrefs';
import {
  DEFAULT_PODCAST_EPISODE_SORT,
  PODCAST_EPISODE_SORT_OPTIONS,
  readPodcastDetailPrefs,
  writePodcastDetailSort,
} from '../../prefs/detailListPrefs';
import { useResponsive } from '../../theme/useResponsive';
import { useTheme } from '../../theme/useTheme';
import type { HomeFeedRowData } from '../home/homeFeedData';
import { mapItemsToHomeFeedRows, mapItemToHomeFeedRow } from '../home/homeFeedData';
import { HomeFeedRow } from '../home/HomeFeedRow';
import { useHomeRowPlayback } from '../home/useHomeRowPlayback';

type PodcastDetailScreenProps = NativeStackScreenProps<
  ChannelBrowseStackParamList,
  'PodcastDetail'
>;

type PodcastLiveRow = HomeFeedRowData & {
  liveStatusId: LiveItemStatusEnum | null;
};

const toLiveRows = (items: DTOItem[]): PodcastLiveRow[] => {
  return items
    .map((item) => ({
      ...mapItemToHomeFeedRow(item),
      liveStatusId: item.live_item?.live_item_status_id ?? null,
    }))
    .filter((row) => row.id.length > 0);
};

const LIVE_STATUS_KEYS: Record<LiveItemStatusEnum, string> = {
  [LiveItemStatusEnum.Ended]: 'media.livestream.ended',
  [LiveItemStatusEnum.Live]: 'media.livestream.live',
  [LiveItemStatusEnum.Pending]: 'media.livestream.pending',
};

const EPISODE_SORT_LABEL_KEYS: Record<PodcastEpisodeSort, string> = {
  alphabetical: 'filters.sort.a_z',
  recent: 'filters.sort.recent',
};

export function PodcastDetailScreen({ navigation, route }: PodcastDetailScreenProps) {
  const { t } = useTranslation();
  const { isLandscape, isTablet, width } = useResponsive();
  const { styles: themeStyles, tokens } = useTheme();
  const { accessToken, clearSession, refreshToken, setTokens, status } = useAuth();
  const [channel, setChannel] = useState<DTOChannel | null>(null);
  const [episodeRows, setEpisodeRows] = useState<HomeFeedRowData[]>([]);
  const [liveRows, setLiveRows] = useState<PodcastLiveRow[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [hasMorePages, setHasMorePages] = useState<boolean>(false);
  const [isSubscribed, setIsSubscribed] = useState<boolean>(false);
  const [isSavingSubscription, setIsSavingSubscription] = useState<boolean>(false);
  const [subscriptionNoticeKey, setSubscriptionNoticeKey] = useState<string | null>(null);
  /** Set only when a signed-in user's membership blocks the server follow; cleared on each attempt. */
  const [subscriptionDenial, setSubscriptionDenial] = useState<FeatureAccess | null>(null);
  /**
   * What the pill shows. The list itself does not read this — it re-reads the stored preference —
   * so the two cannot drift into disagreeing about which order is selected.
   */
  const [episodeSort, setEpisodeSort] = useState<PodcastEpisodeSort>(DEFAULT_PODCAST_EPISODE_SORT);
  const { playbackNoticeKey, runPlayAction, runQueueAction } = useHomeRowPlayback();
  const { podcastId } = route.params;

  // Split when tablet and either landscape or wide enough for two panes (≥ lg).
  const showSplitLayout = isTablet && (isLandscape || width >= breakpoints.lg);

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
        sortRow: {
          marginTop: tokens.spacing.sm,
        },
        splitContainer: {
          backgroundColor: themeStyles.screen.backgroundColor,
          flex: 1,
          flexDirection: 'row',
        },
        splitLeftPane: {
          borderRightColor: themeStyles.border.borderColor,
          borderRightWidth: 1,
          maxWidth: breakpoints.lg,
          width: '40%',
        },
        splitRightPane: {
          flex: 1,
        },
        statusNotice: {
          color: themeStyles.textSecondary.color,
          fontSize: 13,
          marginTop: tokens.spacing.sm,
        },
        subscribeButton: {
          marginTop: tokens.spacing.md,
        },
        subscribeButtonLabel: {
          color: themeStyles.textPrimary.color,
          fontSize: 14,
          fontWeight: '600',
        },
        subscribeActions: {
          flexDirection: 'row',
          gap: tokens.spacing.sm,
          marginTop: tokens.spacing.md,
        },
      }),
    [themeStyles, tokens]
  );

  const authContext = useMemo(
    () => ({ accessToken, clearSession, refreshToken, setTokens }),
    [accessToken, clearSession, refreshToken, setTokens]
  );

  /**
   * The stored preference is read here rather than passed in, so the very first read of this
   * channel already carries the remembered order. Fetching in the default order and re-sorting
   * afterwards would show a list the user did not ask for, however briefly.
   *
   * It also means the order has one source. The pill mirrors the preference for display; nothing
   * hands a sort to this function, so nothing can hand it a stale one.
   */
  const readStoredEpisodes = useCallback(async () => {
    const { sort } = await readPodcastDetailPrefs(podcastId);
    const stored = await channelItemsRepository.listByChannel(podcastId, { sort });
    setEpisodeRows(mapItemsToHomeFeedRows(stored));
    return stored.length;
  }, [podcastId]);

  /**
   * Paint from the device, then reconcile.
   *
   * The stored window renders immediately and is the whole answer offline. The refresh that follows
   * runs directly rather than through the sync queue: somebody opened this screen and is waiting on
   * it, and queued work is for passes nobody asked for (`mobile-sync-orchestration`).
   *
   * A refresh that fails is only surfaced when the user asked for one. On open it is silent,
   * because what is stored is still worth reading and an error over the top of a working list would
   * say nothing useful.
   */
  const loadPodcastData = useCallback(
    async ({ source }: { source: 'initial' | 'refresh' | 'retry' }) => {
      if (source === 'refresh') {
        setIsRefreshing(true);
      } else {
        setIsInitialLoading(true);
      }
      setErrorKey(null);

      try {
        const [subscribed, storedCount] = await Promise.all([
          subscriptionsRepository.isSubscribed(podcastId),
          readStoredEpisodes(),
        ]);
        setIsSubscribed(subscribed);

        if (storedCount > 0) {
          setIsInitialLoading(false);
        }

        try {
          const channelResponse = await requestWithMobileAuthRefresh(authContext, async (api) =>
            api.reqChannelGetByIdOrIdText(podcastId)
          );
          setChannel(channelResponse);

          const result = await channelItemsRepository.syncChannel(authContext, podcastId);
          setHasMorePages(result.hasMore);
          await readStoredEpisodes();

          // Live items are a real-time surface with nothing to store, so they simply stay empty
          // when there is no connection.
          const liveResponse = await requestWithMobileAuthRefresh(authContext, async (api) =>
            api.reqLiveItemGetManyByChannel(podcastId)
          );
          setLiveRows(toLiveRows(liveResponse));
        } catch (error) {
          if (storedCount === 0 || source !== 'initial') {
            throw error;
          }
        }
      } catch {
        setErrorKey('errors.generic');
      } finally {
        setIsRefreshing(false);
        setIsInitialLoading(false);
      }
    },
    [authContext, podcastId, readStoredEpisodes]
  );

  /**
   * Reach further back into the feed and keep it there, so the next visit opens at the same depth.
   *
   * Needs a connection by definition: offline the window stays where it is and the list keeps
   * showing what is stored.
   */
  const loadMoreEpisodes = useCallback(async () => {
    setIsLoadingMore(true);
    try {
      const result = await channelItemsRepository.extendWindow(authContext, podcastId);
      setHasMorePages(result.hasMore);
      await readStoredEpisodes();
    } catch {
      setErrorKey('errors.generic');
    } finally {
      setIsLoadingMore(false);
    }
  }, [authContext, podcastId, readStoredEpisodes]);

  useEffect(() => {
    void loadPodcastData({ source: 'initial' });
  }, [loadPodcastData]);

  // Keyed on the channel, so arriving at a second podcast shows that podcast's order rather than
  // whatever the previous one was left on.
  useEffect(() => {
    let isMounted = true;

    void (async () => {
      const { sort } = await readPodcastDetailPrefs(podcastId);
      if (isMounted) {
        setEpisodeSort(sort);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [podcastId]);

  const handleSortSelect = useCallback(
    (sort: PodcastEpisodeSort) => {
      setEpisodeSort(sort);
      void (async () => {
        await writePodcastDetailSort(podcastId, sort);
        // Re-orders what is already stored; no request, so it works offline and costs nothing.
        await readStoredEpisodes();
      })();
    },
    [podcastId, readStoredEpisodes]
  );

  const episodeSortOptions = useMemo<OptionListItem<PodcastEpisodeSort>[]>(() => {
    return PODCAST_EPISODE_SORT_OPTIONS.map((option) => ({
      label: t(EPISODE_SORT_LABEL_KEYS[option]),
      testID: `podcast-detail-sort-${option}`,
      value: option,
    }));
  }, [t]);

  /**
   * Opening the channel is what marks it seen — there is no per-episode seen state.
   *
   * Written straight to the device rather than through the sync queue, so the badge clears as the
   * screen appears whatever the network is doing. The next reconciliation carries the timestamp to
   * the account, and because seen state only moves forward, a failed one costs nothing.
   *
   * Keyed on the channel alone so returning from an episode does not re-stamp it.
   */
  useEffect(() => {
    void channelSeenRepository.markSeen(podcastId, 'channel');
  }, [podcastId]);

  const handleEpisodePress = useCallback(
    (row: HomeFeedRowData) => {
      navigation.navigate(CHANNEL_BROWSE_STACK_ROUTES.EpisodeDetail, {
        episodeId: row.id,
      });
    },
    [navigation]
  );

  const { goToMembership, handleGateError } = useMembershipGate();
  const { onRequestLogin } = useAuthPrompt();
  const { evaluateFeature } = useAccessTier();

  /**
   * Subscribing has three behaviors and unsubscribing has one.
   *
   * Signed out, the local write *is* the subscription and nothing reaches the server. Signed in the
   * account is the source of truth, so the follow goes to the server first and the local row is
   * written only once it sticks — otherwise the next account sync would silently erase it. A
   * membership denial is definitive and leaves nothing behind locally.
   *
   * Unsubscribing is never gated, in any tier or membership state. The local removal happens first
   * and stands even if the server call fails.
   */
  const handleSubscriptionToggle = useCallback(async () => {
    if (isSavingSubscription) {
      return;
    }

    const isSignedIn = status === 'authenticated';
    const authContext = { accessToken, clearSession, refreshToken, setTokens };

    setIsSavingSubscription(true);
    setSubscriptionNoticeKey(null);
    setSubscriptionDenial(null);
    try {
      if (isSubscribed) {
        await subscriptionsRepository.unsubscribeLocal(podcastId);
        setIsSubscribed(false);
        homeFeedRefresh.notify();

        if (isSignedIn) {
          try {
            await requestWithMobileAuthRefresh(authContext, async (api) =>
              api.reqAccountUnfollowChannel({ channel_id_text: podcastId })
            );
          } catch {
            // The local removal stands; the account catches up on the next successful unsubscribe.
            setSubscriptionNoticeKey('errors.generic');
          }
        }
        return;
      }

      const entry = channel === null ? null : mapDirectoryChannelToSubscribed(channel);
      if (entry === null) {
        setSubscriptionNoticeKey('errors.generic');
        return;
      }

      if (isSignedIn) {
        const access = evaluateFeature('subscribe_sync');
        if (!access.allowed) {
          setSubscriptionDenial(access);
          return;
        }

        try {
          await requestWithMobileAuthRefresh(authContext, async (api) =>
            api.reqAccountFollowChannel({ channel_id_text: podcastId })
          );
        } catch (error) {
          if (handleGateError(error)) {
            return;
          }
          setSubscriptionNoticeKey('errors.generic');
          return;
        }
      }

      await subscriptionsRepository.subscribeLocal(entry);
      setIsSubscribed(true);
      homeFeedRefresh.notify();
    } finally {
      setIsSavingSubscription(false);
    }
  }, [
    accessToken,
    channel,
    clearSession,
    evaluateFeature,
    handleGateError,
    isSavingSubscription,
    isSubscribed,
    podcastId,
    refreshToken,
    setTokens,
    status,
  ]);

  const handleShare = useCallback(() => {
    shareResolvedUrl(buildPublicShareUrl('podcast', podcastId));
  }, [podcastId]);

  const refreshControl = (
    <RefreshControl
      onRefresh={() => {
        void loadPodcastData({ source: 'refresh' });
      }}
      refreshing={isRefreshing}
      tintColor={themeStyles.buttonPrimary.backgroundColor}
    />
  );

  const headerPane = (
    <>
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
        <View style={styles.subscribeActions}>
          <Button
            label={t(isSubscribed ? 'features.unsubscribe' : 'features.subscribe')}
            loading={isSavingSubscription}
            onPress={() => {
              void handleSubscriptionToggle();
            }}
            testID="podcast-detail-subscribe-toggle"
            variant="primary"
          />
          <Button
            label={t('features.share')}
            onPress={handleShare}
            testID="podcast-detail-share"
            variant="secondary"
          />
        </View>
        {subscriptionNoticeKey !== null ? (
          <Text style={styles.statusNotice}>{t(subscriptionNoticeKey)}</Text>
        ) : null}
        {subscriptionDenial !== null ? (
          <GatedFeatureNotice
            access={subscriptionDenial}
            onRequestLogin={onRequestLogin}
            onRequestMembership={goToMembership}
            testID="podcast-detail-subscribe-gate"
          />
        ) : null}
      </View>
    </>
  );

  const listStatus = (
    <>
      {isInitialLoading ? <ListLoading testID="podcast-detail-loading" /> : null}
      {!isInitialLoading && errorKey !== null ? (
        <ListError
          messageKey={errorKey}
          onRetry={() => {
            void loadPodcastData({ source: 'retry' });
          }}
          testID="podcast-detail-error"
        />
      ) : null}
      {!isInitialLoading && errorKey === null && episodeRows.length === 0 ? (
        <ListEmpty messageKey="misc.info" testID="podcast-detail-empty" />
      ) : null}
    </>
  );

  const listHeader = (
    <>
      {listStatus}
      {liveRows.length > 0 ? (
        <View style={styles.rowSurface}>
          <Text style={styles.feedHeading}>{t('media.livestream.livestreams')}</Text>
          {liveRows.map((liveRow, index) => {
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
                isLast={index === liveRows.length - 1}
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
        <>
          <View style={styles.rowSurface}>
            <Text style={styles.feedHeading}>{t('media.podcast.episodes')}</Text>
          </View>
          <View style={styles.sortRow}>
            <SortSelectRow
              heading={t('filters.screen.sort_heading')}
              onSelect={handleSortSelect}
              options={episodeSortOptions}
              testID="podcast-detail-sort"
              value={episodeSort}
            />
          </View>
        </>
      ) : null}
    </>
  );

  const listFooter = (
    <>
      {!isInitialLoading && errorKey === null && hasMorePages ? (
        <Pressable
          onPress={() => {
            if (isLoadingMore) {
              return;
            }
            void loadMoreEpisodes();
          }}
          style={styles.subscribeButton}
          testID="podcast-detail-load-more"
        >
          <Text style={styles.subscribeButtonLabel}>
            {isLoadingMore ? t('misc.loading') : t('info.show_more')}
          </Text>
        </Pressable>
      ) : null}
      {!isInitialLoading && errorKey === null && playbackNoticeKey !== null ? (
        <Text style={styles.statusNotice}>{t(playbackNoticeKey)}</Text>
      ) : null}
    </>
  );

  const episodeListData = !isInitialLoading && errorKey === null ? episodeRows : [];

  if (showSplitLayout) {
    return (
      <View style={styles.splitContainer} testID="podcast-detail-split">
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={refreshControl}
          style={styles.splitLeftPane}
          testID="podcast-detail-screen"
        >
          {headerPane}
        </ScrollView>
        <FlatList
          ListEmptyComponent={listStatus}
          ListFooterComponent={listFooter}
          ListHeaderComponent={listHeader}
          contentContainerStyle={styles.content}
          data={episodeListData}
          keyExtractor={(row) => row.id}
          refreshControl={refreshControl}
          renderItem={({ item: row, index }) => (
            <HomeFeedRow
              isLast={index === episodeListData.length - 1}
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
          )}
          style={styles.splitRightPane}
        />
      </View>
    );
  }

  return (
    <FlatList
      ListEmptyComponent={listStatus}
      ListFooterComponent={listFooter}
      ListHeaderComponent={
        <>
          {headerPane}
          {listHeader}
        </>
      }
      contentContainerStyle={styles.content}
      data={episodeListData}
      keyExtractor={(row) => row.id}
      refreshControl={refreshControl}
      renderItem={({ item: row, index }) => (
        <HomeFeedRow
          isLast={index === episodeListData.length - 1}
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
      )}
      style={{ backgroundColor: themeStyles.screen.backgroundColor }}
      testID="podcast-detail-screen"
    />
  );
}
