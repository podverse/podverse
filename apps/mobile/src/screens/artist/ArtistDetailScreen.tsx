import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshControl, StyleSheet, Text, View } from 'react-native';

import type { DTOChannel, DTOItem, DTORemoteChannelStub } from '@podverse/helpers';
import { primaryChannelLightboxArtworkUrl, primaryChannelListArtworkUrl } from '@podverse/helpers';
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
import { HelperNote } from '../../components/feedback/HelperNote';
import type { SectionChipItem } from '../../components/form';
import { CoverImage, FillList, ListRow } from '../../components/primitives';
import { Button } from '../../components/primitives/Button';
import { HeaderBarAction } from '../../components/screen/HeaderBarAction';
import { HeaderBarActions } from '../../components/screen/HeaderBarActions';
import { SectionHeading } from '../../components/section/SectionHeading';
import { ListEmpty } from '../../components/state/ListEmpty';
import { ListError } from '../../components/state/ListError';
import { LoadingSection } from '../../components/state/LoadingSection';
import { channelItemsRepository } from '../../data/repositories/channelItemsRepository';
import { sectionChromeFlagsRepository } from '../../data/repositories/sectionChromeFlagsRepository';
import { mapDirectoryChannelToSubscribed } from '../../data/repositories/subscriptionsMerge';
import { subscriptionsRepository } from '../../data/repositories/subscriptionsRepository';
import { useChannelNotifications } from '../../hooks/useChannelNotifications';
import { useFirstSubscribePushPrompt } from '../../hooks/useFirstSubscribePushPrompt';
import { useOpenRemoteItemListEntry } from '../../hooks/useOpenRemoteItemListEntry';
import { resolveSupportedLocale } from '../../i18n/locale';
import { resolveInitialSubscribed } from '../../lib/channelActionChrome';
import { homeFeedRefresh } from '../../lib/home/homeFeedRefresh';
import { replaceScreenIfMerged } from '../../lib/mergeRedirectNavigation';
import { OFFLINE_UNAVAILABLE_MESSAGE_KEY } from '../../lib/offlineModeViews';
import type { RemoteItemListEntry } from '../../lib/remoteItems/remoteItemListEntries';
import {
  remoteChannelStubKey,
  toRemoteChannelStubEntry,
  toRemoteItemListEntries,
} from '../../lib/remoteItems/remoteItemListEntries';
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
import type { ArtistTab } from '../../prefs/detailListPrefs';
import { DEFAULT_ARTIST_TAB } from '../../prefs/detailListPrefs';
import { useOfflineMode } from '../../prefs/offlineMode';
import { LIST_ROW_ARTWORK_SIZE } from '../../theme/screenLayout';
import { useTheme } from '../../theme/useTheme';
import type { ThemedStylesTheme } from '../../theme/useThemedStyles';
import { useThemedStyles } from '../../theme/useThemedStyles';
import type { HomeFeedRowData } from '../home/homeFeedData';
import { mapTrackToHomeFeedRow } from '../home/homeFeedData';
import { HomeFeedRow } from '../home/HomeFeedRow';
import type { QueueActionPosition } from '../home/useHomeRowPlayback';
import { useHomeRowPlayback } from '../home/useHomeRowPlayback';
import { channelHasFunding, channelHasPeople, channelHasPodroll } from '../podcast/podcastSections';
import type { ArtistAlbumSectionRow, ArtistDetailSectionRow } from './artistDetailSections';
import { buildArtistAlbumSectionRows, buildArtistTrackSectionRows } from './artistDetailSections';
import {
  ArtistYourAddByRssAlbumsSection,
  useArtistYourAddByRssAlbums,
} from './ArtistYourAddByRssAlbumsSection';
import {
  ArtistYourAddByRssTracksSection,
  useArtistYourAddByRssTracks,
} from './ArtistYourAddByRssTracksSection';
import { useArtistUnsubscribe } from './useArtistUnsubscribe';

/** Artwork sizing only, so it does not depend on the theme. */
const albumCoverStyles = StyleSheet.create({
  image: {
    height: LIST_ROW_ARTWORK_SIZE,
    width: LIST_ROW_ARTWORK_SIZE,
  },
});

/** Content rows draw a top hairline, including the first row. */
const createContentListRowStyles = ({ styles: themeStyles }: ThemedStylesTheme) => ({
  row: {
    borderTopColor: themeStyles.border.borderColor,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});

type ArtistDetailScreenProps = NativeStackScreenProps<ChannelBrowseStackParamList, 'ArtistDetail'>;

type ArtistAlbumUnadded = DTORemoteChannelStub;

const SECTION_LABEL_KEYS: Record<ArtistTab, string> = {
  about: 'info.about',
  albums: 'media.music.albums',
  funding: 'info.funding',
  people: 'info.people.people',
  podroll: 'info.podroll',
  tracks: 'media.music.tracks',
};

const artistTracksKeyExtractor = (row: ArtistDetailSectionRow<DTOItem>): string => row.key;
const artistAlbumsKeyExtractor = (
  row: ArtistAlbumSectionRow<DTOChannel, ArtistAlbumUnadded>
): string => row.key;
const artistPodrollKeyExtractor = (row: RemoteItemListEntry): string => row.key;

function ArtistAddedTrackRow({
  index,
  item,
  onGoToChannel,
  onGoToTrack,
  onPlay,
  onQueue,
  row,
}: {
  index: number;
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
      mediaType="tracks"
      onGoToChannelPress={onGoToChannel}
      onGoToTrackPress={onGoToTrack}
      onPlayPress={onPlay}
      onPress={onPlay}
      onQueuePress={onQueue}
      row={row}
      showChannelContext={false}
      showContextLine
      testID={`artist-track-row-${index}`}
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
  const styles = useThemedStyles(createContentListRowStyles);
  const handlePress = useCallback(() => {
    onPress(row);
  }, [onPress, row]);

  const imageUrl = primaryChannelListArtworkUrl(row.channel_images);

  return (
    <View style={styles.row}>
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
    </View>
  );
}

export function ArtistDetailScreen({ navigation, route }: ArtistDetailScreenProps) {
  const { t, i18n } = useTranslation();
  const { styles: themeStyles, tokens } = useTheme();
  const { accessToken, account, clearSession, refreshToken, setTokens, status } = useAuth();
  const {
    askIfNeeded,
    applyAfterFollow,
    dialog: firstSubscribePushDialog,
  } = useFirstSubscribePushPrompt();
  const { enabled: offlineModeEnabled } = useOfflineMode();
  const {
    artistId,
    previewImageUrl,
    previewIsSubscribed,
    previewNotificationsEnabled,
    previewTitle,
  } = route.params;
  const addByRssAlbums = useArtistYourAddByRssAlbums(artistId);
  const addByRssTracks = useArtistYourAddByRssTracks(artistId);
  const { evaluateFeature, isTierKnown } = useAccessTier();
  const { handleGateError, openGate } = useMembershipGate();
  const { playbackNoticeKey, runPlayAction, runQueueAction } = useHomeRowPlayback();
  const { boostSheet, openBoost } = useBoostSheet();
  const { artistUnsubscribeDialog, unsubscribeArtist } = useArtistUnsubscribe();
  const cachedChrome = getCachedChannelSectionFlags(artistId);
  const [channel, setChannel] = useState<DTOChannel | null>(null);
  const [isChannelLoading, setIsChannelLoading] = useState<boolean>(true);
  const [previewHasPodroll, setPreviewHasPodroll] = useState<boolean>(
    cachedChrome?.hasPodroll === true
  );
  const [previewHasFunding, setPreviewHasFunding] = useState<boolean>(
    cachedChrome?.hasFunding === true
  );
  const [previewHasPeople, setPreviewHasPeople] = useState<boolean>(
    cachedChrome?.hasPeople === true
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
  const isSectionHydrated = true;
  const [section, setSection] = useState<ArtistTab>(DEFAULT_ARTIST_TAB);
  const [settingsOpen, setSettingsOpen] = useState<boolean>(false);
  const [tracksAdded, setTracksAdded] = useState<DTOItem[]>([]);
  const [albumsAdded, setAlbumsAdded] = useState<DTOChannel[]>([]);
  const [albumsUnadded, setAlbumsUnadded] = useState<ArtistAlbumUnadded[]>([]);
  const [isRowsLoading, setIsRowsLoading] = useState<boolean>(true);
  const [isRowsRefreshing, setIsRowsRefreshing] = useState<boolean>(false);
  const [rowsErrorKey, setRowsErrorKey] = useState<string | null>(null);
  const [podrollRows, setPodrollRows] = useState<RemoteItemListEntry[]>([]);
  const [podrollErrorKey, setPodrollErrorKey] = useState<string | null>(null);
  const [isPodrollLoading, setIsPodrollLoading] = useState<boolean>(false);
  const [isPodrollRefreshing, setIsPodrollRefreshing] = useState<boolean>(false);

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
        notYetAddedHeading: {
          marginTop: tokens.spacing.lg,
        },
        notYetAddedNote: {
          marginBottom: tokens.spacing.base,
          marginTop: tokens.spacing.base,
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
    setPreviewHasPeople(nextChrome?.hasPeople === true);
    setTracksAdded([]);
    setAlbumsAdded([]);
    setAlbumsUnadded([]);
    setIsRowsLoading(true);
    setIsSubscribed(resolveInitialSubscribed(artistId, previewIsSubscribed));
  }, [artistId, previewIsSubscribed]);

  useEffect(() => {
    setSection(DEFAULT_ARTIST_TAB);
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
        setAlbumsAdded(response.channelsAdded);
        setAlbumsUnadded(response.channelsUnadded);
        const hasPodroll = channelHasPodroll(response.channel);
        const hasFunding = channelHasFunding(response.channel);
        const hasPeople = channelHasPeople(response.channel);
        setPreviewHasPodroll(hasPodroll);
        setPreviewHasFunding(hasFunding);
        setPreviewHasPeople(hasPeople);
        void sectionChromeFlagsRepository.mergeChannel(artistId, {
          hasFunding,
          hasPeople,
          hasPodroll,
        });
      } catch (error) {
        const replaced = await replaceScreenIfMerged({
          currentIdText: artistId,
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
        if (!replaced) {
          setRowsErrorKey('errors.generic');
        }
      } finally {
        setIsRowsLoading(false);
        setIsRowsRefreshing(false);
        setIsChannelLoading(false);
      }
    },
    [artistId, authContext, navigation, offlineModeEnabled]
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
        setPodrollRows(toRemoteItemListEntries(response));
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
    // Albums, Tracks, and About are always offered. An empty albums or tracks list is a real
    // answer, so Tracks stays in the row while the publisher-feed request is still out.
    const hasPodroll = channel !== null ? channelHasPodroll(channel) : previewHasPodroll;
    const hasFunding = channel !== null ? channelHasFunding(channel) : previewHasFunding;
    const hasPeople = channel !== null ? channelHasPeople(channel) : previewHasPeople;

    const tabs: ArtistTab[] = ['albums', 'tracks', 'about'];
    if (hasPodroll) {
      tabs.push('podroll');
    }
    if (hasFunding) {
      tabs.push('funding');
    }
    if (hasPeople) {
      tabs.push('people');
    }
    return tabs;
  }, [channel, previewHasFunding, previewHasPeople, previewHasPodroll]);

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

  const handleSectionSelect = useCallback((next: ArtistTab) => {
    setSettingsOpen(false);
    setSection(next);
  }, []);

  const handleSettingsPress = useCallback(() => {
    setSettingsOpen((open) => !open);
  }, []);

  const slotAllowed = !isRowsLoading && rowsErrorKey === null;
  const showDirectoryAlbums = slotAllowed && !offlineModeEnabled;

  const handleSubscriptionToggle = useCallback(async () => {
    if (isSavingSubscription) {
      return;
    }

    setSubscriptionNoticeKey(null);

    if (isSubscribed) {
      setIsSavingSubscription(true);
      try {
        const result = await unsubscribeArtist({
          idText: artistId,
          source: 'directory',
          title:
            artistTitle !== null && artistTitle.length > 0 ? artistTitle : (channel?.title ?? ''),
          verifiedAlbumIdTexts: showDirectoryAlbums
            ? albumsAdded
                .filter((album) => album.id_text.trim().length > 0)
                .map((album) => album.id_text)
            : undefined,
        });
        if (result.status === 'cancelled') {
          return;
        }
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
            api.reqAccountFollowChannel({ channel_id_text: artistId })
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
            channelIdText: artistId,
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
    albumsAdded,
    applyAfterFollow,
    askIfNeeded,
    artistId,
    artistTitle,
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
    showDirectoryAlbums,
    unsubscribeArtist,
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
        <HeaderBarActions>
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
            accessibilityLabel={t('features.share')}
            icon="share-outline"
            onPress={handleShare}
            testID="artist-detail-share"
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

  const handleOpenRemoteEntry = useOpenRemoteItemListEntry();

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
        <Button
          label={t(isSubscribed ? 'features.unsubscribe' : 'features.subscribe')}
          loading={isSavingSubscription}
          onPress={handleSubscriptionTogglePress}
          size="sm"
          testID="artist-detail-subscribe-toggle"
          variant="outline"
        />
      }
      artworkUri={channelArtworkUri}
      notice={subscriptionNoticeKey === null ? null : t(subscriptionNoticeKey)}
      notifications={{
        accessibilityLabel: t(
          notificationsEnabled
            ? 'features.notifications.disable_notifications_for_this_artist'
            : 'features.notifications.enable_notifications_for_this_artist'
        ),
        enabled: notificationsEnabled,
        onPress: () => {
          void toggleNotifications();
        },
        testID: 'artist-detail-notifications-toggle',
      }}
      settings={{
        accessibilityLabel: t('settings.settings'),
        onPress: handleSettingsPress,
        selected: settingsOpen,
        testID: 'artist-detail-header-settings',
      }}
      subtitle={subtitle}
      testID="artist-detail-header"
      title={title}
      viewerUri={channelViewerUri}
    />
  );

  const trackSectionRows = useMemo(
    () =>
      buildArtistTrackSectionRows({
        includeAddByRssSlot: slotAllowed && !addByRssTracks.isEmpty,
        trackKey: (item) => `track-${item.id_text}`,
        tracks: slotAllowed ? tracksAdded.filter((item) => item.id_text.trim().length > 0) : [],
      }),
    [addByRssTracks.isEmpty, slotAllowed, tracksAdded]
  );

  const albumSectionRows = useMemo(
    () =>
      buildArtistAlbumSectionRows({
        includeAddByRssSlot: slotAllowed && !addByRssAlbums.isEmpty,
        notYetAdded: showDirectoryAlbums ? albumsUnadded : [],
        notYetAddedKey: (row) => `not-yet-added-${remoteChannelStubKey(row)}`,
        verified: showDirectoryAlbums
          ? albumsAdded.filter((row) => row.id_text.trim().length > 0)
          : [],
        verifiedKey: (row) => `verified-${row.id_text}`,
      }),
    [addByRssAlbums.isEmpty, albumsAdded, albumsUnadded, showDirectoryAlbums, slotAllowed]
  );

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
        <ListEmpty messageKey="media.music.no_tracks_found" testID="artist-detail-tracks-empty" />
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
    ({ item }: { index: number; item: ArtistDetailSectionRow<DTOItem> }) => {
      if (item.kind === 'track') {
        return (
          <ArtistAddedTrackRow
            index={item.sectionIndex}
            item={item.row}
            onGoToChannel={handleGoToChannel}
            onGoToTrack={handleGoToTrack}
            onPlay={handlePlayTrack}
            onQueue={handleQueueTrack}
            row={mapTrackToHomeFeedRow(item.row)}
          />
        );
      }
      if (item.kind === 'add-by-rss-tracks-slot') {
        return <ArtistYourAddByRssTracksSection artistId={artistId} />;
      }
      return null;
    },
    [artistId, handleGoToChannel, handleGoToTrack, handlePlayTrack, handleQueueTrack]
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
        <ListEmpty messageKey="media.music.no_albums_found" testID="artist-detail-albums-empty" />
      ),
    [handleRetryRows, isRowsLoading, offlineModeEnabled, rowsErrorKey]
  );

  const untitledLabel = t('misc.untitled');

  const renderAlbumsItem = useCallback(
    ({ item }: { index: number; item: ArtistAlbumSectionRow<DTOChannel, ArtistAlbumUnadded> }) => {
      if (item.kind === 'verified-heading') {
        return (
          <SectionHeading testID="artist-albums-verified-heading">
            {t('media.music.verified_albums')}
          </SectionHeading>
        );
      }
      if (item.kind === 'verified') {
        return (
          <ArtistAddedAlbumRow
            index={item.sectionIndex}
            onPress={handleOpenAddedAlbum}
            row={item.row}
          />
        );
      }
      if (item.kind === 'add-by-rss-slot') {
        return <ArtistYourAddByRssAlbumsSection artistId={artistId} />;
      }
      if (item.kind === 'not-yet-added-heading') {
        return (
          <SectionHeading
            style={styles.notYetAddedHeading}
            testID="artist-albums-not-yet-added-heading"
          >
            {t('media.music.not_yet_added')}
          </SectionHeading>
        );
      }
      if (item.kind === 'not-yet-added-note') {
        return (
          <View style={styles.notYetAddedNote}>
            <HelperNote
              message={t('media.music.not_yet_added_albums_note')}
              scale="reading"
              testID="artist-albums-not-yet-added-note"
            />
          </View>
        );
      }
      return (
        <RemoteItemListRow
          entry={toRemoteChannelStubEntry(item.row)}
          onPress={handleOpenRemoteEntry}
          testID={`artist-album-unadded-row-${item.sectionIndex}`}
          untitledLabel={untitledLabel}
        />
      );
    },
    [
      artistId,
      handleOpenAddedAlbum,
      handleOpenRemoteEntry,
      styles.notYetAddedHeading,
      styles.notYetAddedNote,
      t,
      untitledLabel,
    ]
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
    ({ index, item }: { index: number; item: RemoteItemListEntry }) => (
      <RemoteItemListRow
        entry={item}
        onPress={handleOpenRemoteEntry}
        testID={`artist-podroll-row-${index}`}
        untitledLabel={untitledLabel}
      />
    ),
    [handleOpenRemoteEntry, untitledLabel]
  );

  const tracksBody = (
    <FillList
      ListEmptyComponent={tracksEmpty}
      ListFooterComponent={tracksFooter}
      contentContainerStyle={styles.listContent}
      data={trackSectionRows}
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
      data={albumSectionRows}
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

  const peopleBody = (
    <PeoplePane
      isLoading={isChannelLoading && channel === null}
      people={(channel?.channel_persons ?? []).map(toAboutPersonFromChannel)}
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
    <ChannelSettingsPane
      channel={channel}
      notifications={notifications}
      testIDPrefix="artist-detail"
    />
  );

  const sectionListBody =
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
              : peopleBody;
  const sectionBody = settingsOpen ? settingsBody : sectionListBody;

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
        selectedSection={settingsOpen ? null : section}
        testID="artist-detail-screen"
      />
      {boostSheet}
      {artistUnsubscribeDialog}
      {firstSubscribePushDialog}
    </>
  );
}
