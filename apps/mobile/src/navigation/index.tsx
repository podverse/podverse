import type {
  BottomTabBarButtonProps,
  BottomTabNavigationProp,
} from '@react-navigation/bottom-tabs';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { PlatformPressable } from '@react-navigation/elements';
import type { LinkingOptions, NavigatorScreenParams } from '@react-navigation/native';
import {
  createNavigationContainerRef,
  getPathFromState as getDefaultPathFromState,
  getStateFromPath as getDefaultStateFromPath,
  NavigationContainer,
} from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { breakpoints } from '@podverse/design-tokens';
import { shouldSuppressExpiryReminder } from '@podverse/helpers';

import { useAuth } from '../auth/AuthProvider';
import { SyncProgressBar } from '../components/feedback/SyncProgressBar';
import { MiniPlayer } from '../components/player/MiniPlayer';
import type { MenuListItem } from '../components/screen/MenuListScreen';
import { MenuListScreen } from '../components/screen/MenuListScreen';
import { getMobileConfig } from '../config';
import { buildMobileLinkPrefixes } from '../config/deepLinkSchemes';
import { useNotificationsUnreadCount } from '../hooks/useNotificationsUnreadCount';
import { useMembership } from '../membership/useMembership';
import { PlaybackE2eStatus } from '../playback/PlaybackE2eStatus';
import type { HomeMediaType } from '../prefs/preferredMediaType';
import { isContentTabId, TAB_TEST_ID_SLUG, tabLabelKey } from '../prefs/tabLayout';
import { AlbumDetailScreen } from '../screens/album/AlbumDetailScreen';
import { ArtistDetailScreen } from '../screens/artist/ArtistDetailScreen';
import { BrowseScreen } from '../screens/browse/BrowseScreen';
import { ClipDetailScreen } from '../screens/clip/ClipDetailScreen';
import { EpisodeDetailScreen } from '../screens/episode/EpisodeDetailScreen';
import { HelloWorldScreen } from '../screens/HelloWorldScreen';
import { AddByRssHomeDetailScreen } from '../screens/home/AddByRssHomeDetailScreen';
import { HomeFilterSortScreen } from '../screens/home/HomeFilterSortScreen';
import { HomeScreen } from '../screens/home/HomeScreen';
import { LibraryDownloadsScreen } from '../screens/library/LibraryDownloadsScreen';
import { LibraryHistoryScreen } from '../screens/library/LibraryHistoryScreen';
import { LibraryMyClipsScreen } from '../screens/library/LibraryMyClipsScreen';
import { LibraryPlaylistsScreen } from '../screens/library/LibraryPlaylistsScreen';
import { LibraryQueueScreen } from '../screens/library/LibraryQueueScreen';
import { LibrarySubscriptionsScreen } from '../screens/library/LibrarySubscriptionsScreen';
import { PlaylistDetailScreen } from '../screens/library/PlaylistDetailScreen';
import { PlaylistFormScreen } from '../screens/library/PlaylistFormScreen';
import { MoreMembershipScreen } from '../screens/more/MoreMembershipScreen';
import { MoreOpmlScreen } from '../screens/more/MoreOpmlScreen';
import { MoreSettingsLocaleScreen } from '../screens/more/MoreSettingsLocaleScreen';
import { MoreSettingsScreen } from '../screens/more/MoreSettingsScreen';
import { MoreSettingsTabBarScreen } from '../screens/more/MoreSettingsTabBarScreen';
import { MoreSettingsThemeScreen } from '../screens/more/MoreSettingsThemeScreen';
import { MoreSyncLogScreen } from '../screens/more/MoreSyncLogScreen';
import { NotificationsInboxScreen } from '../screens/notifications/NotificationsInboxScreen';
import { FullPlayerScreen } from '../screens/player/FullPlayerScreen';
import { PodcastDetailScreen } from '../screens/podcast/PodcastDetailScreen';
import { MyProfileScreen } from '../screens/profile/MyProfileScreen';
import { ProfileScreen } from '../screens/profile/ProfileScreen';
import { AddByRssFeedListScreen } from '../screens/rss/AddByRssFeedListScreen';
import { AddByRssRootScreen } from '../screens/rss/AddByRssRootScreen';
import { PodcastIndexFeedPreviewScreen } from '../screens/search/PodcastIndexFeedPreviewScreen';
import { SearchScreen } from '../screens/search/SearchScreen';
import { V4vInfoScreen } from '../screens/v4v/V4vInfoScreen';
import { useNavigationTheme } from '../theme/useNavigationTheme';
import { useTheme } from '../theme/useTheme';
import { useThemedNativeStackScreenOptions } from '../theme/useThemedNativeStackScreenOptions';
import { mapIncomingPathToScopedPath, mapScopedPathToFlatPath } from './deepLinking';
import { OrderedTabBar } from './OrderedTabBar';
import { tabBarIcon } from './tabBarIcon';
import { useTabLayout } from './TabLayoutProvider';

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
const NotificationsStack = createNativeStackNavigator<NotificationsStackParamList>();
const LibraryStack = createNativeStackNavigator<LibraryStackParamList>();
const MoreStack = createNativeStackNavigator<MoreStackParamList>();
const RootStack = createNativeStackNavigator<RootStackParamList>();
const rootNavigationRef = createNavigationContainerRef<RootStackParamList>();

type PlaceholderScreenProps = {
  testID: string;
  title: string;
};

function PlaceholderScreen({ testID, title }: PlaceholderScreenProps) {
  const { styles: themeStyles, tokens } = useTheme();
  const styles = StyleSheet.create({
    container: {
      alignItems: 'center',
      backgroundColor: themeStyles.screen.backgroundColor,
      flex: 1,
      justifyContent: 'center',
      padding: tokens.spacing.xl,
    },
    title: {
      color: themeStyles.textPrimary.color,
      fontSize: 20,
      fontWeight: '600',
    },
  });

  return (
    <View style={styles.container} testID={testID}>
      <Text style={styles.title}>{title}</Text>
    </View>
  );
}

export const HOME_STACK_ROUTES = {
  AddByRssPodcastDetail: 'AddByRssPodcastDetail',
  AlbumDetail: 'AlbumDetail',
  ArtistDetail: 'ArtistDetail',
  ClipDetail: 'ClipDetail',
  EpisodeDetail: 'EpisodeDetail',
  HomeFilterSort: 'HomeFilterSort',
  HomeRoot: 'HomeRoot',
  PodcastDetail: 'PodcastDetail',
  TrackDetail: 'TrackDetail',
} as const;

/** Shared channel/item detail route names (registered on Home and Search stacks). */
export const CHANNEL_BROWSE_STACK_ROUTES = {
  AlbumDetail: 'AlbumDetail',
  ArtistDetail: 'ArtistDetail',
  ClipDetail: 'ClipDetail',
  EpisodeDetail: 'EpisodeDetail',
  PodcastDetail: 'PodcastDetail',
  TrackDetail: 'TrackDetail',
} as const;

export const SEARCH_STACK_ROUTES = {
  ...CHANNEL_BROWSE_STACK_ROUTES,
  SearchResultDetail: 'SearchResultDetail',
  SearchRoot: 'SearchRoot',
} as const;

export const LIBRARY_STACK_ROUTES = {
  AddByRssFeedList: 'AddByRssFeedList',
  AddByRssRoot: 'AddByRssRoot',
  LibraryClipDetail: 'LibraryClipDetail',
  LibraryDownloads: 'LibraryDownloads',
  LibraryHistory: 'LibraryHistory',
  LibraryHub: 'LibraryHub',
  LibraryMyClips: 'LibraryMyClips',
  LibrarySubscriptions: 'LibrarySubscriptions',
  PlaylistCreate: 'PlaylistCreate',
  PlaylistDetail: 'PlaylistDetail',
  PlaylistEdit: 'PlaylistEdit',
  LibraryPlaylists: 'LibraryPlaylists',
  LibraryQueue: 'LibraryQueue',
  PodcastDetail: 'PodcastDetail',
} as const;

export const BROWSE_STACK_ROUTES = {
  BrowseRoot: 'BrowseRoot',
} as const;

export const NOTIFICATIONS_STACK_ROUTES = {
  NotificationsInbox: 'NotificationsInbox',
} as const;

export const MORE_STACK_ROUTES = {
  MoreAbout: 'MoreAbout',
  MoreMembership: 'MoreMembership',
  MoreOpml: 'MoreOpml',
  MorePublicProfile: 'MorePublicProfile',
  MoreProfile: 'MoreProfile',
  MoreRoot: 'MoreRoot',
  MoreSettings: 'MoreSettings',
  MoreSettingsLocale: 'MoreSettingsLocale',
  MoreSettingsTabBar: 'MoreSettingsTabBar',
  MoreSettingsTheme: 'MoreSettingsTheme',
  MoreSmoke: 'MoreSmoke',
  MoreSyncLog: 'MoreSyncLog',
} as const;

export const ROOT_STACK_ROUTES = {
  FullPlayer: 'FullPlayer',
  MainTabs: 'MainTabs',
  V4vInfo: 'V4vInfo',
} as const;

// Tablet breakpoint for adaptive tab rail — same `lg` token as useResponsive.
export const MOBILE_TABLET_NAV_MIN_WIDTH = breakpoints.lg;

const mobileNavigationScreens = {
  FullPlayer: 'player',
  V4vInfo: 'v4v',
  MainTabs: {
    screens: {
      Home: {
        // Home content routes carry the `home/` prefix so they match the scoped paths produced by
        // `mapIncomingPathToScopedPath` (and consumed back by `mapScopedPathToFlatPath`). Without
        // it, `getStateFromPath('/home/podcast/:id')` returns undefined and deep links fall back
        // to Home. HomeRoot stays the bare `home` segment.
        screens: {
          AddByRssPodcastDetail: 'home/add-by-rss/:feedIdText',
          AlbumDetail: 'home/album/:albumId',
          ArtistDetail: 'home/artist/:artistId',
          ClipDetail: 'home/clip/:clipId',
          EpisodeDetail: 'home/episode/:episodeId',
          HomeRoot: 'home',
          PodcastDetail: 'home/podcast/:podcastId',
          TrackDetail: 'home/track/:trackId',
        },
      },
      More: {
        screens: {
          MoreAbout: 'more/about',
          MoreMembership: 'more/membership',
          MoreOpml: 'more/opml',
          MorePublicProfile: 'more/profile/:accountIdText',
          MoreProfile: 'more/profile',
          MoreRoot: 'more',
          MoreSettings: 'more/settings',
          MoreSettingsLocale: 'more/settings/locale',
          MoreSettingsTabBar: 'more/settings/tab-bar',
          MoreSettingsTheme: 'more/settings/theme',
          MoreSmoke: 'more/smoke',
          MoreSyncLog: 'more/sync-log',
        },
      },
      'My Library': {
        screens: {
          AddByRssFeedList: 'my-library/add-by-rss/feeds',
          AddByRssRoot: 'my-library/add-by-rss',
          LibraryClipDetail: 'my-library/clip/:clipId',
          LibraryDownloads: 'my-library/downloads',
          LibraryHistory: 'my-library/history',
          LibraryHub: 'my-library',
          LibraryMyClips: 'my-library/my-clips',
          LibrarySubscriptions: 'my-library/subscriptions',
          PlaylistCreate: 'my-library/playlist/create',
          PlaylistDetail: 'my-library/playlist/:playlistId',
          PlaylistEdit: 'my-library/playlist/:playlistId/edit',
          LibraryPlaylists: 'my-library/playlists',
          LibraryQueue: 'my-library/queue',
          PodcastDetail: 'my-library/podcast/:podcastId',
        },
      },
      Browse: {
        screens: {
          BrowseRoot: 'browse',
        },
      },
      Notifications: {
        screens: {
          NotificationsInbox: 'notifications',
        },
      },
      Search: {
        screens: {
          AlbumDetail: 'search/album/:albumId',
          ArtistDetail: 'search/artist/:artistId',
          ClipDetail: 'search/clip/:clipId',
          EpisodeDetail: 'search/episode/:episodeId',
          PodcastDetail: 'search/podcast/:podcastId',
          SearchResultDetail: 'search/result/:resultId',
          SearchRoot: 'search',
          TrackDetail: 'search/track/:trackId',
        },
      },
    },
  },
} as const;

/**
 * Deep-link prefixes derived from build config: the custom scheme(s) (`podverse-next://`,
 * `podverse://`, …) plus the public web base URL for universal / app links. Env-driven via
 * `EXPO_PUBLIC_MOBILE_DEEP_LINK_SCHEMES` / `EXPO_PUBLIC_MOBILE_WEB_BASE_URL` so forks can rebuild
 * without any hardcoded Podverse scheme or domain. Kept in sync with native registration in
 * `app.config.ts` (both parse the same env via `config/deepLinkSchemes.ts`).
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
    const scopedPath = mapIncomingPathToScopedPath(path);
    return (
      getDefaultStateFromPath(scopedPath, options) ??
      getDefaultStateFromPath('/home', options) ??
      undefined
    );
  },
  prefixes: MOBILE_LINK_PREFIXES,
};

/** Channel/item detail params shared by Home and Search stacks (tab isolation). */
export type ChannelBrowseStackParamList = {
  AlbumDetail: { albumId: string };
  ArtistDetail: { artistId: string };
  ClipDetail: { clipId: string };
  EpisodeDetail: { episodeId: string };
  PodcastDetail: { podcastId: string };
  TrackDetail: { trackId: string };
};

export type HomeStackParamList = ChannelBrowseStackParamList & {
  AddByRssPodcastDetail: { feedIdText: string };
  /** Which Home list the choices apply to, so each media type keeps its own. */
  HomeFilterSort: { mediaType: HomeMediaType };
  HomeRoot: undefined;
};

export type SearchStackParamList = ChannelBrowseStackParamList & {
  SearchResultDetail: {
    /** Podcast Index feed id (also used by deep link `search/result/:resultId`). */
    resultId: string;
    author?: string;
    description?: string;
    feedUrl?: string;
    imageUrl?: string | null;
    title?: string;
  };
  /**
   * `autoFocus` is a request from another tab (Home's empty state) to start a fresh search: the
   * field is cleared and focused so the user can type straight away. Tapping the Search tab
   * directly omits it and keeps whatever was already there.
   */
  SearchRoot: { autoFocus?: boolean } | undefined;
};

export type LibraryStackParamList = {
  AddByRssFeedList: undefined;
  AddByRssRoot: undefined;
  LibraryClipDetail: { clipId: string };
  LibraryDownloads: undefined;
  LibraryHistory: undefined;
  LibraryHub: undefined;
  LibraryMyClips: undefined;
  LibrarySubscriptions: undefined;
  PlaylistCreate: undefined;
  PlaylistDetail: { playlistId: string };
  PlaylistEdit: { playlistId: string };
  LibraryPlaylists: undefined;
  LibraryQueue: undefined;
  PodcastDetail: { podcastId: string };
};

export type BrowseStackParamList = {
  BrowseRoot: undefined;
};

export type NotificationsStackParamList = {
  NotificationsInbox: undefined;
};

export type MoreStackParamList = {
  MoreAbout: undefined;
  MoreMembership: undefined;
  MoreOpml: undefined;
  MorePublicProfile: { accountIdText: string };
  MoreProfile: undefined;
  MoreRoot: undefined;
  MoreSettings: undefined;
  MoreSettingsLocale: undefined;
  MoreSettingsTabBar: undefined;
  MoreSettingsTheme: undefined;
  MoreSmoke: undefined;
  MoreSyncLog: undefined;
};

type RootStackParamList = {
  FullPlayer: undefined;
  // Nested params so the global membership gate/banner (mounted above the navigator) can deep-navigate
  // to More ▸ Membership via `navigateToMembershipScreen()`.
  MainTabs: NavigatorScreenParams<MobileTabParamList> | undefined;
  V4vInfo: undefined;
};

/** Bottom-tab route names, used for type-safe cross-tab navigation (e.g. Home → My Library). */
export type MobileTabParamList = {
  Home: undefined;
  Search: NavigatorScreenParams<SearchStackParamList> | undefined;
  Browse: NavigatorScreenParams<BrowseStackParamList> | undefined;
  Notifications: undefined;
  'My Library': NavigatorScreenParams<LibraryStackParamList> | undefined;
  More: NavigatorScreenParams<MoreStackParamList> | undefined;
};

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
 * target sits in a different tab's stack. No-op until the navigation container is ready.
 */
export function navigateToMembershipScreen(): void {
  if (!rootNavigationRef.isReady()) {
    return;
  }
  rootNavigationRef.navigate(ROOT_STACK_ROUTES.MainTabs, {
    screen: 'More',
    params: { screen: MORE_STACK_ROUTES.MoreMembership },
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
        component={HomeFilterSortScreen}
        name={HOME_STACK_ROUTES.HomeFilterSort}
        options={{ title: t('filters.screen.title') }}
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
        component={TrackDetailScreen}
        name={HOME_STACK_ROUTES.TrackDetail}
        options={{ title: t('media.music.track') }}
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
        component={TrackDetailScreen}
        name={SEARCH_STACK_ROUTES.TrackDetail}
        options={{ title: t('media.music.track') }}
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
        options={{ title: t('features.my_library') }}
      />
      <LibraryStack.Screen
        component={AddByRssRootScreen}
        name={LIBRARY_STACK_ROUTES.AddByRssRoot}
        options={{ title: t('features.add_by_rss.label') }}
      />
      <LibraryStack.Screen
        component={AddByRssFeedListScreen}
        name={LIBRARY_STACK_ROUTES.AddByRssFeedList}
        options={{ title: t('nav.stack.rss_feeds') }}
      />
      <LibraryStack.Screen
        component={LibrarySubscriptionsScreen}
        name={LIBRARY_STACK_ROUTES.LibrarySubscriptions}
        options={{ title: t('subscriptions.subscriptions') }}
      />
      <LibraryStack.Screen
        component={PodcastDetailScreen}
        name={LIBRARY_STACK_ROUTES.PodcastDetail}
        options={{ title: t('media.podcast.podcast') }}
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
        options={{ title: t('features.clip.clips') }}
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
    </LibraryStack.Navigator>
  );
}

function BrowseStackNavigator() {
  const { t } = useTranslation();
  const screenOptions = useThemedNativeStackScreenOptions();

  return (
    <BrowseStack.Navigator screenOptions={screenOptions}>
      <BrowseStack.Screen
        component={BrowseScreen}
        name={BROWSE_STACK_ROUTES.BrowseRoot}
        options={{ title: t('nav.tab.browse') }}
      />
    </BrowseStack.Navigator>
  );
}

function NotificationsStackNavigator() {
  const { t } = useTranslation();
  const screenOptions = useThemedNativeStackScreenOptions();

  return (
    <NotificationsStack.Navigator screenOptions={screenOptions}>
      <NotificationsStack.Screen
        component={NotificationsInboxScreen}
        name={NOTIFICATIONS_STACK_ROUTES.NotificationsInbox}
        options={{ title: t('nav.tab.notifications') }}
      />
    </NotificationsStack.Navigator>
  );
}

type MoreStackNavigatorProps = {
  onRequestLogin: () => void;
  onRequestLogout: () => Promise<void>;
  onRequestSignUp: () => void;
};

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
        component={MoreSettingsScreen}
        name={MORE_STACK_ROUTES.MoreSettings}
        options={{ title: t('settings.settings') }}
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
        component={MoreOpmlScreen}
        name={MORE_STACK_ROUTES.MoreOpml}
        options={{ title: t('nav.stack.opml') }}
      />
      <MoreStack.Screen
        component={MoreSyncLogScreen}
        name={MORE_STACK_ROUTES.MoreSyncLog}
        options={{ title: t('sync.log.title') }}
      />
      <MoreStack.Screen name={MORE_STACK_ROUTES.MoreSmoke} options={{ title: 'Smoke' }}>
        {() => (
          <HelloWorldScreen
            authMode="anonymous"
            onRequestLogin={onRequestLogin}
            onRequestSignUp={onRequestSignUp}
          />
        )}
      </MoreStack.Screen>
    </MoreStack.Navigator>
  );
}

function TrackDetailScreen() {
  return <PlaceholderScreen testID="track-detail-screen" title="Track Detail Placeholder" />;
}

function LibraryHubScreen({
  navigation,
}: NativeStackScreenProps<LibraryStackParamList, 'LibraryHub'>) {
  const { t } = useTranslation();

  return (
    <MenuListScreen
      items={[
        {
          onPress: () => {
            navigation.navigate(LIBRARY_STACK_ROUTES.LibrarySubscriptions);
          },
          testID: 'library-nav-subscriptions',
          title: t('subscriptions.subscriptions'),
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
            navigation.navigate(LIBRARY_STACK_ROUTES.LibraryHistory);
          },
          testID: 'library-nav-history',
          title: t('features.history.history'),
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
            navigation.navigate(LIBRARY_STACK_ROUTES.LibraryDownloads);
          },
          testID: 'library-nav-downloads',
          title: t('nav.tab.downloads'),
        },
        {
          onPress: () => {
            navigation.navigate(LIBRARY_STACK_ROUTES.LibraryMyClips);
          },
          testID: 'library-nav-my-clips',
          title: t('features.clip.clips'),
        },
        {
          onPress: () => {
            navigation.navigate(LIBRARY_STACK_ROUTES.AddByRssRoot);
          },
          testID: 'library-nav-add-by-rss',
          title: t('features.add_by_rss.label'),
        },
        {
          onPress: () => {
            navigation
              .getParent<BottomTabNavigationProp<MobileTabParamList>>()
              ?.navigate('More', { screen: MORE_STACK_ROUTES.MoreOpml });
          },
          testID: 'library-nav-opml',
          title: t('nav.menu.opml'),
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
  const { isExpired } = useMembership();
  const { overflowTabIds } = useTabLayout();
  const isAuthenticated = status === 'authenticated';
  const tabNavigation = navigation.getParent<BottomTabNavigationProp<MobileTabParamList>>();

  const overflowItems: MenuListItem[] = overflowTabIds.map((tabId) => ({
    onPress: () => {
      tabNavigation?.navigate(tabId);
    },
    testID: `more-nav-${TAB_TEST_ID_SLUG[tabId]}`,
    title: t(tabLabelKey(tabId)),
  }));

  // One of the four renewal reminder surfaces: a persistent row a lapsed member can always find,
  // as opposed to the dismissible banner and the at-the-feature notice.
  const renewalItems: MenuListItem[] =
    isExpired && !shouldSuppressExpiryReminder()
      ? [
          {
            onPress: () => {
              navigation.navigate(MORE_STACK_ROUTES.MoreMembership);
            },
            subtitle: t('membership.gate.settings_row_subtitle'),
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

  return (
    <MenuListScreen
      items={[
        ...overflowItems,
        ...renewalItems,
        {
          onPress: () => {
            navigation.navigate(MORE_STACK_ROUTES.MoreSettings);
          },
          testID: 'more-settings',
          title: t('settings.settings'),
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
        {
          onPress: () => {
            navigation.navigate(MORE_STACK_ROUTES.MoreOpml);
          },
          testID: 'more-nav-opml',
          title: t('nav.menu.opml'),
        },
        // Low in the list on purpose: nobody goes looking for this until sync is already misbehaving.
        {
          onPress: () => {
            navigation.navigate(MORE_STACK_ROUTES.MoreSyncLog);
          },
          testID: 'more-nav-sync-log',
          title: t('sync.log.title'),
        },
        {
          onPress: () => {
            navigation.navigate(MORE_STACK_ROUTES.MoreSmoke);
          },
          testID: 'more-nav-smoke',
          title: 'Smoke',
        },
      ]}
      secondaryItems={authItems}
      testID="more-screen"
    />
  );
}

function MoreAboutScreen() {
  return <PlaceholderScreen testID="more-about-screen" title="About Placeholder" />;
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
  const { visibleTabIds } = useTabLayout();
  const visibleTabSet = useMemo(() => new Set(visibleTabIds), [visibleTabIds]);
  const notificationsUnreadCount = useNotificationsUnreadCount({ enabled: true });
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
        tabBarActiveTintColor: tokens.text.accent,
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
      tabBar={(props) =>
        isTabletLayout ? (
          <OrderedTabBar {...props} />
        ) : (
          <View>
            <PlaybackE2eStatus />
            {/* Above the mini player, which renders nothing when idle — so the bar lands on the tab
                bar by itself, with no conditional placement. */}
            <SyncProgressBar />
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
        component={SearchStackNavigator}
        name="Search"
        options={{
          tabBarButton: tabBarButtonFor('Search'),
          tabBarButtonTestID: visibleTabSet.has('Search') ? 'tab-search' : undefined,
          tabBarIcon: tabBarIcon('search'),
          tabBarLabel: t('features.search.search'),
        }}
      />
      <Tab.Screen
        component={LibraryStackNavigator}
        name="My Library"
        options={{
          tabBarButton: tabBarButtonFor('My Library'),
          tabBarButtonTestID: visibleTabSet.has('My Library') ? 'tab-my-library' : undefined,
          tabBarIcon: tabBarIcon('library'),
          tabBarLabel: t('features.my_library'),
        }}
      />
      <Tab.Screen
        component={BrowseStackNavigator}
        name="Browse"
        options={{
          tabBarButton: tabBarButtonFor('Browse'),
          tabBarButtonTestID: visibleTabSet.has('Browse') ? 'tab-browse' : undefined,
          tabBarIcon: tabBarIcon('browse'),
          tabBarLabel: t('nav.tab.browse'),
        }}
      />
      <Tab.Screen
        component={NotificationsStackNavigator}
        name="Notifications"
        options={{
          tabBarBadge: notificationsUnreadCount > 0 ? notificationsUnreadCount : undefined,
          tabBarButton: tabBarButtonFor('Notifications'),
          tabBarButtonTestID: visibleTabSet.has('Notifications') ? 'tab-notifications' : undefined,
          tabBarIcon: tabBarIcon('notifications'),
          tabBarLabel: t('nav.tab.notifications'),
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

  if (!isTabletLayout) {
    return navigator;
  }

  // The tablet tab bar is a left rail, so there is no bottom column for the bar to sit above. A
  // full-width strip under the whole navigator is the equivalent position, and it carries the
  // home-indicator inset itself because nothing sits beneath it here.
  return (
    <View style={tabScaffoldStyles.tabletRoot}>
      {navigator}
      <SyncProgressBar bottomInset={insets.bottom} />
    </View>
  );
}

const tabScaffoldStyles = StyleSheet.create({
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

  useEffect(() => {
    if (pendingDeepLinkUrl === null || !rootNavigationRef.isReady()) {
      return;
    }

    const scopedPath = mapIncomingPathToScopedPath(pendingDeepLinkUrl);
    const nextState = getDefaultStateFromPath(scopedPath, mobileNavigationLinking.config);
    if (nextState !== undefined) {
      rootNavigationRef.resetRoot(nextState);
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
        <RootStack.Screen name={ROOT_STACK_ROUTES.FullPlayer} options={{ presentation: 'modal' }}>
          {(props) => (
            <FullPlayerScreen
              onClose={() => {
                if (props.navigation.canGoBack()) {
                  props.navigation.goBack();
                  return;
                }
                props.navigation.navigate(ROOT_STACK_ROUTES.MainTabs);
              }}
              onOpenV4v={() => {
                props.navigation.navigate(ROOT_STACK_ROUTES.V4vInfo);
              }}
            />
          )}
        </RootStack.Screen>
        <RootStack.Screen
          component={V4vInfoScreen}
          name={ROOT_STACK_ROUTES.V4vInfo}
          options={{ presentation: 'modal' }}
        />
      </RootStack.Navigator>
    </NavigationContainer>
  );
}
