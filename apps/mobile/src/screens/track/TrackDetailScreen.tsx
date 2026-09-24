import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { FlatList } from 'react-native';
import { Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import type { DTOChannel, DTOItem } from '@podverse/helpers';
import { formatDateAbbrev, primaryChannelListArtworkUrl } from '@podverse/helpers';

import { requestWithMobileAuthRefresh } from '../../auth';
import { useAuth } from '../../auth/AuthProvider';
import { ChannelHeader } from '../../components/channel';
import { DescriptionText, FundingLinksSection, ItemSummaryPeople } from '../../components/content';
import { DownloadRowControl } from '../../components/download/DownloadRowControl';
import type { SectionChipItem } from '../../components/form';
import { SectionChipRow } from '../../components/form';
import { buildMediaRowMoreActions, MediaRowActions } from '../../components/player/MediaRowActions';
import { CoverImage, FillList } from '../../components/primitives';
import { HeaderBarAction } from '../../components/screen/HeaderBarAction';
import { ListEmpty } from '../../components/state/ListEmpty';
import { ListError } from '../../components/state/ListError';
import { LoadingSection } from '../../components/state/LoadingSection';
import { channelItemsRepository } from '../../data/repositories/channelItemsRepository';
import { getItemPrimaryImageUrl } from '../../data/repositories/channelItemWindow';
import { downloadsRepository } from '../../data/repositories/downloadsRepository';
import { playbackContentRepository } from '../../data/repositories/playbackContentRepository';
import { sectionChromeFlagsRepository } from '../../data/repositories/sectionChromeFlagsRepository';
import { downloadActionLabelKey, runDownloadAction } from '../../downloads/downloadAction';
import { useDownloadAction } from '../../downloads/useDownloads';
import { useActionError } from '../../feedback/ActionErrorProvider';
import { shouldReplaceCachedValue } from '../../lib/cachedValue';
import { formatPlaybackDurationLabel } from '../../lib/formatPlaybackDurationLabel';
import { OFFLINE_UNAVAILABLE_MESSAGE_KEY } from '../../lib/offlineModeViews';
import { getCachedItemSectionFlags } from '../../lib/sectionChromeFlags';
import { buildPublicShareUrl, shareResolvedUrl } from '../../lib/share/shareNowPlaying';
import { useMembershipGate } from '../../membership/MembershipGateProvider';
import type { ChannelBrowseStackParamList } from '../../navigation';
import { buildAlbumDetailParams, CHANNEL_BROWSE_STACK_ROUTES } from '../../navigation';
import { usePlaybackSession } from '../../playback/PlaybackProvider';
import type { TrackTab } from '../../prefs/detailListPrefs';
import { DEFAULT_TRACK_TAB } from '../../prefs/detailListPrefs';
import { useOfflineMode } from '../../prefs/offlineMode';
import { listHeaderStackGap, screenBodyInsets } from '../../theme/screenLayout';
import { typography } from '../../theme/typography';
import { useTheme } from '../../theme/useTheme';
import type { EpisodePlaybackProgress } from '../episode/episodePlaybackProgress';
import { episodeProgressTimeKind, parsePlaybackSeconds } from '../episode/episodePlaybackProgress';
import { loadEpisodeTranscriptPane } from '../episode/episodeSectionPaneLoaders';
import { useEpisodeStoredProgress } from '../episode/useEpisodePlaybackProgress';
import type { HomeFeedRowData } from '../home/homeFeedData';
import { mapItemToHomeFeedRow } from '../home/homeFeedData';
import { useHomeRowPlayback } from '../home/useHomeRowPlayback';
import { useAddToPlaylist } from '../library/useAddToPlaylist';

type TrackDetailScreenProps = NativeStackScreenProps<ChannelBrowseStackParamList, 'TrackDetail'>;

type TrackTabRow = { id: string };
const EMPTY_TRACK_TAB_ROWS: TrackTabRow[] = [];
const trackTabRowKeyExtractor = (row: TrackTabRow): string => row.id;
const renderTrackTabItem = (): null => null;

const TRACK_TAB_LABEL_KEYS: Record<TrackTab, string> = {
  funding: 'info.funding',
  summary: 'info.summary.summary',
  transcript: 'info.transcript.lyrics',
};

const TRACK_ARTWORK_SIZE = 96;

const formatProgressTimeLabel = (
  progress: EpisodePlaybackProgress,
  translate: (key: string, options?: { count?: number; timeRemaining?: string }) => string,
  fallbackDuration: string | null
): string | null => {
  const kind = episodeProgressTimeKind(progress);
  const formatSeconds = (seconds: number): string | null =>
    formatPlaybackDurationLabel(seconds, translate);

  if (kind === 'remaining') {
    const remaining = Math.max(0, progress.durationSeconds - progress.positionSeconds);
    const timeRemaining = formatSeconds(remaining);
    if (timeRemaining === null) {
      return null;
    }
    return translate('info.time.left', { timeRemaining });
  }

  if (kind === 'duration') {
    return formatSeconds(progress.durationSeconds);
  }

  if (fallbackDuration !== null && fallbackDuration.length > 0) {
    return formatSeconds(parsePlaybackSeconds(fallbackDuration));
  }

  return null;
};

function TrackPlayChrome({
  item,
  itemRow,
  channel,
  onAlbumPress,
  onPlayPress,
  onQueuePress,
  onAddToPlaylistPress,
  onMarkAsPlayedPress,
  onSharePress,
}: {
  item: DTOItem;
  itemRow: HomeFeedRowData;
  channel: DTOChannel | null;
  onAlbumPress?: () => void;
  onPlayPress: () => void;
  onQueuePress: (position: 'next' | 'last') => void;
  onAddToPlaylistPress: () => void;
  onMarkAsPlayedPress: () => void;
  onSharePress: () => void;
}) {
  const { t, i18n } = useTranslation();
  const { styles: themeStyles, tokens } = useTheme();
  const { activeTarget, enclosureSelectedParams } = usePlaybackSession();
  const { stored } = useEpisodeStoredProgress(item);

  const activeMediaId =
    activeTarget !== null &&
    activeTarget.kind !== 'clip' &&
    'item' in activeTarget &&
    activeTarget.item !== null
      ? activeTarget.item.id_text
      : null;
  const explicitSelectedParams =
    activeMediaId === item.id_text ? enclosureSelectedParams : undefined;
  const {
    errorReason,
    isDownloadable,
    remove: removeDownload,
    start: startDownload,
    status: downloadStatus,
  } = useDownloadAction(item, false, { explicitSelectedParams });
  const { openDownloadError } = useActionError();

  const artworkUri = getItemPrimaryImageUrl(item);
  const trackTitle = item.title ?? item.id_text;
  const dateLabel = useMemo(() => {
    if (item.pub_date === undefined || item.pub_date === null || item.pub_date.length === 0) {
      return null;
    }
    const parsed = new Date(item.pub_date);
    if (Number.isNaN(parsed.getTime())) {
      return null;
    }
    return formatDateAbbrev(parsed, i18n.language);
  }, [i18n.language, item.pub_date]);

  const durationLabel = formatProgressTimeLabel(stored, t, itemRow.duration ?? null);

  const moreActions = useMemo(
    () =>
      buildMediaRowMoreActions(
        t,
        {
          onAddToPlaylist: onAddToPlaylistPress,
          onDownload: isDownloadable
            ? () => {
                if (downloadStatus === 'failed') {
                  openDownloadError(errorReason, startDownload);
                  return;
                }
                runDownloadAction({
                  remove: removeDownload,
                  start: startDownload,
                  status: downloadStatus,
                });
              }
            : undefined,
          onMarkAsPlayed: onMarkAsPlayedPress,
          onQueueLast: () => {
            onQueuePress('last');
          },
          onQueueNext: () => {
            onQueuePress('next');
          },
          onShare: onSharePress,
        },
        {
          downloadLabelKey: isDownloadable ? downloadActionLabelKey(downloadStatus) : undefined,
          downloadTone: downloadStatus === 'complete' ? 'danger' : undefined,
          idSuffix: `-${item.id_text}`,
        }
      ),
    [
      downloadStatus,
      errorReason,
      item,
      item.id_text,
      isDownloadable,
      onAddToPlaylistPress,
      onMarkAsPlayedPress,
      onQueuePress,
      onSharePress,
      openDownloadError,
      removeDownload,
      startDownload,
      t,
    ]
  );

  const styles = useMemo(
    () =>
      StyleSheet.create({
        artwork: {
          height: TRACK_ARTWORK_SIZE,
          width: TRACK_ARTWORK_SIZE,
        },
        artworkRow: {
          alignItems: 'flex-start',
          flexDirection: 'row',
          justifyContent: 'space-between',
          width: '100%',
        },
        date: {
          ...typography.caption,
          color: tokens.text.accent,
        },
        playChrome: {
          marginTop: tokens.spacing.sm,
        },
        root: {
          gap: tokens.spacing.md,
          marginTop: tokens.spacing.md,
        },
        subtitleLink: {
          ...typography.label,
          color: tokens.text.accent,
        },
        subtitleMuted: {
          ...typography.label,
          color: themeStyles.textSecondary.color,
        },
        title: {
          ...typography.title,
          color: themeStyles.textPrimary.color,
        },
        titles: {
          gap: tokens.spacing.xs,
        },
      }),
    [themeStyles, tokens]
  );

  return (
    <View accessible={false} style={styles.root} testID="track-detail-playback-chrome">
      <View style={styles.artworkRow}>
        <CoverImage
          accessibilityLabel={trackTitle}
          style={styles.artwork}
          testID="track-detail-artwork"
          uri={artworkUri}
        />
        <DownloadRowControl
          completeTestID="track-detail-download-complete"
          item={item}
          testID="track-detail-download"
        />
      </View>
      <View style={styles.titles}>
        {onAlbumPress !== undefined && channel !== null ? (
          <Pressable
            accessibilityLabel={channel.title ?? channel.id_text}
            accessibilityRole="link"
            onPress={onAlbumPress}
            testID="track-detail-album-title"
          >
            <Text style={styles.subtitleLink}>{channel.title ?? channel.id_text}</Text>
          </Pressable>
        ) : (
          <Text style={styles.subtitleMuted} testID="track-detail-album-title">
            {channel?.title ?? itemRow.subtitle ?? ''}
          </Text>
        )}
        <Text accessibilityRole="header" style={styles.title} testID="track-detail-title">
          {trackTitle}
        </Text>
        {dateLabel !== null ? (
          <Text style={styles.date} testID="track-detail-date">
            {dateLabel}
          </Text>
        ) : null}
      </View>
      <View style={styles.playChrome}>
        <MediaRowActions
          appearance="icons"
          durationLabel={durationLabel}
          durationTestID={`track-detail-duration-${item.id_text}`}
          idSuffix={`-${item.id_text}`}
          moreActions={moreActions}
          moreTestID={`track-detail-more-${item.id_text}`}
          onPlayPress={onPlayPress}
          playbackMediaId={item.id_text}
          playLabel={t('media_player.play')}
          playTestID={`track-detail-play-${item.id_text}`}
        />
      </View>
    </View>
  );
}

export function TrackDetailScreen({ navigation, route }: TrackDetailScreenProps) {
  const { t } = useTranslation();
  const { styles: themeStyles, tokens } = useTheme();
  const { accessToken, clearSession, refreshToken, setTokens, status } = useAuth();
  const { enabled: offlineModeEnabled } = useOfflineMode();
  const { openGate } = useMembershipGate();
  const { addToPlaylistSheet, requestAddToPlaylist } = useAddToPlaylist();
  const { previewImageUrl, previewTitle, trackId } = route.params;
  const cachedItemChrome = getCachedItemSectionFlags(trackId);
  const listRef = useRef<FlatList<TrackTabRow>>(null);
  const [track, setTrack] = useState<DTOItem | null>(null);
  const [channel, setChannel] = useState<DTOChannel | null>(null);
  const [channelTitle, setChannelTitle] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [previewHasFunding, setPreviewHasFunding] = useState<boolean>(
    cachedItemChrome?.hasFunding === true
  );
  const [activeTab, setActiveTab] = useState<TrackTab>(DEFAULT_TRACK_TAB);
  const [transcriptText, setTranscriptText] = useState('');
  const [isTranscriptLoading, setIsTranscriptLoading] = useState(false);
  const [transcriptErrorKey, setTranscriptErrorKey] = useState<string | null>(null);
  const { playbackNoticeKey, runMarkAsPlayedAction, runPlayAction, runQueueAction } =
    useHomeRowPlayback();

  const authContext = useMemo(
    () => ({ accessToken, clearSession, refreshToken, setTokens }),
    [accessToken, clearSession, refreshToken, setTokens]
  );

  const styles = useMemo(
    () =>
      StyleSheet.create({
        chipRow: {
          marginTop: listHeaderStackGap(tokens.spacing),
        },
        container: {
          backgroundColor: themeStyles.screen.backgroundColor,
          flex: 1,
        },
        content: {
          paddingBottom: tokens.spacing['2xl'],
          paddingHorizontal: screenBodyInsets(tokens.spacing).paddingHorizontal,
          paddingTop: screenBodyInsets(tokens.spacing).paddingTop,
        },
        description: {
          ...typography.prose,
          color: themeStyles.textPrimary.color,
        },
        notice: {
          ...typography.caption,
          color: themeStyles.textSecondary.color,
          marginTop: tokens.spacing.sm,
        },
        showMore: {
          ...typography.caption,
          color: tokens.text.link,
          marginTop: tokens.spacing.sm,
        },
        transcript: {
          ...typography.body,
          color: themeStyles.textPrimary.color,
        },
      }),
    [themeStyles, tokens]
  );

  const applyTrack = useCallback(
    (item: DTOItem, nextChannel: DTOChannel | null, nextTitle: string | null) => {
      setTrack((current) => (shouldReplaceCachedValue(current, item) ? item : current));
      if (nextChannel !== null) {
        setChannel((current) =>
          shouldReplaceCachedValue(current, nextChannel) ? nextChannel : current
        );
        setChannelTitle((current) => (current === nextChannel.title ? current : nextChannel.title));
        return;
      }
      if (nextTitle !== null) {
        setChannelTitle((current) => (current === nextTitle ? current : nextTitle));
      }
    },
    []
  );

  const loadTrack = useCallback(async () => {
    setIsLoading(true);
    setErrorKey(null);
    const stored = await channelItemsRepository.getByIdText(trackId);

    if (stored !== null) {
      applyTrack(stored, stored.channel ?? null, stored.channel?.title ?? null);
      if (stored.channel === undefined || stored.channel === null) {
        const localChannel = await playbackContentRepository.getLocalChannelForItem(trackId);
        if (localChannel !== null) {
          applyTrack(stored, localChannel, localChannel.title);
        }
      }
      setIsLoading(false);
    }

    if (offlineModeEnabled) {
      if (stored === null) {
        const download = await downloadsRepository.getByItemIdText(trackId);
        setTrack(null);
        setChannel(null);
        setChannelTitle(download?.channelTitle ?? null);
        setErrorKey(null);
        setIsLoading(false);
      }
      return;
    }

    try {
      const fresh = await requestWithMobileAuthRefresh(authContext, async (api) =>
        api.reqItemGetByIdOrIdText(trackId)
      );
      void channelItemsRepository.updateStoredItem(fresh);

      let nextChannel = fresh.channel ?? null;
      if (nextChannel === null) {
        try {
          nextChannel = await requestWithMobileAuthRefresh(authContext, async (api) =>
            api.reqChannelGetByIdOrIdText(fresh.channel_id)
          );
        } catch {
          nextChannel = null;
        }
      }
      applyTrack(fresh, nextChannel, nextChannel?.title ?? null);
    } catch {
      if (stored === null) {
        setErrorKey('errors.generic');
        setTrack(null);
        setChannel(null);
        setChannelTitle(null);
      }
    } finally {
      setIsLoading(false);
    }
  }, [applyTrack, authContext, offlineModeEnabled, trackId]);

  useEffect(() => {
    void loadTrack();
  }, [loadTrack]);

  useEffect(() => {
    setActiveTab(DEFAULT_TRACK_TAB);
    setTranscriptText('');
    setTranscriptErrorKey(null);
    setIsTranscriptLoading(false);
    setDescriptionExpanded(false);
  }, [trackId]);

  useEffect(() => {
    if (track === null) {
      return;
    }
    const nextHasFunding = (track.item_fundings?.length ?? 0) > 0;
    setPreviewHasFunding(nextHasFunding);
    void sectionChromeFlagsRepository.mergeItem(trackId, { hasFunding: nextHasFunding });
  }, [track, trackId]);

  const hasTranscript = (track?.item_transcripts?.length ?? 0) > 0;
  const hasFunding = track !== null ? (track.item_fundings?.length ?? 0) > 0 : previewHasFunding;
  const supportedTabs = useMemo<TrackTab[]>(() => {
    const tabs: TrackTab[] = ['summary'];
    if (hasTranscript || transcriptText.length > 0) {
      tabs.push('transcript');
    }
    if (hasFunding) {
      tabs.push('funding');
    }
    return tabs;
  }, [hasFunding, hasTranscript, transcriptText.length]);

  useEffect(() => {
    if (!supportedTabs.includes(activeTab)) {
      setActiveTab('summary');
    }
  }, [activeTab, supportedTabs]);

  const loadTranscript = useCallback(async (): Promise<void> => {
    if (offlineModeEnabled || trackId.length === 0) {
      return;
    }
    setIsTranscriptLoading(true);
    setTranscriptErrorKey(null);
    try {
      const transcript = await loadEpisodeTranscriptPane(async () =>
        requestWithMobileAuthRefresh(authContext, async (api) => api.reqItemTranscriptGet(trackId))
      );
      setTranscriptText(transcript);
    } catch {
      setTranscriptErrorKey('errors.generic');
    } finally {
      setIsTranscriptLoading(false);
    }
  }, [authContext, offlineModeEnabled, trackId]);

  useEffect(() => {
    if (activeTab !== 'transcript' || transcriptText.length > 0) {
      return;
    }
    void loadTranscript();
  }, [activeTab, loadTranscript, transcriptText.length]);

  useEffect(() => {
    listRef.current?.scrollToOffset({ animated: false, offset: 0 });
  }, [activeTab]);

  const sectionChips = useMemo<SectionChipItem<TrackTab>[]>(
    () =>
      supportedTabs.map((tab) => ({
        key: tab,
        label: t(TRACK_TAB_LABEL_KEYS[tab]),
        testID: `track-detail-tab-${tab}`,
      })),
    [supportedTabs, t]
  );

  const handleTabPress = useCallback((tab: TrackTab) => {
    setActiveTab(tab);
  }, []);

  const descriptionHtml = track?.item_description?.value ?? null;

  const playableTrack = useMemo((): DTOItem | null => {
    if (track === null) {
      return null;
    }
    if (track.channel !== undefined || channel === null) {
      return track;
    }
    return { ...track, channel };
  }, [channel, track]);

  const trackRow = useMemo((): HomeFeedRowData | null => {
    if (playableTrack === null) {
      return null;
    }
    const row = mapItemToHomeFeedRow(playableTrack);
    return {
      ...row,
      subtitle: channelTitle ?? row.subtitle,
    };
  }, [channelTitle, playableTrack]);

  const handleShare = useCallback(() => {
    shareResolvedUrl(buildPublicShareUrl('track', trackId));
  }, [trackId]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <HeaderBarAction
          accessibilityLabel={t('features.share')}
          icon="share-outline"
          onPress={handleShare}
          testID="track-detail-share"
        />
      ),
    });
  }, [handleShare, navigation, t]);

  const handleAddToPlaylist = useCallback(() => {
    if (trackRow === null || status !== 'authenticated') {
      openGate('needs_account');
      return;
    }
    requestAddToPlaylist({ idText: trackRow.id, kind: 'item', medium: 'music' });
  }, [openGate, requestAddToPlaylist, status, trackRow]);

  const handleMarkAsPlayed = useCallback(() => {
    if (trackRow === null) {
      return;
    }
    runMarkAsPlayedAction(trackRow, 'tracks');
  }, [runMarkAsPlayedAction, trackRow]);

  const handlePlay = useCallback(() => {
    if (trackRow === null) {
      return;
    }
    runPlayAction(trackRow, 'tracks');
  }, [runPlayAction, trackRow]);

  const handleQueue = useCallback(
    (position: 'next' | 'last') => {
      if (trackRow === null) {
        return;
      }
      runQueueAction(trackRow, 'tracks', position);
    },
    [runQueueAction, trackRow]
  );

  const openAlbum = useCallback(() => {
    if (channel === null) {
      return;
    }
    navigation.navigate(
      CHANNEL_BROWSE_STACK_ROUTES.AlbumDetail,
      buildAlbumDetailParams({
        albumId: channel.id_text,
        previewImageUrl: primaryChannelListArtworkUrl(channel.channel_images),
        previewTitle: channel.title,
      })
    );
  }, [channel, navigation]);

  const handleRetryTrack = useCallback(() => {
    void loadTrack();
  }, [loadTrack]);

  const handleRetryTranscript = useCallback(() => {
    setTranscriptText('');
    void loadTranscript();
  }, [loadTranscript]);

  const headerArtworkUri =
    primaryChannelListArtworkUrl(channel?.channel_images) ??
    (previewImageUrl !== undefined && previewImageUrl !== null && previewImageUrl.length > 0
      ? previewImageUrl
      : null);

  const listHeader = useMemo(
    () =>
      track !== null && trackRow !== null ? (
        <View>
          <ChannelHeader
            artworkUri={headerArtworkUri}
            onTitlePress={channel !== null ? openAlbum : undefined}
            subtitle={channel?.channel_about?.author ?? null}
            testID="track-detail-album-header"
            title={channel?.title ?? channelTitle ?? previewTitle ?? t('media.music.album')}
          />
          <TrackPlayChrome
            channel={channel}
            item={track}
            itemRow={trackRow}
            onAddToPlaylistPress={handleAddToPlaylist}
            onAlbumPress={channel !== null ? openAlbum : undefined}
            onMarkAsPlayedPress={handleMarkAsPlayed}
            onPlayPress={handlePlay}
            onQueuePress={handleQueue}
            onSharePress={handleShare}
          />
          {playbackNoticeKey !== null ? (
            <Text style={styles.notice}>{t(playbackNoticeKey)}</Text>
          ) : null}
          <View style={styles.chipRow}>
            <SectionChipRow
              items={sectionChips}
              onSelect={handleTabPress}
              selectedKey={activeTab}
              testID="track-detail-sections"
            />
          </View>
        </View>
      ) : null,
    [
      activeTab,
      channel,
      channelTitle,
      handleAddToPlaylist,
      handleMarkAsPlayed,
      handlePlay,
      handleQueue,
      handleShare,
      handleTabPress,
      headerArtworkUri,
      openAlbum,
      playbackNoticeKey,
      previewTitle,
      sectionChips,
      styles.chipRow,
      styles.notice,
      t,
      track,
      trackRow,
    ]
  );

  const paneFooter = useMemo(() => {
    if (activeTab === 'summary') {
      return (
        <View testID="track-detail-summary">
          <DescriptionText
            emptyLabel={t('info.summary.no_summary')}
            html={descriptionHtml}
            linkStyle={styles.showMore}
            resetKey={trackId}
            showMoreStyle={styles.showMore}
            testID="track-detail-description"
            textStyle={styles.description}
            toggleTestID="track-detail-description-toggle"
          />
          <ItemSummaryPeople itemPersons={track?.item_persons ?? []} testIDPrefix="track-detail" />
        </View>
      );
    }

    if (activeTab === 'funding') {
      return (
        <FundingLinksSection
          fundings={track?.item_fundings ?? []}
          isLoading={track === null}
          layout="inline"
          testIDPrefix="track-detail"
        />
      );
    }

    if (isTranscriptLoading) {
      return <LoadingSection testID="track-detail-transcript-loading" />;
    }
    if (transcriptErrorKey !== null) {
      return (
        <ListError
          messageKey={transcriptErrorKey}
          onRetry={handleRetryTranscript}
          testID="track-detail-transcript-error"
        />
      );
    }
    if (offlineModeEnabled && transcriptText.length === 0) {
      return (
        <ListEmpty
          messageKey={OFFLINE_UNAVAILABLE_MESSAGE_KEY}
          testID="track-detail-transcript-offline-unavailable"
        />
      );
    }
    if (transcriptText.length === 0) {
      return (
        <ListEmpty
          messageKey="info.transcript.no_transcript"
          testID="track-detail-transcript-empty"
        />
      );
    }
    return (
      <Text style={styles.transcript} testID="track-detail-transcript-content">
        {transcriptText}
      </Text>
    );
  }, [
    activeTab,
    descriptionHtml,
    handleRetryTranscript,
    isTranscriptLoading,
    offlineModeEnabled,
    styles.description,
    styles.showMore,
    styles.transcript,
    t,
    track,
    trackId,
    transcriptErrorKey,
    transcriptText,
  ]);

  const refreshControl = useMemo(
    () => (
      <RefreshControl
        onRefresh={handleRetryTrack}
        refreshing={isLoading}
        tintColor={themeStyles.buttonPrimary.backgroundColor}
      />
    ),
    [handleRetryTrack, isLoading, themeStyles.buttonPrimary.backgroundColor]
  );

  return (
    <View style={styles.container} testID="track-detail-screen">
      {isLoading ? <LoadingSection testID="track-detail-loading" /> : null}
      {!isLoading && offlineModeEnabled && track === null ? (
        <ListEmpty
          messageKey={OFFLINE_UNAVAILABLE_MESSAGE_KEY}
          testID="track-detail-offline-unavailable"
        />
      ) : null}
      {!isLoading && errorKey !== null ? (
        <ListError messageKey={errorKey} onRetry={handleRetryTrack} testID="track-detail-error" />
      ) : null}
      {!isLoading && errorKey === null && track !== null ? (
        <FillList
          ListEmptyComponent={null}
          ListFooterComponent={paneFooter}
          ListHeaderComponent={listHeader}
          contentContainerStyle={styles.content}
          data={EMPTY_TRACK_TAB_ROWS}
          keyExtractor={trackTabRowKeyExtractor}
          ref={listRef}
          refreshControl={refreshControl}
          renderItem={renderTrackTabItem}
          testID="track-detail-list"
        />
      ) : null}
      {addToPlaylistSheet}
    </View>
  );
}
