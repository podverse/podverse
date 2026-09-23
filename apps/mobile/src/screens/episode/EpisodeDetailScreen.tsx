import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { FlatList } from 'react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type {
  DTOChannel,
  DTOClip,
  DTOItem,
  DTOItemChapter,
  DTOItemSoundbite,
} from '@podverse/helpers';
import {
  chapterSectionHasImages,
  primaryChannelListArtworkUrl,
  resolveChapterRowArtwork,
} from '@podverse/helpers';
import { htmlToPlainText } from '@podverse/helpers/html';
import { formatHHMMSS } from '@podverse/helpers/time';

import { requestWithMobileAuthRefresh } from '../../auth';
import { useAuth } from '../../auth/AuthProvider';
import { ChapterListRow, FundingLinksSection, ItemSummaryPeople } from '../../components/content';
import type { MenuSelectChipOption, SectionChipItem } from '../../components/form';
import { MenuSelectChip, SectionChipRow } from '../../components/form';
import { FillList } from '../../components/primitives';
import { HeaderBarAction } from '../../components/screen/HeaderBarAction';
import { ListEmpty } from '../../components/state/ListEmpty';
import { ListError } from '../../components/state/ListError';
import { LoadingSection } from '../../components/state/LoadingSection';
import { channelItemsRepository } from '../../data/repositories/channelItemsRepository';
import { getItemPrimaryImageUrl } from '../../data/repositories/channelItemWindow';
import { downloadsRepository } from '../../data/repositories/downloadsRepository';
import { playbackContentRepository } from '../../data/repositories/playbackContentRepository';
import { sectionChromeFlagsRepository } from '../../data/repositories/sectionChromeFlagsRepository';
import { shouldReplaceCachedValue } from '../../lib/cachedValue';
import {
  isEpisodeTabNetworkBody,
  OFFLINE_UNAVAILABLE_MESSAGE_KEY,
} from '../../lib/offlineModeViews';
import { clipToHomeRow } from '../../lib/rows/homeRowMappers';
import type { ItemSectionChromeFlags } from '../../lib/sectionChromeFlags';
import { getCachedItemSectionFlags } from '../../lib/sectionChromeFlags';
import { buildPublicShareUrl, shareResolvedUrl } from '../../lib/share/shareNowPlaying';
import { useMembershipGate } from '../../membership/MembershipGateProvider';
import type { ChannelBrowseStackParamList } from '../../navigation';
import { buildPodcastDetailParams, CHANNEL_BROWSE_STACK_ROUTES } from '../../navigation';
import { usePlaybackSession } from '../../playback/PlaybackProvider';
import type { EpisodeClipSort, EpisodeTab } from '../../prefs/detailListPrefs';
import { EPISODE_CLIP_SORT_OPTIONS } from '../../prefs/detailListPrefs';
import { useOfflineMode } from '../../prefs/offlineMode';
import { listHeaderStackGap, screenBodyInsets } from '../../theme/screenLayout';
import { typography } from '../../theme/typography';
import { useTheme } from '../../theme/useTheme';
import type { HomeFeedRowData } from '../home/homeFeedData';
import { mapItemToHomeFeedRow } from '../home/homeFeedData';
import { HomeFeedRow } from '../home/HomeFeedRow';
import type { QueueActionPosition } from '../home/useHomeRowPlayback';
import { useHomeRowPlayback } from '../home/useHomeRowPlayback';
import { useAddToPlaylist } from '../library/useAddToPlaylist';
import { EpisodePlayChrome } from './EpisodePlayChrome';
import { EPISODE_TAB_LABEL_KEYS, itemSectionFlagsFromDto } from './episodeTabs';
import { useEpisodeSectionPanes } from './useEpisodeSectionPanes';

type EpisodeDetailScreenProps = NativeStackScreenProps<
  ChannelBrowseStackParamList,
  'EpisodeDetail'
>;

type EpisodePaneRow =
  | { type: 'chapter'; id: string; chapter: DTOItemChapter }
  | { type: 'clip'; id: string; clip: DTOClip }
  | { type: 'soundbite'; id: string; index: number; soundbite: DTOItemSoundbite };

const CLIP_SORT_LABEL_KEYS: Record<EpisodeClipSort, string> = {
  oldest: 'filters.sort.oldest',
  recent: 'filters.sort.recent',
};

const toSoundbiteRow = (
  soundbite: DTOItemSoundbite,
  index: number,
  fallbackTitle: string
): HomeFeedRowData => {
  return {
    id: soundbite.id_text,
    imageUrl:
      soundbite.item !== undefined && soundbite.item !== null
        ? getItemPrimaryImageUrl(soundbite.item)
        : null,
    subtitle: formatHHMMSS(Number(soundbite.start_time)),
    title: soundbite.title ?? `${fallbackTitle} ${index + 1}`,
  };
};

const episodePaneRowKeyExtractor = (row: EpisodePaneRow): string => row.id;

function EpisodeChapterRow({
  chapter,
  fallbackImageUrl,
  isLast,
  showImages,
}: {
  chapter: DTOItemChapter;
  fallbackImageUrl: string | null;
  isLast: boolean;
  showImages: boolean;
}) {
  const { t } = useTranslation();
  const artwork = resolveChapterRowArtwork(chapter, fallbackImageUrl, showImages);

  return (
    <ChapterListRow
      artworkAccessibilityLabel={t('info.chapter.chapter_image')}
      artworkUri={artwork.show ? artwork.uri : null}
      isLast={isLast}
      showArtwork={artwork.show}
      testID="episode-detail-chapter-row"
      timeRange={t('info.time.start_end', {
        timeEnd: formatHHMMSS(Number(chapter.end_time)),
        timeStart: formatHHMMSS(Number(chapter.start_time)),
      })}
      title={chapter.title ?? chapter.id_text}
    />
  );
}

function EpisodeSoundbiteRow({
  isLast,
  onPlay,
  onQueue,
  soundbite,
  soundbiteIndex,
}: {
  isLast: boolean;
  onPlay: (soundbite: DTOItemSoundbite) => void;
  onQueue: (row: HomeFeedRowData, position: QueueActionPosition) => void;
  soundbite: DTOItemSoundbite;
  soundbiteIndex: number;
}) {
  const { t } = useTranslation();
  const row = useMemo(
    () => toSoundbiteRow(soundbite, soundbiteIndex, t('info.soundbite.official_clip')),
    [soundbite, soundbiteIndex, t]
  );
  const handlePlay = useCallback(() => {
    onPlay(soundbite);
  }, [onPlay, soundbite]);

  return (
    <HomeFeedRow
      isLast={isLast}
      mediaType="clips"
      onPlayPress={handlePlay}
      onPress={handlePlay}
      onQueuePress={onQueue}
      row={row}
    />
  );
}

function EpisodeClipRow({
  clip,
  isLast,
  onPlay,
  onPress,
  onQueue,
}: {
  clip: DTOClip;
  isLast: boolean;
  onPlay: (row: HomeFeedRowData) => void;
  onPress: (clipId: string) => void;
  onQueue: (row: HomeFeedRowData, position: QueueActionPosition) => void;
}) {
  const row = useMemo(() => clipToHomeRow(clip), [clip]);
  const handlePress = useCallback(() => {
    onPress(clip.id_text);
  }, [clip.id_text, onPress]);

  return (
    <HomeFeedRow
      isLast={isLast}
      mediaType="clips"
      onPlayPress={onPlay}
      onPress={handlePress}
      onQueuePress={onQueue}
      row={row}
      showChannelContext={false}
    />
  );
}

/**
 * An episode as one scrolling column.
 *
 * Artwork, titles, the play bar, and the section chips live in the list header so a long episode
 * title grows the page instead of covering the chips. The active pane owns the rows (or the
 * footer, for prose). Switching chips resets scroll to the top.
 */
export function EpisodeDetailScreen({ navigation, route }: EpisodeDetailScreenProps) {
  const { t } = useTranslation();
  const { styles: themeStyles, tokens } = useTheme();
  const { accessToken, clearSession, refreshToken, setTokens, status } = useAuth();
  const { enabled: offlineModeEnabled } = useOfflineMode();
  const { openGate } = useMembershipGate();
  const { addToPlaylistSheet, requestAddToPlaylist } = useAddToPlaylist();
  const { episodeId } = route.params;
  const listRef = useRef<FlatList<EpisodePaneRow>>(null);
  const [previewFlags, setPreviewFlags] = useState<ItemSectionChromeFlags | null>(() =>
    getCachedItemSectionFlags(episodeId)
  );
  const [episode, setEpisode] = useState<DTOItem | null>(null);
  const [channel, setChannel] = useState<DTOChannel | null>(null);
  const [channelTitle, setChannelTitle] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [descriptionExpanded, setDescriptionExpanded] = useState<boolean>(false);
  const { playbackNoticeKey, runMarkAsPlayedAction, runPlayAction, runQueueAction } =
    useHomeRowPlayback();
  const { playSoundbite } = usePlaybackSession();

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
        description: {
          ...typography.prose,
          color: themeStyles.textPrimary.color,
        },
        headerActions: {
          alignItems: 'center',
          flexDirection: 'row',
        },
        list: {
          backgroundColor: themeStyles.screen.backgroundColor,
          flex: 1,
        },
        listContent: {
          paddingBottom: tokens.spacing['2xl'],
          paddingHorizontal: screenBodyInsets(tokens.spacing).paddingHorizontal,
          paddingTop: screenBodyInsets(tokens.spacing).paddingTop,
        },
        loadMore: {
          marginTop: tokens.spacing.md,
        },
        loadMoreLabel: {
          color: themeStyles.textPrimary.color,
          fontSize: 14,
          fontWeight: '600',
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

  const applyEpisode = useCallback(
    (item: DTOItem, nextChannel: DTOChannel | null, nextTitle: string | null) => {
      setEpisode((current) => (shouldReplaceCachedValue(current, item) ? item : current));
      const nextFlags = itemSectionFlagsFromDto(item);
      setPreviewFlags(nextFlags);
      void sectionChromeFlagsRepository.mergeItem(episodeId, nextFlags);

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
    [episodeId]
  );

  /**
   * Paint the stored item immediately when this device already has it, then correct it from the
   * server without a second render when the payloads match. Search / unfollowed episodes have
   * nothing stored and wait on the fetch. Offline Mode stays on the stored DTO (and download
   * chrome for the channel title).
   */
  const loadEpisode = useCallback(async () => {
    setIsLoading(true);
    setErrorKey(null);
    const stored = await channelItemsRepository.getByIdText(episodeId);

    if (stored !== null) {
      applyEpisode(stored, stored.channel ?? null, stored.channel?.title ?? null);
      if (stored.channel === undefined || stored.channel === null) {
        const localChannel = await playbackContentRepository.getLocalChannelForItem(episodeId);
        if (localChannel !== null) {
          applyEpisode(stored, localChannel, localChannel.title);
        }
      }
      setIsLoading(false);
    }

    if (offlineModeEnabled) {
      if (stored === null) {
        const download = await downloadsRepository.getByItemIdText(episodeId);
        setEpisode(null);
        setChannel(null);
        setChannelTitle(download?.channelTitle ?? null);
        setErrorKey(null);
        setIsLoading(false);
      }
      return;
    }

    try {
      const fresh = await requestWithMobileAuthRefresh(
        {
          accessToken,
          clearSession,
          refreshToken,
          setTokens,
        },
        async (api) => api.reqItemGetByIdOrIdText(episodeId)
      );
      void channelItemsRepository.updateStoredItem(fresh);

      let nextChannel = fresh.channel ?? null;
      if (nextChannel === null) {
        try {
          nextChannel = await requestWithMobileAuthRefresh(
            {
              accessToken,
              clearSession,
              refreshToken,
              setTokens,
            },
            async (api) => api.reqChannelGetByIdOrIdText(fresh.channel_id)
          );
        } catch {
          nextChannel = null;
        }
      }

      applyEpisode(fresh, nextChannel, nextChannel?.title ?? null);
    } catch {
      if (stored === null) {
        setErrorKey('errors.generic');
        setEpisode(null);
        setChannel(null);
        setChannelTitle(null);
      }
    } finally {
      setIsLoading(false);
    }
  }, [
    accessToken,
    applyEpisode,
    clearSession,
    episodeId,
    offlineModeEnabled,
    refreshToken,
    setTokens,
  ]);

  useEffect(() => {
    void loadEpisode();
  }, [loadEpisode]);

  useEffect(() => {
    setPreviewFlags(getCachedItemSectionFlags(episodeId));
  }, [episodeId]);

  const handleShare = useCallback(() => {
    shareResolvedUrl(buildPublicShareUrl('episode', episodeId));
  }, [episodeId]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={styles.headerActions}>
          <HeaderBarAction
            accessibilityLabel={t('features.share')}
            icon="share-outline"
            onPress={handleShare}
            testID="episode-detail-share"
          />
        </View>
      ),
    });
  }, [handleShare, navigation, styles.headerActions, t]);

  const {
    activeTab,
    chapterRows,
    clipHasMore,
    clipRows,
    clipSort,
    isLoadingMoreClips,
    isPrefsHydrated,
    isTabLoading,
    loadMoreClips: handleLoadMoreClips,
    loadTab,
    selectClipSort: handleClipSortSelect,
    selectTab: handleTabPress,
    soundbiteRows,
    supportedTabs,
    tabErrorKey,
    transcriptText,
  } = useEpisodeSectionPanes({
    episode,
    itemIdText: episodeId,
    offlineModeEnabled,
    previewFlags,
  });
  const chapterListShowsImages = chapterSectionHasImages(chapterRows);
  const chapterFallbackImageUrl = episode !== null ? getItemPrimaryImageUrl(episode) : null;

  useEffect(() => {
    listRef.current?.scrollToOffset({ animated: false, offset: 0 });
  }, [activeTab]);

  const clipSortOptions = useMemo<MenuSelectChipOption<EpisodeClipSort>[]>(() => {
    return EPISODE_CLIP_SORT_OPTIONS.map((option) => ({
      label: t(CLIP_SORT_LABEL_KEYS[option]),
      testID: `episode-detail-clip-sort-${option}`,
      value: option,
    }));
  }, [t]);

  const sectionChips = useMemo<SectionChipItem<EpisodeTab>[]>(
    () =>
      supportedTabs.map((tab) => ({
        key: tab,
        label: t(EPISODE_TAB_LABEL_KEYS[tab]),
        testID: `episode-detail-tab-${tab}`,
      })),
    [supportedTabs, t]
  );

  const descriptionValue = useMemo(() => {
    if (
      episode?.item_description?.value === undefined ||
      episode.item_description.value.length === 0
    ) {
      return '';
    }

    return htmlToPlainText(episode.item_description.value);
  }, [episode]);

  const displayDescription = useMemo(() => {
    if (descriptionExpanded || descriptionValue.length <= 360) {
      return descriptionValue;
    }

    return `${descriptionValue.slice(0, 360)}…`;
  }, [descriptionExpanded, descriptionValue]);

  const downloadableEpisode = useMemo((): DTOItem | null => {
    if (episode === null) {
      return null;
    }
    if (episode.channel !== undefined || channel === null) {
      return episode;
    }
    return { ...episode, channel };
  }, [channel, episode]);

  const episodeRow = useMemo((): HomeFeedRowData | null => {
    if (downloadableEpisode === null) {
      return null;
    }

    const row = mapItemToHomeFeedRow(downloadableEpisode);
    return {
      ...row,
      subtitle: channelTitle ?? row.subtitle,
    };
  }, [channelTitle, downloadableEpisode]);

  const handleAddToPlaylist = useCallback(
    (row: HomeFeedRowData) => {
      if (status !== 'authenticated') {
        openGate('needs_account');
        return;
      }
      requestAddToPlaylist({ idText: row.id, kind: 'item', medium: 'av' });
    },
    [openGate, requestAddToPlaylist, status]
  );

  const handleMarkAsPlayed = useCallback(
    (row: HomeFeedRowData) => {
      runMarkAsPlayedAction(row, 'episodes');
    },
    [runMarkAsPlayedAction]
  );

  const handleEpisodeShare = useCallback((row: HomeFeedRowData) => {
    shareResolvedUrl(buildPublicShareUrl('episode', row.id));
  }, []);

  const handleOpenPodcast = useCallback(() => {
    if (channel === null) {
      return;
    }
    const podcastId = channel.id_text;
    if (podcastId.length === 0) {
      return;
    }
    navigation.navigate(
      CHANNEL_BROWSE_STACK_ROUTES.PodcastDetail,
      buildPodcastDetailParams({
        podcastId,
        previewImageUrl: primaryChannelListArtworkUrl(channel.channel_images),
        previewTitle: channel.title,
      })
    );
  }, [channel, navigation]);

  const listRows = useMemo((): EpisodePaneRow[] => {
    if (isTabLoading) {
      return [];
    }
    if (activeTab === 'clips') {
      return clipRows.map((clip) => ({ clip, id: clip.id_text, type: 'clip' }));
    }
    if (activeTab === 'chapters') {
      return chapterRows.map((chapter) => ({ chapter, id: chapter.id_text, type: 'chapter' }));
    }
    if (activeTab === 'soundbites') {
      return soundbiteRows.map((soundbite, index) => ({
        id: soundbite.id_text,
        index,
        soundbite,
        type: 'soundbite',
      }));
    }
    return [];
  }, [activeTab, chapterRows, clipRows, isTabLoading, soundbiteRows]);

  const podcastTitle = channel?.title ?? channelTitle ?? t('media.podcast.podcast');
  const canOpenPodcast = channel !== null && channel.id_text.length > 0;

  const handleEpisodePlay = useCallback(
    (row: HomeFeedRowData) => {
      runPlayAction(row, 'episodes');
    },
    [runPlayAction]
  );

  const handleEpisodeQueue = useCallback(
    (row: HomeFeedRowData, position: QueueActionPosition) => {
      runQueueAction(row, 'episodes', position);
    },
    [runQueueAction]
  );

  const handleClipPlay = useCallback(
    (row: HomeFeedRowData) => {
      runPlayAction(row, 'clips');
    },
    [runPlayAction]
  );

  const handleClipQueue = useCallback(
    (row: HomeFeedRowData, position: QueueActionPosition) => {
      runQueueAction(row, 'clips', position);
    },
    [runQueueAction]
  );

  const handleSoundbitePlay = useCallback(
    (soundbite: DTOItemSoundbite) => {
      if (episode !== null && channel !== null) {
        void playSoundbite(soundbite, episode, channel);
      }
    },
    [channel, episode, playSoundbite]
  );

  const handleClipRowPress = useCallback(
    (clipId: string) => {
      navigation.navigate(CHANNEL_BROWSE_STACK_ROUTES.ClipDetail, { clipId });
    },
    [navigation]
  );

  const handleToggleDescription = useCallback(() => {
    setDescriptionExpanded((current) => !current);
  }, []);

  const handleRetryEpisode = useCallback(() => {
    void loadEpisode();
  }, [loadEpisode]);

  const handleRetryTab = useCallback(() => {
    void loadTab(activeTab);
  }, [activeTab, loadTab]);

  const handleLoadMoreClipsPress = useCallback(() => {
    void handleLoadMoreClips();
  }, [handleLoadMoreClips]);

  const listRowCount = listRows.length;

  const listHeader = useMemo(
    () =>
      downloadableEpisode !== null && episodeRow !== null ? (
        <View>
          <EpisodePlayChrome
            episode={downloadableEpisode}
            episodeRow={episodeRow}
            onAddToPlaylistPress={handleAddToPlaylist}
            onMarkAsPlayedPress={handleMarkAsPlayed}
            onPlayPress={handleEpisodePlay}
            onPodcastPress={canOpenPodcast ? handleOpenPodcast : undefined}
            onQueuePress={handleEpisodeQueue}
            onSharePress={handleEpisodeShare}
            podcastTitle={podcastTitle}
          />
          {playbackNoticeKey !== null ? (
            <Text style={styles.notice}>{t(playbackNoticeKey)}</Text>
          ) : null}
          <View style={styles.chipRow}>
            <SectionChipRow
              items={sectionChips}
              trailing={
                activeTab === 'clips' ? (
                  <MenuSelectChip
                    heading={t('filters.screen.sort_heading')}
                    onSelect={handleClipSortSelect}
                    options={clipSortOptions}
                    testID="episode-detail-clip-sort"
                    value={clipSort}
                  />
                ) : undefined
              }
              onSelect={handleTabPress}
              selectedKey={activeTab}
              testID="episode-detail-sections"
            />
          </View>
        </View>
      ) : null,
    [
      activeTab,
      canOpenPodcast,
      clipSort,
      clipSortOptions,
      downloadableEpisode,
      episodeRow,
      handleAddToPlaylist,
      handleClipSortSelect,
      handleEpisodePlay,
      handleEpisodeQueue,
      handleEpisodeShare,
      handleMarkAsPlayed,
      handleOpenPodcast,
      handleTabPress,
      playbackNoticeKey,
      podcastTitle,
      sectionChips,
      styles.chipRow,
      styles.notice,
      t,
    ]
  );

  const paneFooter = useMemo(() => {
    if (isTabLoading) {
      return <LoadingSection testID={`episode-detail-tab-loading-${activeTab}`} />;
    }

    if (tabErrorKey !== null) {
      return (
        <ListError
          messageKey={tabErrorKey}
          onRetry={handleRetryTab}
          testID={`episode-detail-tab-error-${activeTab}`}
        />
      );
    }

    if (offlineModeEnabled && isEpisodeTabNetworkBody(activeTab)) {
      const hasCachedBody =
        (activeTab === 'chapters' && chapterRows.length > 0) ||
        (activeTab === 'soundbites' && soundbiteRows.length > 0) ||
        (activeTab === 'clips' && clipRows.length > 0) ||
        (activeTab === 'transcript' && transcriptText.length > 0);
      if (!hasCachedBody) {
        return (
          <ListEmpty
            messageKey={OFFLINE_UNAVAILABLE_MESSAGE_KEY}
            testID="episode-detail-offline-unavailable"
          />
        );
      }
    }

    if (activeTab === 'summary') {
      return (
        <View testID="episode-detail-summary">
          <Text style={styles.description} testID="episode-detail-description">
            {displayDescription.length > 0 ? displayDescription : t('info.summary.no_summary')}
          </Text>
          {descriptionValue.length > 360 ? (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded: descriptionExpanded }}
              onPress={handleToggleDescription}
              testID="episode-detail-description-toggle"
            >
              <Text style={styles.showMore}>
                {t(descriptionExpanded ? 'info.show_less' : 'info.show_more')}
              </Text>
            </Pressable>
          ) : null}
          <ItemSummaryPeople
            itemPersons={episode?.item_persons ?? []}
            testIDPrefix="episode-detail"
          />
        </View>
      );
    }

    if (activeTab === 'funding') {
      return (
        <FundingLinksSection
          fundings={episode?.item_fundings ?? []}
          isLoading={episode === null}
          layout="inline"
          testIDPrefix="episode-detail"
        />
      );
    }

    if (activeTab === 'transcript') {
      return transcriptText.length === 0 ? (
        <ListEmpty messageKey="misc.info" testID="episode-detail-tab-empty-transcript" />
      ) : (
        <Text style={styles.transcript} testID="episode-detail-tab-transcript-content">
          {transcriptText}
        </Text>
      );
    }

    if (activeTab === 'chapters' && chapterRows.length === 0) {
      return <ListEmpty messageKey="misc.info" testID="episode-detail-tab-empty-chapters" />;
    }

    if (activeTab === 'soundbites' && soundbiteRows.length === 0) {
      return (
        <ListEmpty
          messageKey="info.soundbite.no_official_clips_found"
          testID="episode-detail-tab-empty-soundbites"
        />
      );
    }

    if (activeTab === 'clips' && clipRows.length === 0) {
      return (
        <ListEmpty
          messageKey="features.clip.no_clips_found"
          testID="episode-detail-tab-empty-clips"
        />
      );
    }

    if (activeTab === 'clips' && clipHasMore) {
      return (
        <Pressable
          accessibilityRole="button"
          onPress={handleLoadMoreClipsPress}
          style={styles.loadMore}
          testID="episode-detail-clip-load-more"
        >
          <Text style={styles.loadMoreLabel}>
            {isLoadingMoreClips ? t('misc.loading') : t('info.show_more')}
          </Text>
        </Pressable>
      );
    }

    return null;
  }, [
    activeTab,
    chapterRows.length,
    clipHasMore,
    clipRows.length,
    descriptionExpanded,
    descriptionValue.length,
    displayDescription,
    episode,
    handleLoadMoreClipsPress,
    handleRetryTab,
    handleToggleDescription,
    isLoadingMoreClips,
    isTabLoading,
    offlineModeEnabled,
    soundbiteRows.length,
    styles.description,
    styles.loadMore,
    styles.loadMoreLabel,
    styles.showMore,
    styles.transcript,
    t,
    tabErrorKey,
    transcriptText,
  ]);

  const renderItem = useCallback(
    ({ item: row, index }: { item: EpisodePaneRow; index: number }) => {
      const isLast = index === listRowCount - 1;
      if (row.type === 'chapter') {
        return (
          <EpisodeChapterRow
            chapter={row.chapter}
            fallbackImageUrl={chapterFallbackImageUrl}
            isLast={isLast}
            showImages={chapterListShowsImages}
          />
        );
      }

      if (row.type === 'soundbite') {
        return (
          <EpisodeSoundbiteRow
            isLast={isLast}
            onPlay={handleSoundbitePlay}
            onQueue={handleClipQueue}
            soundbite={row.soundbite}
            soundbiteIndex={row.index}
          />
        );
      }

      return (
        <EpisodeClipRow
          clip={row.clip}
          isLast={isLast}
          onPlay={handleClipPlay}
          onPress={handleClipRowPress}
          onQueue={handleClipQueue}
        />
      );
    },
    [
      chapterFallbackImageUrl,
      chapterListShowsImages,
      handleClipPlay,
      handleClipQueue,
      handleClipRowPress,
      handleSoundbitePlay,
      listRowCount,
    ]
  );

  return (
    <View style={styles.container} testID="episode-detail-screen">
      {isLoading ? <LoadingSection testID="episode-detail-loading" /> : null}
      {!isLoading && offlineModeEnabled && episode === null ? (
        <ListEmpty
          messageKey={OFFLINE_UNAVAILABLE_MESSAGE_KEY}
          testID="episode-detail-offline-unavailable"
        />
      ) : null}
      {!isLoading && errorKey !== null ? (
        <ListError
          messageKey={errorKey}
          onRetry={handleRetryEpisode}
          testID="episode-detail-error"
        />
      ) : null}
      {!isLoading && errorKey === null && episode !== null && !isPrefsHydrated ? (
        <LoadingSection testID="episode-detail-tab-prefs-loading" />
      ) : null}
      {!isLoading && errorKey === null && episode !== null && isPrefsHydrated ? (
        <FillList
          ListEmptyComponent={null}
          ListFooterComponent={paneFooter}
          ListHeaderComponent={listHeader}
          contentContainerStyle={styles.listContent}
          data={listRows}
          extraData={`${activeTab}:${clipSort}:${clipHasMore}:${isTabLoading}`}
          keyExtractor={episodePaneRowKeyExtractor}
          ref={listRef}
          renderItem={renderItem}
          style={styles.list}
          testID={
            activeTab === 'clips'
              ? 'episode-detail-clip-list'
              : activeTab === 'chapters'
                ? 'episode-detail-chapter-list'
                : activeTab === 'soundbites'
                  ? 'episode-detail-soundbite-list'
                  : 'episode-detail-list'
          }
        />
      ) : null}
      {addToPlaylistSheet}
    </View>
  );
}
