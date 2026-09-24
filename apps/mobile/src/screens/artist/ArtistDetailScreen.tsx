import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Linking, RefreshControl, StyleSheet, Switch, Text, View } from 'react-native';

import type {
  DTOChannel,
  DTOItem,
  EpisodeByGuidResponse,
  PodcastBatchByFeedGuidResponse,
  RemoteItemsResponse,
} from '@podverse/helpers';
import {
  podcastIndexFeedListImageUrl,
  primaryChannelLightboxArtworkUrl,
  primaryChannelListArtworkUrl,
  primaryListArtworkUrl,
  unparsedPodcastIndexFeedTarget,
} from '@podverse/helpers';
import { getBoostEligibilityForContent } from '@podverse/v4v-metaboost';

import { requestWithMobileAuthRefresh } from '../../auth';
import { useAuth } from '../../auth/AuthProvider';
import { useBoostSheet } from '../../components/boost/useBoostSheet';
import { ChannelDetailShell, ChannelHeader } from '../../components/channel';
import { ChannelAboutSection, FundingLinksSection } from '../../components/content';
import type { SectionChipItem } from '../../components/form';
import { CoverImage, FillList, ListRow } from '../../components/primitives';
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
import { resolveInitialSubscribed } from '../../lib/channelActionChrome';
import { homeFeedRefresh } from '../../lib/home/homeFeedRefresh';
import { OFFLINE_UNAVAILABLE_MESSAGE_KEY } from '../../lib/offlineModeViews';
import { getCachedChannelSectionFlags } from '../../lib/sectionChromeFlags';
import { buildPublicShareUrl, shareResolvedUrl } from '../../lib/share/shareNowPlaying';
import { useMembershipGate } from '../../membership/MembershipGateProvider';
import { useAccessTier } from '../../membership/useAccessTier';
import type { ChannelBrowseStackParamList } from '../../navigation';
import {
  buildAlbumDetailParams,
  buildArtistDetailParams,
  buildPodcastDetailParams,
  buildTrackDetailParams,
  CHANNEL_BROWSE_STACK_ROUTES,
} from '../../navigation';
import type { ArtistTab } from '../../prefs/detailListPrefs';
import {
  DEFAULT_ARTIST_TAB,
  readArtistDetailPrefs,
  writeArtistDetailTab,
} from '../../prefs/detailListPrefs';
import { useOfflineMode } from '../../prefs/offlineMode';
import { LIST_ROW_ARTWORK_SIZE } from '../../theme/screenLayout';
import { useTheme } from '../../theme/useTheme';
import type { HomeFeedRowData } from '../home/homeFeedData';
import { mapItemToHomeFeedRow } from '../home/homeFeedData';
import { HomeFeedRow } from '../home/HomeFeedRow';
import type { QueueActionPosition } from '../home/useHomeRowPlayback';
import { useHomeRowPlayback } from '../home/useHomeRowPlayback';
import { channelHasFunding, channelHasPodroll } from '../podcast/podcastSections';

/** Artwork sizing only, so it does not depend on the theme. */
const albumCoverStyles = StyleSheet.create({
  image: {
    height: LIST_ROW_ARTWORK_SIZE,
    width: LIST_ROW_ARTWORK_SIZE,
  },
});

type ArtistDetailScreenProps = NativeStackScreenProps<ChannelBrowseStackParamList, 'ArtistDetail'>;

type ArtistTrackUnadded = NonNullable<EpisodeByGuidResponse['episode']>;
type ArtistAlbumUnadded = PodcastBatchByFeedGuidResponse['feeds'][number];

type ArtistTracksRow =
  | {
      kind: 'added';
      key: string;
      row: HomeFeedRowData;
      item: DTOItem;
    }
  | {
      kind: 'unadded';
      key: string;
      row: ArtistTrackUnadded;
    };

type ArtistAlbumsRow =
  | {
      kind: 'added';
      key: string;
      row: DTOChannel;
    }
  | {
      kind: 'unadded';
      key: string;
      row: ArtistAlbumUnadded;
    };

type PodrollEntry = {
  id: string;
  imageUrl: string | null;
  subtitle: string | null;
  target: { idText: string; kind: 'channel' | 'episode' };
  title: string;
};

const SECTION_LABEL_KEYS: Record<ArtistTab, string> = {
  about: 'info.about',
  albums: 'media.music.albums',
  funding: 'info.funding',
  podroll: 'info.podroll',
  settings: 'settings.settings',
  tracks: 'media.music.tracks',
};

const artistTracksKeyExtractor = (row: ArtistTracksRow): string => row.key;
const artistAlbumsKeyExtractor = (row: ArtistAlbumsRow): string => row.key;
const artistPodrollKeyExtractor = (row: PodrollEntry): string => row.id;

function ArtistAddedTrackRow({
  index,
  isLast,
  item,
  onGoToChannel,
  onGoToTrack,
  onPlay,
  onQueue,
  row,
}: {
  index: number;
  isLast: boolean;
  item: DTOItem;
  onGoToChannel: (row: HomeFeedRowData) => void;
  onGoToTrack: (row: HomeFeedRowData) => void;
  onPlay: (row: HomeFeedRowData) => void;
  onQueue: (row: HomeFeedRowData, position: QueueActionPosition) => void;
  row: HomeFeedRowData;
}) {
  return (
    <HomeFeedRow
      downloadItem={item}
      downloadTestID={`artist-track-download-${index}`}
      isLast={isLast}
      mediaType="tracks"
      onGoToChannelPress={onGoToChannel}
      onGoToTrackPress={onGoToTrack}
      onPlayPress={onPlay}
      onPress={onPlay}
      onQueuePress={onQueue}
      row={row}
      showChannelContext={false}
      testID={`artist-track-row-${index}`}
    />
  );
}

function ArtistUnaddedTrackRow({
  index,
  onOpenUrl,
  row,
}: {
  index: number;
  onOpenUrl: (url: string) => void;
  row: ArtistTrackUnadded;
}) {
  const link = row.link;
  const hasLink = link !== undefined && link !== null && link.length > 0;
  const handlePress = useCallback(() => {
    if (link === undefined || link === null || link.length === 0) {
      return;
    }
    void onOpenUrl(link);
  }, [link, onOpenUrl]);

  return (
    <ListRow
      onPress={hasLink ? handlePress : undefined}
      subtitle={row.feedTitle ?? row.authorName ?? row.author ?? undefined}
      testID={`artist-track-unadded-row-${index}`}
      title={row.title ?? row.guid}
    />
  );
}

function ArtistAddedAlbumRow({
  index,
  onPress,
  row,
}: {
  index: number;
  onPress: (row: DTOChannel) => void;
  row: DTOChannel;
}) {
  const handlePress = useCallback(() => {
    onPress(row);
  }, [onPress, row]);

  const imageUrl = primaryChannelListArtworkUrl(row.channel_images);

  return (
    <ListRow
      leading={
        <CoverImage
          decodeEdge={LIST_ROW_ARTWORK_SIZE}
          opensViewer={false}
          style={albumCoverStyles.image}
          uri={imageUrl}
        />
      }
      onPress={handlePress}
      subtitle={row.channel_about?.author ?? undefined}
      testID={`artist-album-row-${index}`}
      title={row.title ?? row.id_text}
    />
  );
}

function ArtistUnaddedAlbumRow({
  index,
  onPress,
  row,
}: {
  index: number;
  onPress: (row: ArtistAlbumUnadded) => void;
  row: ArtistAlbumUnadded;
}) {
  const target = unparsedPodcastIndexFeedTarget(row);
  const handlePress = useCallback(() => {
    onPress(row);
  }, [onPress, row]);

  return (
    <ListRow
      leading={
        <CoverImage
          decodeEdge={LIST_ROW_ARTWORK_SIZE}
          opensViewer={false}
          style={albumCoverStyles.image}
          uri={podcastIndexFeedListImageUrl(row)}
        />
      }
      onPress={target !== null ? handlePress : undefined}
      subtitle={row.author ?? undefined}
      testID={`artist-album-unadded-row-${index}`}
      title={row.title}
    />
  );
}

function ArtistPodrollRow({
  index,
  item,
  onPress,
}: {
  index: number;
  item: PodrollEntry;
  onPress: (item: PodrollEntry) => void;
}) {
  const handlePress = useCallback(() => {
    onPress(item);
  }, [item, onPress]);

  return (
    <ListRow
      onPress={handlePress}
      subtitle={item.subtitle ?? undefined}
      testID={`artist-podroll-row-${index}`}
      title={item.title}
    />
  );
}

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

export function ArtistDetailScreen({ navigation, route }: ArtistDetailScreenProps) {
  const { t } = useTranslation();
  const { styles: themeStyles, tokens } = useTheme();
  const { accessToken, clearSession, refreshToken, setTokens, status } = useAuth();
  const { enabled: offlineModeEnabled } = useOfflineMode();
  const {
    artistId,
    previewImageUrl,
    previewIsSubscribed,
    previewNotificationsEnabled,
    previewTitle,
  } = route.params;
  const { evaluateFeature, isTierKnown } = useAccessTier();
  const { handleGateError, openGate } = useMembershipGate();
  const { playbackNoticeKey, runPlayAction, runQueueAction } = useHomeRowPlayback();
  const { boostSheet, openBoost } = useBoostSheet();
  const cachedChrome = getCachedChannelSectionFlags(artistId);
  const [channel, setChannel] = useState<DTOChannel | null>(null);
  const [isChannelLoading, setIsChannelLoading] = useState<boolean>(true);
  const [previewHasPodroll, setPreviewHasPodroll] = useState<boolean>(
    cachedChrome?.hasPodroll === true
  );
  const [previewHasFunding, setPreviewHasFunding] = useState<boolean>(
    cachedChrome?.hasFunding === true
  );
  const [artistTitle, setArtistTitle] = useState<string | null>(
    previewTitle !== undefined && previewTitle.length > 0 ? previewTitle : null
  );
  const [artistArtwork, setArtistArtwork] = useState<string | null>(
    previewImageUrl !== undefined && previewImageUrl !== null && previewImageUrl.length > 0
      ? previewImageUrl
      : null
  );
  const [isSubscribed, setIsSubscribed] = useState<boolean>(() =>
    resolveInitialSubscribed(artistId, previewIsSubscribed)
  );
  const [isSavingSubscription, setIsSavingSubscription] = useState<boolean>(false);
  const [subscriptionNoticeKey, setSubscriptionNoticeKey] = useState<string | null>(null);
  const [isSectionHydrated, setIsSectionHydrated] = useState<boolean>(false);
  const [section, setSection] = useState<ArtistTab>(DEFAULT_ARTIST_TAB);
  const [tracksAdded, setTracksAdded] = useState<DTOItem[]>([]);
  const [tracksUnadded, setTracksUnadded] = useState<ArtistTrackUnadded[]>([]);
  const [albumsAdded, setAlbumsAdded] = useState<DTOChannel[]>([]);
  const [albumsUnadded, setAlbumsUnadded] = useState<ArtistAlbumUnadded[]>([]);
  const [isRowsLoading, setIsRowsLoading] = useState<boolean>(true);
  const [isRowsRefreshing, setIsRowsRefreshing] = useState<boolean>(false);
  const [rowsErrorKey, setRowsErrorKey] = useState<string | null>(null);
  const [podrollRows, setPodrollRows] = useState<PodrollEntry[]>([]);
  const [podrollErrorKey, setPodrollErrorKey] = useState<string | null>(null);
  const [isPodrollLoading, setIsPodrollLoading] = useState<boolean>(false);
  const [isPodrollRefreshing, setIsPodrollRefreshing] = useState<boolean>(false);
  const titleRef = useRef<string | null>(null);
  titleRef.current = channel?.title ?? titleRef.current;

  const authContext = useMemo(
    () => ({ accessToken, clearSession, refreshToken, setTokens }),
    [accessToken, clearSession, refreshToken, setTokens]
  );
  const isSignedIn = status === 'authenticated';

  const notifications = useChannelNotifications({
    channelId: channel?.id ?? null,
    channelIdText: artistId,
    previewNotificationsEnabled,
  });

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
        list: {
          backgroundColor: themeStyles.screen.backgroundColor,
        },
        listContent: {
          paddingHorizontal: tokens.spacing.lg,
          paddingTop: tokens.spacing.md,
        },
        subscribeButtonRow: {
          alignItems: 'flex-start',
        },
      }),
    [themeStyles, tokens]
  );

  useEffect(() => {
    setArtistArtwork(
      previewImageUrl !== undefined && previewImageUrl !== null && previewImageUrl.length > 0
        ? previewImageUrl
        : null
    );
    setArtistTitle(previewTitle !== undefined && previewTitle.length > 0 ? previewTitle : null);
  }, [previewImageUrl, previewTitle]);

  useEffect(() => {
    const nextChrome = getCachedChannelSectionFlags(artistId);
    setChannel(null);
    setIsChannelLoading(true);
    setPreviewHasPodroll(nextChrome?.hasPodroll === true);
    setPreviewHasFunding(nextChrome?.hasFunding === true);
    setTracksAdded([]);
    setTracksUnadded([]);
    setAlbumsAdded([]);
    setAlbumsUnadded([]);
    setIsSubscribed(resolveInitialSubscribed(artistId, previewIsSubscribed));
  }, [artistId, previewIsSubscribed]);

  useEffect(() => {
    let isMounted = true;
    setIsSectionHydrated(false);
    void (async () => {
      const prefs = await readArtistDetailPrefs(artistId);
      if (!isMounted) {
        return;
      }
      setSection(prefs.tab);
      setIsSectionHydrated(true);
    })();
    return () => {
      isMounted = false;
    };
  }, [artistId]);

  useEffect(() => {
    let isMounted = true;
    void subscriptionsRepository.getByIdText(artistId).then((stored) => {
      if (!isMounted || stored === null) {
        return;
      }
      setArtistTitle(stored.title);
      setArtistArtwork(stored.imageUrl);
    });
    return () => {
      isMounted = false;
    };
  }, [artistId]);

  useEffect(() => {
    let isMounted = true;
    void subscriptionsRepository.isSubscribed(artistId).then((subscribed) => {
      if (isMounted) {
        setIsSubscribed(subscribed);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [artistId]);

  const loadRows = useCallback(
    async ({ source }: { source: 'initial' | 'refresh' | 'retry' }): Promise<void> => {
      if (source === 'refresh') {
        setIsRowsRefreshing(true);
      } else {
        setIsRowsLoading(true);
      }
      setRowsErrorKey(null);
      setIsChannelLoading(true);

      try {
        if (offlineModeEnabled) {
          const local = await subscriptionsRepository.getByIdText(artistId);
          const storedTracks = await channelItemsRepository.listByChannel(artistId, {
            sort: 'recent',
          });

          setChannel(null);
          setArtistTitle(local?.title ?? null);
          setArtistArtwork(local?.imageUrl ?? null);
          setTracksAdded(storedTracks);
          setTracksUnadded([]);
          setAlbumsAdded([]);
          setAlbumsUnadded([]);
          return;
        }

        const response = await requestWithMobileAuthRefresh(authContext, async (api) =>
          api.reqPublisherFeedGetRemoteItemsForChannel(artistId)
        );

        setChannel(response.channel);
        setArtistTitle(response.channel.title);
        setArtistArtwork(primaryChannelListArtworkUrl(response.channel.channel_images));
        setTracksAdded(response.itemsAdded);
        setTracksUnadded(response.itemsUnadded);
        setAlbumsAdded(response.channelsAdded);
        setAlbumsUnadded(response.channelsUnadded);
        const hasPodroll = channelHasPodroll(response.channel);
        const hasFunding = channelHasFunding(response.channel);
        setPreviewHasPodroll(hasPodroll);
        setPreviewHasFunding(hasFunding);
        void sectionChromeFlagsRepository.mergeChannel(artistId, { hasFunding, hasPodroll });
      } catch {
        setRowsErrorKey('errors.generic');
      } finally {
        setIsRowsLoading(false);
        setIsRowsRefreshing(false);
        setIsChannelLoading(false);
      }
    },
    [artistId, authContext, offlineModeEnabled]
  );

  useEffect(() => {
    void loadRows({ source: 'initial' });
  }, [loadRows]);

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
          api.reqPodrollGetForChannel(artistId)
        );
        setPodrollRows(toPodrollEntries(response));
      } catch {
        setPodrollErrorKey('errors.generic');
        setPodrollRows([]);
      } finally {
        setIsPodrollLoading(false);
        setIsPodrollRefreshing(false);
      }
    },
    [artistId, authContext]
  );

  useEffect(() => {
    if (!isSectionHydrated || section !== 'podroll' || offlineModeEnabled) {
      return;
    }
    void loadPodroll({ source: 'initial' });
  }, [isSectionHydrated, loadPodroll, offlineModeEnabled, section]);

  const availableSections = useMemo<ArtistTab[]>(() => {
    // Albums and About are always offered (same idea as podcast Episodes / About): an empty
    // albums list is a real answer. Hiding Albums until the publisher-feed request returns makes
    // the screen fall back to About and stay there after albums arrive.
    const hasTracks = tracksAdded.length > 0 || tracksUnadded.length > 0;
    const hasPodroll = channel !== null ? channelHasPodroll(channel) : previewHasPodroll;
    const hasFunding = channel !== null ? channelHasFunding(channel) : previewHasFunding;

    const tabs: ArtistTab[] = ['albums'];
    if (hasTracks) {
      tabs.push('tracks');
    }
    tabs.push('about');
    if (hasPodroll) {
      tabs.push('podroll');
    }
    if (isSignedIn) {
      tabs.push('settings');
    }
    if (hasFunding) {
      tabs.push('funding');
    }
    return tabs;
  }, [
    channel,
    isSignedIn,
    previewHasFunding,
    previewHasPodroll,
    tracksAdded.length,
    tracksUnadded.length,
  ]);

  useEffect(() => {
    if (availableSections.length === 0) {
      return;
    }
    if (availableSections.includes(section)) {
      return;
    }
    const nextSection = availableSections[0];
    if (nextSection === undefined) {
      return;
    }
    setSection(nextSection);
  }, [availableSections, section]);

  const sectionChips = useMemo<SectionChipItem<ArtistTab>[]>(
    () =>
      availableSections.map((entry) => ({
        key: entry,
        label: t(SECTION_LABEL_KEYS[entry]),
        testID: `artist-detail-section-${entry}`,
      })),
    [availableSections, t]
  );

  const handleSectionSelect = useCallback(
    (next: ArtistTab) => {
      setSection(next);
      void writeArtistDetailTab(artistId, next);
    },
    [artistId]
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
          idText: artistId,
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
            api.reqAccountFollowChannel({ channel_id_text: artistId })
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
    artistId,
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
    shareResolvedUrl(buildPublicShareUrl('artist', artistId));
  }, [artistId]);

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
              testID="artist-detail-boost"
            />
          ) : null}
          <HeaderBarAction
            accessibilityLabel={t(
              notificationsEnabled
                ? 'features.notifications.disable_notifications_for_this_artist'
                : 'features.notifications.enable_notifications_for_this_artist'
            )}
            icon={notificationsEnabled ? 'notifications' : 'notifications-off-outline'}
            onPress={() => {
              void toggleNotifications();
            }}
            testID="artist-detail-notifications-toggle"
          />
          <HeaderBarAction
            accessibilityLabel={t('features.share')}
            icon="share-outline"
            onPress={handleShare}
            testID="artist-detail-share"
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

  const openExternalUrl = useCallback(async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch {
      // Optional convenience links only.
    }
  }, []);

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

  const handleRetryRows = useCallback(() => {
    void loadRows({ source: 'retry' });
  }, [loadRows]);

  const handleRefreshRows = useCallback(() => {
    void loadRows({ source: 'refresh' });
  }, [loadRows]);

  const handleRetryPodroll = useCallback(() => {
    void loadPodroll({ source: 'retry' });
  }, [loadPodroll]);

  const handleRefreshPodroll = useCallback(() => {
    void loadRows({ source: 'refresh' });
    void loadPodroll({ source: 'refresh' });
  }, [loadPodroll, loadRows]);

  const handleOpenAddedAlbum = useCallback(
    (row: DTOChannel) => {
      navigation.navigate(
        CHANNEL_BROWSE_STACK_ROUTES.AlbumDetail,
        buildAlbumDetailParams({
          albumId: row.id_text,
          previewImageUrl: primaryChannelListArtworkUrl(row.channel_images),
          previewTitle: row.title,
        })
      );
    },
    [navigation]
  );

  const handleOpenUnaddedAlbum = useCallback(
    (row: ArtistAlbumUnadded) => {
      const target = unparsedPodcastIndexFeedTarget(row);
      if (target === null) {
        return;
      }
      navigation.navigate(CHANNEL_BROWSE_STACK_ROUTES.SearchResultDetail, {
        author: target.author,
        description: target.description,
        feedUrl: target.feedUrl,
        imageUrl: target.imageUrl,
        resultId: target.podcastIndexId,
        title: target.title,
      });
    },
    [navigation]
  );

  const handlePodrollPress = useCallback(
    (item: PodrollEntry) => {
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
    },
    [navigation]
  );

  const handleSubscriptionTogglePress = useCallback(() => {
    void handleSubscriptionToggle();
  }, [handleSubscriptionToggle]);

  const channelArtworkUri = primaryChannelListArtworkUrl(channel?.channel_images) ?? artistArtwork;
  const channelViewerUri =
    primaryChannelLightboxArtworkUrl(channel?.channel_images) ?? channelArtworkUri;
  const title = channel?.title ?? artistTitle ?? t('media.music.artist');
  const subtitle = channel?.channel_about?.author ?? null;

  const channelHeader = (
    <ChannelHeader
      actions={
        <View style={styles.channelActions}>
          <View style={styles.subscribeButtonRow}>
            <Button
              label={t(isSubscribed ? 'features.unsubscribe' : 'features.subscribe')}
              loading={isSavingSubscription}
              onPress={handleSubscriptionTogglePress}
              size="sm"
              testID="artist-detail-subscribe-toggle"
              variant="outline"
            />
          </View>
        </View>
      }
      artworkUri={channelArtworkUri}
      notice={subscriptionNoticeKey === null ? null : t(subscriptionNoticeKey)}
      subtitle={subtitle}
      testID="artist-detail-header"
      title={title}
      viewerUri={channelViewerUri}
    />
  );

  const tracksRows = useMemo<ArtistTracksRow[]>(() => {
    const addedRows: ArtistTracksRow[] = [];
    for (const item of tracksAdded) {
      const compact = mapItemToHomeFeedRow(item, { compact: true });
      const row = {
        ...compact,
        channelId: compact.channelId ?? artistId,
        channelKind: compact.channelKind ?? 'artists',
        subtitle: titleRef.current,
      };
      if (row.id.length === 0) {
        continue;
      }
      addedRows.push({
        item,
        key: `added-${row.id}`,
        kind: 'added',
        row,
      });
    }

    const unaddedRows = tracksUnadded.map((row) => ({
      key: `unadded-${row.guid}`,
      kind: 'unadded' as const,
      row,
    }));

    return [...addedRows, ...unaddedRows];
  }, [artistId, tracksAdded, tracksUnadded]);

  const albumsRows = useMemo<ArtistAlbumsRow[]>(() => {
    const addedRows = albumsAdded.map((row) => ({
      key: `added-${row.id_text}`,
      kind: 'added' as const,
      row,
    }));
    const unaddedRows = albumsUnadded.map((row) => ({
      key: `unadded-${row.id}`,
      kind: 'unadded' as const,
      row,
    }));
    return [...addedRows, ...unaddedRows];
  }, [albumsAdded, albumsUnadded]);

  const tracksCount = tracksRows.length;

  const tracksEmpty = useMemo(
    () =>
      isRowsLoading ? (
        <LoadingSection testID="artist-detail-tracks-loading" />
      ) : rowsErrorKey !== null ? (
        <ListError
          messageKey={rowsErrorKey}
          onRetry={handleRetryRows}
          testID="artist-detail-tracks-error"
        />
      ) : (
        <ListEmpty messageKey="misc.info" testID="artist-detail-tracks-empty" />
      ),
    [handleRetryRows, isRowsLoading, rowsErrorKey]
  );

  const tracksFooter = useMemo(
    () =>
      playbackNoticeKey !== null ? <Text style={styles.notice}>{t(playbackNoticeKey)}</Text> : null,
    [playbackNoticeKey, styles.notice, t]
  );

  const rowsRefreshControl = useMemo(
    () => (
      <RefreshControl
        onRefresh={handleRefreshRows}
        refreshing={isRowsRefreshing}
        tintColor={themeStyles.buttonPrimary.backgroundColor}
      />
    ),
    [handleRefreshRows, isRowsRefreshing, themeStyles.buttonPrimary.backgroundColor]
  );

  const renderTracksItem = useCallback(
    ({ index, item }: { index: number; item: ArtistTracksRow }) => {
      if (item.kind === 'added') {
        return (
          <ArtistAddedTrackRow
            index={index}
            isLast={index === tracksCount - 1}
            item={item.item}
            onGoToChannel={handleGoToChannel}
            onGoToTrack={handleGoToTrack}
            onPlay={handlePlayTrack}
            onQueue={handleQueueTrack}
            row={item.row}
          />
        );
      }

      return <ArtistUnaddedTrackRow index={index} onOpenUrl={openExternalUrl} row={item.row} />;
    },
    [
      handleGoToChannel,
      handleGoToTrack,
      handlePlayTrack,
      handleQueueTrack,
      openExternalUrl,
      tracksCount,
    ]
  );

  const albumsEmpty = useMemo(
    () =>
      isRowsLoading ? (
        <LoadingSection testID="artist-detail-albums-loading" />
      ) : rowsErrorKey !== null ? (
        <ListError
          messageKey={rowsErrorKey}
          onRetry={handleRetryRows}
          testID="artist-detail-albums-error"
        />
      ) : offlineModeEnabled ? (
        <ListEmpty
          messageKey={OFFLINE_UNAVAILABLE_MESSAGE_KEY}
          testID="artist-detail-albums-offline-unavailable"
        />
      ) : (
        <ListEmpty messageKey="misc.info" testID="artist-detail-albums-empty" />
      ),
    [handleRetryRows, isRowsLoading, offlineModeEnabled, rowsErrorKey]
  );

  const renderAlbumsItem = useCallback(
    ({ index, item }: { index: number; item: ArtistAlbumsRow }) => {
      if (item.kind === 'added') {
        return <ArtistAddedAlbumRow index={index} onPress={handleOpenAddedAlbum} row={item.row} />;
      }

      return (
        <ArtistUnaddedAlbumRow index={index} onPress={handleOpenUnaddedAlbum} row={item.row} />
      );
    },
    [handleOpenAddedAlbum, handleOpenUnaddedAlbum]
  );

  const podrollEmpty = useMemo(
    () =>
      isPodrollLoading ? (
        <LoadingSection testID="artist-detail-podroll-loading" />
      ) : podrollErrorKey !== null ? (
        <ListError
          messageKey={podrollErrorKey}
          onRetry={handleRetryPodroll}
          testID="artist-detail-podroll-error"
        />
      ) : (
        <ListEmpty messageKey="info.no_podroll_found" testID="artist-detail-podroll-empty" />
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

  const renderPodrollItem = useCallback(
    ({ index, item }: { index: number; item: PodrollEntry }) => (
      <ArtistPodrollRow index={index} item={item} onPress={handlePodrollPress} />
    ),
    [handlePodrollPress]
  );

  const tracksBody = (
    <FillList
      ListEmptyComponent={tracksEmpty}
      ListFooterComponent={tracksFooter}
      contentContainerStyle={styles.listContent}
      data={tracksRows}
      keyExtractor={artistTracksKeyExtractor}
      refreshControl={rowsRefreshControl}
      renderItem={renderTracksItem}
      style={styles.list}
      testID="artist-detail-tracks-list"
    />
  );

  const albumsBody = (
    <FillList
      ListEmptyComponent={albumsEmpty}
      contentContainerStyle={styles.listContent}
      data={albumsRows}
      keyExtractor={artistAlbumsKeyExtractor}
      refreshControl={rowsRefreshControl}
      renderItem={renderAlbumsItem}
      style={styles.list}
      testID="artist-detail-albums-list"
    />
  );

  const aboutBody = (
    <ChannelAboutSection
      channel={channel}
      isChannelLoading={isChannelLoading}
      testIDPrefix="artist-detail"
    />
  );

  const fundingBody = (
    <FundingLinksSection
      fundings={channel?.channel_fundings ?? []}
      isLoading={isChannelLoading && channel === null}
      testIDPrefix="artist-detail"
    />
  );

  const podrollBody = offlineModeEnabled ? (
    <ListEmpty
      messageKey={OFFLINE_UNAVAILABLE_MESSAGE_KEY}
      testID="artist-detail-podroll-offline"
    />
  ) : (
    <FillList
      ListEmptyComponent={podrollEmpty}
      contentContainerStyle={styles.listContent}
      data={podrollRows}
      keyExtractor={artistPodrollKeyExtractor}
      refreshControl={podrollRefreshControl}
      renderItem={renderPodrollItem}
      style={styles.list}
      testID="artist-detail-podroll-list"
    />
  );

  const settingsBody = (
    <View style={styles.settingsCard} testID="artist-detail-settings">
      <Text style={styles.settingsHeading}>{t('settings.notifications.notifications')}</Text>
      <ListRow
        testID="artist-detail-settings-notifications"
        title={t('features.notifications.enable_notifications_for_this_artist')}
        trailing={
          <Switch
            accessibilityLabel={t('features.notifications.enable_notifications_for_this_artist')}
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
      <Text style={styles.notice} testID="artist-detail-settings-auto-download-notice">
        {t('features.download.auto_download_unavailable')}
      </Text>
    </View>
  );

  const sectionBody =
    section === 'albums'
      ? albumsBody
      : section === 'tracks'
        ? tracksBody
        : section === 'about'
          ? aboutBody
          : section === 'podroll'
            ? podrollBody
            : section === 'funding'
              ? fundingBody
              : settingsBody;

  return (
    <>
      <ChannelDetailShell
        channelHeader={channelHeader}
        isSectionHydrated={isSectionHydrated}
        loadingTestID="artist-detail-section-loading"
        onSelectSection={handleSectionSelect}
        sectionBody={sectionBody}
        sectionChips={sectionChips}
        sectionsTestID="artist-detail-sections"
        selectedSection={section}
        testID="artist-detail-screen"
      />
      {boostSheet}
    </>
  );
}
