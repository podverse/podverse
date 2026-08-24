import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { BottomTabBar, createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { LinkingOptions, NavigatorScreenParams } from '@react-navigation/native';
import {
  createNavigationContainerRef,
  getPathFromState as getDefaultPathFromState,
  getStateFromPath as getDefaultStateFromPath,
  NavigationContainer,
} from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { breakpoints } from '@podverse/design-tokens';

import { useAuth } from '../auth/AuthProvider';
import { MiniPlayer } from '../components/player/MiniPlayer';
import type { MenuListItem } from '../components/screen/MenuListScreen';
import { MenuListScreen } from '../components/screen/MenuListScreen';
import { getMobileConfig } from '../config';
import { buildMobileLinkPrefixes } from '../config/deepLinkSchemes';
import { useNotificationsUnseenCount } from '../hooks/useNotificationsUnseenCount';
import { PlaybackE2eStatus } from '../playback/PlaybackE2eStatus';
import { AlbumDetailScreen } from '../screens/album/AlbumDetailScreen';
import { ArtistDetailScreen } from '../screens/artist/ArtistDetailScreen';
import { ClipDetailScreen } from '../screens/clip/ClipDetailScreen';
import { EpisodeDetailScreen } from '../screens/episode/EpisodeDetailScreen';
import { HelloWorldScreen } from '../screens/HelloWorldScreen';
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
import { MoreSettingsThemeScreen } from '../screens/more/MoreSettingsThemeScreen';
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
import { tabBarIcon } from './tabBarIcon';

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
  AlbumDetail: 'AlbumDetail',
  ArtistDetail: 'ArtistDetail',
  ClipDetail: 'ClipDetail',
  EpisodeDetail: 'EpisodeDetail',
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
  MoreSettingsTheme: 'MoreSettingsTheme',
  MoreSmoke: 'MoreSmoke',
} as const;

export const ROOT_STACK_ROUTES = {
  FullPlayer: 'FullPlayer',
  MainTabs: 'MainTabs',
  V4vInfo: 'V4vInfo',
} as const;

// Tablet breakpoint for adaptive tab rail (Track 7.17) — same `lg` token as useResponsive.
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
          MoreSettingsTheme: 'more/settings/theme',
          MoreSmoke: 'more/smoke',
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
  SearchRoot: undefined;
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
  MoreSettingsTheme: undefined;
  MoreSmoke: undefined;
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
  Search: undefined;
  Notifications: undefined;
  'My Library': NavigatorScreenParams<LibraryStackParamList> | undefined;
  More: NavigatorScreenParams<MoreStackParamList> | undefined;
};

/**
 * Navigate to More ▸ Membership from anywhere — used by the app-wide membership gate modal and the
 * expired banner, which live above the navigator (so they cannot use `useNavigation`). No-op until
 * the navigation container is ready.
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
        options={{ title: t('nav.stack.home') }}
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
  const isAuthenticated = status === 'authenticated';

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
  const notificationsUnseenCount = useNotificationsUnseenCount({ enabled: true });
  const { width } = useWindowDimensions();
  const isTabletLayout = width >= MOBILE_TABLET_NAV_MIN_WIDTH;

  return (
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
          <BottomTabBar {...props} />
        ) : (
          <View>
            <PlaybackE2eStatus />
            <MiniPlayer onExpand={onOpenFullPlayer} />
            <BottomTabBar {...props} />
          </View>
        )
      }
    >
      <Tab.Screen
        name="Home"
        options={{
          tabBarIcon: tabBarIcon('home'),
          tabBarLabel: t('nav.tab.home'),
          tabBarButtonTestID: 'tab-home',
        }}
        component={HomeStackNavigator}
      />
      <Tab.Screen
        component={SearchStackNavigator}
        name="Search"
        options={{
          tabBarIcon: tabBarIcon('search'),
          tabBarLabel: t('features.search.search'),
          tabBarButtonTestID: 'tab-search',
        }}
      />
      <Tab.Screen
        component={NotificationsStackNavigator}
        name="Notifications"
        options={{
          tabBarBadge: notificationsUnseenCount > 0 ? notificationsUnseenCount : undefined,
          tabBarIcon: tabBarIcon('notifications'),
          tabBarLabel: t('nav.tab.notifications'),
          tabBarButtonTestID: 'tab-notifications',
        }}
      />
      <Tab.Screen
        component={LibraryStackNavigator}
        name="My Library"
        options={{
          tabBarIcon: tabBarIcon('library'),
          tabBarLabel: t('features.my_library'),
          tabBarButtonTestID: 'tab-my-library',
        }}
      />
      <Tab.Screen
        name="More"
        options={{
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
}

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
