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
  primaryChannelLightboxArtworkUrl,
  primaryChannelListArtworkUrl,
  primaryListArtworkUrl,
} from '@podverse/helpers';

import { requestWithMobileAuthRefresh } from '../../auth';
import { useAuth } from '../../auth/AuthProvider';
import { ChannelDetailShell, ChannelHeader } from '../../components/channel';
import type { SectionChipItem } from '../../components/form';
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
import {
  buildAlbumDetailParams,
  buildPodcastDetailParams,
  CHANNEL_BROWSE_STACK_ROUTES,
} from '../../navigation';
import type { ArtistTab } from '../../prefs/detailListPrefs';
import {
  DEFAULT_ARTIST_TAB,
  readArtistDetailPrefs,
  writeArtistDetailTab,
} from '../../prefs/detailListPrefs';
import { useOfflineMode } from '../../prefs/offlineMode';
import { useTheme } from '../../theme/useTheme';
import type { HomeFeedRowData } from '../home/homeFeedData';
import { mapItemToHomeFeedRow } from '../home/homeFeedData';
import { HomeFeedRow } from '../home/HomeFeedRow';
import { useHomeRowPlayback } from '../home/useHomeRowPlayback';
import { channelHasPodroll } from '../podcast/podcastSections';

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
  podroll: 'info.podroll',
  settings: 'settings.settings',
  tracks: 'media.music.tracks',
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

export function ArtistDetailScreen({ navigation, route }: ArtistDetailScreenProps) {
  const { t } = useTranslation();
  const { styles: themeStyles, tokens } = useTheme();
  const { accessToken, clearSession, refreshToken, setTokens, status } = useAuth();
  const { enabled: offlineModeEnabled } = useOfflineMode();
  const { artistId } = route.params;
  const { evaluateFeature, isTierKnown } = useAccessTier();
  const { handleGateError, openGate } = useMembershipGate();
  const { playbackNoticeKey, runPlayAction, runQueueAction } = useHomeRowPlayback();
  const cachedChrome = getCachedChannelSectionFlags(artistId);
  const [channel, setChannel] = useState<DTOChannel | null>(null);
  const [isChannelLoading, setIsChannelLoading] = useState<boolean>(true);
  const [previewHasPodroll, setPreviewHasPodroll] = useState<boolean>(
    cachedChrome?.hasPodroll === true
  );
  const [artistTitle, setArtistTitle] = useState<string | null>(null);
  const [artistArtwork, setArtistArtwork] = useState<string | null>(null);
  const [isSubscribed, setIsSubscribed] = useState<boolean>(false);
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
  });

  const styles = useMemo(
    () =>
      StyleSheet.create({
        aboutText: {
          color: themeStyles.textPrimary.color,
          fontSize: 16,
          lineHeight: 24,
          paddingHorizontal: tokens.spacing.lg,
          paddingTop: tokens.spacing.md,
        },
        channelActions: {
          gap: tokens.spacing.sm,
        },
        channelActionRow: {
          alignItems: 'center',
          flexDirection: 'row',
          flexWrap: 'wrap',
          marginHorizontal: -tokens.spacing.sm,
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
    const nextChrome = getCachedChannelSectionFlags(artistId);
    setChannel(null);
    setIsChannelLoading(true);
    setPreviewHasPodroll(nextChrome?.hasPodroll === true);
    setTracksAdded([]);
    setTracksUnadded([]);
    setAlbumsAdded([]);
    setAlbumsUnadded([]);
    setArtistTitle(null);
    setArtistArtwork(null);
  }, [artistId]);

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
        setPreviewHasPodroll(hasPodroll);
        void sectionChromeFlagsRepository.mergeChannel(artistId, { hasPodroll });
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
    const hasAlbums = offlineModeEnabled || albumsAdded.length > 0 || albumsUnadded.length > 0;
    const hasTracks = tracksAdded.length > 0 || tracksUnadded.length > 0;
    const hasPodroll = channel !== null ? channelHasPodroll(channel) : previewHasPodroll;

    const tabs: ArtistTab[] = [];
    if (hasAlbums) {
      tabs.push('albums');
    }
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
    return tabs;
  }, [
    albumsAdded.length,
    albumsUnadded.length,
    channel,
    isSignedIn,
    offlineModeEnabled,
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

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={styles.headerActions}>
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
  }, [handleShare, navigation, notificationsEnabled, styles.headerActions, t, toggleNotifications]);

  const openExternalUrl = useCallback(async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch {
      // Optional convenience links only.
    }
  }, []);

  const channelArtworkUri = primaryChannelListArtworkUrl(channel?.channel_images) ?? artistArtwork;
  const channelViewerUri =
    primaryChannelLightboxArtworkUrl(channel?.channel_images) ?? channelArtworkUri;
  const title = channel?.title ?? artistTitle ?? t('media.music.artist');
  const subtitle = channel?.channel_about?.author ?? null;
  const feedUrl = channel?.feed?.url ?? null;
  const websiteUrl = channel?.channel_about?.website_link_url ?? null;
  const hasOutboundLinks =
    (feedUrl !== null && feedUrl.length > 0) || (websiteUrl !== null && websiteUrl.length > 0);

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
              testID="artist-detail-subscribe-toggle"
              variant="outline"
            />
          </View>
          {hasOutboundLinks ? (
            <View style={styles.channelActionRow}>
              {feedUrl !== null && feedUrl.length > 0 ? (
                <HeaderBarAction
                  accessibilityLabel={t('info.rss_feed')}
                  icon="logo-rss"
                  onPress={() => {
                    void openExternalUrl(feedUrl);
                  }}
                  testID="artist-detail-rss"
                />
              ) : null}
              {websiteUrl !== null && websiteUrl.length > 0 ? (
                <HeaderBarAction
                  accessibilityLabel={t('info.website')}
                  icon="globe-outline"
                  onPress={() => {
                    void openExternalUrl(websiteUrl);
                  }}
                  testID="artist-detail-website"
                />
              ) : null}
            </View>
          ) : null}
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
      const row = { ...mapItemToHomeFeedRow(item), subtitle: titleRef.current };
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
  }, [tracksAdded, tracksUnadded]);

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

  const tracksBody = (
    <FillList
      ListEmptyComponent={
        isRowsLoading ? (
          <LoadingSection testID="artist-detail-tracks-loading" />
        ) : rowsErrorKey !== null ? (
          <ListError
            messageKey={rowsErrorKey}
            onRetry={() => {
              void loadRows({ source: 'retry' });
            }}
            testID="artist-detail-tracks-error"
          />
        ) : (
          <ListEmpty messageKey="misc.info" testID="artist-detail-tracks-empty" />
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
      data={tracksRows}
      keyExtractor={(row) => row.key}
      refreshControl={
        <RefreshControl
          onRefresh={() => {
            void loadRows({ source: 'refresh' });
          }}
          refreshing={isRowsRefreshing}
          tintColor={themeStyles.buttonPrimary.backgroundColor}
        />
      }
      renderItem={({ index, item }) => {
        if (item.kind === 'added') {
          return (
            <HomeFeedRow
              download={{ item: item.item, testID: `artist-track-download-${index}` }}
              isLast={index === tracksRows.length - 1}
              mediaType="tracks"
              onPlayPress={(nextRow) => {
                runPlayAction(nextRow, 'tracks');
              }}
              onPress={(nextRow) => {
                navigation.navigate(CHANNEL_BROWSE_STACK_ROUTES.TrackDetail, {
                  trackId: nextRow.id,
                });
              }}
              onQueuePress={(nextRow, position) => {
                runQueueAction(nextRow, 'tracks', position);
              }}
              row={item.row}
              showChannelContext={false}
              testID={`artist-track-row-${index}`}
            />
          );
        }

        return (
          <ListRow
            onPress={(() => {
              const link = item.row.link;
              if (link === undefined || link === null || link.length === 0) {
                return undefined;
              }
              return () => {
                void openExternalUrl(link);
              };
            })()}
            subtitle={item.row.feedTitle ?? item.row.authorName ?? item.row.author ?? undefined}
            testID={`artist-track-unadded-row-${index}`}
            title={item.row.title ?? item.row.guid}
          />
        );
      }}
      style={{ backgroundColor: themeStyles.screen.backgroundColor }}
      testID="artist-detail-tracks-list"
    />
  );

  const albumsBody = (
    <FillList
      ListEmptyComponent={
        isRowsLoading ? (
          <LoadingSection testID="artist-detail-albums-loading" />
        ) : rowsErrorKey !== null ? (
          <ListError
            messageKey={rowsErrorKey}
            onRetry={() => {
              void loadRows({ source: 'retry' });
            }}
            testID="artist-detail-albums-error"
          />
        ) : offlineModeEnabled ? (
          <ListEmpty
            messageKey={OFFLINE_UNAVAILABLE_MESSAGE_KEY}
            testID="artist-detail-albums-offline-unavailable"
          />
        ) : (
          <ListEmpty messageKey="misc.info" testID="artist-detail-albums-empty" />
        )
      }
      contentContainerStyle={{
        paddingHorizontal: tokens.spacing.lg,
        paddingTop: tokens.spacing.md,
      }}
      data={albumsRows}
      keyExtractor={(row) => row.key}
      refreshControl={
        <RefreshControl
          onRefresh={() => {
            void loadRows({ source: 'refresh' });
          }}
          refreshing={isRowsRefreshing}
          tintColor={themeStyles.buttonPrimary.backgroundColor}
        />
      }
      renderItem={({ index, item }) => {
        if (item.kind === 'added') {
          return (
            <ListRow
              onPress={() => {
                navigation.navigate(
                  CHANNEL_BROWSE_STACK_ROUTES.AlbumDetail,
                  buildAlbumDetailParams({
                    albumId: item.row.id_text,
                    previewImageUrl: primaryChannelListArtworkUrl(item.row.channel_images),
                    previewTitle: item.row.title,
                  })
                );
              }}
              subtitle={item.row.channel_about?.author ?? undefined}
              testID={`artist-album-row-${index}`}
              title={item.row.title ?? item.row.id_text}
            />
          );
        }

        return (
          <ListRow
            onPress={
              item.row.url.length > 0
                ? () => {
                    void openExternalUrl(item.row.url);
                  }
                : undefined
            }
            subtitle={item.row.author ?? undefined}
            testID={`artist-album-unadded-row-${index}`}
            title={item.row.title}
          />
        );
      }}
      style={{ backgroundColor: themeStyles.screen.backgroundColor }}
      testID="artist-detail-albums-list"
    />
  );

  const aboutDescription = channel?.channel_description?.value?.trim() ?? '';
  const aboutBody =
    isChannelLoading && channel === null ? (
      <LoadingSection testID="artist-detail-about-loading" />
    ) : aboutDescription.length > 0 ? (
      <Text style={styles.aboutText} testID="artist-detail-about">
        {aboutDescription}
      </Text>
    ) : (
      <ListEmpty messageKey="misc.info" testID="artist-detail-about-empty" />
    );

  const podrollBody = offlineModeEnabled ? (
    <ListEmpty
      messageKey={OFFLINE_UNAVAILABLE_MESSAGE_KEY}
      testID="artist-detail-podroll-offline"
    />
  ) : (
    <FillList
      ListEmptyComponent={
        isPodrollLoading ? (
          <LoadingSection testID="artist-detail-podroll-loading" />
        ) : podrollErrorKey !== null ? (
          <ListError
            messageKey={podrollErrorKey}
            onRetry={() => {
              void loadPodroll({ source: 'retry' });
            }}
            testID="artist-detail-podroll-error"
          />
        ) : (
          <ListEmpty messageKey="info.no_podroll_found" testID="artist-detail-podroll-empty" />
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
            void loadRows({ source: 'refresh' });
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
          testID={`artist-podroll-row-${index}`}
          title={item.title}
        />
      )}
      style={{ backgroundColor: themeStyles.screen.backgroundColor }}
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
            : settingsBody;

  return (
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
  );
}
