import { useIsFocused } from '@react-navigation/native';
import type { ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { LayoutChangeEvent } from 'react-native';
import {
  BackHandler,
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { breakpoints } from '@podverse/design-tokens';
import {
  chapterSectionHasImages,
  MEDIA_JUMP_BACK_SECONDS,
  MEDIA_JUMP_FORWARD_SECONDS,
  resolveChapterRowArtwork,
} from '@podverse/helpers';
import type {
  DTOChannel,
  DTOClip,
  DTOItem,
  DTOItemChapter,
  DTOItemSoundbite,
} from '@podverse/helpers/dto';
import { htmlToPlainText } from '@podverse/helpers/html';
import { formatHHMMSS } from '@podverse/helpers/time';
import { getShuffleHash } from '@podverse/helpers-requests';
import type { PlaybackTarget } from '@podverse/playback-core';
import { getBoostEligibilityForContent } from '@podverse/v4v-metaboost';

import { requestWithMobileAuthRefresh, useAuth } from '../../auth';
import { nativePlaybackBridge } from '../../bridge/nativePlaybackBridge';
import { useBoostSheet } from '../../components/boost/useBoostSheet';
import { ChapterListRow, FundingLinksSection, ItemSummaryPeople } from '../../components/content';
import type { MenuSelectChipOption, SectionChipItem } from '../../components/form';
import { MenuSelectChip, SectionChipRow } from '../../components/form';
import { FullPlayerActionRow } from '../../components/player/FullPlayerActionRow';
import { FullPlayerArtwork } from '../../components/player/FullPlayerArtwork';
import { FullPlayerMoreSheet } from '../../components/player/FullPlayerMoreSheet';
import { FullPlayerPaneSheet } from '../../components/player/FullPlayerPaneSheet';
import {
  hasNextQueueItem,
  resolveAddToPlaylistTarget,
  resolveQueueMutationTarget,
  shouldDismissFullPlayerOnEmptySession,
  shouldShowV4vAction,
} from '../../components/player/fullPlayerRows';
import { FullPlayerScrubber } from '../../components/player/FullPlayerScrubber';
import { FullPlayerSegmentBand } from '../../components/player/FullPlayerSegmentBand';
import { FullPlayerTransportRow } from '../../components/player/FullPlayerTransportRow';
import { FullPlayerUtilityRow } from '../../components/player/FullPlayerUtilityRow';
import { ignoreFullPlayerBoundedNestedListWarning, LIST_REMOVE_CLIPPED_SUBVIEWS } from '../../components/primitives/listVirtualization';
import { MarqueeText } from '../../components/primitives/MarqueeText';
import { HEADER_BAR_HEIGHT } from '../../components/screen/HeaderBar';
import { ListEmpty } from '../../components/state/ListEmpty';
import { ListError } from '../../components/state/ListError';
import { LoadingSection } from '../../components/state/LoadingSection';
import { getMobileConfig } from '../../config';
import { useAutoQueue } from '../../contexts/AutoQueueProvider';
import { getItemPrimaryImageUrl } from '../../data/repositories/channelItemWindow';
import { mapDirectoryChannelToSubscribed } from '../../data/repositories/subscriptionsMerge';
import { subscriptionsRepository } from '../../data/repositories/subscriptionsRepository';
import { useActionError } from '../../feedback/ActionErrorProvider';
import type { AutoQueueSeed } from '../../hooks/useAutoQueueLoadResources';
import { useAutoQueueLoadResources } from '../../hooks/useAutoQueueLoadResources';
import { usePrimaryQueue } from '../../hooks/usePrimaryQueue';
import { useQueueMutations } from '../../hooks/useQueueMutations';
import { useQueueResources } from '../../hooks/useQueueResources';
import { toggleAutoQueueShuffle } from '../../lib/autoQueue/autoQueue';
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
  FULL_PLAYER_CHIP_HEADER_HEIGHT,
  FULL_PLAYER_CONTROL_STACK_GAP,
  FULL_PLAYER_REGION_BOTTOM_PADDING,
  FULL_PLAYER_REGION_GAP,
  FULL_PLAYER_REGION_TOP_PADDING,
  FULL_PLAYER_TITLE_BLOCK_HEIGHT,
  resolveFullPlayerLayout,
  resolveFullPlayerViewport,
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

// Outer ScrollView + height-locked inner FlatList is intentional; RN's nest warning is structural.
ignoreFullPlayerBoundedNestedListWarning();

const scrollOuterToTop = (scroll: ScrollView | null): void => {
  scroll?.scrollTo({ animated: false, y: 0 });
};

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
    subtitle: formatHHMMSS(Number(soundbite.start_time)),
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

const autoQueueSeedFromTarget = (target: PlaybackTarget | null): AutoQueueSeed | null => {
  if (target === null || target.kind === 'add-by-rss' || target.kind === 'livestream') {
    return null;
  }
  return {
    channel: target.channel,
    clip: target.kind === 'clip' ? target.clip : null,
    item: target.item,
    item_soundbite: target.kind === 'soundbite' ? target.soundbite : null,
  };
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
  const { height: windowHeight, isTablet, width: windowWidth } = useResponsive();
  const insets = useSafeAreaInsets();
  const { styles: themeStyles, tokens } = useTheme();
  const { boostSheet, openBoost } = useBoostSheet();
  const { accessToken, clearSession, refreshToken, setTokens, status } = useAuth();
  const { enabled: offlineModeEnabled } = useOfflineMode();
  const {
    autoQueueActiveRow,
    autoQueueConfig,
    autoQueueResources,
    setAutoQueueActiveRow,
    setAutoQueueConfig,
    setAutoQueueResources,
  } = useAutoQueue();
  const loadAutoQueueResources = useAutoQueueLoadResources();
  const { fetchPrimaryQueue } = usePrimaryQueue();
  const { fetchUpcoming } = useQueueResources();
  const { markAsPlayed } = useQueueMutations();
  const { evaluateFeature, isTierKnown } = useAccessTier();
  const { handleGateError, openGate } = useMembershipGate();
  const { openPlaybackError } = useActionError();
  const { addToPlaylistSheet, requestAddToPlaylist } = useAddToPlaylist();
  const {
    activeTarget,
    enclosureSelectedParams,
    itemLabeledEnclosures,
    jumpBy,
    lastPlaybackError,
    nowPlaying,
    pause,
    playbackRate,
    playSoundbite,
    resume,
    retryPlayback,
    seekTo,
    isAuthoringHold,
    skipToNext,
    skipToNextTrack,
    skipToPrevious,
    skipToPreviousTrack,
    switchEnclosureSelectedParams,
    transportState,
  } = usePlaybackSession();
  const isFocused = useIsFocused();
  const { chapters } = useNowPlayingChapters();
  const { playbackNoticeKey, runPlayAction, runQueueAction } = useHomeRowPlayback();
  const outerScrollRef = useRef<ScrollView>(null);
  const paneListRef = useRef<FlatList<FullPlayerPaneRow>>(null);

  const seededViewport = resolveFullPlayerViewport({
    headerBarHeight: HEADER_BAR_HEIGHT,
    safeAreaTop: insets.top,
    windowHeight,
    windowWidth,
  });
  const [viewportHeight, setViewportHeight] = useState(seededViewport.height);
  const [viewportWidth, setViewportWidth] = useState(seededViewport.width);
  const [chipStripHeight, setChipStripHeight] = useState(FULL_PLAYER_CHIP_HEADER_HEIGHT);
  const [openSheet, setOpenSheet] = useState<FullPlayerSheet>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isMarkedPlayed, setIsMarkedPlayed] = useState(false);
  const [manualUpcomingCount, setManualUpcomingCount] = useState(0);
  const [actionNoticeKey, setActionNoticeKey] = useState<string | null>(null);
  const [isSavingSubscription, setIsSavingSubscription] = useState(false);
  const [isMarkingPlayed, setIsMarkingPlayed] = useState(false);
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
  const canShowBoost = getBoostEligibilityForContent({
    channel,
    item: currentItem,
  }).canShowBoostAction;
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
  const playerChapters = chapterRows.length > 0 ? chapterRows : chapters;
  const chapterListShowsImages = chapterSectionHasImages(chapterRows);
  const chapterFallbackImageUrl =
    currentItem !== null
      ? getItemPrimaryImageUrl(currentItem)
      : nowPlaying?.imageUrl ?? null;

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

  const sheetBottomInset = tokens.spacing.md;
  const sheetBottomGap = hasSections ? insets.bottom + sheetBottomInset : 0;
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
        sheetBottomInset,
        viewportHeight,
        viewportWidth,
      }),
    [
      chipStripHeight,
      contentMaxWidth,
      hasSections,
      insets.bottom,
      isTablet,
      sheetBottomInset,
      tokens.spacing.lg,
      viewportHeight,
      viewportWidth,
    ]
  );
  const styles = useMemo(
    () =>
      StyleSheet.create({
        actionNotice: {
          color: themeStyles.textSecondary.color,
          marginTop: tokens.spacing.md,
        },
        chipHeader: {
          justifyContent: 'center',
          minHeight: FULL_PLAYER_CHIP_HEADER_HEIGHT,
          // Same inset as the pane sheet margin, so the pills line up with the wrapper border
          // rather than the inset content text.
          paddingHorizontal: tokens.spacing.md,
        },
        chipRowSlot: {
          justifyContent: 'center',
          // Twice the shared chip seam. SectionChipRow already owns one unit below the pills, so
          // the extra unit here is the space from chips to the wrapper below.
          paddingBottom: listChipRowBottomGap(tokens.spacing),
          paddingTop: listChipRowBottomGap(tokens.spacing) * 2,
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
        list: {
          flex: 1,
        },
        loadMore: {
          marginTop: tokens.spacing.md,
        },
        loadMoreLabel: {
          color: themeStyles.textPrimary.color,
          fontSize: 14,
          fontWeight: '600',
        },
        outerScroll: {
          flex: 1,
        },
        pane: {
          paddingHorizontal: tokens.spacing.lg,
          // Same top inset as `chapterRow` so Summary / transcript / empty copy starts where the
          // first chapter title does, not flush to the sheet cap.
          paddingTop: tokens.spacing.base,
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
        playerRegionArtworkBand: {
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
          color: tokens.text.link,
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
          alignItems: 'stretch',
          gap: tokens.spacing.xs,
          height: FULL_PLAYER_TITLE_BLOCK_HEIGHT,
          justifyContent: 'center',
          overflow: 'hidden',
          width: '100%',
        },
        viewport: {
          flex: 1,
        },
      }),
    [contentMaxWidth, themeStyles, tokens]
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

  // Natural complete with nothing ahead clears now-playing. Dismiss this screen only when it is
  // focused — `goBack()` while Make clip is on top would pop that screen instead.
  useEffect(() => {
    if (
      shouldDismissFullPlayerOnEmptySession({
        hasPlaybackSession: activeTarget !== null && nowPlaying !== null,
        isAuthoringHold,
        isFocused,
      })
    ) {
      onClose();
    }
  }, [activeTarget, isAuthoringHold, isFocused, nowPlaying, onClose]);

  useEffect(() => {
    setIsMarkedPlayed(false);
  }, [activeTarget]);

  useEffect(() => {
    setDescriptionExpanded(false);
  }, [currentItemIdText]);

  useEffect(() => {
    scrollOuterToTop(outerScrollRef.current);
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
    const { height, width } = event.nativeEvent.layout;
    setViewportHeight((current) => (Math.abs(current - height) < 1 ? current : height));
    setViewportWidth((current) => (Math.abs(current - width) < 1 ? current : width));
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
    setAutoQueueActiveRow(0);
    setAutoQueueResources({});
    setAutoQueueConfig(toggleAutoQueueShuffle(autoQueueConfig, getShuffleHash));
    const seed = autoQueueSeedFromTarget(activeTarget);
    setTimeout(() => {
      void loadAutoQueueResources(seed);
    }, 0);
  }, [
    activeTarget,
    autoQueueConfig,
    loadAutoQueueResources,
    setAutoQueueActiveRow,
    setAutoQueueConfig,
    setAutoQueueResources,
  ]);

  const handleToggleRepeat = useCallback(() => {
    setAutoQueueConfig({
      ...autoQueueConfig,
      repeat: !autoQueueConfig.repeat,
    });
  }, [autoQueueConfig, setAutoQueueConfig]);

  const handleErrorPress = () => {
    openPlaybackError(lastPlaybackError, () => {
      void retryPlayback();
    });
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
    if (target === null || isMarkingPlayed) {
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
      setIsMarkingPlayed(true);
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
      } finally {
        setIsMarkingPlayed(false);
      }
    })();
  }, [
    activeTarget,
    evaluateFeature,
    handleGateError,
    isMarkedPlayed,
    isMarkingPlayed,
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

    let body: ReactNode = null;

    if (isTabLoading) {
      body = <LoadingSection testID={`full-player-pane-loading-${activeTab}`} />;
    } else if (tabErrorKey !== null) {
      body = (
        <ListError
          messageKey={tabErrorKey}
          onRetry={() => {
            void loadTab(activeTab);
          }}
          testID={`full-player-pane-error-${activeTab}`}
        />
      );
    } else if (offlineModeEnabled && isEpisodeTabNetworkBody(activeTab)) {
      const hasCachedBody =
        (activeTab === 'chapters' && chapterRows.length > 0) ||
        (activeTab === 'soundbites' && soundbiteRows.length > 0) ||
        (activeTab === 'clips' && clipRows.length > 0) ||
        (activeTab === 'transcript' && transcriptText.length > 0);
      if (!hasCachedBody) {
        body = (
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

    if (body === null && activeTab === 'summary') {
      body = (
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
            <ItemSummaryPeople
              itemPersons={currentItem?.item_persons ?? []}
              testIDPrefix="full-player"
            />
            {activePaneNoticeKey !== null ? (
              <Text style={styles.actionNotice} testID="full-player-action-notice">
                {t(activePaneNoticeKey)}
              </Text>
            ) : null}
          </View>
        </View>
      );
    } else if (body === null && activeTab === 'funding') {
      body = (
        <FundingLinksSection
          fundings={currentItem?.item_fundings ?? []}
          isLoading={currentItem === null}
          layout="inline"
          testIDPrefix="full-player"
        />
      );
    } else if (body === null && activeTab === 'transcript') {
      body = (
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
    } else if (body === null && activeTab === 'chapters' && chapterRows.length === 0) {
      body = (
        <View style={styles.pane}>
          <View style={styles.column}>
            <ListEmpty messageKey="misc.info" testID="full-player-empty-chapters" />
          </View>
        </View>
      );
    } else if (body === null && activeTab === 'soundbites' && soundbiteRows.length === 0) {
      body = (
        <View style={styles.pane}>
          <View style={styles.column}>
            <ListEmpty
              messageKey="info.soundbite.no_official_clips_found"
              testID="full-player-empty-soundbites"
            />
          </View>
        </View>
      );
    } else if (body === null && activeTab === 'clips' && clipRows.length === 0) {
      body = (
        <View style={styles.pane}>
          <View style={styles.column}>
            <ListEmpty messageKey="features.clip.no_clips_found" testID="full-player-empty-clips" />
          </View>
        </View>
      );
    } else if (body === null && activeTab === 'clips' && clipHasMore) {
      body = (
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

    return body;
  }, [
    activePaneNoticeKey,
    activeTab,
    chapterRows.length,
    clipHasMore,
    clipRows.length,
    currentItem,
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

          <View pointerEvents="box-none" style={styles.playerRegionArtworkBand}>
            <FullPlayerArtwork
              accessibilityLabel={t('media_player.media_player_image')}
              artworkSize={layout.artworkSize}
              chapters={playerChapters}
            />
          </View>

          <View pointerEvents="box-none">
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
            onErrorPress={handleErrorPress}
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

  const canOuterScroll = hasSections && isPrefsHydrated;

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
        onOpenBoost={() => {
          if (channel === null) {
            return;
          }
          openBoost({ channel, item: currentItem });
        }}
        onOpenQueue={onOpenQueue}
        onOpenV4v={onOpenV4v}
        onShare={handleShare}
        showBoost={canShowBoost}
        showV4v={showV4v}
      />

      <View onLayout={handleViewportLayout} style={styles.viewport}>
        <ScrollView
          alwaysBounceVertical={false}
          bounces={false}
          nestedScrollEnabled
          overScrollMode="never"
          ref={outerScrollRef}
          scrollEnabled={canOuterScroll}
          scrollsToTop
          style={styles.outerScroll}
          testID="full-player-outer-scroll"
        >
          {playerRegion}
          {chipStrip}
          {hasSections ? (
            <FullPlayerPaneSheet height={layout.paneSheetHeight} marginBottom={sheetBottomGap}>
              <FlatList
                ListFooterComponent={renderPaneFooter}
                alwaysBounceVertical={false}
                bounces={false}
                data={paneRows}
                extraData={`${activeTab}-${isTabLoading}`}
                keyExtractor={(row) => row.id}
                nestedScrollEnabled
                overScrollMode="never"
                ref={paneListRef}
                removeClippedSubviews={LIST_REMOVE_CLIPPED_SUBVIEWS}
                renderItem={({ item: row, index }) => {
                  if (row.type === 'chapter') {
                    const artwork = resolveChapterRowArtwork(
                      row.chapter,
                      chapterFallbackImageUrl,
                      chapterListShowsImages
                    );
                    return (
                      <ChapterListRow
                        artworkAccessibilityLabel={t('info.chapter.chapter_image')}
                        artworkUri={artwork.show ? artwork.uri : null}
                        isLast={index === listRows.length - 1}
                        onPress={() => {
                          handleChapterPress(row.chapter);
                        }}
                        paddingHorizontal={tokens.spacing.lg}
                        showArtwork={artwork.show}
                        testID="full-player-chapter-row"
                        timeRange={t('info.time.start_end', {
                          timeEnd: formatHHMMSS(Number(row.chapter.end_time)),
                          timeStart: formatHHMMSS(Number(row.chapter.start_time)),
                        })}
                        title={row.chapter.title ?? row.chapter.id_text}
                      />
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
                scrollEnabled={canOuterScroll}
                scrollsToTop={false}
                style={styles.list}
                testID="full-player-section-list"
              />
            </FullPlayerPaneSheet>
          ) : null}
        </ScrollView>
      </View>

      <FullPlayerSleepTimer onCancel={handleCloseSheet} visible={openSheet === 'sleep'} />
      <FullPlayerSpeedControl onCancel={handleCloseSheet} visible={openSheet === 'speed'} />
      <FullPlayerMoreSheet
        canToggleSubscription={canToggleSubscription}
        enclosureSelectedParams={enclosureSelectedParams}
        itemLabeledEnclosures={itemLabeledEnclosures}
        isMarkedPlayed={isMarkedPlayed}
        isMarkingPlayed={isMarkingPlayed}
        isSubscribed={isSubscribed}
        onCancel={handleCloseSheet}
        onSelectEnclosureParams={switchEnclosureSelectedParams}
        onTogglePlayed={handleMarkAsPlayed}
        onToggleSubscription={handleToggleSubscription}
        visible={openSheet === 'more'}
      />
      {addToPlaylistSheet}
      {boostSheet}
    </View>
  );
}
