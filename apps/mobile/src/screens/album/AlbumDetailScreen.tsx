import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshControl, StyleSheet, Switch, Text, View } from 'react-native';

import type { DTOChannel, DTOItem, RemoteItemsResponse } from '@podverse/helpers';
import {
  primaryChannelLightboxArtworkUrl,
  primaryChannelListArtworkUrl,
  primaryListArtworkUrl,
} from '@podverse/helpers';
import { getBoostEligibilityForContent } from '@podverse/v4v-metaboost';

import { requestWithMobileAuthRefresh } from '../../auth';
import { useAuth } from '../../auth/AuthProvider';
import { useBoostSheet } from '../../components/boost/useBoostSheet';
import { ChannelDetailShell, ChannelHeader } from '../../components/channel';
import { ChannelAboutSection, FundingLinksSection } from '../../components/content';
import type { MenuSelectChipOption, SectionChipItem } from '../../components/form';
import { MenuSelectChip } from '../../components/form';
import { FillList, ListRow } from '../../components/primitives';
import { Button } from '../../components/primitives/Button';
import { HeaderBarAction } from '../../components/screen/HeaderBarAction';
import { ListEmpty } from '../../components/state/ListEmpty';
import { ListError } from '../../components/state/ListError';
import { LoadingSection } from '../../components/state/LoadingSection';
import { channelItemsRepository } from '../../data/repositories/channelItemsRepository';
import { sectionChromeFlagsRepository } from '../../data/repositories/sectionChromeFlagsRepository';
import { mapDirectoryChannelToSubscribed } from '../../data/repositories/subscriptionsMerge';
import { subscriptionsRepository } from '../../data/repositories/subscriptionsRepository';
import { useChannelNotifications } from '../../hooks/useChannelNotifications';
import { homeFeedRefresh } from '../../lib/home/homeFeedRefresh';
import { OFFLINE_UNAVAILABLE_MESSAGE_KEY } from '../../lib/offlineModeViews';
import { getCachedChannelSectionFlags } from '../../lib/sectionChromeFlags';
import { buildPublicShareUrl, shareResolvedUrl } from '../../lib/share/shareNowPlaying';
import { useMembershipGate } from '../../membership/MembershipGateProvider';
import { useAccessTier } from '../../membership/useAccessTier';
import type { ChannelBrowseStackParamList } from '../../navigation';
import { buildPodcastDetailParams, CHANNEL_BROWSE_STACK_ROUTES } from '../../navigation';
import type { AlbumDetailRange, AlbumTab, AlbumTrackSort } from '../../prefs/detailListPrefs';
import {
  ALBUM_DETAIL_RANGE_OPTIONS,
  ALBUM_TABS,
  ALBUM_TRACK_SORT_OPTIONS,
  DEFAULT_ALBUM_DETAIL_RANGE,
  DEFAULT_ALBUM_TAB,
  DEFAULT_ALBUM_TRACK_SORT,
  readAlbumDetailPrefs,
  writeAlbumDetailRange,
  writeAlbumDetailSort,
  writeAlbumDetailTab,
} from '../../prefs/detailListPrefs';
import { useOfflineMode } from '../../prefs/offlineMode';
import { useTheme } from '../../theme/useTheme';
import type { HomeFeedRowData } from '../home/homeFeedData';
import { mapItemToHomeFeedRow } from '../home/homeFeedData';
import { HomeFeedRow } from '../home/HomeFeedRow';
import type { HomeRowMetadata } from '../home/homeRowMetadata';
import { useHomeRowPlayback } from '../home/useHomeRowPlayback';
import { channelHasFunding, channelHasPodroll } from '../podcast/podcastSections';

type AlbumDetailScreenProps = NativeStackScreenProps<ChannelBrowseStackParamList, 'AlbumDetail'>;

type PodrollEntry = {
  id: string;
  imageUrl: string | null;
  subtitle: string | null;
  target: { idText: string; kind: 'channel' | 'episode' };
  title: string;
};

const LIVE_ROW_METADATA: HomeRowMetadata = {
  downloadedCount: 0,
  isLive: true,
  latestItemPubDateMs: null,
  unseenBadge: null,
};

const FIRST_PAGE = 1;

const SECTION_LABEL_KEYS: Record<AlbumTab, string> = {
  about: 'info.about',
  funding: 'info.funding',
  podroll: 'info.podroll',
  settings: 'settings.settings',
  tracks: 'media.music.tracks',
};

const TRACK_SORT_LABEL_KEYS: Record<AlbumTrackSort, string> = {
  backward: 'filters.sort.backward',
  forward: 'filters.sort.forward',
  top: 'filters.sort.top',
};

const RANGE_LABEL_KEYS: Record<AlbumDetailRange, string> = {
  'all-time': 'filters.range.all_time',
  day: 'filters.range.day',
  month: 'filters.range.month',
  week: 'filters.range.week',
};

const toTrackRows = (items: DTOItem[], albumTitle: string | null): HomeFeedRowData[] => {
  return items
    .map((item) => ({
      ...mapItemToHomeFeedRow(item),
      metadata: item.live_item ? LIVE_ROW_METADATA : undefined,
      subtitle: albumTitle,
    }))
    .filter((row) => row.id.length > 0);
};

const toPodrollEntries = (response: RemoteItemsResponse): PodrollEntry[] => {
  const rows: PodrollEntry[] = [];
  for (const channel of response.channelsAdded) {
    const idText = channel.id_text.trim();
    if (idText.length === 0) {
      continue;
    }
    rows.push({
      id: `channel-${idText}`,
      imageUrl: primaryChannelListArtworkUrl(channel.channel_images),
      subtitle: null,
      target: { idText, kind: 'channel' },
      title: channel.title ?? idText,
    });
  }
  for (const item of response.itemsAdded) {
    const idText = item.id_text.trim();
    if (idText.length === 0) {
      continue;
    }
    rows.push({
      id: `episode-${idText}`,
      imageUrl: primaryListArtworkUrl(item.item_images, item.channel?.channel_images),
      subtitle: item.channel?.title ?? null,
      target: { idText, kind: 'episode' },
      title: item.title ?? idText,
    });
  }
  return rows;
};

const removeDuplicateItems = (items: DTOItem[]): DTOItem[] => {
  const seen = new Set<string>();
  const deduped: DTOItem[] = [];
  for (const item of items) {
    if (seen.has(item.id_text)) {
      continue;
    }
    seen.add(item.id_text);
    deduped.push(item);
  }
  return deduped;
};

export function AlbumDetailScreen({ navigation, route }: AlbumDetailScreenProps) {
  const { t } = useTranslation();
  const { styles: themeStyles, tokens } = useTheme();
  const { boostSheet, openBoost } = useBoostSheet();
  const { accessToken, clearSession, refreshToken, setTokens, status } = useAuth();
  const { enabled: offlineModeEnabled } = useOfflineMode();
  const { albumId, previewImageUrl, previewTitle } = route.params;
  const { evaluateFeature, isTierKnown } = useAccessTier();
  const { handleGateError, openGate } = useMembershipGate();
  const { playbackNoticeKey, runPlayAction, runQueueAction } = useHomeRowPlayback();
  const cachedChrome = getCachedChannelSectionFlags(albumId);
  const [channel, setChannel] = useState<DTOChannel | null>(null);
  const [isChannelLoading, setIsChannelLoading] = useState<boolean>(true);
  const [previewHasPodroll, setPreviewHasPodroll] = useState<boolean>(
    cachedChrome?.hasPodroll === true
  );
  const [previewHasFunding, setPreviewHasFunding] = useState<boolean>(
    cachedChrome?.hasFunding === true
  );
  const [previewHeaderTitle, setPreviewHeaderTitle] = useState<string | null>(
    previewTitle !== undefined && previewTitle.length > 0 ? previewTitle : null
  );
  const [previewArtworkUri, setPreviewArtworkUri] = useState<string | null>(
    previewImageUrl !== undefined && previewImageUrl !== null && previewImageUrl.length > 0
      ? previewImageUrl
      : null
  );
  const [isSubscribed, setIsSubscribed] = useState<boolean>(false);
  const [isSavingSubscription, setIsSavingSubscription] = useState<boolean>(false);
  const [subscriptionNoticeKey, setSubscriptionNoticeKey] = useState<string | null>(null);
  const [isSectionHydrated, setIsSectionHydrated] = useState<boolean>(false);
  const [section, setSection] = useState<AlbumTab>(DEFAULT_ALBUM_TAB);
  const [sort, setSort] = useState<AlbumTrackSort>(DEFAULT_ALBUM_TRACK_SORT);
  const [range, setRange] = useState<AlbumDetailRange>(DEFAULT_ALBUM_DETAIL_RANGE);
  const [trackRows, setTrackRows] = useState<HomeFeedRowData[]>([]);
  const [tracksById, setTracksById] = useState<Map<string, DTOItem>>(new Map());
  const [trackErrorKey, setTrackErrorKey] = useState<string | null>(null);
  const [isTracksLoading, setIsTracksLoading] = useState<boolean>(true);
  const [isTracksRefreshing, setIsTracksRefreshing] = useState<boolean>(false);
  const [podrollRows, setPodrollRows] = useState<PodrollEntry[]>([]);
  const [podrollErrorKey, setPodrollErrorKey] = useState<string | null>(null);
  const [isPodrollLoading, setIsPodrollLoading] = useState<boolean>(false);
  const [isPodrollRefreshing, setIsPodrollRefreshing] = useState<boolean>(false);
  const channelTitleRef = useRef<string | null>(null);
  channelTitleRef.current = channel?.title ?? channelTitleRef.current;

  const notifications = useChannelNotifications({
    channelId: channel?.id ?? null,
    channelIdText: albumId,
  });

  const authContext = useMemo(
    () => ({ accessToken, clearSession, refreshToken, setTokens }),
    [accessToken, clearSession, refreshToken, setTokens]
  );
  const isSignedIn = status === 'authenticated';

  const styles = useMemo(
    () =>
      StyleSheet.create({
        channelActions: {
          gap: tokens.spacing.sm,
        },
        headerActions: {
          alignItems: 'center',
          flexDirection: 'row',
        },
        notice: {
          color: themeStyles.textSecondary.color,
          fontSize: 13,
          marginTop: tokens.spacing.sm,
          paddingHorizontal: tokens.spacing.lg,
        },
        settingsCard: {
          marginHorizontal: tokens.spacing.lg,
          marginTop: tokens.spacing.md,
          paddingBottom: tokens.spacing.md,
        },
        settingsHeading: {
          color: themeStyles.textPrimary.color,
          fontSize: 16,
          fontWeight: '700',
          marginBottom: tokens.spacing.sm,
          marginTop: tokens.spacing.sm,
          paddingHorizontal: tokens.spacing.md,
        },
        subscribeButtonRow: {
          alignItems: 'flex-start',
        },
      }),
    [themeStyles, tokens]
  );

  useEffect(() => {
    setPreviewArtworkUri(
      previewImageUrl !== undefined && previewImageUrl !== null && previewImageUrl.length > 0
        ? previewImageUrl
        : null
    );
    setPreviewHeaderTitle(
      previewTitle !== undefined && previewTitle.length > 0 ? previewTitle : null
    );
  }, [previewImageUrl, previewTitle]);

  useEffect(() => {
    const nextChrome = getCachedChannelSectionFlags(albumId);
    setChannel(null);
    setIsChannelLoading(true);
    setPreviewHasPodroll(nextChrome?.hasPodroll === true);
    setPreviewHasFunding(nextChrome?.hasFunding === true);
  }, [albumId]);

  useEffect(() => {
    let isMounted = true;
    setIsSectionHydrated(false);
    void (async () => {
      const prefs = await readAlbumDetailPrefs(albumId);
      if (!isMounted) {
        return;
      }
      setSection(prefs.tab);
      setSort(prefs.sort);
      setRange(prefs.range);
      setIsSectionHydrated(true);
    })();
    return () => {
      isMounted = false;
    };
  }, [albumId]);

  useEffect(() => {
    let isMounted = true;
    void subscriptionsRepository.getByIdText(albumId).then((stored) => {
      if (!isMounted || stored === null) {
        return;
      }
      if (previewHeaderTitle === null && stored.title.length > 0) {
        setPreviewHeaderTitle(stored.title);
      }
      if (previewArtworkUri === null && stored.imageUrl !== null && stored.imageUrl.length > 0) {
        setPreviewArtworkUri(stored.imageUrl);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [albumId, previewArtworkUri, previewHeaderTitle]);

  useEffect(() => {
    let isMounted = true;
    void subscriptionsRepository.isSubscribed(albumId).then((subscribed) => {
      if (isMounted) {
        setIsSubscribed(subscribed);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [albumId]);

  const loadChannel = useCallback(async (): Promise<void> => {
    setIsChannelLoading(true);
    try {
      if (offlineModeEnabled) {
        const local = await subscriptionsRepository.getByIdText(albumId);
        if (local !== null) {
          setPreviewHeaderTitle(local.title);
          setPreviewArtworkUri(local.imageUrl);
        }
        return;
      }

      try {
        const response = await requestWithMobileAuthRefresh(authContext, async (api) =>
          api.reqChannelGetByIdOrIdText(albumId)
        );
        setChannel(response);
        const hasPodroll = channelHasPodroll(response);
        const hasFunding = channelHasFunding(response);
        setPreviewHasPodroll(hasPodroll);
        setPreviewHasFunding(hasFunding);
        void sectionChromeFlagsRepository.mergeChannel(albumId, { hasFunding, hasPodroll });
      } catch {
        // Channel and list panes surface their own states.
      }
    } finally {
      setIsChannelLoading(false);
    }
  }, [albumId, authContext, offlineModeEnabled]);

  useEffect(() => {
    void loadChannel();
  }, [loadChannel]);

  const readStoredTracks = useCallback(async (): Promise<DTOItem[]> => {
    return channelItemsRepository.listByChannel(albumId, {
      sort: sort === 'forward' ? 'oldest' : 'recent',
    });
  }, [albumId, sort]);

  const loadTracks = useCallback(
    async ({ source }: { source: 'initial' | 'refresh' | 'retry' }): Promise<void> => {
      if (source === 'refresh') {
        setIsTracksRefreshing(true);
      } else {
        setIsTracksLoading(true);
      }
      setTrackErrorKey(null);
      try {
        const storedItems = await readStoredTracks();
        if (offlineModeEnabled) {
          setTrackRows(toTrackRows(storedItems, channelTitleRef.current));
          setTracksById(new Map(storedItems.map((item) => [item.id_text, item])));
          return;
        }

        const seasonResponse = await requestWithMobileAuthRefresh(authContext, async (api) =>
          api.reqItemGetManyByChannelBySeason({
            idOrIdText: albumId,
            page: FIRST_PAGE,
            range: sort === 'top' ? range : null,
            sort,
          })
        );
        const liveItems = await requestWithMobileAuthRefresh(authContext, async (api) =>
          api.reqLiveItemGetManyByChannel(albumId)
        );
        const merged = removeDuplicateItems([...liveItems, ...seasonResponse.data]);
        setTrackRows(toTrackRows(merged, channelTitleRef.current));
        setTracksById(new Map(merged.map((item) => [item.id_text, item])));
      } catch {
        setTrackErrorKey('errors.generic');
        setTrackRows([]);
        setTracksById(new Map());
      } finally {
        setIsTracksRefreshing(false);
        setIsTracksLoading(false);
      }
    },
    [albumId, authContext, offlineModeEnabled, range, readStoredTracks, sort]
  );

  useEffect(() => {
    if (!isSectionHydrated || section !== 'tracks') {
      return;
    }
    void loadTracks({ source: 'initial' });
  }, [isSectionHydrated, loadTracks, section]);

  const loadPodroll = useCallback(
    async ({ source }: { source: 'initial' | 'refresh' | 'retry' }): Promise<void> => {
      if (source === 'refresh') {
        setIsPodrollRefreshing(true);
      } else {
        setIsPodrollLoading(true);
      }
      setPodrollErrorKey(null);
      try {
        const response = await requestWithMobileAuthRefresh(authContext, async (api) =>
          api.reqPodrollGetForChannel(albumId)
        );
        setPodrollRows(toPodrollEntries(response));
      } catch {
        setPodrollErrorKey('errors.generic');
        setPodrollRows([]);
      } finally {
        setIsPodrollRefreshing(false);
        setIsPodrollLoading(false);
      }
    },
    [albumId, authContext]
  );

  useEffect(() => {
    if (!isSectionHydrated || section !== 'podroll' || offlineModeEnabled) {
      return;
    }
    void loadPodroll({ source: 'initial' });
  }, [isSectionHydrated, loadPodroll, offlineModeEnabled, section]);

  const availableSections = useMemo<AlbumTab[]>(() => {
    const hasPodroll = channel !== null ? channelHasPodroll(channel) : previewHasPodroll;
    const hasFunding = channel !== null ? channelHasFunding(channel) : previewHasFunding;
    return ALBUM_TABS.filter((tab) => {
      if (tab === 'settings') {
        return isSignedIn;
      }
      if (tab === 'podroll') {
        return hasPodroll;
      }
      if (tab === 'funding') {
        return hasFunding;
      }
      return true;
    });
  }, [channel, isSignedIn, previewHasFunding, previewHasPodroll]);

  useEffect(() => {
    if (availableSections.includes(section)) {
      return;
    }
    setSection(DEFAULT_ALBUM_TAB);
  }, [availableSections, section]);

  const sectionChips = useMemo<SectionChipItem<AlbumTab>[]>(
    () =>
      availableSections.map((entry) => ({
        key: entry,
        label: t(SECTION_LABEL_KEYS[entry]),
        testID: `album-detail-section-${entry}`,
      })),
    [availableSections, t]
  );

  const sortOptions = useMemo<MenuSelectChipOption<AlbumTrackSort>[]>(
    () =>
      ALBUM_TRACK_SORT_OPTIONS.filter(
        (option) => !(offlineModeEnabled && option === 'top' && sort !== 'top')
      ).map((option) => ({
        label: t(TRACK_SORT_LABEL_KEYS[option]),
        testID: `album-detail-sort-${option}`,
        value: option,
      })),
    [offlineModeEnabled, sort, t]
  );

  const rangeOptions = useMemo<MenuSelectChipOption<AlbumDetailRange>[]>(
    () =>
      ALBUM_DETAIL_RANGE_OPTIONS.map((option) => ({
        label: t(RANGE_LABEL_KEYS[option]),
        value: option,
      })),
    [t]
  );

  const handleSectionSelect = useCallback(
    (next: AlbumTab) => {
      setSection(next);
      void writeAlbumDetailTab(albumId, next);
    },
    [albumId]
  );

  const handleSortSelect = useCallback(
    (next: AlbumTrackSort) => {
      setSort(next);
      void writeAlbumDetailSort(albumId, next);
      if (next === 'top') {
        setRange(DEFAULT_ALBUM_DETAIL_RANGE);
        void writeAlbumDetailRange(albumId, DEFAULT_ALBUM_DETAIL_RANGE);
      }
    },
    [albumId]
  );

  const handleRangeSelect = useCallback(
    (next: AlbumDetailRange) => {
      setRange(next);
      void writeAlbumDetailRange(albumId, next);
    },
    [albumId]
  );

  const handleSubscriptionToggle = useCallback(async () => {
    if (isSavingSubscription) {
      return;
    }

    setIsSavingSubscription(true);
    setSubscriptionNoticeKey(null);
    try {
      if (isSubscribed) {
        const result = await subscriptionsRepository.unsubscribe({
          accountSync: isSignedIn ? authContext : undefined,
          idText: albumId,
          source: 'directory',
        });
        setIsSubscribed(false);
        homeFeedRefresh.notify();
        if (result.serverError) {
          setSubscriptionNoticeKey('errors.generic');
        }
        return;
      }

      if (channel === null) {
        setSubscriptionNoticeKey('errors.generic');
        return;
      }

      const entry = mapDirectoryChannelToSubscribed(channel);
      if (entry === null) {
        setSubscriptionNoticeKey('errors.generic');
        return;
      }

      if (isSignedIn && isTierKnown) {
        const access = evaluateFeature('subscribe_sync');
        if (!access.allowed) {
          openGate(access.reason);
          return;
        }
      }

      if (isSignedIn) {
        try {
          await requestWithMobileAuthRefresh(authContext, async (api) =>
            api.reqAccountFollowChannel({ channel_id_text: albumId })
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
    albumId,
    authContext,
    channel,
    evaluateFeature,
    handleGateError,
    isSavingSubscription,
    isSignedIn,
    isSubscribed,
    isTierKnown,
    openGate,
  ]);

  const handleShare = useCallback(() => {
    shareResolvedUrl(buildPublicShareUrl('album', albumId));
  }, [albumId]);

  const notificationsEnabled = notifications.isEnabled;
  const toggleNotifications = notifications.toggleEnabled;
  const canShowBoost = getBoostEligibilityForContent({ channel }).canShowBoostAction;

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={styles.headerActions}>
          {canShowBoost && channel !== null ? (
            <HeaderBarAction
              accessibilityLabel={t('value.boost')}
              icon="cash-outline"
              iconColor={tokens.text.warning}
              onPress={() => {
                openBoost({ channel, item: null });
              }}
              testID="album-detail-boost"
            />
          ) : null}
          <HeaderBarAction
            accessibilityLabel={t(
              notificationsEnabled
                ? 'features.notifications.disable_notifications_for_this_album'
                : 'features.notifications.enable_notifications_for_this_album'
            )}
            icon={notificationsEnabled ? 'notifications' : 'notifications-off-outline'}
            onPress={() => {
              void toggleNotifications();
            }}
            testID="album-detail-notifications-toggle"
          />
          <HeaderBarAction
            accessibilityLabel={t('features.share')}
            icon="share-outline"
            onPress={handleShare}
            testID="album-detail-share"
          />
        </View>
      ),
    });
  }, [
    canShowBoost,
    channel,
    handleShare,
    navigation,
    notificationsEnabled,
    openBoost,
    styles.headerActions,
    t,
    tokens.text.warning,
    toggleNotifications,
  ]);

  const channelArtworkUri =
    primaryChannelListArtworkUrl(channel?.channel_images) ?? previewArtworkUri;
  const channelViewerUri =
    primaryChannelLightboxArtworkUrl(channel?.channel_images) ?? channelArtworkUri;
  const title = channel?.title ?? previewHeaderTitle ?? t('media.music.album');

  const channelHeader = (
    <ChannelHeader
      actions={
        <View style={styles.channelActions}>
          <View style={styles.subscribeButtonRow}>
            <Button
              label={t(isSubscribed ? 'features.unsubscribe' : 'features.subscribe')}
              loading={isSavingSubscription}
              onPress={() => {
                void handleSubscriptionToggle();
              }}
              size="sm"
              testID="album-detail-subscribe-toggle"
              variant="outline"
            />
          </View>
        </View>
      }
      artworkUri={channelArtworkUri}
      notice={subscriptionNoticeKey === null ? null : t(subscriptionNoticeKey)}
      testID="album-detail-header"
      title={title}
      viewerUri={channelViewerUri}
    />
  );

  const tracksBody = (
    <FillList
      ListEmptyComponent={
        isTracksLoading ? (
          <LoadingSection testID="album-detail-loading" />
        ) : trackErrorKey !== null ? (
          <ListError
            messageKey={trackErrorKey}
            onRetry={() => {
              void loadTracks({ source: 'retry' });
            }}
            testID="album-detail-error"
          />
        ) : (
          <ListEmpty messageKey="misc.info" testID="album-detail-empty" />
        )
      }
      ListFooterComponent={
        playbackNoticeKey !== null ? (
          <Text style={styles.notice}>{t(playbackNoticeKey)}</Text>
        ) : null
      }
      contentContainerStyle={{
        paddingHorizontal: tokens.spacing.lg,
        paddingTop: tokens.spacing.md,
      }}
      data={trackRows}
      keyExtractor={(row) => row.id}
      refreshControl={
        <RefreshControl
          onRefresh={() => {
            void loadChannel();
            void loadTracks({ source: 'refresh' });
          }}
          refreshing={isTracksRefreshing}
          tintColor={themeStyles.buttonPrimary.backgroundColor}
        />
      }
      renderItem={({ index, item: row }) => {
        const track = tracksById.get(row.id);
        return (
          <HomeFeedRow
            download={
              track === undefined
                ? undefined
                : { item: track, testID: `album-track-download-${index}` }
            }
            isLast={index === trackRows.length - 1}
            mediaType="tracks"
            onPlayPress={(nextRow) => {
              runPlayAction(nextRow, 'tracks');
            }}
            onPress={(nextRow) => {
              navigation.navigate(CHANNEL_BROWSE_STACK_ROUTES.TrackDetail, { trackId: nextRow.id });
            }}
            onQueuePress={(nextRow, position) => {
              runQueueAction(nextRow, 'tracks', position);
            }}
            row={row}
            showChannelContext={false}
            testID={`album-track-row-${index}`}
          />
        );
      }}
      style={{ backgroundColor: themeStyles.screen.backgroundColor }}
      testID="album-detail-track-list"
    />
  );

  const aboutBody = (
    <ChannelAboutSection
      channel={channel}
      isChannelLoading={isChannelLoading}
      testIDPrefix="album-detail"
    />
  );

  const fundingBody = (
    <FundingLinksSection
      fundings={channel?.channel_fundings ?? []}
      isLoading={isChannelLoading && channel === null}
      testIDPrefix="album-detail"
    />
  );

  const podrollBody = offlineModeEnabled ? (
    <ListEmpty messageKey={OFFLINE_UNAVAILABLE_MESSAGE_KEY} testID="album-detail-podroll-offline" />
  ) : (
    <FillList
      ListEmptyComponent={
        isPodrollLoading ? (
          <LoadingSection testID="album-detail-podroll-loading" />
        ) : podrollErrorKey !== null ? (
          <ListError
            messageKey={podrollErrorKey}
            onRetry={() => {
              void loadPodroll({ source: 'retry' });
            }}
            testID="album-detail-podroll-error"
          />
        ) : (
          <ListEmpty messageKey="info.no_podroll_found" testID="album-detail-podroll-empty" />
        )
      }
      contentContainerStyle={{
        paddingHorizontal: tokens.spacing.lg,
        paddingTop: tokens.spacing.md,
      }}
      data={podrollRows}
      keyExtractor={(row) => row.id}
      refreshControl={
        <RefreshControl
          onRefresh={() => {
            void loadChannel();
            void loadPodroll({ source: 'refresh' });
          }}
          refreshing={isPodrollRefreshing}
          tintColor={themeStyles.buttonPrimary.backgroundColor}
        />
      }
      renderItem={({ index, item }) => (
        <ListRow
          onPress={() => {
            if (item.target.kind === 'channel') {
              navigation.navigate(
                CHANNEL_BROWSE_STACK_ROUTES.PodcastDetail,
                buildPodcastDetailParams({
                  podcastId: item.target.idText,
                  previewImageUrl: item.imageUrl,
                  previewTitle: item.title,
                })
              );
              return;
            }
            navigation.navigate(CHANNEL_BROWSE_STACK_ROUTES.EpisodeDetail, {
              episodeId: item.target.idText,
            });
          }}
          subtitle={item.subtitle ?? undefined}
          testID={`album-detail-podroll-row-${index}`}
          title={item.title}
        />
      )}
      style={{ backgroundColor: themeStyles.screen.backgroundColor }}
      testID="album-detail-podroll-list"
    />
  );

  const settingsBody = (
    <View style={styles.settingsCard} testID="album-detail-settings">
      <Text style={styles.settingsHeading}>{t('settings.notifications.notifications')}</Text>
      <ListRow
        testID="album-detail-settings-notifications"
        title={t('features.notifications.enable_notifications_for_this_album')}
        trailing={
          <Switch
            accessibilityLabel={t('features.notifications.enable_notifications_for_this_album')}
            accessibilityRole="switch"
            accessibilityState={{ checked: notifications.isEnabled }}
            disabled={notifications.isSaving}
            onValueChange={(nextValue) => {
              void notifications.setEnabled(nextValue);
            }}
            value={notifications.isEnabled}
          />
        }
      />
      {notifications.errorKey !== null ? (
        <Text style={styles.notice}>{t(notifications.errorKey)}</Text>
      ) : null}
      <Text style={styles.notice} testID="album-detail-settings-auto-download-notice">
        {t('features.download.auto_download_unavailable')}
      </Text>
    </View>
  );

  const sectionBody =
    section === 'tracks'
      ? tracksBody
      : section === 'about'
        ? aboutBody
        : section === 'podroll'
          ? podrollBody
          : section === 'funding'
            ? fundingBody
            : settingsBody;

  const chipTrailing =
    section === 'tracks' ? (
      <>
        <MenuSelectChip
          heading={t('filters.screen.sort_heading')}
          onSelect={handleSortSelect}
          options={sortOptions}
          testID="album-detail-sort-pill"
          value={sort}
        />
        {!offlineModeEnabled && sort === 'top' ? (
          <MenuSelectChip
            heading={t('filters.screen.range_heading')}
            onSelect={handleRangeSelect}
            options={rangeOptions}
            testID="album-detail-range-pill"
            value={range}
          />
        ) : null}
      </>
    ) : undefined;

  return (
    <>
      <ChannelDetailShell
        channelHeader={channelHeader}
        chipTrailing={chipTrailing}
        isSectionHydrated={isSectionHydrated}
        loadingTestID="album-detail-section-loading"
        onSelectSection={handleSectionSelect}
        sectionBody={sectionBody}
        sectionChips={sectionChips}
        sectionsTestID="album-detail-sections"
        selectedSection={section}
        testID="album-detail-screen"
      />
      {boostSheet}
    </>
  );
}
