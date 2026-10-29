import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshControl, StyleSheet, Text } from 'react-native';

import type { DTOChannel, DTOItem } from '@podverse/helpers';
import { primaryChannelLightboxArtworkUrl, primaryChannelListArtworkUrl } from '@podverse/helpers';
import type { ApiRequestService } from '@podverse/helpers-requests';
import { getBoostEligibilityForContent } from '@podverse/v4v-metaboost';

import { requestWithMobileAuthRefresh } from '../../auth';
import { useAuth } from '../../auth/AuthProvider';
import { useBoostSheet } from '../../components/boost/useBoostSheet';
import { ChannelDetailShell, ChannelHeader, ChannelSettingsPane } from '../../components/channel';
import {
  ChannelAboutSection,
  FundingLinksSection,
  PeoplePane,
  RemoteItemListRow,
  toAboutPersonFromChannel,
} from '../../components/content';
import type { MenuSelectChipOption, SectionChipItem } from '../../components/form';
import { MenuSelectChip } from '../../components/form';
import { FillList } from '../../components/primitives';
import { Button } from '../../components/primitives/Button';
import { HeaderBarAction } from '../../components/screen/HeaderBarAction';
import { HeaderBarActions } from '../../components/screen/HeaderBarActions';
import { ListEmpty } from '../../components/state/ListEmpty';
import { ListError } from '../../components/state/ListError';
import { ListLoading } from '../../components/state/ListLoading';
import { LoadingSection } from '../../components/state/LoadingSection';
import { channelItemsRepository } from '../../data/repositories/channelItemsRepository';
import { sectionChromeFlagsRepository } from '../../data/repositories/sectionChromeFlagsRepository';
import { mapDirectoryChannelToSubscribed } from '../../data/repositories/subscriptionsMerge';
import { subscriptionsRepository } from '../../data/repositories/subscriptionsRepository';
import { useChannelNotifications } from '../../hooks/useChannelNotifications';
import { useFirstSubscribePushPrompt } from '../../hooks/useFirstSubscribePushPrompt';
import { useLoadMoreOnEndReached } from '../../hooks/useLoadMoreOnEndReached';
import { useOpenRemoteItemListEntry } from '../../hooks/useOpenRemoteItemListEntry';
import { resolveSupportedLocale } from '../../i18n/locale';
import { resolveInitialSubscribed } from '../../lib/channelActionChrome';
import { homeFeedRefresh } from '../../lib/home/homeFeedRefresh';
import { replaceScreenIfMerged } from '../../lib/mergeRedirectNavigation';
import { OFFLINE_UNAVAILABLE_MESSAGE_KEY } from '../../lib/offlineModeViews';
import {
  canLoadNextPage,
  LIST_END_REACHED_THRESHOLD,
  listResponseHasMore,
} from '../../lib/pagination/pagedList';
import type { RemoteItemListEntry } from '../../lib/remoteItems/remoteItemListEntries';
import { toRemoteItemListEntries } from '../../lib/remoteItems/remoteItemListEntries';
import { getCachedChannelSectionFlags } from '../../lib/sectionChromeFlags';
import { buildPublicShareUrl, shareResolvedUrl } from '../../lib/share/shareNowPlaying';
import { useMembershipGate } from '../../membership/MembershipGateProvider';
import { useAccessTier } from '../../membership/useAccessTier';
import type { ChannelBrowseStackParamList } from '../../navigation';
import {
  buildAlbumDetailParams,
  buildArtistDetailParams,
  buildTrackDetailParams,
  CHANNEL_BROWSE_STACK_ROUTES,
} from '../../navigation';
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
} from '../../prefs/detailListPrefs';
import { useOfflineMode } from '../../prefs/offlineMode';
import { useTheme } from '../../theme/useTheme';
import type { HomeFeedRowData } from '../home/homeFeedData';
import { HomeFeedRow } from '../home/HomeFeedRow';
import type { QueueActionPosition } from '../home/useHomeRowPlayback';
import { useHomeRowPlayback } from '../home/useHomeRowPlayback';
import {
  channelHasFunding,
  channelHasPeople,
  channelHasPodroll,
  channelHasRemoteItems,
} from '../podcast/podcastSections';
import { RemoteItemListPane } from '../podcast/sections';
import { isAlbumLivestreamRow, toAlbumTrackRows } from './albumTrackRows';

type AlbumDetailScreenProps = NativeStackScreenProps<ChannelBrowseStackParamList, 'AlbumDetail'>;

const FIRST_PAGE = 1;

const albumTrackKeyExtractor = (row: HomeFeedRowData): string => row.id;
const albumPodrollKeyExtractor = (row: RemoteItemListEntry): string => row.key;

/** An album track, or a livestream on the same row a podcast's livestream uses. */
function AlbumTrackRow({
  index,
  onGoToChannel,
  onGoToTrack,
  onOpenLivestream,
  onPlay,
  onQueue,
  onShareLivestream,
  row,
  track,
}: {
  index: number;
  onGoToChannel: (row: HomeFeedRowData) => void;
  onGoToTrack: (row: HomeFeedRowData) => void;
  onOpenLivestream: (row: HomeFeedRowData) => void;
  onPlay: (row: HomeFeedRowData) => void;
  onQueue: (row: HomeFeedRowData, position: QueueActionPosition) => void;
  onShareLivestream: (row: HomeFeedRowData) => void;
  row: HomeFeedRowData;
  track: DTOItem | undefined;
}) {
  if (isAlbumLivestreamRow(row)) {
    return (
      <HomeFeedRow
        downloadItem={track}
        downloadTestID={`album-track-download-${index}`}
        mediaType="episodes"
        onPlayPress={onPlay}
        onPress={onOpenLivestream}
        onSharePress={onShareLivestream}
        row={row}
        showChannelContext={false}
        testID={`album-livestream-row-${index}`}
      />
    );
  }

  return (
    <HomeFeedRow
      downloadItem={track}
      downloadTestID={`album-track-download-${index}`}
      mediaType="tracks"
      onGoToChannelPress={onGoToChannel}
      onGoToTrackPress={onGoToTrack}
      onPlayPress={onPlay}
      onPress={onPlay}
      onQueuePress={onQueue}
      row={row}
      showChannelContext={false}
      testID={`album-track-row-${index}`}
    />
  );
}

const SECTION_LABEL_KEYS: Record<AlbumTab, string> = {
  about: 'info.about',
  funding: 'info.funding',
  people: 'info.people.people',
  podroll: 'info.podroll',
  remote_items: 'info.remote_items',
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
  const { t, i18n } = useTranslation();
  const { styles: themeStyles, tokens } = useTheme();
  const { boostSheet, openBoost } = useBoostSheet();
  const { accessToken, account, clearSession, refreshToken, setTokens, status } = useAuth();
  const {
    askIfNeeded,
    applyAfterFollow,
    dialog: firstSubscribePushDialog,
  } = useFirstSubscribePushPrompt();
  const { enabled: offlineModeEnabled } = useOfflineMode();
  const {
    albumId,
    previewImageUrl,
    previewIsSubscribed,
    previewNotificationsEnabled,
    previewTitle,
  } = route.params;
  const { evaluateFeature, isTierKnown } = useAccessTier();
  const { handleGateError, openGate } = useMembershipGate();
  const { playbackNoticeKey, runPlayAction, runQueueAction } = useHomeRowPlayback();
  const cachedChrome = getCachedChannelSectionFlags(albumId);
  const [channel, setChannel] = useState<DTOChannel | null>(null);
  const [isChannelLoading, setIsChannelLoading] = useState<boolean>(true);
  const [previewHasPodroll, setPreviewHasPodroll] = useState<boolean>(
    cachedChrome?.hasPodroll === true
  );
  const [previewHasRemoteItems, setPreviewHasRemoteItems] = useState<boolean>(
    cachedChrome?.hasRemoteItems === true
  );
  const [previewHasFunding, setPreviewHasFunding] = useState<boolean>(
    cachedChrome?.hasFunding === true
  );
  const [previewHasPeople, setPreviewHasPeople] = useState<boolean>(
    cachedChrome?.hasPeople === true
  );
  const [previewHeaderTitle, setPreviewHeaderTitle] = useState<string | null>(
    previewTitle !== undefined && previewTitle.length > 0 ? previewTitle : null
  );
  const [previewArtworkUri, setPreviewArtworkUri] = useState<string | null>(
    previewImageUrl !== undefined && previewImageUrl !== null && previewImageUrl.length > 0
      ? previewImageUrl
      : null
  );
  const [isSubscribed, setIsSubscribed] = useState<boolean>(() =>
    resolveInitialSubscribed(albumId, previewIsSubscribed)
  );
  const [isSavingSubscription, setIsSavingSubscription] = useState<boolean>(false);
  const [subscriptionNoticeKey, setSubscriptionNoticeKey] = useState<string | null>(null);
  const [isSectionHydrated, setIsSectionHydrated] = useState<boolean>(false);
  const [section, setSection] = useState<AlbumTab>(DEFAULT_ALBUM_TAB);
  const [settingsOpen, setSettingsOpen] = useState<boolean>(false);
  const [sort, setSort] = useState<AlbumTrackSort>(DEFAULT_ALBUM_TRACK_SORT);
  const [range, setRange] = useState<AlbumDetailRange>(DEFAULT_ALBUM_DETAIL_RANGE);
  const [trackRows, setTrackRows] = useState<HomeFeedRowData[]>([]);
  const [tracksHasMore, setTracksHasMore] = useState<boolean>(false);
  const [isTracksLoadingMore, setIsTracksLoadingMore] = useState<boolean>(false);
  const [tracksLoadMoreErrorKey, setTracksLoadMoreErrorKey] = useState<string | null>(null);
  const [tracksById, setTracksById] = useState<Map<string, DTOItem>>(new Map());
  const [trackErrorKey, setTrackErrorKey] = useState<string | null>(null);
  const [isTracksLoading, setIsTracksLoading] = useState<boolean>(true);
  const [isTracksRefreshing, setIsTracksRefreshing] = useState<boolean>(false);
  const [podrollRows, setPodrollRows] = useState<RemoteItemListEntry[]>([]);
  const [podrollErrorKey, setPodrollErrorKey] = useState<string | null>(null);
  const [isPodrollLoading, setIsPodrollLoading] = useState<boolean>(false);
  const [isPodrollRefreshing, setIsPodrollRefreshing] = useState<boolean>(false);
  const channelTitleRef = useRef<string | null>(null);
  const trackItemsRef = useRef<DTOItem[]>([]);
  const tracksPageRef = useRef<number>(FIRST_PAGE);
  const tracksGenerationRef = useRef<number>(0);
  channelTitleRef.current = channel?.title ?? channelTitleRef.current;

  const notifications = useChannelNotifications({
    channelId: channel?.id ?? null,
    channelIdText: albumId,
    previewNotificationsEnabled,
  });

  const authContext = useMemo(
    () => ({ accessToken, clearSession, refreshToken, setTokens }),
    [accessToken, clearSession, refreshToken, setTokens]
  );
  const isSignedIn = status === 'authenticated';

  const styles = useMemo(
    () =>
      StyleSheet.create({
        notice: {
          color: themeStyles.textSecondary.color,
          fontSize: 13,
          marginTop: tokens.spacing.sm,
          paddingHorizontal: tokens.spacing.lg,
        },
        list: {
          backgroundColor: themeStyles.screen.backgroundColor,
        },
        listContent: {
          paddingHorizontal: tokens.spacing.lg,
          paddingTop: tokens.spacing.md,
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
    setPreviewHasRemoteItems(nextChrome?.hasRemoteItems === true);
    setPreviewHasFunding(nextChrome?.hasFunding === true);
    setPreviewHasPeople(nextChrome?.hasPeople === true);
    setIsSubscribed(resolveInitialSubscribed(albumId, previewIsSubscribed));
  }, [albumId, previewIsSubscribed]);

  useEffect(() => {
    let isMounted = true;
    setIsSectionHydrated(false);
    setSection(DEFAULT_ALBUM_TAB);
    void (async () => {
      const prefs = await readAlbumDetailPrefs(albumId);
      if (!isMounted) {
        return;
      }
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
        const hasRemoteItems = channelHasRemoteItems(response);
        const hasFunding = channelHasFunding(response);
        const hasPeople = channelHasPeople(response);
        setPreviewHasPodroll(hasPodroll);
        setPreviewHasRemoteItems(hasRemoteItems);
        setPreviewHasFunding(hasFunding);
        setPreviewHasPeople(hasPeople);
        void sectionChromeFlagsRepository.mergeChannel(albumId, {
          hasFunding,
          hasPeople,
          hasPodroll,
          hasRemoteItems,
        });
      } catch (error) {
        const replaced = await replaceScreenIfMerged({
          currentIdText: albumId,
          error,
          loadChannel: (idText) =>
            requestWithMobileAuthRefresh(authContext, async (api) =>
              api.reqChannelGetByIdOrIdText(idText)
            ),
          loadItem: (idText) =>
            requestWithMobileAuthRefresh(authContext, async (api) =>
              api.reqItemGetByIdOrIdText(idText)
            ),
          navigation,
        });
        if (replaced) {
          return;
        }
      }
    } finally {
      setIsChannelLoading(false);
    }
  }, [albumId, authContext, navigation, offlineModeEnabled]);

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
      tracksGenerationRef.current += 1;
      const generation = tracksGenerationRef.current;
      setIsTracksLoadingMore(false);
      setTracksLoadMoreErrorKey(null);
      if (source === 'refresh') {
        setIsTracksRefreshing(true);
      } else {
        setIsTracksLoading(true);
      }
      setTrackErrorKey(null);
      try {
        const storedItems = await readStoredTracks();
        if (generation !== tracksGenerationRef.current) {
          return;
        }
        if (offlineModeEnabled) {
          trackItemsRef.current = storedItems;
          setTracksHasMore(false);
          setTrackRows(toAlbumTrackRows(storedItems, albumId, channelTitleRef.current));
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
        if (generation !== tracksGenerationRef.current) {
          return;
        }
        trackItemsRef.current = merged;
        tracksPageRef.current = FIRST_PAGE;
        setTracksHasMore(listResponseHasMore(seasonResponse.meta, seasonResponse.data.length));
        setTrackRows(toAlbumTrackRows(merged, albumId, channelTitleRef.current));
        setTracksById(new Map(merged.map((item) => [item.id_text, item])));
      } catch {
        if (generation !== tracksGenerationRef.current) {
          return;
        }
        setTrackErrorKey('errors.generic');
        setTrackRows([]);
        setTracksById(new Map());
        trackItemsRef.current = [];
        setTracksHasMore(false);
      } finally {
        if (generation === tracksGenerationRef.current) {
          setIsTracksRefreshing(false);
          setIsTracksLoading(false);
        }
      }
    },
    [albumId, authContext, offlineModeEnabled, range, readStoredTracks, sort]
  );

  const loadNextTracksPage = useCallback(async (): Promise<void> => {
    if (offlineModeEnabled) {
      return;
    }
    const generation = tracksGenerationRef.current;
    const nextPage = tracksPageRef.current + 1;
    setIsTracksLoadingMore(true);
    setTracksLoadMoreErrorKey(null);
    try {
      const response = await requestWithMobileAuthRefresh(authContext, async (api) =>
        api.reqItemGetManyByChannelBySeason({
          idOrIdText: albumId,
          page: nextPage,
          range: sort === 'top' ? range : null,
          sort,
        })
      );
      if (generation !== tracksGenerationRef.current) {
        return;
      }
      const joined = removeDuplicateItems([...trackItemsRef.current, ...response.data]);
      trackItemsRef.current = joined;
      tracksPageRef.current = nextPage;
      setTrackRows(toAlbumTrackRows(joined, albumId, channelTitleRef.current));
      setTracksById(new Map(joined.map((item) => [item.id_text, item])));
      setTracksHasMore(listResponseHasMore(response.meta, response.data.length));
    } catch {
      if (generation !== tracksGenerationRef.current) {
        return;
      }
      setTracksLoadMoreErrorKey('errors.generic');
    } finally {
      if (generation === tracksGenerationRef.current) {
        setIsTracksLoadingMore(false);
      }
    }
  }, [albumId, authContext, offlineModeEnabled, range, sort]);

  const handleTracksEndReached = useLoadMoreOnEndReached({
    canLoadMore:
      !offlineModeEnabled &&
      canLoadNextPage({
        hasError: trackErrorKey !== null || tracksLoadMoreErrorKey !== null,
        hasMore: tracksHasMore,
        isLoading: isTracksLoading || isTracksRefreshing,
        isLoadingMore: isTracksLoadingMore,
      }),
    loadMore: loadNextTracksPage,
  });

  const handleRetryTracksPage = useCallback(() => {
    void loadNextTracksPage();
  }, [loadNextTracksPage]);

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
        setPodrollRows(toRemoteItemListEntries(response));
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
    const hasRemoteItems =
      channel !== null ? channelHasRemoteItems(channel) : previewHasRemoteItems;
    const hasFunding = channel !== null ? channelHasFunding(channel) : previewHasFunding;
    const hasPeople = channel !== null ? channelHasPeople(channel) : previewHasPeople;
    return ALBUM_TABS.filter((tab) => {
      if (tab === 'podroll') {
        return hasPodroll;
      }
      if (tab === 'remote_items') {
        return hasRemoteItems;
      }
      if (tab === 'funding') {
        return hasFunding;
      }
      if (tab === 'people') {
        return hasPeople;
      }
      return true;
    });
  }, [channel, previewHasFunding, previewHasPeople, previewHasPodroll, previewHasRemoteItems]);

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

  const handleSectionSelect = useCallback((next: AlbumTab) => {
    setSettingsOpen(false);
    setSection(next);
  }, []);

  const handleSettingsPress = useCallback(() => {
    setSettingsOpen((open) => !open);
  }, []);

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

    setSubscriptionNoticeKey(null);

    if (isSubscribed) {
      setIsSavingSubscription(true);
      try {
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
      } finally {
        setIsSavingSubscription(false);
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

    let pushChoice: Awaited<ReturnType<typeof askIfNeeded>> = null;
    let accountIdText: string | null = null;
    if (isSignedIn) {
      accountIdText = account?.id_text ?? null;
      pushChoice = accountIdText === null ? null : await askIfNeeded(accountIdText);
    }

    setIsSavingSubscription(true);
    try {
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

        if (accountIdText !== null) {
          await applyAfterFollow({
            accountIdText,
            auth: authContext,
            channelIdText: albumId,
            choice: pushChoice,
            locale: resolveSupportedLocale(i18n.language),
          });
        }
      }

      await subscriptionsRepository.subscribeLocal(entry);
      setIsSubscribed(true);
      homeFeedRefresh.notify();
    } finally {
      setIsSavingSubscription(false);
    }
  }, [
    account?.id_text,
    albumId,
    applyAfterFollow,
    askIfNeeded,
    authContext,
    channel,
    evaluateFeature,
    handleGateError,
    i18n.language,
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
        <HeaderBarActions>
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
            accessibilityLabel={t('features.share')}
            icon="share-outline"
            onPress={handleShare}
            testID="album-detail-share"
          />
        </HeaderBarActions>
      ),
    });
  }, [canShowBoost, channel, handleShare, navigation, openBoost, t, tokens.text.warning]);

  const handleGoToChannel = useCallback(
    (nextRow: HomeFeedRowData) => {
      if (nextRow.channelId === undefined) {
        return;
      }
      if (nextRow.channelKind === 'artists') {
        navigation.navigate(
          CHANNEL_BROWSE_STACK_ROUTES.ArtistDetail,
          buildArtistDetailParams({
            artistId: nextRow.channelId,
            previewTitle: nextRow.subtitle,
          })
        );
        return;
      }
      navigation.navigate(
        CHANNEL_BROWSE_STACK_ROUTES.AlbumDetail,
        buildAlbumDetailParams({
          albumId: nextRow.channelId,
          previewTitle: nextRow.subtitle,
        })
      );
    },
    [navigation]
  );

  const handleGoToTrack = useCallback(
    (nextRow: HomeFeedRowData) => {
      navigation.navigate(
        CHANNEL_BROWSE_STACK_ROUTES.TrackDetail,
        buildTrackDetailParams({
          previewImageUrl: nextRow.imageUrl,
          previewTitle: nextRow.title,
          trackId: nextRow.id,
        })
      );
    },
    [navigation]
  );

  const handleOpenLivestream = useCallback(
    (nextRow: HomeFeedRowData) => {
      navigation.navigate(CHANNEL_BROWSE_STACK_ROUTES.EpisodeDetail, { episodeId: nextRow.id });
    },
    [navigation]
  );

  const handleShareLivestream = useCallback((nextRow: HomeFeedRowData) => {
    shareResolvedUrl(buildPublicShareUrl('episode', nextRow.id));
  }, []);

  const handlePlayTrack = useCallback(
    (nextRow: HomeFeedRowData) => {
      runPlayAction(nextRow, 'tracks');
    },
    [runPlayAction]
  );

  const handleQueueTrack = useCallback(
    (nextRow: HomeFeedRowData, position: QueueActionPosition) => {
      runQueueAction(nextRow, 'tracks', position);
    },
    [runQueueAction]
  );

  const handleRetryTracks = useCallback(() => {
    void loadTracks({ source: 'retry' });
  }, [loadTracks]);

  const handleRefreshTracks = useCallback(() => {
    void loadChannel();
    void loadTracks({ source: 'refresh' });
  }, [loadChannel, loadTracks]);

  const handleRetryPodroll = useCallback(() => {
    void loadPodroll({ source: 'retry' });
  }, [loadPodroll]);

  const handleRefreshPodroll = useCallback(() => {
    void loadChannel();
    void loadPodroll({ source: 'refresh' });
  }, [loadChannel, loadPodroll]);

  const handlePodrollPress = useOpenRemoteItemListEntry();

  const handleSubscriptionTogglePress = useCallback(() => {
    void handleSubscriptionToggle();
  }, [handleSubscriptionToggle]);

  const tracksEmpty = useMemo(
    () =>
      isTracksLoading ? (
        <LoadingSection testID="album-detail-loading" />
      ) : trackErrorKey !== null ? (
        <ListError
          messageKey={trackErrorKey}
          onRetry={handleRetryTracks}
          testID="album-detail-error"
        />
      ) : (
        <ListEmpty messageKey="media.music.no_tracks_found" testID="album-detail-empty" />
      ),
    [handleRetryTracks, isTracksLoading, trackErrorKey]
  );

  const tracksFooter = useMemo(
    () => (
      <>
        {isTracksLoadingMore ? (
          <ListLoading testID="album-detail-track-loading-more" />
        ) : tracksLoadMoreErrorKey !== null ? (
          <ListError
            messageKey={tracksLoadMoreErrorKey}
            onRetry={handleRetryTracksPage}
            testID="album-detail-track-load-more-error"
          />
        ) : null}
        {playbackNoticeKey !== null ? (
          <Text style={styles.notice}>{t(playbackNoticeKey)}</Text>
        ) : null}
      </>
    ),
    [
      handleRetryTracksPage,
      isTracksLoadingMore,
      playbackNoticeKey,
      styles.notice,
      t,
      tracksLoadMoreErrorKey,
    ]
  );

  const tracksRefreshControl = useMemo(
    () => (
      <RefreshControl
        onRefresh={handleRefreshTracks}
        refreshing={isTracksRefreshing}
        tintColor={themeStyles.buttonPrimary.backgroundColor}
      />
    ),
    [handleRefreshTracks, isTracksRefreshing, themeStyles.buttonPrimary.backgroundColor]
  );

  const renderTrackItem = useCallback(
    ({ index, item: row }: { index: number; item: HomeFeedRowData }) => (
      <AlbumTrackRow
        index={index}
        onGoToChannel={handleGoToChannel}
        onGoToTrack={handleGoToTrack}
        onOpenLivestream={handleOpenLivestream}
        onPlay={handlePlayTrack}
        onQueue={handleQueueTrack}
        onShareLivestream={handleShareLivestream}
        row={row}
        track={tracksById.get(row.id)}
      />
    ),
    [
      handleGoToChannel,
      handleGoToTrack,
      handleOpenLivestream,
      handlePlayTrack,
      handleQueueTrack,
      handleShareLivestream,
      tracksById,
    ]
  );

  const podrollEmpty = useMemo(
    () =>
      isPodrollLoading ? (
        <LoadingSection testID="album-detail-podroll-loading" />
      ) : podrollErrorKey !== null ? (
        <ListError
          messageKey={podrollErrorKey}
          onRetry={handleRetryPodroll}
          testID="album-detail-podroll-error"
        />
      ) : (
        <ListEmpty messageKey="info.no_podroll_found" testID="album-detail-podroll-empty" />
      ),
    [handleRetryPodroll, isPodrollLoading, podrollErrorKey]
  );

  const podrollRefreshControl = useMemo(
    () => (
      <RefreshControl
        onRefresh={handleRefreshPodroll}
        refreshing={isPodrollRefreshing}
        tintColor={themeStyles.buttonPrimary.backgroundColor}
      />
    ),
    [handleRefreshPodroll, isPodrollRefreshing, themeStyles.buttonPrimary.backgroundColor]
  );

  const untitledLabel = t('misc.untitled');

  const renderPodrollItem = useCallback(
    ({ index, item }: { index: number; item: RemoteItemListEntry }) => (
      <RemoteItemListRow
        entry={item}
        onPress={handlePodrollPress}
        testID={`album-detail-podroll-row-${index}`}
        untitledLabel={untitledLabel}
      />
    ),
    [handlePodrollPress, untitledLabel]
  );

  const channelArtworkUri =
    primaryChannelListArtworkUrl(channel?.channel_images) ?? previewArtworkUri;
  const channelViewerUri =
    primaryChannelLightboxArtworkUrl(channel?.channel_images) ?? channelArtworkUri;
  const title = channel?.title ?? previewHeaderTitle ?? t('media.music.album');

  const channelHeader = (
    <ChannelHeader
      actions={
        <Button
          label={t(isSubscribed ? 'features.unsubscribe' : 'features.subscribe')}
          loading={isSavingSubscription}
          onPress={handleSubscriptionTogglePress}
          size="sm"
          testID="album-detail-subscribe-toggle"
          variant="outline"
        />
      }
      artworkUri={channelArtworkUri}
      notice={subscriptionNoticeKey === null ? null : t(subscriptionNoticeKey)}
      notifications={{
        accessibilityLabel: t(
          notificationsEnabled
            ? 'features.notifications.disable_notifications_for_this_album'
            : 'features.notifications.enable_notifications_for_this_album'
        ),
        enabled: notificationsEnabled,
        onPress: () => {
          void toggleNotifications();
        },
        testID: 'album-detail-notifications-toggle',
      }}
      settings={{
        accessibilityLabel: t('settings.settings'),
        onPress: handleSettingsPress,
        selected: settingsOpen,
        testID: 'album-detail-header-settings',
      }}
      testID="album-detail-header"
      title={title}
      viewerUri={channelViewerUri}
    />
  );

  const tracksBody = (
    <FillList
      ListEmptyComponent={tracksEmpty}
      ListFooterComponent={tracksFooter}
      contentContainerStyle={styles.listContent}
      data={trackRows}
      keyExtractor={albumTrackKeyExtractor}
      onEndReached={handleTracksEndReached}
      onEndReachedThreshold={LIST_END_REACHED_THRESHOLD}
      refreshControl={tracksRefreshControl}
      renderItem={renderTrackItem}
      style={styles.list}
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

  const peopleBody = (
    <PeoplePane
      isLoading={isChannelLoading && channel === null}
      people={(channel?.channel_persons ?? []).map(toAboutPersonFromChannel)}
      testIDPrefix="album-detail"
    />
  );

  const podrollBody = offlineModeEnabled ? (
    <ListEmpty messageKey={OFFLINE_UNAVAILABLE_MESSAGE_KEY} testID="album-detail-podroll-offline" />
  ) : (
    <FillList
      ListEmptyComponent={podrollEmpty}
      contentContainerStyle={styles.listContent}
      data={podrollRows}
      keyExtractor={albumPodrollKeyExtractor}
      refreshControl={podrollRefreshControl}
      renderItem={renderPodrollItem}
      style={styles.list}
      testID="album-detail-podroll-list"
    />
  );

  const fetchRemoteItems = useCallback(
    (api: ApiRequestService) => api.reqRemoteItemGetForChannel(albumId),
    [albumId]
  );

  const remoteItemsBody = offlineModeEnabled ? (
    <ListEmpty
      messageKey={OFFLINE_UNAVAILABLE_MESSAGE_KEY}
      testID="album-detail-remote-items-offline"
    />
  ) : (
    <RemoteItemListPane
      accessibilityLabelKey="info.remote_items"
      emptyMessageKey="info.no_remote_items_found"
      fetchResponse={fetchRemoteItems}
      listHeader={null}
      onRefreshChannel={loadChannel}
      rowTestIDPrefix="album-detail-remote-item-row"
      testID="album-detail-remote-items-list"
    />
  );

  const settingsBody = (
    <ChannelSettingsPane
      channel={channel}
      notifications={notifications}
      testIDPrefix="album-detail"
    />
  );

  const sectionListBody =
    section === 'tracks'
      ? tracksBody
      : section === 'about'
        ? aboutBody
        : section === 'podroll'
          ? podrollBody
          : section === 'remote_items'
            ? remoteItemsBody
            : section === 'funding'
              ? fundingBody
              : peopleBody;
  const sectionBody = settingsOpen ? settingsBody : sectionListBody;

  const chipTrailing =
    settingsOpen || section !== 'tracks' ? undefined : (
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
    );

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
        selectedSection={settingsOpen ? null : section}
        testID="album-detail-screen"
      />
      {boostSheet}
      {firstSubscribePushDialog}
    </>
  );
}
