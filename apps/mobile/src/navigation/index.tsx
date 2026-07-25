import { BottomTabBar, createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { LinkingOptions } from '@react-navigation/native';
import { NavigationContainer } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { MiniPlayer } from '../components/player/MiniPlayer';
import { PlaybackE2eStatus } from '../playback/PlaybackE2eStatus';
import { AlbumDetailScreen } from '../screens/album/AlbumDetailScreen';
import { ArtistDetailScreen } from '../screens/artist/ArtistDetailScreen';
import { ClipDetailScreen } from '../screens/clip/ClipDetailScreen';
import { EpisodeDetailScreen } from '../screens/episode/EpisodeDetailScreen';
import { HomeScreen } from '../screens/home/HomeScreen';
import { LibraryDownloadsScreen } from '../screens/library/LibraryDownloadsScreen';
import { LibraryHistoryScreen } from '../screens/library/LibraryHistoryScreen';
import { LibraryMyClipsScreen } from '../screens/library/LibraryMyClipsScreen';
import { LibraryPlaylistsScreen } from '../screens/library/LibraryPlaylistsScreen';
import { LibraryQueueScreen } from '../screens/library/LibraryQueueScreen';
import { PlaylistDetailScreen } from '../screens/library/PlaylistDetailScreen';
import { PlaylistFormScreen } from '../screens/library/PlaylistFormScreen';
import { FullPlayerScreen } from '../screens/player/FullPlayerScreen';
import { PodcastDetailScreen } from '../screens/podcast/PodcastDetailScreen';
import { MyProfileScreen } from '../screens/profile/MyProfileScreen';
import { ProfileScreen } from '../screens/profile/ProfileScreen';
import { AddByRssFeedListScreen } from '../screens/rss/AddByRssFeedListScreen';
import { AddByRssRootScreen } from '../screens/rss/AddByRssRootScreen';
import { SearchScreen } from '../screens/search/SearchScreen';
import { useTheme } from '../theme/useTheme';

type MobileTabNavigatorProps = {
  onRequestLogout: () => Promise<void>;
};

const Tab = createBottomTabNavigator();
const HomeStack = createNativeStackNavigator<HomeStackParamList>();
const SearchStack = createNativeStackNavigator<SearchStackParamList>();
const LibraryStack = createNativeStackNavigator<LibraryStackParamList>();
const RssStack = createNativeStackNavigator<RssStackParamList>();
const MoreStack = createNativeStackNavigator<MoreStackParamList>();
const RootStack = createNativeStackNavigator<RootStackParamList>();

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

type PlaceholderMenuItem = {
  onPress: () => void;
  testID: string;
  title: string;
};

type PlaceholderMenuScreenProps = {
  items: PlaceholderMenuItem[];
  testID: string;
  title: string;
};

function PlaceholderMenuScreen({ items, testID, title }: PlaceholderMenuScreenProps) {
  const { styles: themeStyles, tokens } = useTheme();
  const styles = StyleSheet.create({
    button: {
      borderColor: themeStyles.border.borderColor,
      borderRadius: tokens.radii.sm,
      borderWidth: 1,
      marginTop: tokens.spacing.md,
      paddingHorizontal: tokens.spacing.lg,
      paddingVertical: tokens.spacing.sm,
    },
    buttonText: {
      color: themeStyles.textPrimary.color,
      fontWeight: '600',
    },
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
      {items.map((item) => (
        <Pressable
          accessibilityRole="button"
          key={item.testID}
          onPress={item.onPress}
          style={styles.button}
          testID={item.testID}
        >
          <Text style={styles.buttonText}>{item.title}</Text>
        </Pressable>
      ))}
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

export const SEARCH_STACK_ROUTES = {
  SearchResultDetail: 'SearchResultDetail',
  SearchRoot: 'SearchRoot',
} as const;

export const LIBRARY_STACK_ROUTES = {
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
} as const;

export const RSS_STACK_ROUTES = {
  AddByRssFeedList: 'AddByRssFeedList',
  AddByRssRoot: 'AddByRssRoot',
} as const;

export const MORE_STACK_ROUTES = {
  MoreAbout: 'MoreAbout',
  MoreMembership: 'MoreMembership',
  MoreOpmlExport: 'MoreOpmlExport',
  MoreOpmlImport: 'MoreOpmlImport',
  MorePublicProfile: 'MorePublicProfile',
  MoreProfile: 'MoreProfile',
  MoreRoot: 'MoreRoot',
  MoreSettings: 'MoreSettings',
} as const;

export const ROOT_STACK_ROUTES = {
  FullPlayer: 'FullPlayer',
  MainTabs: 'MainTabs',
} as const;

// Tablet breakpoint for adaptive tab rail in Track 7.17.
export const MOBILE_TABLET_NAV_MIN_WIDTH = 900;

export const mobileNavigationLinking: LinkingOptions<RootStackParamList> = {
  config: {
    screens: {
      FullPlayer: 'player',
      MainTabs: {
        screens: {
          Home: {
            screens: {
              AlbumDetail: 'album/:albumId',
              ArtistDetail: 'artist/:artistId',
              ClipDetail: 'clip/:clipId',
              EpisodeDetail: 'episode/:episodeId',
              HomeRoot: 'home',
              PodcastDetail: 'podcast/:podcastId',
              TrackDetail: 'track/:trackId',
            },
          },
          More: {
            screens: {
              MoreAbout: 'more/about',
              MoreMembership: 'more/membership',
              MoreOpmlExport: 'more/opml/export',
              MoreOpmlImport: 'more/opml/import',
              MorePublicProfile: 'more/profile/:accountIdText',
              MoreProfile: 'more/profile',
              MoreRoot: 'more',
              MoreSettings: 'more/settings',
            },
          },
          'My Library': {
            screens: {
              LibraryClipDetail: 'my-library/clip/:clipId',
              LibraryDownloads: 'my-library/downloads',
              LibraryHistory: 'my-library/history',
              LibraryHub: 'my-library',
              LibraryMyClips: 'my-library/my-clips',
              PlaylistCreate: 'my-library/playlist/create',
              PlaylistDetail: 'my-library/playlist/:playlistId',
              PlaylistEdit: 'my-library/playlist/:playlistId/edit',
              LibraryPlaylists: 'my-library/playlists',
              LibraryQueue: 'my-library/queue',
            },
          },
          RSS: {
            screens: {
              AddByRssFeedList: 'add-by-rss/feeds',
              AddByRssRoot: 'add-by-rss',
            },
          },
          Search: {
            screens: {
              SearchResultDetail: 'search/result/:resultId',
              SearchRoot: 'search',
            },
          },
        },
      },
    },
  },
  prefixes: ['podverse://', 'https://podverse.fm'],
};

export type HomeStackParamList = {
  AlbumDetail: { albumId: string };
  ArtistDetail: { artistId: string };
  ClipDetail: { clipId: string };
  EpisodeDetail: { episodeId: string };
  HomeRoot: undefined;
  PodcastDetail: { podcastId: string };
  TrackDetail: { trackId: string };
};

export type SearchStackParamList = {
  SearchResultDetail: { resultId: string };
  SearchRoot: undefined;
};

export type LibraryStackParamList = {
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
};

export type RssStackParamList = {
  AddByRssFeedList: undefined;
  AddByRssRoot: undefined;
};

export type MoreStackParamList = {
  MoreAbout: undefined;
  MoreMembership: undefined;
  MoreOpmlExport: undefined;
  MoreOpmlImport: undefined;
  MorePublicProfile: { accountIdText: string };
  MoreProfile: undefined;
  MoreRoot: undefined;
  MoreSettings: undefined;
};

type RootStackParamList = {
  FullPlayer: undefined;
  MainTabs: undefined;
};

function HomeStackNavigator() {
  const { t } = useTranslation();

  return (
    <HomeStack.Navigator>
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

  return (
    <SearchStack.Navigator>
      <SearchStack.Screen
        component={SearchScreen}
        name={SEARCH_STACK_ROUTES.SearchRoot}
        options={{ title: t('features.search.search') }}
      />
      <SearchStack.Screen
        component={SearchResultDetailScreen}
        name={SEARCH_STACK_ROUTES.SearchResultDetail}
        options={{ title: t('nav.stack.search_result') }}
      />
    </SearchStack.Navigator>
  );
}

function LibraryStackNavigator() {
  const { t } = useTranslation();

  return (
    <LibraryStack.Navigator>
      <LibraryStack.Screen
        component={LibraryHubScreen}
        name={LIBRARY_STACK_ROUTES.LibraryHub}
        options={{ title: t('features.my_library') }}
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

function RssStackNavigator() {
  const { t } = useTranslation();

  return (
    <RssStack.Navigator>
      <RssStack.Screen
        component={AddByRssRootScreen}
        name={RSS_STACK_ROUTES.AddByRssRoot}
        options={{ title: t('features.add_by_rss.label') }}
      />
      <RssStack.Screen
        component={AddByRssFeedListScreen}
        name={RSS_STACK_ROUTES.AddByRssFeedList}
        options={{ title: t('nav.stack.rss_feeds') }}
      />
    </RssStack.Navigator>
  );
}

type MoreStackNavigatorProps = {
  onRequestLogout: () => Promise<void>;
};

function MoreStackNavigator({ onRequestLogout }: MoreStackNavigatorProps) {
  const { t } = useTranslation();

  return (
    <MoreStack.Navigator>
      <MoreStack.Screen options={{ title: t('nav.tab.more') }} name={MORE_STACK_ROUTES.MoreRoot}>
        {(props) => <MoreRootScreen {...props} onRequestLogout={onRequestLogout} />}
      </MoreStack.Screen>
      <MoreStack.Screen
        component={MoreSettingsScreen}
        name={MORE_STACK_ROUTES.MoreSettings}
        options={{ title: t('settings.settings') }}
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
        component={MoreOpmlImportScreen}
        name={MORE_STACK_ROUTES.MoreOpmlImport}
        options={{ title: t('settings.settings') }}
      />
      <MoreStack.Screen
        component={MoreOpmlExportScreen}
        name={MORE_STACK_ROUTES.MoreOpmlExport}
        options={{ title: t('settings.settings') }}
      />
    </MoreStack.Navigator>
  );
}

function TrackDetailScreen() {
  return <PlaceholderScreen testID="track-detail-screen" title="Track Detail Placeholder" />;
}

function SearchResultDetailScreen() {
  return (
    <PlaceholderScreen testID="search-result-detail-screen" title="Search Result Placeholder" />
  );
}

function LibraryHubScreen({
  navigation,
}: NativeStackScreenProps<LibraryStackParamList, 'LibraryHub'>) {
  const { t } = useTranslation();

  return (
    <PlaceholderMenuScreen
      items={[
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
            navigation.navigate(MORE_STACK_ROUTES.MoreOpmlImport);
          },
          testID: 'library-nav-opml-import',
          title: t('settings.settings'),
        },
        {
          onPress: () => {
            navigation.navigate(MORE_STACK_ROUTES.MoreOpmlExport);
          },
          testID: 'library-nav-opml-export',
          title: t('settings.settings'),
        },
      ]}
      testID="library-hub-screen"
      title={t('features.my_library')}
    />
  );
}

type MoreRootScreenProps = NativeStackScreenProps<MoreStackParamList, 'MoreRoot'> & {
  onRequestLogout: () => Promise<void>;
};

function MoreRootScreen({ navigation, onRequestLogout }: MoreRootScreenProps) {
  const { t } = useTranslation();

  return (
    <PlaceholderMenuScreen
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
            navigation.navigate(MORE_STACK_ROUTES.MoreOpmlImport);
          },
          testID: 'opml-import-entry',
          title: t('settings.settings'),
        },
        {
          onPress: () => {
            navigation.navigate(MORE_STACK_ROUTES.MoreOpmlExport);
          },
          testID: 'opml-export-entry',
          title: t('settings.settings'),
        },
        {
          onPress: () => {
            void onRequestLogout();
          },
          testID: 'more-nav-logout',
          title: t('authentication.logout'),
        },
      ]}
      testID="more-screen"
      title={t('nav.tab.more')}
    />
  );
}

function MoreSettingsScreen() {
  return <PlaceholderScreen testID="more-settings-screen" title="Settings Placeholder" />;
}

function MoreAboutScreen() {
  return <PlaceholderScreen testID="more-about-screen" title="About Placeholder" />;
}

function MoreMembershipScreen() {
  return <PlaceholderScreen testID="more-membership-screen" title="Membership Placeholder" />;
}

function MoreOpmlImportScreen() {
  const { t } = useTranslation();
  return <PlaceholderScreen testID="more-opml-import-screen" title={t('settings.settings')} />;
}

function MoreOpmlExportScreen() {
  const { t } = useTranslation();
  return <PlaceholderScreen testID="more-opml-export-screen" title={t('settings.settings')} />;
}

type TabScaffoldProps = {
  onOpenFullPlayer: () => void;
  onRequestLogout: () => Promise<void>;
};

function TabScaffold({ onOpenFullPlayer, onRequestLogout }: TabScaffoldProps) {
  const { t } = useTranslation();
  const { styles: themeStyles, tokens } = useTheme();
  const { width } = useWindowDimensions();
  const isTabletLayout = width >= MOBILE_TABLET_NAV_MIN_WIDTH;

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: themeStyles.buttonPrimary.color,
        tabBarInactiveTintColor: themeStyles.textSecondary.color,
        tabBarLabelPosition: isTabletLayout ? 'below-icon' : 'beside-icon',
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
          tabBarLabel: t('nav.tab.home'),
          tabBarButtonTestID: 'tab-home',
        }}
        component={HomeStackNavigator}
      />
      <Tab.Screen
        component={SearchStackNavigator}
        name="Search"
        options={{
          tabBarLabel: t('features.search.search'),
          tabBarButtonTestID: 'tab-search',
        }}
      />
      <Tab.Screen
        component={LibraryStackNavigator}
        name="My Library"
        options={{
          tabBarLabel: t('features.my_library'),
          tabBarButtonTestID: 'tab-my-library',
        }}
      />
      <Tab.Screen
        component={RssStackNavigator}
        name="RSS"
        options={{
          tabBarLabel: t('nav.tab.rss'),
          tabBarButtonTestID: 'tab-rss',
        }}
      />
      <Tab.Screen
        name="More"
        options={{ tabBarButtonTestID: 'tab-more', tabBarLabel: t('nav.tab.more') }}
      >
        {() => <MoreStackNavigator onRequestLogout={onRequestLogout} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

export function MobileTabNavigator({ onRequestLogout }: MobileTabNavigatorProps) {
  return (
    <NavigationContainer linking={mobileNavigationLinking}>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        <RootStack.Screen name={ROOT_STACK_ROUTES.MainTabs}>
          {(props) => (
            <TabScaffold
              onOpenFullPlayer={() => {
                props.navigation.navigate(ROOT_STACK_ROUTES.FullPlayer);
              }}
              onRequestLogout={onRequestLogout}
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
            />
          )}
        </RootStack.Screen>
      </RootStack.Navigator>
    </NavigationContainer>
  );
}
