import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { LayoutChangeEvent } from 'react-native';
import { BackHandler, FlatList, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { breakpoints } from '@podverse/design-tokens';
import { MEDIA_JUMP_BACK_SECONDS, MEDIA_JUMP_FORWARD_SECONDS } from '@podverse/helpers';
import type {
  DTOChannel,
  DTOClip,
  DTOItem,
  DTOItemChapter,
  DTOItemSoundbite,
} from '@podverse/helpers/dto';
import { htmlToPlainText } from '@podverse/helpers/html';
import { formatPlaybackTime } from '@podverse/helpers/time';
import type { PlaybackTarget } from '@podverse/playback-core';

import { requestWithMobileAuthRefresh, useAuth } from '../../auth';
import { nativePlaybackBridge } from '../../bridge/nativePlaybackBridge';
import type { MenuSelectChipOption, SectionChipItem } from '../../components/form';
import { MenuSelectChip, SectionChipRow } from '../../components/form';
import { FullPlayerActionRow } from '../../components/player/FullPlayerActionRow';
import { FullPlayerArtwork } from '../../components/player/FullPlayerArtwork';
import { FullPlayerMoreSheet } from '../../components/player/FullPlayerMoreSheet';
import {
  hasNextQueueItem,
  resolveAddToPlaylistTarget,
  resolveQueueMutationTarget,
  shouldShowV4vAction,
} from '../../components/player/fullPlayerRows';
import { FullPlayerScrubber } from '../../components/player/FullPlayerScrubber';
import { FullPlayerSegmentBand } from '../../components/player/FullPlayerSegmentBand';
import { FullPlayerTransportRow } from '../../components/player/FullPlayerTransportRow';
import { FullPlayerUtilityRow } from '../../components/player/FullPlayerUtilityRow';
import { LIST_REMOVE_CLIPPED_SUBVIEWS } from '../../components/primitives/listVirtualization';
import { MarqueeText } from '../../components/primitives/MarqueeText';
import { ListEmpty } from '../../components/state/ListEmpty';
import { ListError } from '../../components/state/ListError';
import { LoadingSection } from '../../components/state/LoadingSection';
import { getMobileConfig } from '../../config';
import { useAutoQueue } from '../../contexts/AutoQueueProvider';
import { getItemPrimaryImageUrl } from '../../data/repositories/channelItemWindow';
import { mapDirectoryChannelToSubscribed } from '../../data/repositories/subscriptionsMerge';
import { subscriptionsRepository } from '../../data/repositories/subscriptionsRepository';
import { usePrimaryQueue } from '../../hooks/usePrimaryQueue';
import { useQueueMutations } from '../../hooks/useQueueMutations';
import { useQueueResources } from '../../hooks/useQueueResources';
import { homeFeedRefresh } from '../../lib/home/homeFeedRefresh';
import {
  isEpisodeTabNetworkBody,
  OFFLINE_UNAVAILABLE_MESSAGE_KEY,
} from '../../lib/offlineModeViews';
import { clipToHomeRow } from '../../lib/rows/homeRowMappers';
import { buildNowPlayingShareUrl, shareResolvedUrl } from '../../lib/share/shareNowPlaying';
import { useMembershipGate } from '../../membership/MembershipGateProvider';
import { useAccessTier } from '../../membership/useAccessTier';
import { ROOT_SLIDE_UP_ANIMATION_MS } from '../../navigation/slideUpScreen';
import { usePlaybackSession } from '../../playback/PlaybackProvider';
import { hasEpisodeChaptersForTrackButtons } from '../../playback/previousAction';
import { useNowPlayingChapters } from '../../playback/useNowPlayingChapters';
import type { EpisodeClipSort, EpisodeTab } from '../../prefs/detailListPrefs';
import { EPISODE_CLIP_SORT_OPTIONS } from '../../prefs/detailListPrefs';
import { useOfflineMode } from '../../prefs/offlineMode';
import { listChipRowBottomGap } from '../../theme/screenLayout';
import { useResponsive } from '../../theme/useResponsive';
import { useTheme } from '../../theme/useTheme';
import {
  EPISODE_TAB_LABEL_KEYS,
  itemHasChapters,
  itemSectionFlagsFromDto,
} from '../episode/episodeTabs';
import { useEpisodeSectionPanes } from '../episode/useEpisodeSectionPanes';
import type { HomeFeedRowData } from '../home/homeFeedData';
import { HomeFeedRow } from '../home/HomeFeedRow';
import { useHomeRowPlayback } from '../home/useHomeRowPlayback';
import { useAddToPlaylist } from '../library/useAddToPlaylist';
import {
  FULL_PLAYER_ARTWORK_MAX_PHONE,
  FULL_PLAYER_ARTWORK_MAX_TABLET,
  FULL_PLAYER_CHIP_HEADER_HEIGHT,
  FULL_PLAYER_CONTROL_STACK_GAP,
  FULL_PLAYER_REGION_BOTTOM_PADDING,
  FULL_PLAYER_REGION_GAP,
  FULL_PLAYER_REGION_TOP_PADDING,
  FULL_PLAYER_TITLE_BLOCK_HEIGHT,
  resolveFullPlayerLayout,
} from './fullPlayerLayout';
import { FullPlayerSleepTimer } from './FullPlayerSleepTimer';
import { FullPlayerSpeedControl } from './FullPlayerSpeedControl';

type FullPlayerScreenProps = {
  onClose: () => void;
  onOpenMakeClip: (params: { mode: 'create' } | { mode: 'edit'; clipId: string }) => void;
  /** Navigate to the Library queue screen. */
  onOpenQueue: () => void;
  /** Navigate to the V4V information screen. */
  onOpenV4v: () => void;
};

type FullPlayerSheet = 'more' | 'sleep' | 'speed' | null;

type FullPlayerPaneRow =
  | { type: 'chapter'; id: string; chapter: DTOItemChapter }
  | { type: 'clip'; id: string; clip: DTOClip }
  | { type: 'soundbite'; id: string; index: number; soundbite: DTOItemSoundbite };

const CLIP_SORT_LABEL_KEYS: Record<EpisodeClipSort, string> = {
  oldest: 'filters.sort.oldest',
  recent: 'filters.sort.recent',
};

const EMPTY_PANE_ROWS: FullPlayerPaneRow[] = [];

const scrollPaneListToTop = (list: FlatList<FullPlayerPaneRow> | null): void => {
  list?.scrollToOffset({ animated: false, offset: 0 });
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
    subtitle: formatPlaybackTime(soundbite.start_time),
    title: soundbite.title ?? `${fallbackTitle} ${index + 1}`,
  };
};

const itemFromTarget = (target: PlaybackTarget | null): DTOItem | null => {
  if (target === null) {
    return null;
  }
  switch (target.kind) {
    case 'clip':
    case 'soundbite':
    case 'chapter':
    case 'item-podcast':
    case 'item-video':
    case 'item-music':
      return target.item;
    case 'livestream':
      return target.item;
    case 'add-by-rss':
      return null;
  }
};

const channelFromTarget = (target: PlaybackTarget | null): DTOChannel | null => {
  if (target === null) {
    return null;
  }
  switch (target.kind) {
    case 'clip':
    case 'soundbite':
    case 'chapter':
    case 'item-podcast':
    case 'item-video':
    case 'item-music':
    case 'livestream':
      return target.channel;
    case 'add-by-rss':
      return null;
  }
};

const hasSectionsForTarget = (target: PlaybackTarget | null): boolean => {
  if (target === null) {
    return false;
  }
  if (target.kind === 'add-by-rss') {
    return false;
  }
  if (target.kind === 'livestream' && target.item === null) {
    return false;
  }
  return itemFromTarget(target) !== null;
};

export function FullPlayerScreen({
  onClose,
  onOpenMakeClip,
  onOpenQueue,
  onOpenV4v,
}: FullPlayerScreenProps) {
  const { t } = useTranslation();
  const { isTablet } = useResponsive();
  const insets = useSafeAreaInsets();
  const { styles: themeStyles, tokens } = useTheme();
  const { accessToken, clearSession, refreshToken, setTokens, status } = useAuth();
  const { enabled: offlineModeEnabled } = useOfflineMode();
  const { autoQueueActiveRow, autoQueueConfig, autoQueueResources, setAutoQueueConfig } =
    useAutoQueue();
  const { fetchPrimaryQueue } = usePrimaryQueue();
  const { fetchUpcoming } = useQueueResources();
  const { markAsPlayed } = useQueueMutations();
  const { evaluateFeature, isTierKnown } = useAccessTier();
  const { handleGateError, openGate } = useMembershipGate();
  const { addToPlaylistSheet, requestAddToPlaylist } = useAddToPlaylist();
  const {
    activeTarget,
    enclosureSelectedParams,
    itemLabeledEnclosures,
    jumpBy,
    nowPlaying,
    pause,
    playbackRate,
    playSoundbite,
    resume,
    retryPlayback,
    seekTo,
    skipToNext,
    skipToNextTrack,
    skipToPrevious,
    skipToPreviousTrack,
    switchEnclosureSelectedParams,
    transportState,
  } = usePlaybackSession();
  const { chapters } = useNowPlayingChapters();
  const { playbackNoticeKey, runPlayAction, runQueueAction } = useHomeRowPlayback();
  const paneListRef = useRef<FlatList<FullPlayerPaneRow>>(null);

  const [viewportHeight, setViewportHeight] = useState(0);
  const [viewportWidth, setViewportWidth] = useState(0);
  const [chipStripHeight, setChipStripHeight] = useState(FULL_PLAYER_CHIP_HEADER_HEIGHT);
  const [openSheet, setOpenSheet] = useState<FullPlayerSheet>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isMarkedPlayed, setIsMarkedPlayed] = useState(false);
  const [manualUpcomingCount, setManualUpcomingCount] = useState(0);
  const [actionNoticeKey, setActionNoticeKey] = useState<string | null>(null);
  const [isSavingSubscription, setIsSavingSubscription] = useState(false);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);

  const isV4vEnabled = getMobileConfig().isV4vEnabled;
  const authContext = useMemo(
    () => ({ accessToken, clearSession, refreshToken, setTokens }),
    [accessToken, clearSession, refreshToken, setTokens]
  );
  const contentMaxWidth = isTablet ? breakpoints.lg : viewportWidth;

  const currentItem = itemFromTarget(activeTarget);
  const currentItemIdText = currentItem?.id_text ?? null;
  const episodeForPanes = useMemo(() => {
    if (currentItem === null) {
      return null;
    }
    if (itemHasChapters(currentItem) || chapters.length === 0) {
      return currentItem;
    }
    return {
      ...currentItem,
      item_chapters_feed: {
        id: 0,
        item_id: currentItem.id,
        type: 'application/json',
        url: '',
      },
    };
  }, [chapters.length, currentItem]);
  const previewFlags = episodeForPanes === null ? null : itemSectionFlagsFromDto(episodeForPanes);
  const channel = channelFromTarget(activeTarget);
  const hasSections = hasSectionsForTarget(activeTarget);
  const isPlaybackActive = activeTarget !== null && nowPlaying !== null;
  const shareUrl = activeTarget !== null ? buildNowPlayingShareUrl(activeTarget) : null;
  const addToPlaylistTarget = resolveAddToPlaylistTarget(activeTarget);
  const showV4v = shouldShowV4vAction(activeTarget, isV4vEnabled);
  const activePaneNoticeKey = actionNoticeKey ?? playbackNoticeKey;
  const summaryText = useMemo(() => {
    const value = currentItem?.item_description?.value;
    if (value === undefined || value === null || value.length === 0) {
      return '';
    }
    return htmlToPlainText(value).trim();
  }, [currentItem?.item_description?.value]);
  const displayedSummary = useMemo(() => {
    if (descriptionExpanded || summaryText.length <= 360) {
      return summaryText;
    }
    return `${summaryText.slice(0, 360)}…`;
  }, [descriptionExpanded, summaryText]);

  const {
    activeTab,
    chapterRows,
    clipHasMore,
    clipRows,
    clipSort,
    isLoadingMoreClips,
    isPrefsHydrated,
    isTabLoading,
    loadMoreClips,
    loadTab,
    selectClipSort,
    selectTab,
    soundbiteRows,
    supportedTabs,
    tabErrorKey,
    transcriptText,
  } = useEpisodeSectionPanes({
    episode: episodeForPanes,
    itemIdText: currentItemIdText,
    offlineModeEnabled,
    previewFlags,
  });

  const autoUpcomingCount = useMemo(
    () =>
      Object.keys(autoQueueResources)
        .map(Number)
        .filter((rowIndex) => rowIndex > autoQueueActiveRow).length,
    [autoQueueActiveRow, autoQueueResources]
  );
  const canSkipToNext = hasNextQueueItem(manualUpcomingCount, autoUpcomingCount);
  const isMusicNowPlaying = activeTarget?.kind === 'item-music';
  const episodeHasChaptersForTrackButtons = hasEpisodeChaptersForTrackButtons(
    activeTarget,
    chapters
  );
  const canToggleSubscription = channel !== null;

  const sectionChips = useMemo<SectionChipItem<EpisodeTab>[]>(
    () =>
      supportedTabs.map((tab) => ({
        key: tab,
        label: t(EPISODE_TAB_LABEL_KEYS[tab]),
        testID: `full-player-section-${tab}`,
      })),
    [supportedTabs, t]
  );
  const clipSortOptions = useMemo<MenuSelectChipOption<EpisodeClipSort>[]>(() => {
    return EPISODE_CLIP_SORT_OPTIONS.map((option) => ({
      label: t(CLIP_SORT_LABEL_KEYS[option]),
      testID: `full-player-clip-sort-${option}`,
      value: option,
    }));
  }, [t]);
  const listRows = useMemo((): FullPlayerPaneRow[] => {
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
  const paneRows =
    !hasSections || !isPrefsHydrated || supportedTabs.length === 0 ? EMPTY_PANE_ROWS : listRows;

  const layout = useMemo(
    () =>
      resolveFullPlayerLayout({
        chipStripHeight,
        hasSections,
        isTablet,
        maxContentWidth: Math.max(
          0,
          Math.min(contentMaxWidth, viewportWidth) - tokens.spacing.lg * 2
        ),
        safeAreaBottom: insets.bottom,
        safeAreaTop: 0,
        viewportHeight,
        viewportWidth,
      }),
    [
      chipStripHeight,
      contentMaxWidth,
      hasSections,
      insets.bottom,
      isTablet,
      tokens.spacing.lg,
      viewportHeight,
      viewportWidth,
    ]
  );
  const artworkSizeCap = isTablet ? FULL_PLAYER_ARTWORK_MAX_TABLET : FULL_PLAYER_ARTWORK_MAX_PHONE;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        actionNotice: {
          color: themeStyles.textSecondary.color,
          marginTop: tokens.spacing.md,
        },
        chapterRow: {
          borderBottomColor: themeStyles.border.borderColor,
          borderBottomWidth: StyleSheet.hairlineWidth,
          paddingHorizontal: tokens.spacing.lg,
          paddingVertical: tokens.spacing.base,
        },
        chapterRowLast: {
          borderBottomWidth: 0,
        },
        chapterTime: {
          color: themeStyles.textSecondary.color,
          marginTop: tokens.spacing.xs,
        },
        chapterTitle: {
          color: themeStyles.textPrimary.color,
          fontSize: 16,
          fontWeight: '600',
        },
        chipHeader: {
          backgroundColor: themeStyles.screen.backgroundColor,
          justifyContent: 'center',
          minHeight: FULL_PLAYER_CHIP_HEADER_HEIGHT,
          paddingHorizontal: tokens.spacing.lg,
        },
        chipRowSlot: {
          justifyContent: 'center',
          paddingTop: listChipRowBottomGap(tokens.spacing),
        },
        column: {
          alignSelf: 'center',
          maxWidth: contentMaxWidth,
          width: '100%',
        },
        container: {
          backgroundColor: themeStyles.screen.backgroundColor,
          flex: 1,
        },
        headerSafeSpacer: {
          height: insets.bottom,
        },
        list: {
          flex: 1,
        },
        listContent: {
          paddingBottom: Math.max(tokens.spacing['2xl'], insets.bottom + tokens.spacing.xl),
        },
        listHeader: {
          backgroundColor: themeStyles.screen.backgroundColor,
        },
        loadMore: {
          marginTop: tokens.spacing.md,
        },
        loadMoreLabel: {
          color: themeStyles.textPrimary.color,
          fontSize: 14,
          fontWeight: '600',
        },
        pane: {
          paddingBottom: tokens.spacing.lg,
          paddingHorizontal: tokens.spacing.lg,
          paddingTop: tokens.spacing.md,
        },
        paneEmpty: {
          color: themeStyles.textSecondary.color,
          fontSize: 15,
        },
        paneText: {
          color: themeStyles.textPrimary.color,
          fontSize: 16,
          lineHeight: 24,
        },
        playerRegion: {
          backgroundColor: themeStyles.screen.backgroundColor,
          // A viewport too short for the fixed bands clips them here rather than letting them paint
          // over the chip strip below.
          overflow: 'hidden',
        },
        playerRegionFull: {
          paddingBottom: FULL_PLAYER_REGION_BOTTOM_PADDING,
          paddingHorizontal: tokens.spacing.lg,
          paddingTop: FULL_PLAYER_REGION_TOP_PADDING,
        },
        playerRegionContent: {
          alignItems: 'stretch',
          flex: 1,
          width: '100%',
        },
        playerRegionControlStack: {
          gap: FULL_PLAYER_CONTROL_STACK_GAP,
          marginTop: FULL_PLAYER_CONTROL_STACK_GAP,
          width: '100%',
        },
        playerRegionArtworkPassThrough: {
          flexGrow: 1,
          flexShrink: 1,
          minHeight: 0,
          width: '100%',
        },
        playerRegionUpperBands: {
          alignItems: 'stretch',
          flexGrow: 1,
          flexShrink: 1,
          gap: FULL_PLAYER_REGION_GAP,
          minHeight: 0,
          width: '100%',
        },
        showMore: {
          color: themeStyles.textSecondary.color,
          marginTop: tokens.spacing.sm,
        },
        subtitle: {
          color: tokens.text.accent,
          fontSize: 15,
          fontWeight: '600',
          textAlign: 'center',
        },
        title: {
          color: themeStyles.textPrimary.color,
          fontSize: 22,
          fontWeight: '600',
          minWidth: 0,
        },
        titleBlock: {
          alignItems: 'center',
          gap: tokens.spacing.xs,
          justifyContent: 'center',
          minHeight: FULL_PLAYER_TITLE_BLOCK_HEIGHT,
        },
        viewport: {
          flex: 1,
        },
      }),
    [contentMaxWidth, insets.bottom, themeStyles, tokens]
  );

  // Expand re-parents the single native surface to the `full` target; collapse (unmount) animates it
  // back to `mini`. Reparenting + geometry only — never `load`/`destroy`, so playback stays
  // continuous. The `full` target view is the `PodverseVideoSurfaceView`
  // rendered below, which registers itself with the host; this only flips which target is active.
  useEffect(() => {
    nativePlaybackBridge.animateVideoSurface('full', ROOT_SLIDE_UP_ANIMATION_MS);
    return () => {
      nativePlaybackBridge.animateVideoSurface('mini', ROOT_SLIDE_UP_ANIMATION_MS);
    };
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'android') {
      return;
    }

    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });

    return () => {
      subscription.remove();
    };
  }, [onClose]);

  useEffect(() => {
    setIsMarkedPlayed(false);
  }, [activeTarget]);

  useEffect(() => {
    setDescriptionExpanded(false);
  }, [currentItemIdText]);

  useEffect(() => {
    scrollPaneListToTop(paneListRef.current);
  }, [currentItemIdText]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (channel === null) {
        if (!cancelled) {
          setIsSubscribed(false);
        }
        return;
      }
      const subscribed = await subscriptionsRepository.isSubscribed(channel.id_text);
      if (!cancelled) {
        setIsSubscribed(subscribed);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [channel]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (activeTarget === null) {
        if (!cancelled) {
          setManualUpcomingCount(0);
        }
        return;
      }

      try {
        const queue = await fetchPrimaryQueue();
        if (queue === null) {
          if (!cancelled) {
            setManualUpcomingCount(0);
          }
          return;
        }
        const upcoming = await fetchUpcoming(queue.id_text);
        if (!cancelled) {
          setManualUpcomingCount(upcoming.length);
        }
      } catch {
        if (!cancelled) {
          setManualUpcomingCount(0);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeTarget, fetchPrimaryQueue, fetchUpcoming]);

  const handleOpenSheet = (sheet: Exclude<FullPlayerSheet, null>) => {
    setOpenSheet(sheet);
  };

  const handleCloseSheet = () => {
    setOpenSheet(null);
  };

  const handleShare = () => {
    shareResolvedUrl(shareUrl);
  };

  const handleViewportLayout = (event: LayoutChangeEvent) => {
    setViewportHeight(event.nativeEvent.layout.height);
    setViewportWidth(event.nativeEvent.layout.width);
  };

  // The strip grows with the OS font setting, so the peek reserve follows the measured chips rather
  // than the default-size constant — otherwise pane copy reappears under them at large text sizes.
  const handleChipStripLayout = useCallback((event: LayoutChangeEvent) => {
    const { height } = event.nativeEvent.layout;
    setChipStripHeight((current) => (Math.abs(current - height) < 1 ? current : height));
  }, []);

  const handlePlay = () => {
    void resume();
  };

  const handlePause = () => {
    pause();
  };

  const handleToggleShuffle = useCallback(() => {
    setAutoQueueConfig({
      ...autoQueueConfig,
      random: !autoQueueConfig.random,
    });
  }, [autoQueueConfig, setAutoQueueConfig]);

  const handleToggleRepeat = useCallback(() => {
    setAutoQueueConfig({
      ...autoQueueConfig,
      repeat: !autoQueueConfig.repeat,
    });
  }, [autoQueueConfig, setAutoQueueConfig]);

  const handleRetry = () => {
    void retryPlayback();
  };

  const handleAddToPlaylist = useCallback(() => {
    if (addToPlaylistTarget === null) {
      return;
    }
    requestAddToPlaylist(addToPlaylistTarget);
  }, [addToPlaylistTarget, requestAddToPlaylist]);

  const handleToggleSubscription = useCallback(() => {
    if (channel === null || isSavingSubscription) {
      return;
    }

    void (async () => {
      setIsSavingSubscription(true);
      setActionNoticeKey(null);
      try {
        if (isSubscribed) {
          const result = await subscriptionsRepository.unsubscribe({
            accountSync: status === 'authenticated' ? authContext : undefined,
            idText: channel.id_text,
            source: 'directory',
          });
          setIsSubscribed(false);
          homeFeedRefresh.notify();
          if (result.serverError) {
            setActionNoticeKey('errors.generic');
          }
          return;
        }

        const entry = mapDirectoryChannelToSubscribed(channel);
        if (entry === null) {
          setActionNoticeKey('errors.generic');
          return;
        }

        if (status === 'authenticated' && isTierKnown) {
          const access = evaluateFeature('subscribe_sync');
          if (!access.allowed) {
            openGate(access.reason);
            return;
          }
        }

        if (status === 'authenticated') {
          try {
            await requestWithMobileAuthRefresh(authContext, async (api) =>
              api.reqAccountFollowChannel({ channel_id_text: channel.id_text })
            );
          } catch (error) {
            if (handleGateError(error)) {
              return;
            }
            setActionNoticeKey('errors.generic');
            return;
          }
        }

        await subscriptionsRepository.subscribeLocal(entry);
        setIsSubscribed(true);
        homeFeedRefresh.notify();
      } finally {
        setIsSavingSubscription(false);
      }
    })();
  }, [
    authContext,
    channel,
    evaluateFeature,
    handleGateError,
    isSavingSubscription,
    isSubscribed,
    isTierKnown,
    openGate,
    status,
  ]);

  const handleMarkAsPlayed = useCallback(() => {
    const target = resolveQueueMutationTarget(activeTarget);
    if (target === null) {
      return;
    }

    if (isTierKnown) {
      const access = evaluateFeature('queue_history_sync');
      if (!access.allowed) {
        openGate(access.reason);
        return;
      }
    }

    void (async () => {
      const nextCompleted = !isMarkedPlayed;
      setActionNoticeKey(null);
      try {
        const marked = await markAsPlayed(
          target.idText,
          target.kind,
          target.mediaType,
          nextCompleted
        );
        if (!marked) {
          setActionNoticeKey('features.history.mark_as_played_error');
          return;
        }
        setIsMarkedPlayed(nextCompleted);
        setActionNoticeKey(
          nextCompleted
            ? 'features.history.marked_as_played'
            : 'features.history.marked_as_unplayed'
        );
      } catch (error) {
        if (handleGateError(error)) {
          return;
        }
        setActionNoticeKey('features.history.mark_as_played_error');
      }
    })();
  }, [
    activeTarget,
    evaluateFeature,
    handleGateError,
    isMarkedPlayed,
    isTierKnown,
    markAsPlayed,
    openGate,
  ]);

  const handleChapterPress = useCallback(
    (chapter: DTOItemChapter) => {
      const parsed = Number.parseFloat(chapter.start_time);
      if (!Number.isFinite(parsed) || parsed < 0) {
        return;
      }
      seekTo(parsed);
    },
    [seekTo]
  );

  const renderPaneFooter = useCallback(() => {
    if (!hasSections || !isPrefsHydrated) {
      return null;
    }

    if (isTabLoading) {
      return <LoadingSection testID={`full-player-pane-loading-${activeTab}`} />;
    }

    if (tabErrorKey !== null) {
      return (
        <ListError
          messageKey={tabErrorKey}
          onRetry={() => {
            void loadTab(activeTab);
          }}
          testID={`full-player-pane-error-${activeTab}`}
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
          <View style={styles.pane}>
            <View style={styles.column}>
              <ListEmpty
                messageKey={OFFLINE_UNAVAILABLE_MESSAGE_KEY}
                testID="full-player-offline-unavailable"
              />
            </View>
          </View>
        );
      }
    }

    if (activeTab === 'summary') {
      return (
        <View style={styles.pane} testID="full-player-summary-pane">
          <View style={styles.column}>
            {displayedSummary.length > 0 ? (
              <Text style={styles.paneText} testID="full-player-summary-text">
                {displayedSummary}
              </Text>
            ) : (
              <Text style={styles.paneEmpty}>{t('info.summary.no_summary')}</Text>
            )}
            {summaryText.length > 360 ? (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ expanded: descriptionExpanded }}
                onPress={() => {
                  setDescriptionExpanded((current) => !current);
                }}
                testID="full-player-summary-toggle"
              >
                <Text style={styles.showMore}>
                  {t(descriptionExpanded ? 'info.show_less' : 'info.show_more')}
                </Text>
              </Pressable>
            ) : null}
            {activePaneNoticeKey !== null ? (
              <Text style={styles.actionNotice} testID="full-player-action-notice">
                {t(activePaneNoticeKey)}
              </Text>
            ) : null}
          </View>
        </View>
      );
    }

    if (activeTab === 'transcript') {
      return (
        <View style={styles.pane} testID="full-player-transcript-pane">
          <View style={styles.column}>
            {transcriptText.length === 0 ? (
              <ListEmpty messageKey="misc.info" testID="full-player-empty-transcript" />
            ) : (
              <Text style={styles.paneText} testID="full-player-transcript-text">
                {transcriptText}
              </Text>
            )}
          </View>
        </View>
      );
    }

    if (activeTab === 'chapters' && chapterRows.length === 0) {
      return (
        <View style={styles.pane}>
          <View style={styles.column}>
            <ListEmpty messageKey="misc.info" testID="full-player-empty-chapters" />
          </View>
        </View>
      );
    }

    if (activeTab === 'soundbites' && soundbiteRows.length === 0) {
      return (
        <View style={styles.pane}>
          <View style={styles.column}>
            <ListEmpty
              messageKey="info.soundbite.no_official_clips_found"
              testID="full-player-empty-soundbites"
            />
          </View>
        </View>
      );
    }

    if (activeTab === 'clips' && clipRows.length === 0) {
      return (
        <View style={styles.pane}>
          <View style={styles.column}>
            <ListEmpty messageKey="features.clip.no_clips_found" testID="full-player-empty-clips" />
          </View>
        </View>
      );
    }

    if (activeTab === 'clips' && clipHasMore) {
      return (
        <View style={styles.pane}>
          <View style={styles.column}>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                void loadMoreClips();
              }}
              style={styles.loadMore}
              testID="full-player-clip-load-more"
            >
              <Text style={styles.loadMoreLabel}>
                {isLoadingMoreClips ? t('misc.loading') : t('info.show_more')}
              </Text>
            </Pressable>
          </View>
        </View>
      );
    }

    return null;
  }, [
    activePaneNoticeKey,
    activeTab,
    chapterRows.length,
    clipHasMore,
    clipRows.length,
    descriptionExpanded,
    displayedSummary,
    hasSections,
    isLoadingMoreClips,
    isPrefsHydrated,
    isTabLoading,
    loadMoreClips,
    loadTab,
    offlineModeEnabled,
    soundbiteRows.length,
    styles.actionNotice,
    styles.column,
    styles.loadMore,
    styles.loadMoreLabel,
    styles.pane,
    styles.paneEmpty,
    styles.paneText,
    styles.showMore,
    summaryText.length,
    t,
    tabErrorKey,
    transcriptText,
  ]);

  const chipStrip =
    hasSections && isPrefsHydrated ? (
      <View style={styles.chipHeader} testID="full-player-section-header">
        <View style={styles.column}>
          <View onLayout={handleChipStripLayout} style={styles.chipRowSlot}>
            <SectionChipRow
              items={sectionChips}
              trailing={
                activeTab === 'clips' ? (
                  <MenuSelectChip
                    heading={t('filters.screen.sort_heading')}
                    onSelect={selectClipSort}
                    options={clipSortOptions}
                    testID="full-player-clip-sort"
                    value={clipSort}
                  />
                ) : undefined
              }
              onSelect={selectTab}
              selectedKey={activeTab}
              testID="full-player-sections"
            />
          </View>
        </View>
      </View>
    ) : null;

  const playerRegion = isPlaybackActive ? (
    <View
      style={[styles.playerRegion, { height: layout.playerRegionHeight }]}
      testID="full-player-region"
    >
      <View style={[styles.column, styles.playerRegionContent, styles.playerRegionFull]}>
        <View style={styles.playerRegionUpperBands}>
          <View pointerEvents="none" style={styles.titleBlock}>
            <MarqueeText align="center" style={styles.title} testID="full-player-title">
              {nowPlaying?.title ?? t('media_player.fullscreen_media_player')}
            </MarqueeText>
            {nowPlaying?.channelTitle !== null && nowPlaying?.channelTitle !== undefined ? (
              <Text numberOfLines={1} style={styles.subtitle}>
                {nowPlaying.channelTitle}
              </Text>
            ) : null}
          </View>

          <View pointerEvents="none" style={styles.playerRegionArtworkPassThrough}>
            <FullPlayerArtwork
              accessibilityLabel={t('media_player.media_player_image')}
              artworkSize={layout.artworkSize}
              artworkSizeCap={artworkSizeCap}
              chapters={chapters}
            />
          </View>

          <View pointerEvents="none">
            <FullPlayerSegmentBand chapters={chapters} />
          </View>

          <View pointerEvents="auto">
            <FullPlayerScrubber chapters={chapters} />
          </View>
        </View>

        <View pointerEvents="auto" style={styles.playerRegionControlStack}>
          <FullPlayerTransportRow
            hasEpisodeChaptersForTrackButtons={episodeHasChaptersForTrackButtons}
            hasNextQueueItem={canSkipToNext}
            isMusicNowPlaying={isMusicNowPlaying}
            isRepeatEnabled={autoQueueConfig.repeat}
            isShuffleEnabled={autoQueueConfig.random}
            onJumpBack={() => {
              jumpBy(-MEDIA_JUMP_BACK_SECONDS);
            }}
            onJumpForward={() => {
              jumpBy(MEDIA_JUMP_FORWARD_SECONDS);
            }}
            onPause={handlePause}
            onPlay={handlePlay}
            onRetry={handleRetry}
            onSkipToNext={() => {
              void skipToNext();
            }}
            onSkipToNextTrack={() => {
              void skipToNextTrack();
            }}
            onSkipToPrevious={() => {
              void skipToPrevious();
            }}
            onSkipToPreviousTrack={() => {
              void skipToPreviousTrack();
            }}
            onToggleRepeat={handleToggleRepeat}
            onToggleShuffle={handleToggleShuffle}
            state={transportState}
          />

          <FullPlayerUtilityRow
            onOpenMore={() => {
              handleOpenSheet('more');
            }}
            onOpenSleepTimer={() => {
              handleOpenSheet('sleep');
            }}
            onOpenSpeed={() => {
              handleOpenSheet('speed');
            }}
            playbackRate={playbackRate}
          />
        </View>
      </View>
    </View>
  ) : null;

  const listHeader =
    playerRegion !== null || chipStrip !== null ? (
      <View style={styles.listHeader}>
        {playerRegion}
        {chipStrip}
        {hasSections ? <View style={styles.headerSafeSpacer} /> : null}
      </View>
    ) : null;

  return (
    <View style={styles.container} testID="full-player-screen">
      <FullPlayerActionRow
        disableAddToPlaylist={addToPlaylistTarget === null}
        disableShare={shareUrl === null}
        onAddToPlaylist={handleAddToPlaylist}
        onClose={onClose}
        onCreateClip={() => {
          if (isTierKnown) {
            const access = evaluateFeature('clip_authoring');
            if (!access.allowed) {
              openGate(access.reason);
              return;
            }
          }
          onOpenMakeClip({ mode: 'create' });
        }}
        onOpenQueue={onOpenQueue}
        onOpenV4v={onOpenV4v}
        onShare={handleShare}
        showV4v={showV4v}
      />

      <View onLayout={handleViewportLayout} style={styles.viewport}>
        <FlatList
          ListFooterComponent={renderPaneFooter}
          ListHeaderComponent={listHeader}
          alwaysBounceVertical={false}
          bounces={false}
          contentContainerStyle={styles.listContent}
          data={paneRows}
          extraData={`${activeTab}-${isTabLoading}`}
          keyExtractor={(row) => row.id}
          overScrollMode="never"
          ref={paneListRef}
          removeClippedSubviews={LIST_REMOVE_CLIPPED_SUBVIEWS}
          renderItem={({ item: row, index }) => {
            if (row.type === 'chapter') {
              return (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    handleChapterPress(row.chapter);
                  }}
                  style={[
                    styles.chapterRow,
                    index === listRows.length - 1 ? styles.chapterRowLast : null,
                  ]}
                  testID="full-player-chapter-row"
                >
                  <View style={styles.column}>
                    <Text style={styles.chapterTitle}>
                      {row.chapter.title ?? row.chapter.id_text}
                    </Text>
                    <Text style={styles.chapterTime}>
                      {t('info.time.start_end', {
                        timeEnd: formatPlaybackTime(row.chapter.end_time),
                        timeStart: formatPlaybackTime(row.chapter.start_time),
                      })}
                    </Text>
                  </View>
                </Pressable>
              );
            }

            if (row.type === 'soundbite') {
              return (
                <View style={styles.column}>
                  <HomeFeedRow
                    isLast={index === listRows.length - 1}
                    mediaType="clips"
                    onPlayPress={() => {
                      if (currentItem !== null && channel !== null) {
                        void playSoundbite(row.soundbite, currentItem, channel);
                      }
                    }}
                    onPress={() => {
                      if (currentItem !== null && channel !== null) {
                        void playSoundbite(row.soundbite, currentItem, channel);
                      }
                    }}
                    onQueuePress={(feedRow, position) => {
                      runQueueAction(feedRow, 'clips', position);
                    }}
                    row={toSoundbiteRow(
                      row.soundbite,
                      row.index,
                      t('info.soundbite.official_clip')
                    )}
                    showChannelContext={false}
                  />
                </View>
              );
            }

            return (
              <View style={styles.column}>
                <HomeFeedRow
                  isLast={index === listRows.length - 1}
                  mediaType="clips"
                  onPlayPress={(feedRow) => {
                    runPlayAction(feedRow, 'clips');
                  }}
                  onPress={(feedRow) => {
                    runPlayAction(feedRow, 'clips');
                  }}
                  onQueuePress={(feedRow, position) => {
                    runQueueAction(feedRow, 'clips', position);
                  }}
                  row={clipToHomeRow(row.clip)}
                  showChannelContext={false}
                />
              </View>
            );
          }}
          scrollEnabled={hasSections && isPrefsHydrated}
          style={styles.list}
          testID="full-player-section-list"
        />
      </View>

      <FullPlayerSleepTimer onCancel={handleCloseSheet} visible={openSheet === 'sleep'} />
      <FullPlayerSpeedControl onCancel={handleCloseSheet} visible={openSheet === 'speed'} />
      <FullPlayerMoreSheet
        canToggleSubscription={canToggleSubscription}
        enclosureSelectedParams={enclosureSelectedParams}
        itemLabeledEnclosures={itemLabeledEnclosures}
        isMarkedPlayed={isMarkedPlayed}
        isSubscribed={isSubscribed}
        onCancel={handleCloseSheet}
        onSelectEnclosureParams={switchEnclosureSelectedParams}
        onTogglePlayed={handleMarkAsPlayed}
        onToggleSubscription={handleToggleSubscription}
        visible={openSheet === 'more'}
      />
      {addToPlaylistSheet}
    </View>
  );
}
