import type {
  BottomTabBarButtonProps,
  BottomTabNavigationProp,
} from '@react-navigation/bottom-tabs';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { PlatformPressable } from '@react-navigation/elements';
import type {
  LinkingOptions,
  NavigationProp,
  NavigatorScreenParams,
  ParamListBase,
} from '@react-navigation/native';
import {
  CommonActions,
  createNavigationContainerRef,
  getPathFromState as getDefaultPathFromState,
  NavigationContainer,
  StackActions,
} from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { breakpoints } from '@podverse/design-tokens';
import { APP_ROUTES, MOBILE_HOME_TAB_SEGMENT } from '@podverse/helpers';

import { useAuth } from '../auth/AuthProvider';
import { GlobalActivityBar } from '../components/feedback/GlobalActivityBar';
import { MiniPlayer } from '../components/player/MiniPlayer';
import { NowPlayingSegmentBar } from '../components/player/NowPlayingSegmentBar';
import type { MenuListItem, MenuListSection } from '../components/screen/MenuListScreen';
import { MenuListScreen } from '../components/screen/MenuListScreen';
import { OfflineModeBanner } from '../components/screen/OfflineModeBanner';
import { OfflineModeFeaturesHeader } from '../components/screen/OfflineModeFeaturesHeader';
import { getMobileConfig } from '../config';
import { buildMobileLinkPrefixes } from '../config/deepLinkSchemes';
import { isMobileE2eFromEnv } from '../config/env';
import { sumBadgeCounts } from '../downloads/inProgressDownloadCount';
import { useInProgressDownloadCount } from '../downloads/useDownloads';
import { isMobileE2eHarnessEnabled } from '../lib/e2e/e2eHarness';
import { PerfE2eReport } from '../lib/perf/PerfE2eReport';
import { useMembership } from '../membership/useMembership';
import { NotificationStreamE2eStatus } from '../notifications/NotificationStreamE2eStatus';
import { PlaybackE2eStatus } from '../playback/PlaybackE2eStatus';
import type { ContentTabId } from '../prefs/tabLayout';
import { isContentTabId, TAB_TEST_ID_SLUG, tabLabelKey } from '../prefs/tabLayout';
import { AlbumDetailScreen } from '../screens/album/AlbumDetailScreen';
import { ArtistDetailScreen } from '../screens/artist/ArtistDetailScreen';
import { BrowseScreen } from '../screens/browse/BrowseScreen';
import type { BrowseMediaType } from '../screens/browse/browseTypes';
import { ClipDetailScreen } from '../screens/clip/ClipDetailScreen';
import { MakeClipScreen } from '../screens/clip/MakeClipScreen';
import { EpisodeDetailScreen } from '../screens/episode/EpisodeDetailScreen';
import { HelloWorldScreen } from '../screens/HelloWorldScreen';
import type { AddByRssDetailStackParamList } from '../screens/home/addByRss/addByRssStackParams';
import { AddByRssEpisodeDetailScreen } from '../screens/home/AddByRssEpisodeDetailScreen';
import { AddByRssHomeDetailScreen } from '../screens/home/AddByRssHomeDetailScreen';
import { AddByRssLivestreamDetailScreen } from '../screens/home/AddByRssLivestreamDetailScreen';
import { AddByRssTrackDetailScreen } from '../screens/home/AddByRssTrackDetailScreen';
import { HomeScreen } from '../screens/home/HomeScreen';
import { ImageViewerScreen } from '../screens/image/ImageViewerScreen';
import { LibraryDownloadsScreen } from '../screens/library/LibraryDownloadsScreen';
import { LibraryHistoryScreen } from '../screens/library/LibraryHistoryScreen';
import { LibraryMyClipsScreen } from '../screens/library/LibraryMyClipsScreen';
import { LibraryPlaylistsScreen } from '../screens/library/LibraryPlaylistsScreen';
import { LibraryQueueScreen } from '../screens/library/LibraryQueueScreen';
import { PlaylistDetailScreen } from '../screens/library/PlaylistDetailScreen';
import { PlaylistFormScreen } from '../screens/library/PlaylistFormScreen';
import type { ApiKeyExpirationChoice } from '../screens/more/accountApiKeyRows';
import { MoreAboutScreen } from '../screens/more/MoreAboutScreen';
import { MoreAdvancedScreen } from '../screens/more/MoreAdvancedScreen';
import { MoreCustomApiScreen } from '../screens/more/MoreCustomApiScreen';
import { MoreE2ePlaybackScreen } from '../screens/more/MoreE2ePlaybackScreen';
import { MoreErrorLogDetailScreen } from '../screens/more/MoreErrorLogDetailScreen';
import { MoreErrorLogScreen } from '../screens/more/MoreErrorLogScreen';
import { MoreFaqScreen } from '../screens/more/MoreFaqScreen';
import { MoreIdentityRemapScreen } from '../screens/more/MoreIdentityRemapScreen';
import { MoreMembershipExtendScreen } from '../screens/more/MoreMembershipExtendScreen';
import { MoreMembershipScreen } from '../screens/more/MoreMembershipScreen';
import { MoreOpmlScreen } from '../screens/more/MoreOpmlScreen';
import { MoreRemovedContentScreen } from '../screens/more/MoreRemovedContentScreen';
import { MoreSettingsAppearanceScreen } from '../screens/more/MoreSettingsAppearanceScreen';
import { MoreSettingsAutoDownloadCatchUpScreen } from '../screens/more/MoreSettingsAutoDownloadCatchUpScreen';
import { MoreSettingsChangePasswordScreen } from '../screens/more/MoreSettingsChangePasswordScreen';
import { MoreSettingsDeveloperCreateScreen } from '../screens/more/MoreSettingsDeveloperCreateScreen';
import { MoreSettingsDeveloperExpirationScreen } from '../screens/more/MoreSettingsDeveloperExpirationScreen';
import { MoreSettingsDeveloperScreen } from '../screens/more/MoreSettingsDeveloperScreen';
import { MoreSettingsDownloadLimitScreen } from '../screens/more/MoreSettingsDownloadLimitScreen';
import { MoreSettingsDownloadsScreen } from '../screens/more/MoreSettingsDownloadsScreen';
import { MoreSettingsLocaleScreen } from '../screens/more/MoreSettingsLocaleScreen';
import { MoreSettingsNotificationsScreen } from '../screens/more/MoreSettingsNotificationsScreen';
import { MoreSettingsPlaybackScreen } from '../screens/more/MoreSettingsPlaybackScreen';
import { MoreSettingsScreen } from '../screens/more/MoreSettingsScreen';
import { MoreSettingsSessionsScreen } from '../screens/more/MoreSettingsSessionsScreen';
import { MoreSettingsTabBarScreen } from '../screens/more/MoreSettingsTabBarScreen';
import { MoreSettingsTasteProfileScreen } from '../screens/more/MoreSettingsTasteProfileScreen';
import { MoreSettingsThemeScreen } from '../screens/more/MoreSettingsThemeScreen';
import { MoreTermsOfServiceScreen } from '../screens/more/MoreTermsOfServiceScreen';
import { NotificationsInboxScreen } from '../screens/notifications/NotificationsInboxScreen';
import type {
  FullPlayerContentTarget,
  FullPlayerItemOpenRequest,
  FullPlayerOpenRequest,
  PlayerStackRoute,
} from '../screens/player/fullPlayerContentLink';
import { playerItemStackRoutes } from '../screens/player/fullPlayerContentLink';
import { FullPlayerScreen } from '../screens/player/FullPlayerScreen';
import { PodcastDetailScreen } from '../screens/podcast/PodcastDetailScreen';
import { MyProfileEditScreen } from '../screens/profile/MyProfileEditScreen';
import { MyProfileScreen } from '../screens/profile/MyProfileScreen';
import { ProfileScreen } from '../screens/profile/ProfileScreen';
import { RecommendationsScreen } from '../screens/recommendations/RecommendationsScreen';
import { AddByRssAddScreen } from '../screens/rss/AddByRssAddScreen';
import { AddByRssCredentialsScreen } from '../screens/rss/AddByRssCredentialsScreen';
import { AddByRssRemoteFeedScreen } from '../screens/rss/AddByRssRemoteFeedScreen';
import { AddByRssRootScreen } from '../screens/rss/AddByRssRootScreen';
import { PodcastIndexFeedPreviewScreen } from '../screens/search/PodcastIndexFeedPreviewScreen';
import { SearchScreen } from '../screens/search/SearchScreen';
import { TrackDetailScreen } from '../screens/track/TrackDetailScreen';
import { V4vInfoScreen } from '../screens/v4v/V4vInfoScreen';
import { BottomChromeOverlayHeightProvider } from '../theme/bottomChromeOverlayInset';
import { useNavigationTheme } from '../theme/useNavigationTheme';
import { useTheme } from '../theme/useTheme';
import { useThemedNativeStackScreenOptions } from '../theme/useThemedNativeStackScreenOptions';
import type { AlbumDetailRouteParams } from './albumDetailParams';
import { buildAlbumDetailParams } from './albumDetailParams';
import type { ArtistDetailRouteParams } from './artistDetailParams';
import { buildArtistDetailParams } from './artistDetailParams';
import { mapScopedPathToFlatPath } from './deepLinking';
import { focusedTabPop } from './focusedTabPop';
import { resolveMobileDeepLinkAction, resolveMobileDeepLinkState } from './notificationStack';
import { OrderedTabBar } from './OrderedTabBar';
import type { PodcastDetailRouteParams } from './podcastDetailParams';
import { buildPodcastDetailParams } from './podcastDetailParams';
import type { SearchResultDetailParams } from './searchResultDetailParams';
import { buildSearchResultDetailParams } from './searchResultDetailParams';
import {
  MAKE_CLIP_SCREEN_OPTIONS,
  ROOT_SEARCH_ROUTE_NAME,
  ROOT_SLIDE_UP_SCREEN_OPTIONS,
} from './slideUpScreen';
import { tabBarIcon } from './tabBarIcon';
import { useTabLayout } from './TabLayoutProvider';
import type { TrackDetailRouteParams } from './trackDetailParams';
import { buildTrackDetailParams } from './trackDetailParams';
import { useBottomChromeOverlayInsetSource } from './useBottomChromeOverlayInsetSource';

type MobileTabNavigatorProps = {
  onConsumePendingDeepLink: () => void;
  pendingDeepLinkUrl: string | null;
  onRequestLogin: () => void;
  onRequestLogout: () => Promise<void>;
  onRequestSignUp: () => void;
};

const Tab = createBottomTabNavigator();
const HomeStack = createNativeStackNavigator<HomeStackParamList>();
const SearchStack = createNativeStackNavigator<SearchStackParamList>();
const BrowseStack = createNativeStackNavigator<BrowseStackParamList>();
const LibraryStack = createNativeStackNavigator<LibraryStackParamList>();
const MoreStack = createNativeStackNavigator<MoreStackParamList>();
const RootStack = createNativeStackNavigator<RootStackParamList>();
const rootNavigationRef = createNavigationContainerRef<RootStackParamList>();

export const HOME_STACK_ROUTES = {
  AddByRssCredentials: 'AddByRssCredentials',
  AddByRssEpisodeDetail: 'AddByRssEpisodeDetail',
  AddByRssLivestreamDetail: 'AddByRssLivestreamDetail',
  AddByRssPodcastDetail: 'AddByRssPodcastDetail',
  AddByRssRemoteFeedDetail: 'AddByRssRemoteFeedDetail',
  AddByRssTrackDetail: 'AddByRssTrackDetail',
  AlbumDetail: 'AlbumDetail',
  ArtistDetail: 'ArtistDetail',
  ClipDetail: 'ClipDetail',
  EpisodeDetail: 'EpisodeDetail',
  HomeRoot: 'HomeRoot',
  PlaylistCreate: 'PlaylistCreate',
  PodcastDetail: 'PodcastDetail',
  TrackDetail: 'TrackDetail',
} as const;

/** Shared channel/item detail route names (registered on Home, Browse, Library, and Search stacks). */
export const CHANNEL_BROWSE_STACK_ROUTES = {
  AlbumDetail: 'AlbumDetail',
  ArtistDetail: 'ArtistDetail',
  ClipDetail: 'ClipDetail',
  EpisodeDetail: 'EpisodeDetail',
  PlaylistCreate: 'PlaylistCreate',
  PodcastDetail: 'PodcastDetail',
  /** Provider search detail for an unparsed feed (Search results and remote stub rows). */
  SearchResultDetail: 'SearchResultDetail',
  TrackDetail: 'TrackDetail',
} as const;

export const SEARCH_STACK_ROUTES = {
  ...CHANNEL_BROWSE_STACK_ROUTES,
  AddByRssCredentials: 'AddByRssCredentials',
  AddByRssEpisodeDetail: 'AddByRssEpisodeDetail',
  AddByRssLivestreamDetail: 'AddByRssLivestreamDetail',
  AddByRssPodcastDetail: 'AddByRssPodcastDetail',
  AddByRssRemoteFeedDetail: 'AddByRssRemoteFeedDetail',
  AddByRssTrackDetail: 'AddByRssTrackDetail',
  SearchRoot: 'SearchRoot',
} as const;

export const LIBRARY_STACK_ROUTES = {
  AddByRssAdd: 'AddByRssAdd',
  AddByRssCredentials: 'AddByRssCredentials',
  AddByRssEpisodeDetail: 'AddByRssEpisodeDetail',
  AddByRssLivestreamDetail: 'AddByRssLivestreamDetail',
  AddByRssPodcastDetail: 'AddByRssPodcastDetail',
  AddByRssRemoteFeedDetail: 'AddByRssRemoteFeedDetail',
  AddByRssTrackDetail: 'AddByRssTrackDetail',
  AddByRssRoot: 'AddByRssRoot',
  AlbumDetail: 'AlbumDetail',
  ArtistDetail: 'ArtistDetail',
  EpisodeDetail: 'EpisodeDetail',
  LibraryClipDetail: 'LibraryClipDetail',
  LibraryDownloads: 'LibraryDownloads',
  LibraryHistory: 'LibraryHistory',
  LibraryHub: 'LibraryHub',
  LibraryMyClips: 'LibraryMyClips',
  PlaylistCreate: 'PlaylistCreate',
  PlaylistDetail: 'PlaylistDetail',
  PlaylistEdit: 'PlaylistEdit',
  LibraryPlaylists: 'LibraryPlaylists',
  LibraryQueue: 'LibraryQueue',
  PodcastDetail: 'PodcastDetail',
  SearchResultDetail: 'SearchResultDetail',
  TrackDetail: 'TrackDetail',
} as const;

export const BROWSE_STACK_ROUTES = {
  ...CHANNEL_BROWSE_STACK_ROUTES,
  AddByRssCredentials: 'AddByRssCredentials',
  AddByRssEpisodeDetail: 'AddByRssEpisodeDetail',
  AddByRssLivestreamDetail: 'AddByRssLivestreamDetail',
  AddByRssPodcastDetail: 'AddByRssPodcastDetail',
  AddByRssRemoteFeedDetail: 'AddByRssRemoteFeedDetail',
  AddByRssTrackDetail: 'AddByRssTrackDetail',
  BrowseRoot: 'BrowseRoot',
  PlaylistDetail: 'PlaylistDetail',
  Profile: 'Profile',
} as const;

export const MORE_STACK_ROUTES = {
  MoreAbout: 'MoreAbout',
  MoreE2ePlayback: 'MoreE2ePlayback',
  MoreIdentityRemap: 'MoreIdentityRemap',
  MoreFaq: 'MoreFaq',
  MoreMembership: 'MoreMembership',
  MoreMembershipExtend: 'MoreMembershipExtend',
  MoreOpml: 'MoreOpml',
  MoreOverflowBrowse: 'MoreOverflowBrowse',
  MoreOverflowHome: 'MoreOverflowHome',
  MoreOverflowLibrary: 'MoreOverflowLibrary',
  MoreOverflowRecommendations: 'MoreOverflowRecommendations',
  MorePublicProfile: 'MorePublicProfile',
  MoreProfile: 'MoreProfile',
  MoreProfileEdit: 'MoreProfileEdit',
  PlaylistDetail: 'PlaylistDetail',
  MoreRoot: 'MoreRoot',
  MoreSettings: 'MoreSettings',
  MoreSettingsAppearance: 'MoreSettingsAppearance',
  MoreSettingsAutoDownloadCatchUp: 'MoreSettingsAutoDownloadCatchUp',
  MoreSettingsChangePassword: 'MoreSettingsChangePassword',
  MoreSettingsDownloadLimit: 'MoreSettingsDownloadLimit',
  MoreSettingsDownloads: 'MoreSettingsDownloads',
  MoreSettingsLocale: 'MoreSettingsLocale',
  MoreSettingsNotifications: 'MoreSettingsNotifications',
  MoreSettingsPlayback: 'MoreSettingsPlayback',
  MoreSettingsTasteProfile: 'MoreSettingsTasteProfile',
  MoreSettingsSessions: 'MoreSettingsSessions',
  MoreSettingsDeveloper: 'MoreSettingsDeveloper',
  MoreSettingsDeveloperCreate: 'MoreSettingsDeveloperCreate',
  MoreSettingsDeveloperExpiration: 'MoreSettingsDeveloperExpiration',
  MoreTermsOfService: 'MoreTermsOfService',
  MoreSettingsTabBar: 'MoreSettingsTabBar',
  MoreSettingsTheme: 'MoreSettingsTheme',
  MoreSmoke: 'MoreSmoke',
  MoreAdvanced: 'MoreAdvanced',
  MoreCustomApi: 'MoreCustomApi',
  MoreErrorLog: 'MoreErrorLog',
  MoreErrorLogDetail: 'MoreErrorLogDetail',
  MoreRemovedContent: 'MoreRemovedContent',
} as const;

export const ROOT_STACK_ROUTES = {
  FullPlayer: 'FullPlayer',
  ImageViewer: 'ImageViewer',
  MakeClip: 'MakeClip',
  MainTabs: 'MainTabs',
  NotificationsInbox: 'NotificationsInbox',
  Search: ROOT_SEARCH_ROUTE_NAME,
  V4vInfo: 'V4vInfo',
} as const;

// Tablet breakpoint for adaptive tab rail — same `lg` token as useResponsive.
export const MOBILE_TABLET_NAV_MIN_WIDTH = breakpoints.lg;

/** Prefix used by the More-hosted copy of a content tab's linking paths. */
const OVERFLOW_LINK_PREFIX = 'more/overflow';

/**
 * `Object.fromEntries` widens keys to `string`. The assertion restores the source key union so the
 * result still matches `PathConfigMap` for that tab.
 */
const prefixScreenPaths = <Screens extends Record<string, string>>(
  screens: Screens,
  prefix: string
): { [Key in keyof Screens]: string } => {
  return Object.fromEntries(
    Object.entries(screens).map(([name, path]) => [name, `${prefix}/${path}`])
  ) as { [Key in keyof Screens]: string };
};

const homeTabLinkScreens = {
  AddByRssEpisodeDetail: `${MOBILE_HOME_TAB_SEGMENT}/add-by-rss/:feedIdText/item/:itemKey`,
  AddByRssLivestreamDetail: `${MOBILE_HOME_TAB_SEGMENT}/add-by-rss/:feedIdText/livestream/:liveItemKey`,
  AddByRssPodcastDetail: `${MOBILE_HOME_TAB_SEGMENT}/add-by-rss/:feedIdText`,
  AddByRssTrackDetail: `${MOBILE_HOME_TAB_SEGMENT}/add-by-rss/:feedIdText/track/:itemKey`,
  AlbumDetail: `${MOBILE_HOME_TAB_SEGMENT}${APP_ROUTES.ALBUM}/:albumId`,
  ArtistDetail: `${MOBILE_HOME_TAB_SEGMENT}${APP_ROUTES.ARTIST}/:artistId`,
  ClipDetail: `${MOBILE_HOME_TAB_SEGMENT}${APP_ROUTES.CLIP}/:clipId`,
  EpisodeDetail: `${MOBILE_HOME_TAB_SEGMENT}${APP_ROUTES.EPISODE}/:episodeId`,
  HomeRoot: MOBILE_HOME_TAB_SEGMENT,
  PodcastDetail: `${MOBILE_HOME_TAB_SEGMENT}${APP_ROUTES.PODCAST}/:podcastId`,
  TrackDetail: `${MOBILE_HOME_TAB_SEGMENT}${APP_ROUTES.TRACK}/:trackId`,
} as const;

const moreTabLinkScreens = {
  MoreAbout: 'more/about',
  MoreAdvanced: 'more/advanced',
  MoreCustomApi: 'more/advanced/custom-api',
  MoreE2ePlayback: 'more/e2e/playback',
  MoreIdentityRemap: 'more/e2e/identity-remap',
  MoreErrorLog: 'more/advanced/error-log',
  MoreRemovedContent: 'more/advanced/removed-content',
  MoreFaq: 'more/faq',
  MoreMembership: `more${APP_ROUTES.MEMBERSHIP}`,
  MoreMembershipExtend: `more${APP_ROUTES.MEMBERSHIP_RENEW}`,
  MoreOpml: 'more/opml',
  MorePublicProfile: `more${APP_ROUTES.PROFILE}/:accountIdText`,
  MoreProfile: `more${APP_ROUTES.PROFILE}`,
  MoreRoot: 'more',
  MoreSettings: `more${APP_ROUTES.SETTINGS}`,
  MoreSettingsAppearance: `more${APP_ROUTES.SETTINGS}/appearance`,
  MoreSettingsAutoDownloadCatchUp: `more${APP_ROUTES.SETTINGS}/downloads/catch-up`,
  MoreSettingsChangePassword: `more${APP_ROUTES.SETTINGS}/change-password`,
  MoreSettingsDownloadLimit: `more${APP_ROUTES.SETTINGS}/downloads/limit`,
  MoreSettingsDownloads: `more${APP_ROUTES.SETTINGS}/downloads`,
  MoreSettingsLocale: `more${APP_ROUTES.SETTINGS}/locale`,
  MoreSettingsNotifications: `more${APP_ROUTES.SETTINGS}/notifications`,
  MoreSettingsPlayback: `more${APP_ROUTES.SETTINGS}/playback`,
  MoreSettingsSessions: `more${APP_ROUTES.SETTINGS}/sessions`,
  MoreSettingsDeveloper: `more${APP_ROUTES.SETTINGS}/developer`,
  MoreSettingsTabBar: `more${APP_ROUTES.SETTINGS}/tab-bar`,
  MoreSettingsTheme: `more${APP_ROUTES.SETTINGS}/theme`,
  MoreSmoke: 'more/e2e/smoke',
} as const;

const libraryTabLinkScreens = {
  AddByRssAdd: 'my-library/add-by-rss/add',
  AddByRssCredentials: 'my-library/add-by-rss/credentials/:feedIdText',
  AddByRssEpisodeDetail: 'my-library/add-by-rss/:feedIdText/item/:itemKey',
  AddByRssLivestreamDetail: 'my-library/add-by-rss/:feedIdText/livestream/:liveItemKey',
  AddByRssPodcastDetail: 'my-library/add-by-rss/:feedIdText',
  AddByRssTrackDetail: 'my-library/add-by-rss/:feedIdText/track/:itemKey',
  AddByRssRoot: 'my-library/add-by-rss',
  AlbumDetail: `my-library${APP_ROUTES.ALBUM}/:albumId`,
  ArtistDetail: `my-library${APP_ROUTES.ARTIST}/:artistId`,
  EpisodeDetail: `my-library${APP_ROUTES.EPISODE}/:episodeId`,
  LibraryClipDetail: `my-library${APP_ROUTES.CLIP}/:clipId`,
  LibraryDownloads: 'my-library/downloads',
  LibraryHistory: 'my-library/history',
  LibraryHub: 'my-library',
  LibraryMyClips: 'my-library/my-clips',
  PlaylistCreate: `my-library${APP_ROUTES.PLAYLIST}/create`,
  PlaylistDetail: `my-library${APP_ROUTES.PLAYLIST}/:playlistId`,
  PlaylistEdit: `my-library${APP_ROUTES.PLAYLIST}/:playlistId/edit`,
  LibraryPlaylists: 'my-library/playlists',
  LibraryQueue: 'my-library/queue',
  PodcastDetail: `my-library${APP_ROUTES.PODCAST}/:podcastId`,
  TrackDetail: `my-library${APP_ROUTES.TRACK}/:trackId`,
} as const;

const browseTabLinkScreens = {
  AddByRssCredentials: 'browse/add-by-rss/credentials/:feedIdText',
  AddByRssEpisodeDetail: 'browse/add-by-rss/:feedIdText/item/:itemKey',
  AddByRssLivestreamDetail: 'browse/add-by-rss/:feedIdText/livestream/:liveItemKey',
  AddByRssPodcastDetail: 'browse/add-by-rss/:feedIdText',
  AddByRssTrackDetail: 'browse/add-by-rss/:feedIdText/track/:itemKey',
  AlbumDetail: `browse${APP_ROUTES.ALBUM}/:albumId`,
  ArtistDetail: `browse${APP_ROUTES.ARTIST}/:artistId`,
  BrowseRoot: 'browse',
  ClipDetail: `browse${APP_ROUTES.CLIP}/:clipId`,
  EpisodeDetail: `browse${APP_ROUTES.EPISODE}/:episodeId`,
  PlaylistDetail: `browse${APP_ROUTES.PLAYLIST}/:playlistId`,
  PodcastDetail: `browse${APP_ROUTES.PODCAST}/:podcastId`,
  Profile: `browse${APP_ROUTES.PROFILE}/:accountIdText`,
  TrackDetail: `browse${APP_ROUTES.TRACK}/:trackId`,
} as const;

const recommendationsTabLinkScreens = {
  AddByRssCredentials: 'recommendations/add-by-rss/credentials/:feedIdText',
  AddByRssEpisodeDetail: 'recommendations/add-by-rss/:feedIdText/item/:itemKey',
  AddByRssLivestreamDetail: 'recommendations/add-by-rss/:feedIdText/livestream/:liveItemKey',
  AddByRssPodcastDetail: 'recommendations/add-by-rss/:feedIdText',
  AddByRssTrackDetail: 'recommendations/add-by-rss/:feedIdText/track/:itemKey',
  AlbumDetail: `recommendations${APP_ROUTES.ALBUM}/:albumId`,
  ArtistDetail: `recommendations${APP_ROUTES.ARTIST}/:artistId`,
  BrowseRoot: 'recommendations',
  ClipDetail: `recommendations${APP_ROUTES.CLIP}/:clipId`,
  EpisodeDetail: `recommendations${APP_ROUTES.EPISODE}/:episodeId`,
  PlaylistDetail: `recommendations${APP_ROUTES.PLAYLIST}/:playlistId`,
  PodcastDetail: `recommendations${APP_ROUTES.PODCAST}/:podcastId`,
  Profile: `recommendations${APP_ROUTES.PROFILE}/:accountIdText`,
  TrackDetail: `recommendations${APP_ROUTES.TRACK}/:trackId`,
} as const;

const searchTabLinkScreens = {
  AddByRssCredentials: 'search/add-by-rss/credentials/:feedIdText',
  AddByRssEpisodeDetail: 'search/add-by-rss/:feedIdText/item/:itemKey',
  AddByRssLivestreamDetail: 'search/add-by-rss/:feedIdText/livestream/:liveItemKey',
  AddByRssPodcastDetail: 'search/add-by-rss/:feedIdText',
  AddByRssTrackDetail: 'search/add-by-rss/:feedIdText/track/:itemKey',
  AlbumDetail: `search${APP_ROUTES.ALBUM}/:albumId`,
  ArtistDetail: `search${APP_ROUTES.ARTIST}/:artistId`,
  ClipDetail: `search${APP_ROUTES.CLIP}/:clipId`,
  EpisodeDetail: `search${APP_ROUTES.EPISODE}/:episodeId`,
  PodcastDetail: `search${APP_ROUTES.PODCAST}/:podcastId`,
  SearchResultDetail: 'search/result/:resultId',
  SearchRoot: 'search',
  TrackDetail: `search${APP_ROUTES.TRACK}/:trackId`,
} as const;

const mobileNavigationScreens = {
  FullPlayer: 'player',
  NotificationsInbox: 'notifications',
  Search: {
    screens: searchTabLinkScreens,
  },
  V4vInfo: 'v4v',
  MainTabs: {
    screens: {
      Home: {
        // Home content routes carry the `home/` prefix so they match the scoped paths produced by
        // `mapIncomingPathToScopedPath` (and consumed back by `mapScopedPathToFlatPath`). Without
        // it, `getStateFromPath('/home/podcast/:id')` returns undefined and deep links fall back
        // to Home. HomeRoot stays the bare `home` segment. Search is a root slide-up, so its
        // `search` paths live on that root route, not under Home.
        screens: homeTabLinkScreens,
      },
      More: {
        screens: {
          ...moreTabLinkScreens,
          // Overflow copies of each content-tab stack.
          MoreOverflowBrowse: {
            screens: prefixScreenPaths(browseTabLinkScreens, OVERFLOW_LINK_PREFIX),
          },
          MoreOverflowHome: {
            screens: prefixScreenPaths(homeTabLinkScreens, OVERFLOW_LINK_PREFIX),
          },
          MoreOverflowLibrary: {
            screens: prefixScreenPaths(libraryTabLinkScreens, OVERFLOW_LINK_PREFIX),
          },
          MoreOverflowRecommendations: {
            screens: prefixScreenPaths(recommendationsTabLinkScreens, OVERFLOW_LINK_PREFIX),
          },
        },
      },
      'My Library': {
        screens: libraryTabLinkScreens,
      },
      Browse: {
        screens: browseTabLinkScreens,
      },
      Recommendations: {
        screens: recommendationsTabLinkScreens,
      },
    },
  },
} as const;

/**
 * Deep-link prefixes derived from build config: the custom scheme(s) (`podverse-next://`,
 * `podverse://`, …) plus the public web base URL for universal / app links. Env-driven via
 * `EXPO_PUBLIC_MOBILE_DEEP_LINK_SCHEMES` / `EXPO_PUBLIC_MOBILE_WEB_BASE_URL` so forks can rebuild
 * without any hardcoded Podverse scheme or domain. Kept in sync with native registration in
 * `app.config.ts` (both parse the same env via `config/deepLinkSchemes.js`).
 */
const mobileLinkConfig = getMobileConfig();
export const MOBILE_LINK_PREFIXES = buildMobileLinkPrefixes(
  mobileLinkConfig.deepLinkSchemes,
  mobileLinkConfig.webBaseUrl
);

export const mobileNavigationLinking: LinkingOptions<RootStackParamList> = {
  config: {
    screens: mobileNavigationScreens,
  },
  getPathFromState: (state, options) => {
    const scopedPath = getDefaultPathFromState(state, options);
    return mapScopedPathToFlatPath(scopedPath);
  },
  getStateFromPath: (path, options) => {
    return resolveMobileDeepLinkState(path, options);
  },
  prefixes: MOBILE_LINK_PREFIXES,
};

export type { AlbumDetailRouteParams };
export { buildAlbumDetailParams };
export type { ArtistDetailRouteParams };
export { buildArtistDetailParams };
export type { PodcastDetailRouteParams };
export { buildPodcastDetailParams };
export type { SearchResultDetailParams };
export { buildSearchResultDetailParams };
export type { TrackDetailRouteParams };
export { buildTrackDetailParams };

/** Channel/item detail params shared by Home, Browse, Library, and Search stacks (tab isolation). */
export type ChannelBrowseStackParamList = {
  AlbumDetail: AlbumDetailRouteParams;
  ArtistDetail: ArtistDetailRouteParams;
  ClipDetail: { clipId: string };
  EpisodeDetail: { episodeId: string };
  PlaylistCreate: undefined;
  PodcastDetail: PodcastDetailRouteParams;
  SearchResultDetail: SearchResultDetailParams;
  TrackDetail: TrackDetailRouteParams;
};

export type HomeStackParamList = ChannelBrowseStackParamList &
  AddByRssDetailStackParamList & {
    HomeRoot: undefined;
  };

export type SearchStackParamList = ChannelBrowseStackParamList &
  AddByRssDetailStackParamList & {
    /**
     * `autoFocus` clears the field and focuses it. Home's search control and empty-state button
     * send it. `medium` optionally selects the All / Music chip (and persists it) before the field
     * focuses. Both are consumed on focus so returning from a result keeps the query.
     */
    SearchRoot: { autoFocus?: boolean; medium?: 'all' | 'music' } | undefined;
  };

export type LibraryStackParamList = AddByRssDetailStackParamList & {
  AddByRssAdd: undefined;
  AddByRssRoot: undefined;
  AlbumDetail: AlbumDetailRouteParams;
  ArtistDetail: ArtistDetailRouteParams;
  EpisodeDetail: { episodeId: string };
  LibraryClipDetail: { clipId: string };
  LibraryDownloads: undefined;
  LibraryHistory: undefined;
  LibraryHub: undefined;
  LibraryMyClips: undefined;
  PlaylistCreate: undefined;
  PlaylistDetail: { playlistId: string };
  PlaylistEdit: { playlistId: string };
  LibraryPlaylists: undefined;
  LibraryQueue: undefined;
  PodcastDetail: PodcastDetailRouteParams;
  SearchResultDetail: SearchResultDetailParams;
  TrackDetail: TrackDetailRouteParams;
};

export type BrowseStackParamList = ChannelBrowseStackParamList &
  AddByRssDetailStackParamList & {
    /**
     * `mediaType` is a request from another tab (Home's empty state) to open Browse on a specific
     * chip. Applied once on focus, persisted, then cleared so a later tab return keeps the user's
     * last Browse choice.
     */
    BrowseRoot: { mediaType?: BrowseMediaType } | undefined;
    PlaylistDetail: { playlistId: string };
    Profile: { accountIdText: string };
  };

export type MoreStackParamList = {
  MoreAbout: undefined;
  MoreE2ePlayback: undefined;
  MoreIdentityRemap: undefined;
  MoreFaq: undefined;
  MoreMembership: undefined;
  MoreMembershipExtend: undefined;
  MoreOpml: undefined;
  MoreOverflowBrowse: NavigatorScreenParams<BrowseStackParamList> | undefined;
  MoreOverflowHome: NavigatorScreenParams<HomeStackParamList> | undefined;
  MoreOverflowLibrary: NavigatorScreenParams<LibraryStackParamList> | undefined;
  MoreOverflowRecommendations: NavigatorScreenParams<BrowseStackParamList> | undefined;
  MorePublicProfile: { accountIdText: string };
  MoreProfile: undefined;
  MoreProfileEdit: undefined;
  PlaylistDetail: { playlistId: string };
  MoreRoot: undefined;
  MoreSettings: undefined;
  MoreSettingsAppearance: undefined;
  MoreSettingsAutoDownloadCatchUp: undefined;
  MoreSettingsChangePassword: undefined;
  MoreSettingsDownloadLimit: undefined;
  MoreSettingsDownloads: undefined;
  MoreSettingsLocale: undefined;
  MoreSettingsNotifications: undefined;
  MoreSettingsPlayback: undefined;
  MoreSettingsTasteProfile: undefined;
  MoreSettingsSessions: undefined;
  MoreSettingsDeveloper: undefined;
  MoreSettingsDeveloperCreate: { expiresIn?: ApiKeyExpirationChoice } | undefined;
  MoreSettingsDeveloperExpiration: { expiresIn: ApiKeyExpirationChoice };
  MoreTermsOfService: undefined;
  MoreSettingsTabBar: undefined;
  MoreSettingsTheme: undefined;
  MoreSmoke: undefined;
  MoreAdvanced: undefined;
  MoreCustomApi: undefined;
  MoreErrorLog: undefined;
  MoreErrorLogDetail: { entryId: number };
  MoreRemovedContent: undefined;
};

/** Slide-up image viewer. `addByRssFeedUrl` is a feed URL, never a request header. */
export type ImageViewerRouteParams = {
  accessibilityLabel: string;
  addByRssFeedUrl?: string;
  uri: string;
};

export type RootStackParamList = {
  FullPlayer: undefined;
  ImageViewer: ImageViewerRouteParams;
  MakeClip: { mode: 'create' } | { mode: 'edit'; clipId: string };
  // Nested params so the global membership gate/banner (mounted above the navigator) can deep-navigate
  // to More ▸ Membership via `navigateToMembershipScreen()`.
  MainTabs: NavigatorScreenParams<MobileTabParamList> | undefined;
  NotificationsInbox: undefined;
  Search: NavigatorScreenParams<SearchStackParamList> | undefined;
  V4vInfo: undefined;
};

/** Bottom-tab route names, used for type-safe cross-tab navigation (e.g. Home → My Library). */
export type MobileTabParamList = {
  Home: NavigatorScreenParams<HomeStackParamList> | undefined;
  Browse: NavigatorScreenParams<BrowseStackParamList> | undefined;
  Recommendations: NavigatorScreenParams<BrowseStackParamList> | undefined;
  'My Library': NavigatorScreenParams<LibraryStackParamList> | undefined;
  More: NavigatorScreenParams<MoreStackParamList> | undefined;
};

/**
 * The full player is a card on the root stack above the tab shell. Opening a link from
 * that card pops back to the shell that is already there, so the other tabs keep the
 * screens the listener left.
 */
const returnToMainTabs = (
  navigation: { navigate: NavigationProp<RootStackParamList>['navigate'] },
  params: NonNullable<RootStackParamList['MainTabs']>
): void => {
  navigation.navigate(ROOT_STACK_ROUTES.MainTabs, params, { pop: true });
};

const openFullPlayerContent = (
  navigation: NavigationProp<RootStackParamList>,
  request: FullPlayerOpenRequest,
  visibleTabIds: readonly ContentTabId[]
): void => {
  const previewImageUrl = request.imageUrl;
  const previewTitle = request.name;

  if (request.stack === 'Home') {
    const params = homeContentParams(request, previewImageUrl, previewTitle);
    if (visibleTabIds.includes('Home')) {
      returnToMainTabs(navigation, { params, screen: 'Home' });
      return;
    }
    returnToMainTabs(navigation, {
      params: { initial: false, params, screen: MORE_STACK_ROUTES.MoreOverflowHome },
      screen: 'More',
    });
    return;
  }

  const params = browseContentParams(request, previewImageUrl, previewTitle);
  if (visibleTabIds.includes('Browse')) {
    returnToMainTabs(navigation, { params, screen: 'Browse' });
    return;
  }
  returnToMainTabs(navigation, {
    params: { initial: false, params, screen: MORE_STACK_ROUTES.MoreOverflowBrowse },
    screen: 'More',
  });
};

const playerChannelRoute = (channel: FullPlayerContentTarget): PlayerStackRoute | null => {
  switch (channel.kind) {
    case 'podcast':
      return {
        name: HOME_STACK_ROUTES.PodcastDetail,
        params: buildPodcastDetailParams({
          podcastId: channel.idText,
          previewImageUrl: channel.imageUrl,
          previewTitle: channel.name,
        }),
      };
    case 'album':
      return {
        name: HOME_STACK_ROUTES.AlbumDetail,
        params: buildAlbumDetailParams({
          albumId: channel.idText,
          previewImageUrl: channel.imageUrl,
          previewTitle: channel.name,
        }),
      };
    case 'artist':
      return {
        name: HOME_STACK_ROUTES.ArtistDetail,
        params: buildArtistDetailParams({
          artistId: channel.idText,
          previewImageUrl: channel.imageUrl,
          previewTitle: channel.name,
        }),
      };
    case 'add-by-rss':
      return {
        name: HOME_STACK_ROUTES.AddByRssPodcastDetail,
        params: { feedIdText: channel.idText },
      };
    case 'add-by-rss-episode':
    case 'add-by-rss-livestream':
    case 'add-by-rss-track':
    case 'clip':
    case 'episode':
    case 'track':
      return null;
  }
};

const playerItemRoute = (item: FullPlayerContentTarget): PlayerStackRoute | null => {
  switch (item.kind) {
    case 'episode':
      return { name: HOME_STACK_ROUTES.EpisodeDetail, params: { episodeId: item.idText } };
    case 'clip':
      return { name: HOME_STACK_ROUTES.ClipDetail, params: { clipId: item.idText } };
    case 'track':
      return {
        name: HOME_STACK_ROUTES.TrackDetail,
        params: buildTrackDetailParams({
          previewImageUrl: item.imageUrl,
          previewTitle: item.name,
          trackId: item.idText,
        }),
      };
    case 'add-by-rss-episode':
      return {
        name: HOME_STACK_ROUTES.AddByRssEpisodeDetail,
        params: { feedIdText: item.idText, itemKey: item.itemKey ?? '' },
      };
    case 'add-by-rss-track':
      return {
        name: HOME_STACK_ROUTES.AddByRssTrackDetail,
        params: { feedIdText: item.idText, itemKey: item.itemKey ?? '' },
      };
    case 'add-by-rss-livestream':
      return {
        name: HOME_STACK_ROUTES.AddByRssLivestreamDetail,
        params: { feedIdText: item.idText, liveItemKey: item.itemKey ?? '' },
      };
    case 'add-by-rss':
    case 'album':
    case 'artist':
    case 'podcast':
      return null;
  }
};

const openFullPlayerItem = (
  navigation: NavigationProp<RootStackParamList>,
  request: FullPlayerItemOpenRequest,
  visibleTabIds: readonly ContentTabId[]
): void => {
  const channelRoute = playerChannelRoute(request.channel);
  if (channelRoute === null) {
    openFullPlayerContent(navigation, { ...request.item, stack: request.stack }, visibleTabIds);
    return;
  }

  const itemRoute = playerItemRoute(request.item);
  if (itemRoute === null) {
    openFullPlayerContent(navigation, { ...request.item, stack: request.stack }, visibleTabIds);
    return;
  }

  const rootName =
    request.stack === 'Home' ? HOME_STACK_ROUTES.HomeRoot : BROWSE_STACK_ROUTES.BrowseRoot;
  const routes = playerItemStackRoutes(rootName, channelRoute, itemRoute);
  const stackParams = { state: { index: routes.length - 1, routes } };

  if (request.stack === 'Home') {
    if (visibleTabIds.includes('Home')) {
      returnToMainTabs(navigation, { params: stackParams, screen: 'Home' });
      return;
    }
    returnToMainTabs(navigation, {
      params: { initial: false, params: stackParams, screen: MORE_STACK_ROUTES.MoreOverflowHome },
      screen: 'More',
    });
    return;
  }

  if (visibleTabIds.includes('Browse')) {
    returnToMainTabs(navigation, { params: stackParams, screen: 'Browse' });
    return;
  }
  returnToMainTabs(navigation, {
    params: {
      initial: false,
      params: stackParams,
      screen: MORE_STACK_ROUTES.MoreOverflowBrowse,
    },
    screen: 'More',
  });
};

const homeContentParams = (
  request: FullPlayerOpenRequest,
  previewImageUrl: string | null,
  previewTitle: string
): NavigatorScreenParams<HomeStackParamList> => {
  switch (request.kind) {
    case 'episode':
      return { initial: false, params: { episodeId: request.idText }, screen: 'EpisodeDetail' };
    case 'clip':
      return { initial: false, params: { clipId: request.idText }, screen: 'ClipDetail' };
    case 'track':
      return {
        initial: false,
        params: buildTrackDetailParams({ previewImageUrl, previewTitle, trackId: request.idText }),
        screen: 'TrackDetail',
      };
    case 'podcast':
      return {
        initial: false,
        params: buildPodcastDetailParams({
          podcastId: request.idText,
          previewImageUrl,
          previewTitle,
        }),
        screen: 'PodcastDetail',
      };
    case 'album':
      return {
        initial: false,
        params: buildAlbumDetailParams({ albumId: request.idText, previewImageUrl, previewTitle }),
        screen: 'AlbumDetail',
      };
    case 'artist':
      return {
        initial: false,
        params: buildArtistDetailParams({
          artistId: request.idText,
          previewImageUrl,
          previewTitle,
        }),
        screen: 'ArtistDetail',
      };
    case 'add-by-rss':
      return {
        initial: false,
        params: { feedIdText: request.idText },
        screen: 'AddByRssPodcastDetail',
      };
    case 'add-by-rss-episode':
      return {
        initial: false,
        params: { feedIdText: request.idText, itemKey: request.itemKey ?? '' },
        screen: 'AddByRssEpisodeDetail',
      };
    case 'add-by-rss-track':
      return {
        initial: false,
        params: { feedIdText: request.idText, itemKey: request.itemKey ?? '' },
        screen: 'AddByRssTrackDetail',
      };
    case 'add-by-rss-livestream':
      return {
        initial: false,
        params: { feedIdText: request.idText, liveItemKey: request.itemKey ?? '' },
        screen: 'AddByRssLivestreamDetail',
      };
  }
};

const browseContentParams = (
  request: FullPlayerOpenRequest,
  previewImageUrl: string | null,
  previewTitle: string
): NavigatorScreenParams<BrowseStackParamList> => {
  return catalogContentParams(request, previewImageUrl, previewTitle);
};

const catalogContentParams = (
  request: FullPlayerOpenRequest,
  previewImageUrl: string | null,
  previewTitle: string
): NavigatorScreenParams<ChannelBrowseStackParamList> => {
  switch (request.kind) {
    case 'episode':
      return { initial: false, params: { episodeId: request.idText }, screen: 'EpisodeDetail' };
    case 'clip':
      return { initial: false, params: { clipId: request.idText }, screen: 'ClipDetail' };
    case 'track':
      return {
        initial: false,
        params: buildTrackDetailParams({ previewImageUrl, previewTitle, trackId: request.idText }),
        screen: 'TrackDetail',
      };
    case 'podcast':
      return {
        initial: false,
        params: buildPodcastDetailParams({
          podcastId: request.idText,
          previewImageUrl,
          previewTitle,
        }),
        screen: 'PodcastDetail',
      };
    case 'album':
      return {
        initial: false,
        params: buildAlbumDetailParams({ albumId: request.idText, previewImageUrl, previewTitle }),
        screen: 'AlbumDetail',
      };
    case 'artist':
      return {
        initial: false,
        params: buildArtistDetailParams({
          artistId: request.idText,
          previewImageUrl,
          previewTitle,
        }),
        screen: 'ArtistDetail',
      };
    case 'add-by-rss':
    case 'add-by-rss-episode':
    case 'add-by-rss-livestream':
    case 'add-by-rss-track':
      throw new Error('Add by RSS content opens on Home.');
  }
};

function isMobileTabNavigation(
  navigation: NavigationProp<ParamListBase>
): navigation is BottomTabNavigationProp<MobileTabParamList> {
  return navigation.getState().type === 'tab';
}

/** Walk up until the bottom-tab navigator. A stack pushed onto More is not a direct child of it. */
export function getEnclosingTabNavigation(
  navigation: NavigationProp<ParamListBase>
): BottomTabNavigationProp<MobileTabParamList> | undefined {
  let current: NavigationProp<ParamListBase> | undefined = navigation;
  while (current !== undefined) {
    const parent: NavigationProp<ParamListBase> | undefined = current.getParent();
    if (parent === undefined) {
      return undefined;
    }
    if (isMobileTabNavigation(parent)) {
      return parent;
    }
    current = parent;
  }
  return undefined;
}

type ContentTabOpenTarget = {
  tabId: 'Browse';
  params: NonNullable<NavigatorScreenParams<BrowseStackParamList>>;
};

/**
 * Open Browse. A visible tab switches in the tab bar. A tab listed on More is pushed on the More
 * stack so Back returns there.
 */
export function navigateToContentTab(
  navigation: NavigationProp<ParamListBase>,
  visibleTabIds: readonly ContentTabId[],
  target: ContentTabOpenTarget
): void {
  const tabNavigation = getEnclosingTabNavigation(navigation);
  if (tabNavigation === undefined) {
    return;
  }

  if (visibleTabIds.includes(target.tabId)) {
    tabNavigation.navigate('Browse', target.params);
    return;
  }

  tabNavigation.navigate('More', {
    params: target.params,
    screen: MORE_STACK_ROUTES.MoreOverflowBrowse,
  });
}

function HiddenTabBarButton() {
  return null;
}

/** Tab items stay visually still on press — no ripple or opacity dim. */
function QuietTabBarButton(props: BottomTabBarButtonProps) {
  return <PlatformPressable {...props} pressColor="transparent" pressOpacity={1} />;
}

/**
 * Navigate to More ▸ Membership from anywhere — used by the app-wide membership gate modal (which
 * lives above the navigator and so cannot use `useNavigation`) and by the Home expiry banner, whose
 * target sits in a different tab's stack. `initial: false` keeps More's menu under Membership when
 * More mounts for this navigation. No-op until the navigation container is ready.
 */
export function navigateToMembershipScreen(): void {
  if (!rootNavigationRef.isReady()) {
    return;
  }
  rootNavigationRef.navigate(ROOT_STACK_ROUTES.MainTabs, {
    screen: 'More',
    params: { initial: false, screen: MORE_STACK_ROUTES.MoreMembership },
  });
}

export function navigateToMakeClipScreen(params: RootStackParamList['MakeClip']): void {
  if (!rootNavigationRef.isReady()) {
    return;
  }
  rootNavigationRef.navigate(ROOT_STACK_ROUTES.MakeClip, params);
}

export function navigateToImageViewerScreen(params: RootStackParamList['ImageViewer']): void {
  if (!rootNavigationRef.isReady()) {
    return;
  }
  rootNavigationRef.navigate(ROOT_STACK_ROUTES.ImageViewer, params);
}

export function navigateToNotificationsInboxScreen(): void {
  if (!rootNavigationRef.isReady()) {
    return;
  }
  rootNavigationRef.navigate(ROOT_STACK_ROUTES.NotificationsInbox);
}

export function navigateToSearchScreen(params?: SearchStackParamList['SearchRoot']): void {
  if (!rootNavigationRef.isReady()) {
    return;
  }
  rootNavigationRef.navigate(ROOT_STACK_ROUTES.Search, {
    params,
    screen: SEARCH_STACK_ROUTES.SearchRoot,
  });
}

function HomeStackNavigator() {
  const { t } = useTranslation();
  const screenOptions = useThemedNativeStackScreenOptions();

  return (
    <HomeStack.Navigator screenOptions={screenOptions}>
      <HomeStack.Screen
        component={HomeScreen}
        name={HOME_STACK_ROUTES.HomeRoot}
        options={{ title: t('nav.tab.home') }}
      />
      <HomeStack.Screen
        component={AddByRssHomeDetailScreen}
        name={HOME_STACK_ROUTES.AddByRssPodcastDetail}
        options={{ title: t('media.podcast.podcast') }}
      />
      <HomeStack.Screen
        component={AddByRssEpisodeDetailScreen}
        name={HOME_STACK_ROUTES.AddByRssEpisodeDetail}
        options={{ title: t('media.podcast.episode') }}
      />
      <HomeStack.Screen
        component={AddByRssLivestreamDetailScreen}
        name={HOME_STACK_ROUTES.AddByRssLivestreamDetail}
        options={{ title: t('media.livestream.livestream') }}
      />
      <HomeStack.Screen
        component={AddByRssTrackDetailScreen}
        name={HOME_STACK_ROUTES.AddByRssTrackDetail}
        options={{ title: t('media.music.track') }}
      />
      <HomeStack.Screen
        component={AddByRssCredentialsScreen}
        name={HOME_STACK_ROUTES.AddByRssCredentials}
        options={{ title: t('features.add_by_rss.credentials_page_title') }}
      />
      <HomeStack.Screen
        component={AddByRssRemoteFeedScreen}
        name={HOME_STACK_ROUTES.AddByRssRemoteFeedDetail}
        options={{ title: t('features.add_by_rss.label') }}
      />
      <HomeStack.Screen
        component={PodcastDetailScreen}
        name={HOME_STACK_ROUTES.PodcastDetail}
        options={{ title: t('media.podcast.podcast') }}
      />
      <HomeStack.Screen
        component={EpisodeDetailScreen}
        name={HOME_STACK_ROUTES.EpisodeDetail}
        options={{ title: t('media.podcast.episode') }}
      />
      <HomeStack.Screen
        component={ClipDetailScreen}
        name={HOME_STACK_ROUTES.ClipDetail}
        options={{ title: t('features.clip.clip') }}
      />
      <HomeStack.Screen
        component={ArtistDetailScreen}
        name={HOME_STACK_ROUTES.ArtistDetail}
        options={{ title: t('media.music.artist') }}
      />
      <HomeStack.Screen
        component={AlbumDetailScreen}
        name={HOME_STACK_ROUTES.AlbumDetail}
        options={{ title: t('media.music.album') }}
      />
      <HomeStack.Screen
        component={PodcastIndexFeedPreviewScreen}
        name={CHANNEL_BROWSE_STACK_ROUTES.SearchResultDetail}
        options={{ title: t('nav.stack.search_result') }}
      />
      <HomeStack.Screen
        component={TrackDetailScreen}
        name={HOME_STACK_ROUTES.TrackDetail}
        options={{ title: t('media.music.track') }}
      />
      <HomeStack.Screen
        component={PlaylistFormScreen}
        name={HOME_STACK_ROUTES.PlaylistCreate}
        options={{ title: t('features.playlist.create_playlist') }}
      />
    </HomeStack.Navigator>
  );
}

function SearchStackNavigator() {
  const { t } = useTranslation();
  const screenOptions = useThemedNativeStackScreenOptions();

  return (
    <SearchStack.Navigator screenOptions={screenOptions}>
      <SearchStack.Screen
        component={SearchScreen}
        name={SEARCH_STACK_ROUTES.SearchRoot}
        options={{ title: t('features.search.search') }}
      />
      <SearchStack.Screen
        component={PodcastIndexFeedPreviewScreen}
        name={SEARCH_STACK_ROUTES.SearchResultDetail}
        options={{ title: t('nav.stack.search_result') }}
      />
      <SearchStack.Screen
        component={PodcastDetailScreen}
        name={SEARCH_STACK_ROUTES.PodcastDetail}
        options={{ title: t('media.podcast.podcast') }}
      />
      <SearchStack.Screen
        component={EpisodeDetailScreen}
        name={SEARCH_STACK_ROUTES.EpisodeDetail}
        options={{ title: t('media.podcast.episode') }}
      />
      <SearchStack.Screen
        component={ClipDetailScreen}
        name={SEARCH_STACK_ROUTES.ClipDetail}
        options={{ title: t('features.clip.clip') }}
      />
      <SearchStack.Screen
        component={ArtistDetailScreen}
        name={SEARCH_STACK_ROUTES.ArtistDetail}
        options={{ title: t('media.music.artist') }}
      />
      <SearchStack.Screen
        component={AlbumDetailScreen}
        name={SEARCH_STACK_ROUTES.AlbumDetail}
        options={{ title: t('media.music.album') }}
      />
      <SearchStack.Screen
        component={AddByRssHomeDetailScreen}
        name={SEARCH_STACK_ROUTES.AddByRssPodcastDetail}
        options={{ title: t('media.podcast.podcast') }}
      />
      <SearchStack.Screen
        component={AddByRssEpisodeDetailScreen}
        name={SEARCH_STACK_ROUTES.AddByRssEpisodeDetail}
        options={{ title: t('media.podcast.episode') }}
      />
      <SearchStack.Screen
        component={AddByRssLivestreamDetailScreen}
        name={SEARCH_STACK_ROUTES.AddByRssLivestreamDetail}
        options={{ title: t('media.livestream.livestream') }}
      />
      <SearchStack.Screen
        component={AddByRssTrackDetailScreen}
        name={SEARCH_STACK_ROUTES.AddByRssTrackDetail}
        options={{ title: t('media.music.track') }}
      />
      <SearchStack.Screen
        component={AddByRssCredentialsScreen}
        name={SEARCH_STACK_ROUTES.AddByRssCredentials}
        options={{ title: t('features.add_by_rss.credentials_page_title') }}
      />
      <SearchStack.Screen
        component={AddByRssRemoteFeedScreen}
        name={SEARCH_STACK_ROUTES.AddByRssRemoteFeedDetail}
        options={{ title: t('features.add_by_rss.label') }}
      />
      <SearchStack.Screen
        component={TrackDetailScreen}
        name={SEARCH_STACK_ROUTES.TrackDetail}
        options={{ title: t('media.music.track') }}
      />
      <SearchStack.Screen
        component={PlaylistFormScreen}
        name={SEARCH_STACK_ROUTES.PlaylistCreate}
        options={{ title: t('features.playlist.create_playlist') }}
      />
    </SearchStack.Navigator>
  );
}

function LibraryStackNavigator() {
  const { t } = useTranslation();
  const screenOptions = useThemedNativeStackScreenOptions();

  return (
    <LibraryStack.Navigator screenOptions={screenOptions}>
      <LibraryStack.Screen
        component={LibraryHubScreen}
        name={LIBRARY_STACK_ROUTES.LibraryHub}
        options={{ title: t('nav.tab.my_library') }}
      />
      <LibraryStack.Screen
        component={AddByRssRootScreen}
        name={LIBRARY_STACK_ROUTES.AddByRssRoot}
        options={{ title: t('features.add_by_rss.label') }}
      />
      <LibraryStack.Screen
        component={AddByRssAddScreen}
        name={LIBRARY_STACK_ROUTES.AddByRssAdd}
        options={{ title: t('features.add_feed.add_feed') }}
      />
      <LibraryStack.Screen
        component={AddByRssHomeDetailScreen}
        name={LIBRARY_STACK_ROUTES.AddByRssPodcastDetail}
        options={{ title: t('media.podcast.podcast') }}
      />
      <LibraryStack.Screen
        component={AddByRssEpisodeDetailScreen}
        name={LIBRARY_STACK_ROUTES.AddByRssEpisodeDetail}
        options={{ title: t('media.podcast.episode') }}
      />
      <LibraryStack.Screen
        component={AddByRssLivestreamDetailScreen}
        name={LIBRARY_STACK_ROUTES.AddByRssLivestreamDetail}
        options={{ title: t('media.livestream.livestream') }}
      />
      <LibraryStack.Screen
        component={AddByRssTrackDetailScreen}
        name={LIBRARY_STACK_ROUTES.AddByRssTrackDetail}
        options={{ title: t('media.music.track') }}
      />
      <LibraryStack.Screen
        component={AddByRssCredentialsScreen}
        name={LIBRARY_STACK_ROUTES.AddByRssCredentials}
        options={{ title: t('features.add_by_rss.credentials_page_title') }}
      />
      <LibraryStack.Screen
        component={AddByRssRemoteFeedScreen}
        name={LIBRARY_STACK_ROUTES.AddByRssRemoteFeedDetail}
        options={{ title: t('features.add_by_rss.label') }}
      />
      <LibraryStack.Screen
        component={PodcastDetailScreen}
        name={LIBRARY_STACK_ROUTES.PodcastDetail}
        options={{ title: t('media.podcast.podcast') }}
      />
      <LibraryStack.Screen
        component={ArtistDetailScreen}
        name={LIBRARY_STACK_ROUTES.ArtistDetail}
        options={{ title: t('media.music.artist') }}
      />
      <LibraryStack.Screen
        component={AlbumDetailScreen}
        name={LIBRARY_STACK_ROUTES.AlbumDetail}
        options={{ title: t('media.music.album') }}
      />
      <LibraryStack.Screen
        component={PodcastIndexFeedPreviewScreen}
        name={LIBRARY_STACK_ROUTES.SearchResultDetail}
        options={{ title: t('nav.stack.search_result') }}
      />
      <LibraryStack.Screen
        component={TrackDetailScreen}
        name={LIBRARY_STACK_ROUTES.TrackDetail}
        options={{ title: t('media.music.track') }}
      />
      <LibraryStack.Screen
        component={LibraryPlaylistsScreen}
        name={LIBRARY_STACK_ROUTES.LibraryPlaylists}
        options={{ title: t('features.playlist.playlists') }}
      />
      <LibraryStack.Screen
        component={PlaylistDetailScreen}
        name={LIBRARY_STACK_ROUTES.PlaylistDetail}
        options={{ title: t('features.playlist.playlist') }}
      />
      <LibraryStack.Screen
        component={PlaylistFormScreen}
        name={LIBRARY_STACK_ROUTES.PlaylistCreate}
        options={{ title: t('features.playlist.create_playlist') }}
      />
      <LibraryStack.Screen
        component={PlaylistFormScreen}
        name={LIBRARY_STACK_ROUTES.PlaylistEdit}
        options={{ title: t('features.playlist.edit_playlist') }}
      />
      <LibraryStack.Screen
        component={LibraryHistoryScreen}
        name={LIBRARY_STACK_ROUTES.LibraryHistory}
        options={{ title: t('features.history.history') }}
      />
      <LibraryStack.Screen
        component={LibraryQueueScreen}
        name={LIBRARY_STACK_ROUTES.LibraryQueue}
        options={{ title: t('features.queue.queue') }}
      />
      <LibraryStack.Screen
        component={LibraryMyClipsScreen}
        name={LIBRARY_STACK_ROUTES.LibraryMyClips}
        options={{ title: t('features.my_clips') }}
      />
      <LibraryStack.Screen
        component={ClipDetailScreen}
        name={LIBRARY_STACK_ROUTES.LibraryClipDetail}
        options={{ title: t('features.clip.clip') }}
      />
      <LibraryStack.Screen
        component={LibraryDownloadsScreen}
        name={LIBRARY_STACK_ROUTES.LibraryDownloads}
        options={{ title: t('nav.tab.downloads') }}
      />
      <LibraryStack.Screen
        component={EpisodeDetailScreen}
        name={LIBRARY_STACK_ROUTES.EpisodeDetail}
        options={{ title: t('media.podcast.episode') }}
      />
    </LibraryStack.Navigator>
  );
}

function BrowseStackNavigator({ root = 'browse' }: { root?: 'browse' | 'recommendations' }) {
  const { t } = useTranslation();
  const screenOptions = useThemedNativeStackScreenOptions();
  const rootScreen = root === 'recommendations' ? RecommendationsScreen : BrowseScreen;
  const rootTitle = root === 'recommendations' ? t('nav.tab.recommendations') : t('nav.tab.browse');

  return (
    <BrowseStack.Navigator screenOptions={screenOptions}>
      <BrowseStack.Screen
        component={rootScreen}
        name={BROWSE_STACK_ROUTES.BrowseRoot}
        options={{ title: rootTitle }}
      />
      <BrowseStack.Screen
        component={PodcastDetailScreen}
        name={BROWSE_STACK_ROUTES.PodcastDetail}
        options={{ title: t('media.podcast.podcast') }}
      />
      <BrowseStack.Screen
        component={EpisodeDetailScreen}
        name={BROWSE_STACK_ROUTES.EpisodeDetail}
        options={{ title: t('media.podcast.episode') }}
      />
      <BrowseStack.Screen
        component={ClipDetailScreen}
        name={BROWSE_STACK_ROUTES.ClipDetail}
        options={{ title: t('features.clip.clip') }}
      />
      <BrowseStack.Screen
        component={ArtistDetailScreen}
        name={BROWSE_STACK_ROUTES.ArtistDetail}
        options={{ title: t('media.music.artist') }}
      />
      <BrowseStack.Screen
        component={AlbumDetailScreen}
        name={BROWSE_STACK_ROUTES.AlbumDetail}
        options={{ title: t('media.music.album') }}
      />
      <BrowseStack.Screen
        component={AddByRssHomeDetailScreen}
        name={BROWSE_STACK_ROUTES.AddByRssPodcastDetail}
        options={{ title: t('media.podcast.podcast') }}
      />
      <BrowseStack.Screen
        component={AddByRssEpisodeDetailScreen}
        name={BROWSE_STACK_ROUTES.AddByRssEpisodeDetail}
        options={{ title: t('media.podcast.episode') }}
      />
      <BrowseStack.Screen
        component={AddByRssLivestreamDetailScreen}
        name={BROWSE_STACK_ROUTES.AddByRssLivestreamDetail}
        options={{ title: t('media.livestream.livestream') }}
      />
      <BrowseStack.Screen
        component={AddByRssTrackDetailScreen}
        name={BROWSE_STACK_ROUTES.AddByRssTrackDetail}
        options={{ title: t('media.music.track') }}
      />
      <BrowseStack.Screen
        component={AddByRssCredentialsScreen}
        name={BROWSE_STACK_ROUTES.AddByRssCredentials}
        options={{ title: t('features.add_by_rss.credentials_page_title') }}
      />
      <BrowseStack.Screen
        component={AddByRssRemoteFeedScreen}
        name={BROWSE_STACK_ROUTES.AddByRssRemoteFeedDetail}
        options={{ title: t('features.add_by_rss.label') }}
      />
      <BrowseStack.Screen
        component={PodcastIndexFeedPreviewScreen}
        name={BROWSE_STACK_ROUTES.SearchResultDetail}
        options={{ title: t('nav.stack.search_result') }}
      />
      <BrowseStack.Screen
        component={TrackDetailScreen}
        name={BROWSE_STACK_ROUTES.TrackDetail}
        options={{ title: t('media.music.track') }}
      />
      <BrowseStack.Screen
        component={PlaylistDetailScreen}
        name={BROWSE_STACK_ROUTES.PlaylistDetail}
        options={{ title: t('features.playlist.playlist') }}
      />
      <BrowseStack.Screen
        component={ProfileScreen}
        name={BROWSE_STACK_ROUTES.Profile}
        options={{ title: t('features.profile') }}
      />
      <BrowseStack.Screen
        component={PlaylistFormScreen}
        name={BROWSE_STACK_ROUTES.PlaylistCreate}
        options={{ title: t('features.playlist.create_playlist') }}
      />
    </BrowseStack.Navigator>
  );
}

function BrowseTabStackNavigator() {
  return <BrowseStackNavigator root="browse" />;
}

function RecommendationsStackNavigator() {
  return <BrowseStackNavigator root="recommendations" />;
}

type MoreStackNavigatorProps = {
  onRequestLogin: () => void;
  onRequestLogout: () => Promise<void>;
  onRequestSignUp: () => void;
};

const moreOverflowScreenOptions = {
  gestureEnabled: false,
  headerShown: false,
} as const;

function MoreStackNavigator({
  onRequestLogin,
  onRequestLogout,
  onRequestSignUp,
}: MoreStackNavigatorProps) {
  const { t } = useTranslation();
  const screenOptions = useThemedNativeStackScreenOptions();

  return (
    <MoreStack.Navigator screenOptions={screenOptions}>
      <MoreStack.Screen options={{ title: t('nav.tab.more') }} name={MORE_STACK_ROUTES.MoreRoot}>
        {(props) => (
          <MoreRootScreen
            {...props}
            onRequestLogin={onRequestLogin}
            onRequestLogout={onRequestLogout}
            onRequestSignUp={onRequestSignUp}
          />
        )}
      </MoreStack.Screen>
      <MoreStack.Screen
        component={HomeStackNavigator}
        name={MORE_STACK_ROUTES.MoreOverflowHome}
        options={moreOverflowScreenOptions}
      />
      <MoreStack.Screen
        component={LibraryStackNavigator}
        name={MORE_STACK_ROUTES.MoreOverflowLibrary}
        options={moreOverflowScreenOptions}
      />
      <MoreStack.Screen
        component={BrowseTabStackNavigator}
        name={MORE_STACK_ROUTES.MoreOverflowBrowse}
        options={moreOverflowScreenOptions}
      />
      <MoreStack.Screen
        component={RecommendationsStackNavigator}
        name={MORE_STACK_ROUTES.MoreOverflowRecommendations}
        options={moreOverflowScreenOptions}
      />
      <MoreStack.Screen
        component={MoreFaqScreen}
        name={MORE_STACK_ROUTES.MoreFaq}
        options={{ title: t('misc.faq') }}
      />
      <MoreStack.Screen
        component={MoreSettingsScreen}
        name={MORE_STACK_ROUTES.MoreSettings}
        options={{ title: t('settings.settings') }}
      />
      <MoreStack.Screen
        component={MoreSettingsAppearanceScreen}
        name={MORE_STACK_ROUTES.MoreSettingsAppearance}
        options={{ title: t('settings.groups.appearance') }}
      />
      <MoreStack.Screen
        component={MoreSettingsDownloadsScreen}
        name={MORE_STACK_ROUTES.MoreSettingsDownloads}
        options={{ title: t('nav.tab.downloads') }}
      />
      <MoreStack.Screen
        component={MoreSettingsAutoDownloadCatchUpScreen}
        name={MORE_STACK_ROUTES.MoreSettingsAutoDownloadCatchUp}
        options={{ title: t('settings.downloads.auto_download_catch_up_label') }}
      />
      <MoreStack.Screen
        component={MoreSettingsDownloadLimitScreen}
        name={MORE_STACK_ROUTES.MoreSettingsDownloadLimit}
        options={{ title: t('settings.downloads.limit_label') }}
      />
      <MoreStack.Screen
        component={MoreSettingsPlaybackScreen}
        name={MORE_STACK_ROUTES.MoreSettingsPlayback}
        options={{ title: t('settings.groups.playback') }}
      />
      <MoreStack.Screen
        component={MoreSettingsTasteProfileScreen}
        name={MORE_STACK_ROUTES.MoreSettingsTasteProfile}
        options={{ title: t('settings.recommendations.recommendations') }}
      />
      <MoreStack.Screen
        component={MoreSettingsChangePasswordScreen}
        name={MORE_STACK_ROUTES.MoreSettingsChangePassword}
        options={{ title: t('settings.account.change_password.heading') }}
      />
      <MoreStack.Screen
        component={MoreSettingsSessionsScreen}
        name={MORE_STACK_ROUTES.MoreSettingsSessions}
        options={{ title: t('settings.account.sessions.heading') }}
      />
      <MoreStack.Screen
        component={MoreSettingsDeveloperScreen}
        name={MORE_STACK_ROUTES.MoreSettingsDeveloper}
        options={{ title: t('settings.developer.heading') }}
      />
      <MoreStack.Screen
        component={MoreSettingsDeveloperCreateScreen}
        name={MORE_STACK_ROUTES.MoreSettingsDeveloperCreate}
        options={{ title: t('settings.developer.create') }}
      />
      <MoreStack.Screen
        component={MoreSettingsDeveloperExpirationScreen}
        name={MORE_STACK_ROUTES.MoreSettingsDeveloperExpiration}
        options={{ title: t('settings.developer.expiration') }}
      />
      <MoreStack.Screen
        component={MoreTermsOfServiceScreen}
        name={MORE_STACK_ROUTES.MoreTermsOfService}
        options={{ title: t('terms_acceptance.header') }}
      />
      <MoreStack.Screen
        component={MoreSettingsNotificationsScreen}
        name={MORE_STACK_ROUTES.MoreSettingsNotifications}
        options={{ title: t('settings.notifications.notifications') }}
      />
      <MoreStack.Screen
        component={MoreSettingsThemeScreen}
        name={MORE_STACK_ROUTES.MoreSettingsTheme}
        options={{ title: t('settings.ui_theme.theme') }}
      />
      <MoreStack.Screen
        component={MoreSettingsLocaleScreen}
        name={MORE_STACK_ROUTES.MoreSettingsLocale}
        options={{ title: t('language.select_language') }}
      />
      <MoreStack.Screen
        component={MoreSettingsTabBarScreen}
        name={MORE_STACK_ROUTES.MoreSettingsTabBar}
        options={{ title: t('settings.tab_bar.title') }}
      />
      <MoreStack.Screen
        component={MoreAboutScreen}
        name={MORE_STACK_ROUTES.MoreAbout}
        options={{ title: t('info.about') }}
      />
      <MoreStack.Screen
        component={MyProfileScreen}
        name={MORE_STACK_ROUTES.MoreProfile}
        options={{ title: t('features.profile') }}
      />
      <MoreStack.Screen
        component={MyProfileEditScreen}
        name={MORE_STACK_ROUTES.MoreProfileEdit}
        options={{ title: t('settings.profile.profile') }}
      />
      <MoreStack.Screen
        component={PlaylistDetailScreen}
        name={MORE_STACK_ROUTES.PlaylistDetail}
        options={{ title: t('features.playlist.playlist') }}
      />
      <MoreStack.Screen
        component={ProfileScreen}
        name={MORE_STACK_ROUTES.MorePublicProfile}
        options={{ title: t('features.profile') }}
      />
      <MoreStack.Screen
        component={MoreMembershipScreen}
        name={MORE_STACK_ROUTES.MoreMembership}
        options={{ title: t('membership.membership') }}
      />
      <MoreStack.Screen
        component={MoreMembershipExtendScreen}
        name={MORE_STACK_ROUTES.MoreMembershipExtend}
        options={{ title: t('membership.extend_my_membership') }}
      />
      <MoreStack.Screen
        component={MoreOpmlScreen}
        name={MORE_STACK_ROUTES.MoreOpml}
        options={{ title: t('nav.stack.opml') }}
      />
      <MoreStack.Screen
        component={MoreAdvancedScreen}
        name={MORE_STACK_ROUTES.MoreAdvanced}
        options={{ title: t('more_advanced.title') }}
      />
      <MoreStack.Screen
        component={MoreCustomApiScreen}
        name={MORE_STACK_ROUTES.MoreCustomApi}
        options={{ title: t('custom_api.title') }}
      />
      <MoreStack.Screen
        component={MoreErrorLogScreen}
        name={MORE_STACK_ROUTES.MoreErrorLog}
        options={{ title: t('error_log.title') }}
      />
      <MoreStack.Screen
        component={MoreRemovedContentScreen}
        name={MORE_STACK_ROUTES.MoreRemovedContent}
        options={{ title: t('removed_content.title') }}
      />
      <MoreStack.Screen
        component={MoreErrorLogDetailScreen}
        name={MORE_STACK_ROUTES.MoreErrorLogDetail}
        options={{ title: t('error_log.detail.title') }}
      />
      {isMobileE2eHarnessEnabled() ? (
        <MoreStack.Screen name={MORE_STACK_ROUTES.MoreSmoke} options={{ title: t('e2e.smoke') }}>
          {() => (
            <HelloWorldScreen
              authMode="anonymous"
              onRequestLogin={onRequestLogin}
              onRequestSignUp={onRequestSignUp}
            />
          )}
        </MoreStack.Screen>
      ) : null}
      {isMobileE2eFromEnv() ? (
        <MoreStack.Screen
          component={MoreE2ePlaybackScreen}
          name={MORE_STACK_ROUTES.MoreE2ePlayback}
          options={{ title: t('e2e.playback') }}
        />
      ) : null}
      {isMobileE2eFromEnv() ? (
        <MoreStack.Screen
          component={MoreIdentityRemapScreen}
          name={MORE_STACK_ROUTES.MoreIdentityRemap}
          options={{ title: t('e2e.identity_remap') }}
        />
      ) : null}
    </MoreStack.Navigator>
  );
}

function LibraryHubScreen({
  navigation,
}: NativeStackScreenProps<LibraryStackParamList, 'LibraryHub'>) {
  const { t } = useTranslation();
  const inProgressDownloadCount = useInProgressDownloadCount();

  return (
    <MenuListScreen
      sections={[
        {
          items: [
            {
              accessibilityLabel:
                inProgressDownloadCount > 0
                  ? `${t('nav.tab.downloads')}, ${t('features.download.in_progress_count', {
                      count: inProgressDownloadCount,
                    })}`
                  : undefined,
              badgeCount: inProgressDownloadCount,
              onPress: () => {
                navigation.navigate(LIBRARY_STACK_ROUTES.LibraryDownloads);
              },
              testID: 'library-nav-downloads',
              title: t('nav.tab.downloads'),
            },
            {
              onPress: () => {
                navigation.navigate(LIBRARY_STACK_ROUTES.LibraryQueue);
              },
              testID: 'library-nav-queue',
              title: t('features.queue.queue'),
            },
            {
              onPress: () => {
                navigation.navigate(LIBRARY_STACK_ROUTES.LibraryHistory);
              },
              testID: 'library-nav-history',
              title: t('features.history.history'),
            },
            {
              onPress: () => {
                navigation.navigate(LIBRARY_STACK_ROUTES.LibraryPlaylists);
              },
              testID: 'library-nav-playlists',
              title: t('features.playlist.playlists'),
            },
            {
              onPress: () => {
                navigation.navigate(LIBRARY_STACK_ROUTES.LibraryMyClips);
              },
              testID: 'library-nav-my-clips',
              title: t('features.my_clips'),
            },
            {
              onPress: () => {
                navigation.navigate(LIBRARY_STACK_ROUTES.AddByRssRoot);
              },
              testID: 'library-nav-add-by-rss',
              title: t('features.add_by_rss.label'),
            },
          ],
          key: 'library',
        },
      ]}
      testID="library-hub-screen"
    />
  );
}

type MoreRootScreenProps = NativeStackScreenProps<MoreStackParamList, 'MoreRoot'> & {
  onRequestLogin: () => void;
  onRequestLogout: () => Promise<void>;
  onRequestSignUp: () => void;
};

function MoreRootScreen({
  navigation,
  onRequestLogin,
  onRequestLogout,
  onRequestSignUp,
}: MoreRootScreenProps) {
  const { t } = useTranslation();
  const { status } = useAuth();
  const membership = useMembership();
  const { overflowTabIds } = useTabLayout();
  const isAuthenticated = status === 'authenticated';

  const openOverflowTab = (tabId: ContentTabId): void => {
    switch (tabId) {
      case 'Browse':
        navigation.navigate(MORE_STACK_ROUTES.MoreOverflowBrowse);
        return;
      case 'Home':
        navigation.navigate(MORE_STACK_ROUTES.MoreOverflowHome);
        return;
      case 'My Library':
        navigation.navigate(MORE_STACK_ROUTES.MoreOverflowLibrary);
        return;
      case 'Recommendations':
        navigation.navigate(MORE_STACK_ROUTES.MoreOverflowRecommendations);
        return;
    }
  };

  const overflowItems: MenuListItem[] = overflowTabIds.map((tabId) => ({
    onPress: () => {
      openOverflowTab(tabId);
    },
    testID: `more-nav-${TAB_TEST_ID_SLUG[tabId]}`,
    title: t(tabLabelKey(tabId)),
  }));

  // A persistent row a lapsed member can always find, beside the dismissible banner and the
  // at-the-feature notice.
  const renewalItems: MenuListItem[] = membership.isExpired
    ? [
        {
          onPress: () => {
            navigation.navigate(MORE_STACK_ROUTES.MoreMembership);
          },
          subtitle: t(
            membership.tier === 'premium'
              ? 'membership.gate.settings_row_subtitle_premium'
              : 'membership.gate.settings_row_subtitle'
          ),
          testID: 'more-nav-membership-renew',
          title: t('membership.gate.settings_row_title'),
        },
      ]
    : [];

  const authItems: MenuListItem[] = isAuthenticated
    ? [
        {
          onPress: () => {
            void onRequestLogout();
          },
          showsChevron: false,
          testID: 'more-nav-logout',
          title: t('authentication.logout'),
        },
      ]
    : [
        {
          onPress: onRequestLogin,
          testID: 'anonymous-login-cta',
          title: t('authentication.login'),
        },
        {
          onPress: onRequestSignUp,
          testID: 'anonymous-signup-cta',
          title: t('authentication.sign_up'),
        },
      ];

  const sections: MenuListSection[] = [
    {
      items: [
        ...renewalItems,
        {
          onPress: () => {
            navigation.navigate(MORE_STACK_ROUTES.MoreProfile);
          },
          testID: 'more-nav-profile',
          title: t('features.profile'),
        },
        {
          onPress: () => {
            navigation.navigate(MORE_STACK_ROUTES.MoreMembership);
          },
          testID: 'more-nav-membership',
          title: t('membership.membership'),
        },
        ...authItems,
      ],
      key: 'account',
      title: t('nav.menu.section_account'),
    },
    {
      header: <OfflineModeFeaturesHeader />,
      items: [
        ...overflowItems,
        {
          onPress: () => {
            navigation.navigate(MORE_STACK_ROUTES.MoreSettings);
          },
          testID: 'more-settings',
          title: t('settings.settings'),
        },
        {
          onPress: () => {
            navigation.navigate(MORE_STACK_ROUTES.MoreOpml);
          },
          testID: 'more-nav-opml',
          title: t('nav.menu.opml'),
        },
      ],
      key: 'features',
      title: t('nav.menu.section_features'),
    },
    {
      items: [
        {
          onPress: () => {
            navigation.navigate(MORE_STACK_ROUTES.MoreFaq);
          },
          testID: 'more-faq-row',
          title: t('misc.faq'),
        },
        {
          onPress: () => {
            navigation.navigate(MORE_STACK_ROUTES.MoreAbout);
          },
          testID: 'more-nav-about',
          title: t('info.about'),
        },
        {
          onPress: () => {
            navigation.navigate(MORE_STACK_ROUTES.MoreAdvanced);
          },
          testID: 'more-nav-advanced',
          title: t('more_advanced.title'),
        },
      ],
      key: 'other',
      title: t('nav.menu.section_other'),
    },
  ];

  if (isMobileE2eHarnessEnabled()) {
    const e2eItems: MenuListItem[] = [
      {
        onPress: () => {
          navigation.navigate(MORE_STACK_ROUTES.MoreSmoke);
        },
        testID: 'more-nav-smoke',
        title: t('e2e.smoke'),
      },
    ];
    if (isMobileE2eFromEnv()) {
      e2eItems.push({
        onPress: () => {
          navigation.navigate(MORE_STACK_ROUTES.MoreE2ePlayback);
        },
        testID: 'more-nav-e2e-playback',
        title: t('e2e.playback'),
      });
      e2eItems.push({
        onPress: () => {
          navigation.navigate(MORE_STACK_ROUTES.MoreIdentityRemap);
        },
        testID: 'more-nav-identity-remap',
        title: t('e2e.identity_remap'),
      });
    }
    sections.push({
      items: e2eItems,
      key: 'e2e',
      title: t('e2e.section'),
    });
  }

  return <MenuListScreen sections={sections} testID="more-screen" />;
}

type TabScaffoldProps = {
  onOpenFullPlayer: () => void;
  onRequestLogin: () => void;
  onRequestLogout: () => Promise<void>;
  onRequestSignUp: () => void;
};

function TabScaffold({
  onOpenFullPlayer,
  onRequestLogin,
  onRequestLogout,
  onRequestSignUp,
}: TabScaffoldProps) {
  const { t } = useTranslation();
  const { styles: themeStyles, tokens } = useTheme();
  const overlayHeight = useBottomChromeOverlayInsetSource();
  const { visibleTabIds } = useTabLayout();
  const visibleTabSet = useMemo(() => new Set(visibleTabIds), [visibleTabIds]);
  const inProgressDownloadCount = useInProgressDownloadCount();
  const libraryTabBadgeCount = sumBadgeCounts([inProgressDownloadCount]);
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isTabletLayout = width >= MOBILE_TABLET_NAV_MIN_WIDTH;

  const tabBarButtonFor = (name: string) => {
    if (name === 'More' || (isContentTabId(name) && visibleTabSet.has(name))) {
      return QuietTabBarButton;
    }
    return HiddenTabBarButton;
  };

  const navigator = (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        // The tablet rail fills the active item, so its icon and label take the primary button's
        // foreground, like a selected chip. The phone bar has no fill and tints with the accent.
        tabBarActiveBackgroundColor: isTabletLayout
          ? themeStyles.buttonPrimary.backgroundColor
          : undefined,
        tabBarActiveTintColor: isTabletLayout
          ? themeStyles.buttonPrimary.color
          : tokens.text.accent,
        tabBarBadgeStyle: {
          backgroundColor: tokens.text.accent,
          color: tokens.background.primary,
          fontSize: 11,
          fontWeight: '700',
          minWidth: 20,
          height: 20,
          lineHeight: 16,
          borderRadius: 10,
        },
        tabBarInactiveTintColor: themeStyles.textSecondary.color,
        // Tablet left rail requires `beside-icon`; phone bottom bar uses icon-above-label layout.
        tabBarLabelPosition: isTabletLayout ? 'beside-icon' : 'below-icon',
        tabBarLabelStyle: isTabletLayout ? undefined : { marginTop: tokens.spacing.xs },
        tabBarPosition: isTabletLayout ? 'left' : 'bottom',
        tabBarStyle: {
          backgroundColor: tokens.background.secondary,
          borderColor: themeStyles.border.borderColor,
          borderTopColor: themeStyles.border.borderColor,
          borderWidth: isTabletLayout ? 1 : 0,
          minWidth: isTabletLayout ? 120 : undefined,
        },
      }}
      screenListeners={({ navigation, route }) => ({
        tabPress: (event) => {
          const tabState = navigation.getState();
          const focused = tabState.routes[tabState.index];
          if (focused === undefined || focused.key !== route.key) {
            return;
          }
          const nested = focused.state;
          const nestedIndex = nested?.index;
          const focusedRoute =
            nested !== undefined && nestedIndex !== undefined && nested.routes !== undefined
              ? nested.routes[nestedIndex]
              : undefined;
          const decision = focusedTabPop({
            focusedRouteName: focusedRoute?.name,
            moreRootName: MORE_STACK_ROUTES.MoreRoot,
            nestedIndex,
            nestedKey: nested?.key,
            tabName: route.name,
          });
          if (decision.action === 'none' || nested?.key === undefined) {
            return;
          }
          // The nested stack also handles this press and pops on the next frame.
          // Stopping that default leaves this single pop or reset. A second pop
          // after the stack is already at its first screen is reported as unhandled.
          event.preventDefault();
          // More returns to its menu. Other tabs return to the first screen in that stack.
          if (decision.action === 'popToTop') {
            navigation.dispatch({
              ...StackActions.popToTop(),
              target: nested.key,
            });
            return;
          }
          navigation.dispatch({
            ...CommonActions.reset({
              index: 0,
              routes: [{ name: decision.routeName }],
            }),
            target: nested.key,
          });
        },
      })}
      tabBar={(props) =>
        isTabletLayout ? (
          <OrderedTabBar {...props} />
        ) : (
          <View
            collapsable={false}
            style={[
              { backgroundColor: themeStyles.screen.backgroundColor },
              overlayHeight > 0 ? { marginTop: -overlayHeight } : null,
            ]}
          >
            {/*
              Persistent bottom chrome above tabs, outermost first: sync → Offline Mode → current
              clip/chapter → mini player. Sync sits at the top of the stack because it comes and
              goes on its own schedule, so its arrival pushes only itself instead of shifting the
              bars a listener is aiming at. The negative top margin equals that stack's height, so
              the scene above the tab bar does not resize when a bar appears. The stack overlaps
              the scene, so this wrapper paints an opaque base: a strip tinted with a translucent
              token (the warning fill) must never let list rows show through it.
            */}
            <GlobalActivityBar />
            <OfflineModeBanner />
            <NowPlayingSegmentBar />
            <MiniPlayer onExpand={onOpenFullPlayer} />
            <OrderedTabBar {...props} />
          </View>
        )
      }
    >
      <Tab.Screen
        name="Home"
        options={{
          tabBarButton: tabBarButtonFor('Home'),
          tabBarButtonTestID: visibleTabSet.has('Home') ? 'tab-home' : undefined,
          tabBarIcon: tabBarIcon('home'),
          tabBarLabel: t('nav.tab.home'),
        }}
        component={HomeStackNavigator}
      />
      <Tab.Screen
        component={LibraryStackNavigator}
        name="My Library"
        options={{
          tabBarBadge: libraryTabBadgeCount > 0 ? libraryTabBadgeCount : undefined,
          tabBarButton: tabBarButtonFor('My Library'),
          tabBarButtonTestID: visibleTabSet.has('My Library') ? 'tab-my-library' : undefined,
          tabBarIcon: tabBarIcon('library'),
          tabBarLabel: t('nav.tab.my_library'),
        }}
      />
      <Tab.Screen
        component={BrowseTabStackNavigator}
        name="Browse"
        options={{
          tabBarButton: tabBarButtonFor('Browse'),
          tabBarButtonTestID: visibleTabSet.has('Browse') ? 'tab-browse' : undefined,
          tabBarIcon: tabBarIcon('browse'),
          tabBarLabel: t('nav.tab.browse'),
        }}
      />
      <Tab.Screen
        component={RecommendationsStackNavigator}
        name="Recommendations"
        options={{
          tabBarButton: tabBarButtonFor('Recommendations'),
          tabBarButtonTestID: visibleTabSet.has('Recommendations')
            ? 'tab-recommendations'
            : undefined,
          tabBarIcon: tabBarIcon('recommendations'),
          tabBarLabel: t('nav.tab.for_me'),
        }}
      />
      <Tab.Screen
        name="More"
        options={{
          tabBarButton: tabBarButtonFor('More'),
          tabBarButtonTestID: 'tab-more',
          tabBarIcon: tabBarIcon('more'),
          tabBarLabel: t('nav.tab.more'),
        }}
      >
        {() => (
          <MoreStackNavigator
            onRequestLogin={onRequestLogin}
            onRequestLogout={onRequestLogout}
            onRequestSignUp={onRequestSignUp}
          />
        )}
      </Tab.Screen>
    </Tab.Navigator>
  );

  // The tablet tab bar is a left rail, so there is no bottom column for the bar to sit above. A
  // full-width strip under the whole navigator is the equivalent position, and it carries the
  // home-indicator inset itself because nothing sits beneath it here. Order matches phone:
  // sync → Offline Mode → current clip/chapter → mini player. The negative top margin is the
  // variable strips only, so the safe-area padding stays reserved and the scene does not resize
  // when a bar appears.
  const scaffold = !isTabletLayout ? (
    navigator
  ) : (
    <View style={tabScaffoldStyles.tabletRoot}>
      {navigator}
      <View
        collapsable={false}
        style={[
          tabScaffoldStyles.tabletBottomChrome,
          {
            backgroundColor: themeStyles.screen.backgroundColor,
            marginTop: overlayHeight > 0 ? -overlayHeight : 0,
            paddingBottom: insets.bottom,
          },
        ]}
      >
        <GlobalActivityBar />
        <OfflineModeBanner />
        <NowPlayingSegmentBar />
        <MiniPlayer onExpand={onOpenFullPlayer} />
      </View>
    </View>
  );

  return (
    <BottomChromeOverlayHeightProvider value={overlayHeight}>
      {scaffold}
    </BottomChromeOverlayHeightProvider>
  );
}

const rootNavigationStyles = StyleSheet.create({
  host: {
    flex: 1,
  },
});

const tabScaffoldStyles = StyleSheet.create({
  tabletBottomChrome: {
    width: '100%',
  },
  tabletRoot: {
    flex: 1,
  },
});

export function MobileTabNavigator({
  onConsumePendingDeepLink,
  pendingDeepLinkUrl,
  onRequestLogin,
  onRequestLogout,
  onRequestSignUp,
}: MobileTabNavigatorProps) {
  const navigationTheme = useNavigationTheme();
  const { visibleTabIds } = useTabLayout();

  useEffect(() => {
    if (pendingDeepLinkUrl === null || !rootNavigationRef.isReady()) {
      return;
    }

    const action = resolveMobileDeepLinkAction(pendingDeepLinkUrl, mobileNavigationLinking.config);
    if (action !== undefined) {
      rootNavigationRef.dispatch(action);
    } else {
      rootNavigationRef.navigate(ROOT_STACK_ROUTES.MainTabs);
    }
    onConsumePendingDeepLink();
  }, [onConsumePendingDeepLink, pendingDeepLinkUrl]);

  return (
    <NavigationContainer
      linking={mobileNavigationLinking}
      ref={rootNavigationRef}
      theme={navigationTheme}
    >
      <View style={rootNavigationStyles.host}>
        <RootStack.Navigator screenOptions={{ headerShown: false }}>
          <RootStack.Screen name={ROOT_STACK_ROUTES.MainTabs}>
            {(props) => (
              <TabScaffold
                onOpenFullPlayer={() => {
                  props.navigation.navigate(ROOT_STACK_ROUTES.FullPlayer);
                }}
                onRequestLogin={onRequestLogin}
                onRequestLogout={onRequestLogout}
                onRequestSignUp={onRequestSignUp}
              />
            )}
          </RootStack.Screen>
          <RootStack.Screen
            name={ROOT_STACK_ROUTES.FullPlayer}
            options={ROOT_SLIDE_UP_SCREEN_OPTIONS}
          >
            {(props) => (
              <FullPlayerScreen
                onOpenContent={(request) => {
                  openFullPlayerContent(props.navigation, request, visibleTabIds);
                }}
                onOpenItem={(request) => {
                  openFullPlayerItem(props.navigation, request, visibleTabIds);
                }}
                onClose={() => {
                  if (props.navigation.canGoBack()) {
                    props.navigation.goBack();
                    return;
                  }
                  props.navigation.navigate(ROOT_STACK_ROUTES.MainTabs);
                }}
                onOpenMakeClip={(params) => {
                  props.navigation.navigate(ROOT_STACK_ROUTES.MakeClip, params);
                }}
                onOpenQueue={() => {
                  returnToMainTabs(props.navigation, {
                    params: { screen: LIBRARY_STACK_ROUTES.LibraryQueue },
                    screen: 'My Library',
                  });
                }}
                onOpenV4v={() => {
                  props.navigation.navigate(ROOT_STACK_ROUTES.V4vInfo);
                }}
              />
            )}
          </RootStack.Screen>
          <RootStack.Screen
            component={MakeClipScreen}
            name={ROOT_STACK_ROUTES.MakeClip}
            options={MAKE_CLIP_SCREEN_OPTIONS}
          />
          <RootStack.Screen
            component={V4vInfoScreen}
            name={ROOT_STACK_ROUTES.V4vInfo}
            options={ROOT_SLIDE_UP_SCREEN_OPTIONS}
          />
          <RootStack.Screen
            component={ImageViewerScreen}
            name={ROOT_STACK_ROUTES.ImageViewer}
            options={ROOT_SLIDE_UP_SCREEN_OPTIONS}
          />
          <RootStack.Screen
            component={NotificationsInboxScreen}
            name={ROOT_STACK_ROUTES.NotificationsInbox}
            options={ROOT_SLIDE_UP_SCREEN_OPTIONS}
          />
          <RootStack.Screen
            component={SearchStackNavigator}
            name={ROOT_STACK_ROUTES.Search}
            options={ROOT_SLIDE_UP_SCREEN_OPTIONS}
          />
        </RootStack.Navigator>
        <PlaybackE2eStatus />
        <NotificationStreamE2eStatus />
        <PerfE2eReport />
      </View>
    </NavigationContainer>
  );
}
