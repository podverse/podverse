import { useIsFocused } from '@react-navigation/native';
import type { ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { LayoutChangeEvent, ScrollViewInstance } from 'react-native';
import {
  BackHandler,
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
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
  TranscriptRow,
} from '@podverse/helpers/dto';
import { formatHHMMSS } from '@podverse/helpers/time';
import type { PlaybackTarget } from '@podverse/playback-core';
import { getBoostEligibilityForContent } from '@podverse/v4v-metaboost';

import { requestWithMobileAuthRefresh, useAuth } from '../../auth';
import { useAuthPrompt } from '../../auth/AuthPromptContext';
import { nativePlaybackBridge } from '../../bridge/nativePlaybackBridge';
import { useBoostSheet } from '../../components/boost/useBoostSheet';
import {
  ArtistChooserSheet,
  ChapterListRow,
  DescriptionText,
  FundingLinksSection,
  PeoplePane,
  toAboutPersonFromItem,
  TranscriptFollowBar,
  TranscriptListRow,
} from '../../components/content';
import type { MenuSelectChipOption, SectionChipItem } from '../../components/form';
import { MenuSelectChip, SectionChipRow } from '../../components/form';
import { FullPlayerActionRow } from '../../components/player/FullPlayerActionRow';
import { FullPlayerArtwork } from '../../components/player/FullPlayerArtwork';
import { FullPlayerMoreSheet } from '../../components/player/FullPlayerMoreSheet';
import {
  FULL_PLAYER_PANE_SHEET_BORDER_WIDTH,
  FullPlayerPaneSheet,
  fullPlayerPaneSheetChrome,
} from '../../components/player/FullPlayerPaneSheet';
import {
  canAdvanceToNextQueueItem,
  resolveAddToPlaylistTarget,
  resolveQueueMutationTarget,
  resolveRemoteAddToPlaylistTarget,
  shouldDismissFullPlayerOnEmptySession,
  shouldShowV4vAction,
} from '../../components/player/fullPlayerRows';
import {
  FullPlayerLiveProgress,
  FullPlayerScrubber,
} from '../../components/player/FullPlayerScrubber';
import { FullPlayerSegmentBand } from '../../components/player/FullPlayerSegmentBand';
import { FullPlayerTransportRow } from '../../components/player/FullPlayerTransportRow';
import { FullPlayerUtilityRow } from '../../components/player/FullPlayerUtilityRow';
import {
  ignoreFullPlayerBoundedNestedListWarning,
  LIST_REMOVE_CLIPPED_SUBVIEWS,
} from '../../components/primitives/listVirtualization';
import { MarqueeText } from '../../components/primitives/MarqueeText';
import { HEADER_BAR_HEIGHT } from '../../components/screen/HeaderBar';
import { CallToActionSection } from '../../components/state/CallToActionSection';
import { ListEmpty } from '../../components/state/ListEmpty';
import { ListError } from '../../components/state/ListError';
import { ListLoading } from '../../components/state/ListLoading';
import { LoadingSection } from '../../components/state/LoadingSection';
import { getMobileConfig } from '../../config';
import { useAutoQueue } from '../../contexts/AutoQueueProvider';
import { addByRssRepository } from '../../data/repositories/addByRssRepository';
import { getItemPrimaryImageUrl } from '../../data/repositories/channelItemWindow';
import { mapDirectoryChannelToSubscribed } from '../../data/repositories/subscriptionsMerge';
import { subscriptionsRepository } from '../../data/repositories/subscriptionsRepository';
import { useActionError } from '../../feedback/ActionErrorProvider';
import { useAddByRssArtistIndexVersion } from '../../hooks/useAddByRssArtistIndexVersion';
import { useFirstSubscribePushPrompt } from '../../hooks/useFirstSubscribePushPrompt';
import { useItemDescription } from '../../hooks/useItemDescription';
import { useLoadMoreOnEndReached } from '../../hooks/useLoadMoreOnEndReached';
import { usePrimaryQueue } from '../../hooks/usePrimaryQueue';
import { useQueueMutations } from '../../hooks/useQueueMutations';
import { useQueueResources } from '../../hooks/useQueueResources';
import { getReduceMotionSnapshot } from '../../hooks/useReduceMotion';
import { useTranscriptFollowControls } from '../../hooks/useTranscriptFollowControls';
import { useTranscriptListAutoscroll } from '../../hooks/useTranscriptListAutoscroll';
import { resolveSupportedLocale } from '../../i18n/locale';
import { resolveAddByRssLiveItemKey } from '../../lib/addByRss/liveItemDetail';
import { addByRssEpisodeItemKey } from '../../lib/addByRss/localResourceData';
import { isAddByRssLivestreamResourceData } from '../../lib/addByRss/resourceData';
import { getChannelActionChrome } from '../../lib/channelActionChrome';
import { homeFeedRefresh } from '../../lib/home/homeFeedRefresh';
import {
  isEpisodeTabNetworkBody,
  OFFLINE_UNAVAILABLE_MESSAGE_KEY,
} from '../../lib/offlineModeViews';
import { canLoadNextPage, LIST_END_REACHED_THRESHOLD } from '../../lib/pagination/pagedList';
import { playbackTargetRowMediaId } from '../../lib/playback/buildPlaybackTarget';
import { isMusicPlaybackTarget } from '../../lib/playback/engineAudioProfile';
import type { LineArtist } from '../../lib/playback/lineArtist';
import { joinLineArtistTitles } from '../../lib/playback/lineArtist';
import { playbackTargetArtists } from '../../lib/playback/verifiedArtists';
import { clipToHomeRow } from '../../lib/rows/homeRowMappers';
import {
  buildNowPlayingShareUrl,
  buildRemotePlaybackShareUrl,
  shareResolvedUrl,
} from '../../lib/share/shareNowPlaying';
import { useMembershipGate } from '../../membership/MembershipGateProvider';
import { useAccessTier } from '../../membership/useAccessTier';
import { ROOT_SLIDE_UP_ANIMATION_MS } from '../../navigation/slideUpScreen';
import { isLivePlaybackTarget } from '../../playback/crossDevice/crossDevicePlaybackPolicy';
import {
  useCrossDevicePlayerDisplay,
  usePlayerStatusText,
} from '../../playback/crossDevice/useCrossDevicePlayerDisplay';
import { useDisplayedAddByRssResourceData } from '../../playback/crossDevice/useDisplayedAddByRssResourceData';
import { useLivePlaybackCanRewind } from '../../playback/livePlaybackStore';
import {
  nowPlayingAddByRssSections,
  useNowPlayingAddByRssSections,
} from '../../playback/nowPlayingAddByRssSections';
import { playbackMediumIdFromTarget } from '../../playback/playbackEventSource';
import { usePlaybackSession } from '../../playback/PlaybackProvider';
import { playingChapterSourceFromTarget } from '../../playback/playingChapter';
import { hasEpisodeChaptersForTrackButtons } from '../../playback/previousAction';
import { useItemDescriptionClock } from '../../playback/useItemDescriptionClock';
import { useNowPlayingChapters } from '../../playback/useNowPlayingChapters';
import { usePlayingChapterIdText } from '../../playback/usePlayingChapterIdText';
import { usePlayingTranscriptIndex } from '../../playback/usePlayingTranscriptIndex';
import { isVideoFullscreenActive } from '../../playback/videoFullscreenStore';
import type { EpisodeClipSort, EpisodeTab } from '../../prefs/detailListPrefs';
import { DEFAULT_EPISODE_TAB, EPISODE_CLIP_SORT_OPTIONS } from '../../prefs/detailListPrefs';
import { useOfflineMode } from '../../prefs/offlineMode';
import { isLightUiTheme } from '../../theme/lightUiThemes';
import { listChipRowBottomGap } from '../../theme/screenLayout';
import { useResponsive } from '../../theme/useResponsive';
import { useTheme } from '../../theme/useTheme';
import {
  EPISODE_TAB_LABEL_KEYS,
  itemHasChapters,
  itemSectionFlagsFromDto,
  resolveEpisodeTabForItem,
} from '../episode/episodeTabs';
import { useEpisodeSectionPanes } from '../episode/useEpisodeSectionPanes';
import { resolveAddByRssEpisodeTabs } from '../home/addByRss/addByRssEpisodeTabs';
import { toAddByRssAboutPeople } from '../home/addByRssHomeDetailData';
import type { HomeFeedRowData } from '../home/homeFeedData';
import { HomeFeedRow } from '../home/HomeFeedRow';
import { useHomeRowPlayback } from '../home/useHomeRowPlayback';
import { useAddToPlaylist } from '../library/useAddToPlaylist';
import {
  addByRssPaneSummary,
  addByRssResourceDataLinksChapters,
  resolveFullPlayerAddByRssPaneState,
  shouldLoadFullPlayerAddByRssSections,
} from './fullPlayerAddByRssPanes';
import type {
  FullPlayerContentTarget,
  FullPlayerItemOpenRequest,
  FullPlayerOpenRequest,
} from './fullPlayerContentLink';
import {
  fullPlayerArtistLink,
  fullPlayerOpenScreenLabelKey,
  playerContentStack,
  resolveFullPlayerChannelLink,
  resolveFullPlayerTitleLink,
  resolveLocalAddByRssFeedIdText,
  resolveRemoteFullPlayerChannelLink,
  resolveRemoteFullPlayerTitleLink,
} from './fullPlayerContentLink';
import {
  FULL_PLAYER_ARTIST_LINE_HEIGHT,
  FULL_PLAYER_CHIP_HEADER_HEIGHT,
  FULL_PLAYER_CONTROL_STACK_GAP,
  FULL_PLAYER_REGION_BOTTOM_PADDING,
  FULL_PLAYER_REGION_GAP,
  FULL_PLAYER_REGION_TOP_PADDING,
  resolveFullPlayerLayout,
  resolveFullPlayerTitleBlockHeight,
  resolveFullPlayerViewport,
} from './fullPlayerLayout';
import type { FullPlayerRemoteRegionStyles } from './FullPlayerRemoteRegion';
import { FullPlayerRemoteRegion } from './FullPlayerRemoteRegion';
import { FullPlayerSleepTimer } from './FullPlayerSleepTimer';
import { FullPlayerSpeedControl } from './FullPlayerSpeedControl';
import {
  FULL_PLAYER_PANE_TEXT_FONT_SIZE,
  FULL_PLAYER_PANE_TEXT_LINE_HEIGHT,
  resolveFullPlayerSummaryPreview,
} from './fullPlayerSummaryPreview';

type FullPlayerScreenProps = {
  onClose: () => void;
  onOpenContent: (request: FullPlayerOpenRequest) => void;
  onOpenItem: (request: FullPlayerItemOpenRequest) => void;
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
  | { type: 'soundbite'; id: string; index: number; soundbite: DTOItemSoundbite }
  | { type: 'transcript'; id: string; index: number; row: TranscriptRow };

const CLIP_SORT_LABEL_KEYS: Record<EpisodeClipSort, string> = {
  oldest: 'filters.sort.oldest',
  recent: 'filters.sort.recent',
};

const EMPTY_PANE_ROWS: FullPlayerPaneRow[] = [];
const EMPTY_CHAPTER_ROWS: DTOItemChapter[] = [];

// Outer ScrollView + height-locked inner FlatList is intentional; RN's nest warning is structural.
ignoreFullPlayerBoundedNestedListWarning();

const scrollOuterToTop = (scroll: ScrollViewInstance | null): void => {
  scroll?.scrollTo({ animated: false, y: 0 });
};

/** The outer column's end puts the chips at the top and the sheet in the rest of the viewport. */
const scrollOuterToPane = (scroll: ScrollViewInstance | null): void => {
  scroll?.scrollToEnd({ animated: !getReduceMotionSnapshot() });
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

const hasSectionsForTarget = (target: PlaybackTarget | null): boolean => {
  if (target === null) {
    return false;
  }
  if (target.kind === 'add-by-rss') {
    return !isAddByRssLivestreamResourceData(target.resourceData);
  }
  if (target.kind === 'livestream' && target.item === null) {
    return false;
  }
  return itemFromTarget(target) !== null;
};

export function FullPlayerScreen({
  onClose,
  onOpenContent,
  onOpenItem,
  onOpenMakeClip,
  onOpenQueue,
  onOpenV4v,
}: FullPlayerScreenProps) {
  const { t, i18n } = useTranslation();
  const { height: windowHeight, isTablet, width: windowWidth } = useResponsive();
  const { fontScale } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { styles: themeStyles, tokens, uiTheme } = useTheme();
  const { boostSheet, openBoost } = useBoostSheet();
  const { accessToken, account, clearSession, refreshToken, setTokens, status } = useAuth();
  const {
    askIfNeeded,
    applyAfterFollow,
    dialog: firstSubscribePushDialog,
  } = useFirstSubscribePushPrompt();
  const { enabled: offlineModeEnabled } = useOfflineMode();
  const { autoQueueConfig } = useAutoQueue();
  const { fetchQueueForMedium } = usePrimaryQueue();
  const { fetchUpcoming } = useQueueResources();
  const { markAddByRssAsPlayed, markAsPlayed } = useQueueMutations();
  const { evaluateFeature, isTierKnown } = useAccessTier();
  const { handleGateError, openGate } = useMembershipGate();
  const { openPlaybackError } = useActionError();
  const { addToPlaylistSheet, requestAddToPlaylist } = useAddToPlaylist();
  const {
    activeTarget,
    hasAutomaticNext,
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
    toggleRepeat,
    toggleShuffle,
    transportState,
  } = usePlaybackSession();
  const isLiveNowPlaying = activeTarget !== null && isLivePlaybackTarget(activeTarget);
  const liveCanRewind = useLivePlaybackCanRewind();
  const display = useCrossDevicePlayerDisplay();
  const remoteDisplay = display.kind === 'remote' ? display : null;
  const isRemoteDisplay = remoteDisplay !== null;
  const statusText = usePlayerStatusText(display);
  const addByRssResourceData = useDisplayedAddByRssResourceData();
  const addByRssItemResourceData =
    addByRssResourceData !== null && !isAddByRssLivestreamResourceData(addByRssResourceData)
      ? addByRssResourceData
      : null;
  const isFocused = useIsFocused();
  const { chapters } = useNowPlayingChapters();
  const { playbackNoticeKey, runPlayAction, runQueueAction } = useHomeRowPlayback();
  const outerScrollRef = useRef<ScrollViewInstance>(null);
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
  const [addByRssFeedIdText, setAddByRssFeedIdText] = useState<string | null>(null);
  const [addByRssItemKey, setAddByRssItemKey] = useState<string | null>(null);

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
  const onDescriptionClock = useItemDescriptionClock(currentItem, channel);
  const hasSections = !isRemoteDisplay && hasSectionsForTarget(activeTarget);
  const addByRssSections = useNowPlayingAddByRssSections(addByRssItemResourceData);
  const addByRssSource = addByRssSections.source;
  const { onRequestLogin } = useAuthPrompt();
  const isPlaybackActive = activeTarget !== null && nowPlaying !== null;
  const shareUrl =
    remoteDisplay !== null
      ? buildRemotePlaybackShareUrl(remoteDisplay.resource, remoteDisplay.isLive)
      : activeTarget !== null
        ? buildNowPlayingShareUrl(activeTarget)
        : null;
  const addToPlaylistTarget =
    remoteDisplay !== null
      ? resolveRemoteAddToPlaylistTarget(remoteDisplay.resource, addByRssResourceData)
      : resolveAddToPlaylistTarget(activeTarget);
  const queueMutationTarget = useMemo(
    () => resolveQueueMutationTarget(activeTarget),
    [activeTarget]
  );
  const showV4v = shouldShowV4vAction(activeTarget, isV4vEnabled);
  const canShowBoost = getBoostEligibilityForContent({
    channel,
    item: currentItem,
  }).canShowBoostAction;
  const activePaneNoticeKey = actionNoticeKey ?? playbackNoticeKey;
  const summaryDescription = useItemDescription(currentItem);
  const summaryHtml = summaryDescription?.html ?? (summaryDescription?.preview || null);
  const visibleTitle = nowPlaying?.title ?? null;
  const visibleChannelTitle = nowPlaying?.channelTitle ?? null;
  const titleLink = useMemo(
    () =>
      remoteDisplay !== null
        ? resolveRemoteFullPlayerTitleLink(remoteDisplay.resource, {
            feedIdText: addByRssFeedIdText,
            itemKey: addByRssItemKey,
            resourceData: addByRssResourceData,
          })
        : resolveFullPlayerTitleLink(activeTarget, visibleTitle, {
            feedIdText: addByRssFeedIdText,
            itemKey: addByRssItemKey,
          }),
    [
      activeTarget,
      addByRssFeedIdText,
      addByRssItemKey,
      addByRssResourceData,
      remoteDisplay,
      visibleTitle,
    ]
  );
  const channelLink = useMemo(
    () =>
      remoteDisplay !== null
        ? resolveRemoteFullPlayerChannelLink(remoteDisplay.resource, addByRssFeedIdText)
        : resolveFullPlayerChannelLink(activeTarget, visibleChannelTitle, addByRssFeedIdText),
    [activeTarget, addByRssFeedIdText, addByRssResourceData, remoteDisplay, visibleChannelTitle]
  );
  const artistIndexVersion = useAddByRssArtistIndexVersion();
  const playerArtists = useMemo(
    () => playbackTargetArtists(activeTarget),
    [activeTarget, artistIndexVersion]
  );
  const artistLineText = joinLineArtistTitles(playerArtists);
  const artistBandMediaId = activeTarget === null ? null : playbackTargetRowMediaId(activeTarget);
  const [artistBand, setArtistBand] = useState<{ mediaId: string | null; reserved: boolean }>(
    () => ({ mediaId: artistBandMediaId, reserved: playerArtists.length > 0 })
  );
  const [isArtistChooserOpen, setIsArtistChooserOpen] = useState(false);
  if (artistBand.mediaId !== artistBandMediaId) {
    setArtistBand({ mediaId: artistBandMediaId, reserved: playerArtists.length > 0 });
    setIsArtistChooserOpen(false);
  }
  // The band is decided when an item starts. A later refresh of the same item that adds or drops
  // artists does not resize the block.
  const hasArtistLine =
    artistBand.mediaId === artistBandMediaId ? artistBand.reserved : playerArtists.length > 0;

  useEffect(() => {
    const resourceData = addByRssResourceData;
    if (resourceData === null) {
      setAddByRssFeedIdText(null);
      setAddByRssItemKey(null);
      return;
    }
    let isCurrent = true;
    setAddByRssFeedIdText(null);
    setAddByRssItemKey(null);
    void resolveLocalAddByRssFeedIdText(resourceData, {
      getFeedByIdText: (idText) => addByRssRepository.getFeedByIdText(idText),
      getFeedByUrl: (feedUrl) => addByRssRepository.getFeedByUrl(feedUrl),
    })
      .then(async (feedIdText) => {
        if (!isCurrent) {
          return;
        }
        setAddByRssFeedIdText(feedIdText);
        if (feedIdText === null) {
          return;
        }
        const record = await addByRssRepository.getFeedByIdText(feedIdText);
        if (!isCurrent || record === null) {
          return;
        }
        const mappedFeed = await addByRssRepository.getMappedFeedByUrl(record.feedUrl);
        if (!isCurrent || mappedFeed === null) {
          return;
        }
        const itemKey = isAddByRssLivestreamResourceData(resourceData)
          ? resolveAddByRssLiveItemKey(mappedFeed, resourceData, feedIdText)
          : addByRssEpisodeItemKey(mappedFeed, resourceData);
        setAddByRssItemKey(itemKey);
      })
      .catch(() => {
        if (isCurrent) {
          setAddByRssFeedIdText(null);
          setAddByRssItemKey(null);
        }
      });
    return () => {
      isCurrent = false;
    };
  }, [addByRssResourceData]);

  const openLinkedContent = useCallback(
    (target: FullPlayerContentTarget) => {
      const channelIdText = channel?.id_text;
      const isSubscribed =
        !isRemoteDisplay &&
        channelIdText !== undefined &&
        getChannelActionChrome(channelIdText)?.isSubscribed === true;
      onOpenContent({
        ...target,
        stack: playerContentStack({ isSubscribed, kind: target.kind }),
      });
    },
    [channel, isRemoteDisplay, onOpenContent]
  );
  const openArtist = useCallback(
    (artist: LineArtist) => {
      const link = fullPlayerArtistLink(artist);
      const isSubscribed =
        artist.kind === 'directory' &&
        getChannelActionChrome(artist.publisher.id_text)?.isSubscribed === true;
      onOpenContent({ ...link, stack: playerContentStack({ isSubscribed, kind: link.kind }) });
    },
    [onOpenContent]
  );
  const onArtistLinePress = useCallback(() => {
    const [only] = playerArtists;
    if (playerArtists.length === 1 && only !== undefined) {
      openArtist(only);
      return;
    }
    if (playerArtists.length > 1) {
      setIsArtistChooserOpen(true);
    }
  }, [openArtist, playerArtists]);
  const openTitleContent = useCallback(() => {
    if (titleLink === null) {
      return;
    }
    if (channelLink === null) {
      openLinkedContent(titleLink);
      return;
    }
    const channelIdText = channel?.id_text;
    const isSubscribed =
      !isRemoteDisplay &&
      channelIdText !== undefined &&
      getChannelActionChrome(channelIdText)?.isSubscribed === true;
    onOpenItem({
      channel: channelLink,
      item: titleLink,
      stack: playerContentStack({ isSubscribed, kind: titleLink.kind }),
    });
  }, [channel, channelLink, isRemoteDisplay, onOpenItem, openLinkedContent, titleLink]);
  const contentLinkLabel = useCallback(
    (request: FullPlayerContentTarget) =>
      t('media_player.open_named_screen', {
        name: request.name,
        screen: t(fullPlayerOpenScreenLabelKey(request.kind)),
      }),
    [t]
  );

  const {
    activeTab,
    chapterRows,
    clipHasMore,
    clipLoadMoreErrorKey,
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
    transcriptRows,
  } = useEpisodeSectionPanes({
    episode: episodeForPanes,
    itemIdText: currentItemIdText,
    offlineModeEnabled,
    previewFlags,
  });
  const addByRssPeople = useMemo(
    () => toAddByRssAboutPeople(addByRssSource?.itemBundle.people ?? []),
    [addByRssSource]
  );
  const addByRssTabs = useMemo(
    () =>
      addByRssItemResourceData === null
        ? null
        : resolveAddByRssEpisodeTabs({
            hasChapters: addByRssSource?.sectionUrls?.chaptersFeedUrl !== undefined,
            hasPeople: addByRssPeople.length > 0,
            hasTranscript: addByRssSource?.sectionUrls?.transcriptUrl !== undefined,
          }),
    [addByRssItemResourceData, addByRssPeople.length, addByRssSource]
  );
  const addByRssPaneState =
    addByRssItemResourceData === null
      ? null
      : resolveFullPlayerAddByRssPaneState({
          activeTab,
          authStatus: status,
          offlineModeEnabled,
          snapshot: addByRssSections,
        });
  const handleClipsEndReached = useLoadMoreOnEndReached({
    canLoadMore:
      activeTab === 'clips' &&
      addByRssPaneState === null &&
      !offlineModeEnabled &&
      canLoadNextPage({
        hasError: tabErrorKey !== null || clipLoadMoreErrorKey !== null,
        hasMore: clipHasMore,
        isLoading: isTabLoading,
        isLoadingMore: isLoadingMoreClips,
      }),
    loadMore: loadMoreClips,
  });
  const handleRetryClipsPage = useCallback(() => {
    void loadMoreClips();
  }, [loadMoreClips]);
  const addByRssSummary = useMemo(
    () => addByRssPaneSummary(addByRssSource?.itemBundle ?? null),
    [addByRssSource]
  );
  const paneChapterRows =
    addByRssItemResourceData === null
      ? chapterRows
      : addByRssPaneState === 'content'
        ? (addByRssSections.sections?.chapters ?? EMPTY_CHAPTER_ROWS)
        : EMPTY_CHAPTER_ROWS;
  const paneItemMediaId = useMemo(
    () => playingChapterSourceFromTarget(activeTarget)?.mediaId ?? null,
    [activeTarget]
  );
  const playingChapterIdText = usePlayingChapterIdText({
    chapters: paneChapterRows,
    itemMediaId: paneItemMediaId,
  });
  const paneTranscriptRows =
    addByRssItemResourceData === null
      ? transcriptRows
      : (addByRssSections.sections?.transcriptRows ?? []);
  const {
    autoScrollOn,
    filteredRows: filteredTranscriptRows,
    filterTerm,
    setFilterTerm,
    toggleAutoScroll,
  } = useTranscriptFollowControls({
    itemMediaId: paneItemMediaId,
    rows: paneTranscriptRows,
  });
  const playingTranscriptIndex = usePlayingTranscriptIndex({
    itemMediaId: paneItemMediaId,
    rows: filteredTranscriptRows,
  });
  const {
    onScrollToIndexFailed: onTranscriptScrollToIndexFailed,
    onViewableItemsChanged: onTranscriptViewableItemsChanged,
    viewabilityConfig: transcriptViewabilityConfig,
  } = useTranscriptListAutoscroll({
    activeIndex: playingTranscriptIndex,
    autoScrollOn: autoScrollOn && activeTab === 'transcript',
    dataIndexOffset: 0,
    listRef: paneListRef,
  });
  const paneListExtraData = `${activeTab}-${isTabLoading}-${addByRssPaneState ?? 'none'}-${
    playingChapterIdText ?? 'none'
  }-${playingTranscriptIndex}-${autoScrollOn}-${filterTerm}`;
  const showTranscriptFollowBar =
    activeTab === 'transcript' &&
    paneTranscriptRows.length > 0 &&
    (addByRssPaneState === null || addByRssPaneState === 'content');
  const paneResetKey = addByRssSections.key ?? currentItemIdText;

  useEffect(() => {
    if (addByRssSections.key !== null) {
      selectTab(DEFAULT_EPISODE_TAB);
    }
  }, [addByRssSections.key, selectTab]);

  useEffect(() => {
    if (
      shouldLoadFullPlayerAddByRssSections({
        activeTab,
        authStatus: status,
        offlineModeEnabled,
        snapshot: addByRssSections,
      })
    ) {
      void nowPlayingAddByRssSections.load(authContext);
    }
  }, [activeTab, addByRssSections, authContext, offlineModeEnabled, status]);

  const retryAddByRssSections = useCallback(() => {
    void nowPlayingAddByRssSections.load(authContext);
  }, [authContext]);

  const handleAddByRssDescriptionClock = useCallback(
    (seconds: number) => {
      seekTo(Math.max(0, seconds));
    },
    [seekTo]
  );

  const playerChapters = chapterRows.length > 0 ? chapterRows : chapters;
  const chapterListShowsImages = chapterSectionHasImages(paneChapterRows);
  const chapterFallbackImageUrl =
    currentItem !== null ? getItemPrimaryImageUrl(currentItem) : (nowPlaying?.imageUrl ?? null);

  const canSkipToNext = canAdvanceToNextQueueItem(manualUpcomingCount, hasAutomaticNext);
  const isMusicNowPlaying = isMusicPlaybackTarget(activeTarget);
  const episodeHasChaptersForTrackButtons = hasEpisodeChaptersForTrackButtons(
    activeTarget,
    chapters
  );
  const canToggleSubscription = channel !== null;
  const hasSegmentBand =
    isRemoteDisplay ||
    activeTarget?.kind === 'clip' ||
    activeTarget?.kind === 'soundbite' ||
    activeTarget?.kind === 'chapter' ||
    (currentItem !== null && itemHasChapters(currentItem)) ||
    (addByRssItemResourceData !== null &&
      addByRssResourceDataLinksChapters(addByRssItemResourceData)) ||
    addByRssSource?.sectionUrls?.chaptersFeedUrl !== undefined ||
    chapters.length > 0;

  // Music cannot be clipped, so the player drops the Clips chip. Episode detail keeps it.
  // Add by RSS items take their chips from the parsed item.
  const playerTabs = useMemo(
    () =>
      addByRssTabs !== null
        ? addByRssTabs
        : isMusicNowPlaying
          ? supportedTabs.filter((tab) => tab !== 'clips')
          : supportedTabs,
    [addByRssTabs, isMusicNowPlaying, supportedTabs]
  );
  useEffect(() => {
    if (playerTabs.length === 0) {
      return;
    }
    const nextTab = resolveEpisodeTabForItem({ selectedTab: activeTab, supportedTabs: playerTabs });
    if (nextTab !== activeTab) {
      selectTab(nextTab);
    }
  }, [activeTab, playerTabs, selectTab]);

  const sectionChips = useMemo<SectionChipItem<EpisodeTab>[]>(
    () =>
      playerTabs.map((tab) => ({
        key: tab,
        label: t(EPISODE_TAB_LABEL_KEYS[tab]),
        testID: `full-player-section-${tab}`,
      })),
    [playerTabs, t]
  );
  const clipSortOptions = useMemo<MenuSelectChipOption<EpisodeClipSort>[]>(() => {
    return EPISODE_CLIP_SORT_OPTIONS.map((option) => ({
      label: t(CLIP_SORT_LABEL_KEYS[option]),
      testID: `full-player-clip-sort-${option}`,
      value: option,
    }));
  }, [t]);
  const listRows = useMemo((): FullPlayerPaneRow[] => {
    // Directory rows wait on the episode loader. Add by RSS rows follow the pane, which stays
    // empty until chapters are ready to show.
    if (addByRssItemResourceData === null && isTabLoading) {
      return [];
    }
    if (activeTab === 'clips') {
      return clipRows.map((clip) => ({ clip, id: clip.id_text, type: 'clip' }));
    }
    if (activeTab === 'chapters') {
      return paneChapterRows.map((chapter) => ({ chapter, id: chapter.id_text, type: 'chapter' }));
    }
    if (activeTab === 'soundbites') {
      return soundbiteRows.map((soundbite, index) => ({
        id: soundbite.id_text,
        index,
        soundbite,
        type: 'soundbite',
      }));
    }
    if (activeTab === 'transcript') {
      return filteredTranscriptRows.map((row, index) => ({
        id: `transcript-${index}`,
        index,
        row,
        type: 'transcript' as const,
      }));
    }
    return [];
  }, [
    activeTab,
    addByRssItemResourceData,
    clipRows,
    filteredTranscriptRows,
    isTabLoading,
    paneChapterRows,
    soundbiteRows,
  ]);
  const paneRows =
    !hasSections || !isPrefsHydrated || playerTabs.length === 0 ? EMPTY_PANE_ROWS : listRows;

  const layoutHasArtistLine = !isRemoteDisplay && hasArtistLine;
  const sheetBottomInset = tokens.spacing.md;
  const sheetBottomGap = hasSections ? insets.bottom + sheetBottomInset : 0;
  const layout = useMemo(
    () =>
      resolveFullPlayerLayout({
        chipStripHeight,
        hasArtistLine: layoutHasArtistLine,
        hasSegmentBand,
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
      hasSegmentBand,
      layoutHasArtistLine,
      hasSections,
      insets.bottom,
      isTablet,
      sheetBottomInset,
      tokens.spacing.lg,
      viewportHeight,
      viewportWidth,
    ]
  );
  const summaryPreview = useMemo(() => {
    const chrome = fullPlayerPaneSheetChrome(tokens.spacing);
    // The prose list keeps this inset above and below the scroller, outside the scrollport.
    const paneEdgeInset = tokens.spacing.base;
    const scrollportHeight = Math.max(
      0,
      layout.paneSheetHeight - FULL_PLAYER_PANE_SHEET_BORDER_WIDTH * 2 - paneEdgeInset * 2
    );
    const paneContentWidth = Math.max(
      0,
      viewportWidth -
        chrome.marginHorizontal * 2 -
        FULL_PLAYER_PANE_SHEET_BORDER_WIDTH * 2 -
        tokens.spacing.lg * 2
    );
    return resolveFullPlayerSummaryPreview({
      contentWidth: Math.min(contentMaxWidth, paneContentWidth),
      fontScale,
      paddingTop: 0,
      scrollportHeight,
    });
  }, [contentMaxWidth, fontScale, layout.paneSheetHeight, tokens.spacing, viewportWidth]);
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
        paneListFill: {
          flexGrow: 1,
        },
        // Frame around the scroller. Padding here stays on screen; padding on the list only
        // appears at the end of the content.
        proseFrame: {
          flex: 1,
          minHeight: 0,
          paddingVertical: tokens.spacing.base,
        },
        outerScroll: {
          flex: 1,
        },
        pane: {
          paddingHorizontal: tokens.spacing.lg,
          // Same top inset as a chapter row. Summary takes vertical inset from `proseFrame`
          // instead, so the bottom edge keeps the same inset while the text scrolls.
          paddingTop: tokens.spacing.base,
        },
        // Load errors are a footer, not a row. This inset is theirs alone.
        paneError: {
          paddingHorizontal: tokens.spacing.lg,
        },
        paneProse: {
          paddingHorizontal: tokens.spacing.lg,
        },
        paneText: {
          color: themeStyles.textPrimary.color,
          fontSize: FULL_PLAYER_PANE_TEXT_FONT_SIZE,
          lineHeight: FULL_PLAYER_PANE_TEXT_LINE_HEIGHT,
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
        artistLine: {
          color: tokens.text.link,
          fontSize: 15,
          fontWeight: '600',
          lineHeight: FULL_PLAYER_ARTIST_LINE_HEIGHT,
          textAlign: 'center',
        },
        subtitle: {
          fontSize: 17,
          fontWeight: '600',
          lineHeight: 22,
          textAlign: 'center',
        },
        subtitleLink: {
          color: tokens.text.link,
        },
        subtitlePlain: {
          color: themeStyles.textSecondary.color,
        },
        titleLink: {
          minWidth: 0,
          width: '100%',
        },
        title: {
          color: themeStyles.textPrimary.color,
          fontSize: 24,
          fontWeight: '600',
          lineHeight: 30,
          minWidth: 0,
        },
        titleBlock: {
          alignItems: 'stretch',
          gap: tokens.spacing.xs,
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
  const remoteRegionStyles = useMemo(
    (): FullPlayerRemoteRegionStyles => ({
      artworkBand: styles.playerRegionArtworkBand,
      content: [styles.column, styles.playerRegionContent, styles.playerRegionFull],
      controlStack: styles.playerRegionControlStack,
      region: [styles.playerRegion, { height: layout.playerRegionHeight }],
      subtitle: [styles.subtitle, styles.subtitlePlain],
      subtitleLink: [styles.subtitle, styles.subtitleLink],
      title: styles.title,
      titleBlock: styles.titleBlock,
      titleLink: styles.titleLink,
      upperBands: styles.playerRegionUpperBands,
    }),
    [layout.playerRegionHeight, styles]
  );

  // Expand re-parents the single native surface to the `full` target; collapse (unmount) animates it
  // back to `mini`. Reparenting + geometry only — never `load`/`destroy`, so playback stays
  // continuous. The `full` target view is the `PodverseVideoSurfaceView`
  // rendered below, which registers itself with the host; this only flips which target is active.
  useEffect(() => {
    nativePlaybackBridge.animateVideoSurface('full', ROOT_SLIDE_UP_ANIMATION_MS);
    return () => {
      if (isVideoFullscreenActive()) {
        return;
      }
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
        hasPlaybackSession: isRemoteDisplay || (activeTarget !== null && nowPlaying !== null),
        isAuthoringHold,
        isFocused,
      })
    ) {
      onClose();
    }
  }, [activeTarget, isAuthoringHold, isFocused, isRemoteDisplay, nowPlaying, onClose]);

  useEffect(() => {
    if (!isRemoteDisplay) {
      return;
    }
    setOpenSheet((current) => (current !== null && current !== 'speed' ? null : current));
    setIsArtistChooserOpen(false);
  }, [isRemoteDisplay]);

  useEffect(() => {
    setIsMarkedPlayed(false);
  }, [activeTarget]);

  useEffect(() => {
    scrollOuterToTop(outerScrollRef.current);
    scrollPaneListToTop(paneListRef.current);
  }, [currentItemIdText]);

  useEffect(() => {
    scrollPaneListToTop(paneListRef.current);
  }, [activeTab]);

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
        // The queue for the medium that is playing. A track can start while the podcast
        // queue is still active, and Next plays from the playing medium's queue.
        const queue = await fetchQueueForMedium(playbackMediumIdFromTarget(activeTarget));
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
  }, [activeTarget, fetchQueueForMedium, fetchUpcoming]);

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

  const handleSelectSection = useCallback(
    (tab: EpisodeTab) => {
      selectTab(tab);
      scrollOuterToPane(outerScrollRef.current);
    },
    [selectTab]
  );

  const handlePlay = () => {
    void resume();
  };

  const handlePause = () => {
    pause();
  };

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
      setActionNoticeKey(null);

      if (isSubscribed) {
        setIsSavingSubscription(true);
        try {
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
        } finally {
          setIsSavingSubscription(false);
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

      let pushChoice: Awaited<ReturnType<typeof askIfNeeded>> = null;
      let accountIdText: string | null = null;
      if (status === 'authenticated') {
        accountIdText = account?.id_text ?? null;
        pushChoice = accountIdText === null ? null : await askIfNeeded(accountIdText);
      }

      setIsSavingSubscription(true);
      try {
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

          if (accountIdText !== null) {
            await applyAfterFollow({
              accountIdText,
              auth: authContext,
              channelIdText: channel.id_text,
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
    })();
  }, [
    account?.id_text,
    applyAfterFollow,
    askIfNeeded,
    authContext,
    channel,
    evaluateFeature,
    handleGateError,
    i18n.language,
    isSavingSubscription,
    isSubscribed,
    isTierKnown,
    openGate,
    status,
  ]);

  const handleMarkAsPlayed = useCallback(() => {
    const target = queueMutationTarget;
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
        const marked =
          target.kind === 'add-by-rss'
            ? await markAddByRssAsPlayed(target.resourceData, target.medium, nextCompleted)
            : await markAsPlayed(target.idText, target.kind, target.mediaType, nextCompleted);
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
    evaluateFeature,
    handleGateError,
    isMarkedPlayed,
    isMarkingPlayed,
    isTierKnown,
    markAddByRssAsPlayed,
    markAsPlayed,
    openGate,
    queueMutationTarget,
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

    if (addByRssPaneState !== null) {
      if (addByRssPaneState === 'offline') {
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
      } else if (addByRssPaneState === 'auth-required') {
        body = (
          <View style={styles.pane}>
            <View style={styles.column}>
              <CallToActionSection
                actionLabelKey="authentication.login"
                messageKey="authentication.login_required"
                onAction={onRequestLogin}
                testID="full-player-auth-required"
              />
            </View>
          </View>
        );
      } else if (addByRssPaneState === 'error') {
        body = (
          <View style={styles.paneError}>
            <ListError
              messageKey="errors.generic"
              onRetry={retryAddByRssSections}
              testID={`full-player-pane-error-${activeTab}`}
            />
          </View>
        );
      } else if (addByRssPaneState === 'loading') {
        body = <LoadingSection testID={`full-player-pane-loading-${activeTab}`} />;
      }
    } else if (isTabLoading) {
      body = <LoadingSection testID={`full-player-pane-loading-${activeTab}`} />;
    } else if (tabErrorKey !== null) {
      body = (
        <View style={styles.paneError}>
          <ListError
            messageKey={tabErrorKey}
            onRetry={() => {
              void loadTab(activeTab);
            }}
            testID={`full-player-pane-error-${activeTab}`}
          />
        </View>
      );
    } else if (offlineModeEnabled && isEpisodeTabNetworkBody(activeTab)) {
      const hasCachedBody =
        (activeTab === 'chapters' && chapterRows.length > 0) ||
        (activeTab === 'soundbites' && soundbiteRows.length > 0) ||
        (activeTab === 'clips' && clipRows.length > 0) ||
        (activeTab === 'transcript' && paneTranscriptRows.length > 0);
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
        <View style={styles.paneProse} testID="full-player-summary-pane">
          <View style={styles.column}>
            <DescriptionText
              collapseLength={summaryPreview?.collapseLength}
              collapsedMaxLines={summaryPreview?.collapsedMaxLines}
              emptyLabel={t('info.summary.no_summary')}
              html={addByRssItemResourceData === null ? summaryHtml : addByRssSummary.html}
              linkStyle={styles.showMore}
              onDescriptionClock={
                addByRssItemResourceData === null
                  ? onDescriptionClock
                  : handleAddByRssDescriptionClock
              }
              resetKey={paneResetKey}
              showMoreStyle={styles.showMore}
              testID="full-player-summary-text"
              textStyle={styles.paneText}
              toggleTestID="full-player-summary-toggle"
              truncation={
                addByRssItemResourceData === null
                  ? summaryDescription?.isTruncated === true
                    ? { kind: 'item', linkUrl: summaryDescription.linkUrl }
                    : undefined
                  : addByRssSummary.truncation
              }
            />
            {activePaneNoticeKey !== null ? (
              <Text style={styles.actionNotice} testID="full-player-action-notice">
                {t(activePaneNoticeKey)}
              </Text>
            ) : null}
          </View>
        </View>
      );
    } else if (body === null && activeTab === 'people') {
      body = (
        <View style={styles.pane} testID="full-player-people-pane">
          <View style={styles.column}>
            <PeoplePane
              isLoading={addByRssItemResourceData === null && currentItem === null}
              layout="inline"
              people={
                addByRssItemResourceData === null
                  ? (currentItem?.item_persons ?? []).map(toAboutPersonFromItem)
                  : addByRssPeople
              }
              testIDPrefix="full-player"
            />
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
    } else if (body === null && activeTab === 'transcript' && paneTranscriptRows.length === 0) {
      body = (
        <View style={styles.pane} testID="full-player-transcript-pane">
          <View style={styles.column}>
            <ListEmpty
              messageKey="info.transcript.no_transcript"
              testID="full-player-empty-transcript"
            />
          </View>
        </View>
      );
    } else if (body === null && activeTab === 'chapters' && paneChapterRows.length === 0) {
      body = (
        <View style={styles.pane}>
          <View style={styles.column}>
            <ListEmpty messageKey="info.chapter.no_chapters" testID="full-player-empty-chapters" />
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
    } else if (body === null && activeTab === 'clips' && isLoadingMoreClips) {
      body = (
        <View style={styles.pane}>
          <View style={styles.column}>
            <ListLoading testID="full-player-clip-loading-more" />
          </View>
        </View>
      );
    } else if (body === null && activeTab === 'clips' && clipLoadMoreErrorKey !== null) {
      body = (
        <View style={styles.paneError}>
          <ListError
            messageKey={clipLoadMoreErrorKey}
            onRetry={handleRetryClipsPage}
            testID="full-player-clip-load-more-error"
          />
        </View>
      );
    }

    return body;
  }, [
    activePaneNoticeKey,
    activeTab,
    addByRssItemResourceData,
    addByRssPaneState,
    addByRssPeople,
    addByRssSummary.html,
    addByRssSummary.truncation,
    chapterRows.length,
    clipLoadMoreErrorKey,
    clipRows.length,
    currentItem,
    handleAddByRssDescriptionClock,
    handleRetryClipsPage,
    hasSections,
    isLoadingMoreClips,
    isPrefsHydrated,
    isTabLoading,
    loadTab,
    offlineModeEnabled,
    onDescriptionClock,
    onRequestLogin,
    paneChapterRows.length,
    paneResetKey,
    paneTranscriptRows.length,
    retryAddByRssSections,
    soundbiteRows.length,
    styles.actionNotice,
    styles.column,
    styles.pane,
    styles.paneError,
    styles.paneProse,
    styles.paneText,
    styles.showMore,
    summaryDescription,
    summaryHtml,
    summaryPreview,
    t,
    tabErrorKey,
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
            onSelect={handleSelectSection}
            selectedKey={activeTab}
            testID="full-player-sections"
          />
        </View>
      </View>
    ) : null;

  const playerRegion =
    remoteDisplay !== null ? (
      <FullPlayerRemoteRegion
        artworkSize={layout.artworkSize}
        channelLink={channelLink}
        chapters={chapters}
        contentLinkLabel={contentLinkLabel}
        display={remoteDisplay}
        onJumpBack={() => {
          jumpBy(-MEDIA_JUMP_BACK_SECONDS);
        }}
        onJumpForward={() => {
          jumpBy(MEDIA_JUMP_FORWARD_SECONDS);
        }}
        onOpenChannel={() => {
          if (channelLink !== null) {
            openLinkedContent(channelLink);
          }
        }}
        onOpenSpeed={() => {
          handleOpenSheet('speed');
        }}
        onOpenTitle={openTitleContent}
        onPause={handlePause}
        onPlay={handlePlay}
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
        regionStyles={remoteRegionStyles}
        statusText={statusText}
        titleLink={titleLink}
      />
    ) : isPlaybackActive ? (
      <View
        style={[styles.playerRegion, { height: layout.playerRegionHeight }]}
        testID="full-player-region"
      >
        <View style={[styles.column, styles.playerRegionContent, styles.playerRegionFull]}>
          <View style={styles.playerRegionUpperBands}>
            <View
              pointerEvents="box-none"
              style={[
                styles.titleBlock,
                { height: resolveFullPlayerTitleBlockHeight(hasArtistLine) },
              ]}
            >
              {titleLink !== null && visibleTitle !== null ? (
                <Pressable
                  accessibilityLabel={contentLinkLabel(titleLink)}
                  accessibilityRole="link"
                  onPress={openTitleContent}
                  style={({ pressed }) => [styles.titleLink, pressed ? { opacity: 0.6 } : null]}
                  testID="full-player-title-link"
                >
                  <MarqueeText
                    align="center"
                    style={styles.title}
                    testID="full-player-title"
                    turnGroup="full-player"
                    turnOrder={0}
                  >
                    {visibleTitle}
                  </MarqueeText>
                </Pressable>
              ) : (
                <MarqueeText
                  align="center"
                  style={styles.title}
                  testID="full-player-title"
                  turnGroup="full-player"
                  turnOrder={0}
                >
                  {visibleTitle ?? t('media_player.fullscreen_media_player')}
                </MarqueeText>
              )}
              {hasArtistLine && artistLineText.length > 0 ? (
                <Pressable
                  accessibilityLabel={t('media_player.open_named_screen', {
                    name: artistLineText,
                    screen: t(
                      playerArtists.length > 1 ? 'media.music.artists' : 'media.music.artist'
                    ),
                  })}
                  accessibilityRole="link"
                  onPress={onArtistLinePress}
                  style={({ pressed }) => [pressed ? { opacity: 0.6 } : null]}
                  testID="full-player-artist-link"
                >
                  <Text numberOfLines={1} style={styles.artistLine}>
                    {artistLineText}
                  </Text>
                </Pressable>
              ) : null}
              {visibleChannelTitle !== null && visibleChannelTitle.length > 0 ? (
                channelLink !== null ? (
                  <Pressable
                    accessibilityLabel={contentLinkLabel(channelLink)}
                    accessibilityRole="link"
                    onPress={() => {
                      openLinkedContent(channelLink);
                    }}
                    style={({ pressed }) => [pressed ? { opacity: 0.6 } : null]}
                    testID="full-player-channel-link"
                  >
                    <Text numberOfLines={1} style={[styles.subtitle, styles.subtitleLink]}>
                      {visibleChannelTitle}
                    </Text>
                  </Pressable>
                ) : (
                  <Text numberOfLines={1} style={[styles.subtitle, styles.subtitlePlain]}>
                    {visibleChannelTitle}
                  </Text>
                )
              ) : null}
            </View>

            <View pointerEvents="box-none" style={styles.playerRegionArtworkBand}>
              <FullPlayerArtwork
                accessibilityLabel={t('media_player.media_player_image')}
                artworkSize={layout.artworkSize}
                chapters={playerChapters}
              />
            </View>

            {hasSegmentBand ? (
              <View pointerEvents="box-none">
                <FullPlayerSegmentBand chapters={chapters} />
              </View>
            ) : null}

            <View pointerEvents="auto">
              {isLiveNowPlaying ? (
                <FullPlayerLiveProgress canRewind={liveCanRewind} />
              ) : (
                <FullPlayerScrubber chapters={chapters} />
              )}
            </View>
          </View>

          <View pointerEvents="auto" style={styles.playerRegionControlStack}>
            <FullPlayerTransportRow
              hasEpisodeChaptersForTrackButtons={episodeHasChaptersForTrackButtons}
              hasNextQueueItem={canSkipToNext}
              hideJumpButtons={isLiveNowPlaying && !liveCanRewind}
              isMusicNowPlaying={isMusicNowPlaying}
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
              state={transportState}
            />

            <FullPlayerUtilityRow
              isMusicNowPlaying={isMusicNowPlaying}
              isRepeatEnabled={autoQueueConfig.repeat}
              isShuffleEnabled={autoQueueConfig.random}
              onOpenMore={() => {
                handleOpenSheet('more');
              }}
              onOpenSleepTimer={() => {
                handleOpenSheet('sleep');
              }}
              onOpenSpeed={() => {
                handleOpenSheet('speed');
              }}
              onToggleRepeat={toggleRepeat}
              onToggleShuffle={toggleShuffle}
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
        showBoost={!isRemoteDisplay && canShowBoost}
        showCreateClip={!isRemoteDisplay && !isMusicNowPlaying}
        showV4v={!isRemoteDisplay && showV4v}
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
          showsVerticalScrollIndicator={false}
          style={styles.outerScroll}
          testID="full-player-outer-scroll"
        >
          {playerRegion}
          {chipStrip}
          {hasSections ? (
            <FullPlayerPaneSheet height={layout.paneSheetHeight} marginBottom={sheetBottomGap}>
              <View style={activeTab === 'summary' ? styles.proseFrame : styles.list}>
                {showTranscriptFollowBar ? (
                  <TranscriptFollowBar
                    autoScrollOn={autoScrollOn}
                    filterTestID="full-player-transcript-filter"
                    onChangeFilterTerm={setFilterTerm}
                    onToggleAutoScroll={toggleAutoScroll}
                    paddingHorizontal={tokens.spacing.lg}
                    term={filterTerm}
                    toggleTestID="full-player-transcript-autoscroll"
                  />
                ) : null}
                <FlatList
                  ListFooterComponent={renderPaneFooter}
                  alwaysBounceVertical={false}
                  bounces={false}
                  contentContainerStyle={
                    activeTab === 'summary' ||
                    (activeTab === 'transcript' && paneTranscriptRows.length === 0) ||
                    isTabLoading ||
                    tabErrorKey !== null ||
                    addByRssPaneState !== null
                      ? styles.paneListFill
                      : undefined
                  }
                  data={paneRows}
                  extraData={paneListExtraData}
                  keyExtractor={(row) => row.id}
                  nestedScrollEnabled
                  onEndReached={activeTab === 'clips' ? handleClipsEndReached : undefined}
                  onEndReachedThreshold={LIST_END_REACHED_THRESHOLD}
                  onScrollToIndexFailed={
                    activeTab === 'transcript' ? onTranscriptScrollToIndexFailed : undefined
                  }
                  onViewableItemsChanged={onTranscriptViewableItemsChanged}
                  overScrollMode="never"
                  ref={paneListRef}
                  removeClippedSubviews={LIST_REMOVE_CLIPPED_SUBVIEWS}
                  renderItem={({ item: row }) => {
                    if (row.type === 'transcript') {
                      return (
                        <TranscriptListRow
                          body={row.row.body}
                          highlighted={row.index === playingTranscriptIndex}
                          paddingHorizontal={tokens.spacing.lg}
                          speaker={row.row.speaker}
                          startTimeFormatted={row.row.startTimeFormatted}
                          testID={
                            row.index === 0
                              ? 'full-player-transcript-text'
                              : `full-player-transcript-row-${row.index}`
                          }
                        />
                      );
                    }

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
                          isPlaying={row.chapter.id_text === playingChapterIdText}
                          onPress={() => {
                            handleChapterPress(row.chapter);
                          }}
                          paddingHorizontal={tokens.spacing.lg}
                          showArtwork={artwork.show}
                          testID={`full-player-chapter-row-${row.chapter.id_text}`}
                          timeRange={t('features.clip.clip_time_range', {
                            hhmmssEnd: formatHHMMSS(Number(row.chapter.end_time)),
                            hhmmssStart: formatHHMMSS(Number(row.chapter.start_time)),
                          })}
                          title={row.chapter.title ?? row.chapter.id_text}
                        />
                      );
                    }

                    if (row.type === 'soundbite') {
                      return (
                        <View style={styles.column}>
                          <HomeFeedRow
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
                  indicatorStyle={isLightUiTheme(uiTheme) ? 'black' : 'white'}
                  persistentScrollbar
                  scrollEnabled={canOuterScroll}
                  scrollsToTop={false}
                  showsVerticalScrollIndicator
                  style={styles.list}
                  testID="full-player-section-list"
                  viewabilityConfig={transcriptViewabilityConfig}
                />
              </View>
            </FullPlayerPaneSheet>
          ) : null}
        </ScrollView>
      </View>

      <FullPlayerSleepTimer onCancel={handleCloseSheet} visible={openSheet === 'sleep'} />
      <FullPlayerSpeedControl onCancel={handleCloseSheet} visible={openSheet === 'speed'} />
      <FullPlayerMoreSheet
        canTogglePlayed={queueMutationTarget !== null}
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
      <ArtistChooserSheet
        artists={playerArtists}
        onCancel={() => {
          setIsArtistChooserOpen(false);
        }}
        onSelect={(artist) => {
          setIsArtistChooserOpen(false);
          openArtist(artist);
        }}
        testID="full-player-artist-chooser"
        visible={isArtistChooserOpen}
      />
      {addToPlaylistSheet}
      {boostSheet}
      {firstSubscribePushDialog}
    </View>
  );
}
