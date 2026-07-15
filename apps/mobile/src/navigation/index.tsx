import { BottomTabBar, createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { LinkingOptions } from '@react-navigation/native';
import { NavigationContainer } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import {
  BackHandler,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { HelloWorldScreen } from '../screens/HelloWorldScreen';
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
  ClipDetail: 'ClipDetail',
  EpisodeDetail: 'EpisodeDetail',
  HomeRoot: 'HomeRoot',
  PodcastDetail: 'PodcastDetail',
} as const;

export const SEARCH_STACK_ROUTES = {
  SearchResultDetail: 'SearchResultDetail',
  SearchRoot: 'SearchRoot',
} as const;

export const LIBRARY_STACK_ROUTES = {
  LibraryDownloads: 'LibraryDownloads',
  LibraryHistory: 'LibraryHistory',
  LibraryHub: 'LibraryHub',
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
              ClipDetail: 'clip/:clipId',
              EpisodeDetail: 'episode/:episodeId',
              HomeRoot: 'home',
              PodcastDetail: 'podcast/:podcastId',
            },
          },
          More: {
            screens: {
              MoreAbout: 'more/about',
              MoreMembership: 'more/membership',
              MoreProfile: 'more/profile',
              MoreRoot: 'more',
              MoreSettings: 'more/settings',
            },
          },
          'My Library': {
            screens: {
              LibraryDownloads: 'my-library/downloads',
              LibraryHistory: 'my-library/history',
              LibraryHub: 'my-library',
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

type HomeStackParamList = {
  ClipDetail: { clipId: string };
  EpisodeDetail: { episodeId: string };
  HomeRoot: undefined;
  PodcastDetail: { podcastId: string };
};

type SearchStackParamList = {
  SearchResultDetail: { resultId: string };
  SearchRoot: undefined;
};

type LibraryStackParamList = {
  LibraryDownloads: undefined;
  LibraryHistory: undefined;
  LibraryHub: undefined;
  LibraryPlaylists: undefined;
  LibraryQueue: undefined;
};

type RssStackParamList = {
  AddByRssFeedList: undefined;
  AddByRssRoot: undefined;
};

type MoreStackParamList = {
  MoreAbout: undefined;
  MoreMembership: undefined;
  MoreProfile: undefined;
  MoreRoot: undefined;
  MoreSettings: undefined;
};

type RootStackParamList = {
  FullPlayer: undefined;
  MainTabs: undefined;
};

function HomeStackNavigator({ onRequestLogout }: { onRequestLogout: () => Promise<void> }) {
  return (
    <HomeStack.Navigator>
      <HomeStack.Screen name={HOME_STACK_ROUTES.HomeRoot} options={{ title: 'Home' }}>
        {() => <HelloWorldScreen authMode="authenticated" onRequestLogout={onRequestLogout} />}
      </HomeStack.Screen>
      <HomeStack.Screen
        component={PodcastDetailScreen}
        name={HOME_STACK_ROUTES.PodcastDetail}
        options={{ title: 'Podcast' }}
      />
      <HomeStack.Screen
        component={EpisodeDetailScreen}
        name={HOME_STACK_ROUTES.EpisodeDetail}
        options={{ title: 'Episode' }}
      />
      <HomeStack.Screen
        component={ClipDetailScreen}
        name={HOME_STACK_ROUTES.ClipDetail}
        options={{ title: 'Clip' }}
      />
    </HomeStack.Navigator>
  );
}

function SearchStackNavigator() {
  return (
    <SearchStack.Navigator>
      <SearchStack.Screen
        component={SearchRootScreen}
        name={SEARCH_STACK_ROUTES.SearchRoot}
        options={{ title: 'Search' }}
      />
      <SearchStack.Screen
        component={SearchResultDetailScreen}
        name={SEARCH_STACK_ROUTES.SearchResultDetail}
        options={{ title: 'Search Result' }}
      />
    </SearchStack.Navigator>
  );
}

function LibraryStackNavigator() {
  return (
    <LibraryStack.Navigator>
      <LibraryStack.Screen
        component={LibraryHubScreen}
        name={LIBRARY_STACK_ROUTES.LibraryHub}
        options={{ title: 'My Library' }}
      />
      <LibraryStack.Screen
        component={LibraryPlaylistsScreen}
        name={LIBRARY_STACK_ROUTES.LibraryPlaylists}
        options={{ title: 'Playlists' }}
      />
      <LibraryStack.Screen
        component={LibraryHistoryScreen}
        name={LIBRARY_STACK_ROUTES.LibraryHistory}
        options={{ title: 'History' }}
      />
      <LibraryStack.Screen
        component={LibraryQueueScreen}
        name={LIBRARY_STACK_ROUTES.LibraryQueue}
        options={{ title: 'Queue' }}
      />
      <LibraryStack.Screen
        component={LibraryDownloadsScreen}
        name={LIBRARY_STACK_ROUTES.LibraryDownloads}
        options={{ title: 'Downloads' }}
      />
    </LibraryStack.Navigator>
  );
}

function RssStackNavigator() {
  return (
    <RssStack.Navigator>
      <RssStack.Screen
        component={AddByRssRootScreen}
        name={RSS_STACK_ROUTES.AddByRssRoot}
        options={{ title: 'Add by RSS' }}
      />
      <RssStack.Screen
        component={AddByRssFeedListScreen}
        name={RSS_STACK_ROUTES.AddByRssFeedList}
        options={{ title: 'RSS Feeds' }}
      />
    </RssStack.Navigator>
  );
}

type MoreStackNavigatorProps = {
  onRequestLogout: () => Promise<void>;
};

function MoreStackNavigator({ onRequestLogout }: MoreStackNavigatorProps) {
  return (
    <MoreStack.Navigator>
      <MoreStack.Screen options={{ title: 'More' }} name={MORE_STACK_ROUTES.MoreRoot}>
        {(props) => <MoreRootScreen {...props} onRequestLogout={onRequestLogout} />}
      </MoreStack.Screen>
      <MoreStack.Screen
        component={MoreSettingsScreen}
        name={MORE_STACK_ROUTES.MoreSettings}
        options={{ title: 'Settings' }}
      />
      <MoreStack.Screen
        component={MoreAboutScreen}
        name={MORE_STACK_ROUTES.MoreAbout}
        options={{ title: 'About' }}
      />
      <MoreStack.Screen
        component={MoreProfileScreen}
        name={MORE_STACK_ROUTES.MoreProfile}
        options={{ title: 'Profile' }}
      />
      <MoreStack.Screen
        component={MoreMembershipScreen}
        name={MORE_STACK_ROUTES.MoreMembership}
        options={{ title: 'Membership' }}
      />
    </MoreStack.Navigator>
  );
}

function PodcastDetailScreen() {
  return <PlaceholderScreen testID="podcast-detail-screen" title="Podcast Detail Placeholder" />;
}

function EpisodeDetailScreen() {
  return <PlaceholderScreen testID="episode-detail-screen" title="Episode Detail Placeholder" />;
}

function ClipDetailScreen() {
  return <PlaceholderScreen testID="clip-detail-screen" title="Clip Detail Placeholder" />;
}

function SearchRootScreen() {
  return <PlaceholderScreen testID="search-screen" title="Search Placeholder" />;
}

function SearchResultDetailScreen() {
  return (
    <PlaceholderScreen testID="search-result-detail-screen" title="Search Result Placeholder" />
  );
}

function LibraryHubScreen({
  navigation,
}: NativeStackScreenProps<LibraryStackParamList, 'LibraryHub'>) {
  return (
    <PlaceholderMenuScreen
      items={[
        {
          onPress: () => {
            navigation.navigate(LIBRARY_STACK_ROUTES.LibraryPlaylists);
          },
          testID: 'library-nav-playlists',
          title: 'Playlists',
        },
        {
          onPress: () => {
            navigation.navigate(LIBRARY_STACK_ROUTES.LibraryHistory);
          },
          testID: 'library-nav-history',
          title: 'History',
        },
        {
          onPress: () => {
            navigation.navigate(LIBRARY_STACK_ROUTES.LibraryQueue);
          },
          testID: 'library-nav-queue',
          title: 'Queue',
        },
        {
          onPress: () => {
            navigation.navigate(LIBRARY_STACK_ROUTES.LibraryDownloads);
          },
          testID: 'library-nav-downloads',
          title: 'Downloads',
        },
      ]}
      testID="library-hub-screen"
      title="My Library"
    />
  );
}

function LibraryPlaylistsScreen() {
  return <PlaceholderScreen testID="library-playlists-screen" title="Playlists Placeholder" />;
}

function LibraryHistoryScreen() {
  return <PlaceholderScreen testID="library-history-screen" title="History Placeholder" />;
}

function LibraryQueueScreen() {
  return <PlaceholderScreen testID="library-queue-screen" title="Queue Placeholder" />;
}

function LibraryDownloadsScreen() {
  return <PlaceholderScreen testID="library-downloads-screen" title="Downloads Placeholder" />;
}

function AddByRssRootScreen({
  navigation,
}: NativeStackScreenProps<RssStackParamList, 'AddByRssRoot'>) {
  return (
    <PlaceholderMenuScreen
      items={[
        {
          onPress: () => {
            navigation.navigate(RSS_STACK_ROUTES.AddByRssFeedList);
          },
          testID: 'rss-nav-feed-list',
          title: 'View RSS feeds',
        },
      ]}
      testID="rss-root-screen"
      title="Add by RSS"
    />
  );
}

function AddByRssFeedListScreen() {
  return <PlaceholderScreen testID="rss-feed-list-screen" title="RSS Feed List Placeholder" />;
}

type MoreRootScreenProps = NativeStackScreenProps<MoreStackParamList, 'MoreRoot'> & {
  onRequestLogout: () => Promise<void>;
};

function MoreRootScreen({ navigation, onRequestLogout }: MoreRootScreenProps) {
  return (
    <PlaceholderMenuScreen
      items={[
        {
          onPress: () => {
            navigation.navigate(MORE_STACK_ROUTES.MoreSettings);
          },
          testID: 'more-nav-settings',
          title: 'Settings',
        },
        {
          onPress: () => {
            navigation.navigate(MORE_STACK_ROUTES.MoreAbout);
          },
          testID: 'more-nav-about',
          title: 'About',
        },
        {
          onPress: () => {
            navigation.navigate(MORE_STACK_ROUTES.MoreProfile);
          },
          testID: 'more-nav-profile',
          title: 'Profile',
        },
        {
          onPress: () => {
            navigation.navigate(MORE_STACK_ROUTES.MoreMembership);
          },
          testID: 'more-nav-membership',
          title: 'Membership',
        },
        {
          onPress: () => {
            void onRequestLogout();
          },
          testID: 'more-nav-logout',
          title: 'Log out',
        },
      ]}
      testID="more-screen"
      title="More"
    />
  );
}

function MoreSettingsScreen() {
  return <PlaceholderScreen testID="more-settings-screen" title="Settings Placeholder" />;
}

function MoreAboutScreen() {
  return <PlaceholderScreen testID="more-about-screen" title="About Placeholder" />;
}

function MoreProfileScreen() {
  return <PlaceholderScreen testID="more-profile-screen" title="Profile Placeholder" />;
}

function MoreMembershipScreen() {
  return <PlaceholderScreen testID="more-membership-screen" title="Membership Placeholder" />;
}

type MiniPlayerSlotProps = {
  onExpand: () => void;
};

function MiniPlayerSlot({ onExpand }: MiniPlayerSlotProps) {
  const { styles: themeStyles, tokens } = useTheme();
  const [slotHeight, setSlotHeight] = useState<number | null>(null);
  const styles = StyleSheet.create({
    container: {
      backgroundColor: tokens.background.secondary,
      borderTopColor: themeStyles.border.borderColor,
      borderTopWidth: 1,
      paddingHorizontal: tokens.spacing.lg,
      paddingVertical: tokens.spacing.sm,
    },
    subtitle: {
      color: themeStyles.textSecondary.color,
      fontSize: 12,
      marginTop: tokens.spacing.xs,
    },
    title: {
      color: themeStyles.textPrimary.color,
      fontSize: 14,
      fontWeight: '600',
    },
  });

  return (
    <Pressable
      accessibilityRole="button"
      onLayout={(event) => {
        setSlotHeight(event.nativeEvent.layout.height);
      }}
      onPress={onExpand}
      style={styles.container}
      testID="mini-player"
    >
      <Text style={styles.title}>Mini Player Placeholder</Text>
      <Text style={styles.subtitle}>Tap to expand full player</Text>
      <Text style={styles.subtitle}>Mini slot height: {slotHeight ?? 0}</Text>
    </Pressable>
  );
}

type TabScaffoldProps = {
  onOpenFullPlayer: () => void;
  onRequestLogout: () => Promise<void>;
};

function TabScaffold({ onOpenFullPlayer, onRequestLogout }: TabScaffoldProps) {
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
            <MiniPlayerSlot onExpand={onOpenFullPlayer} />
            <BottomTabBar {...props} />
          </View>
        )
      }
    >
      <Tab.Screen
        name="Home"
        options={{
          tabBarButtonTestID: 'tab-home',
        }}
      >
        {() => <HomeStackNavigator onRequestLogout={onRequestLogout} />}
      </Tab.Screen>
      <Tab.Screen
        component={SearchStackNavigator}
        name="Search"
        options={{
          tabBarButtonTestID: 'tab-search',
        }}
      />
      <Tab.Screen
        component={LibraryStackNavigator}
        name="My Library"
        options={{
          tabBarButtonTestID: 'tab-my-library',
        }}
      />
      <Tab.Screen
        component={RssStackNavigator}
        name="RSS"
        options={{
          tabBarButtonTestID: 'tab-rss',
        }}
      />
      <Tab.Screen name="More" options={{ tabBarButtonTestID: 'tab-more' }}>
        {() => <MoreStackNavigator onRequestLogout={onRequestLogout} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

function FullPlayerScreen({
  navigation,
}: NativeStackScreenProps<RootStackParamList, 'FullPlayer'>) {
  useEffect(() => {
    if (Platform.OS !== 'android') {
      return;
    }

    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      navigation.goBack();
      return true;
    });

    return () => {
      subscription.remove();
    };
  }, [navigation]);

  const { styles: themeStyles, tokens } = useTheme();
  const styles = StyleSheet.create({
    closeButton: {
      borderColor: themeStyles.border.borderColor,
      borderRadius: tokens.radii.sm,
      borderWidth: 1,
      marginTop: tokens.spacing.lg,
      paddingHorizontal: tokens.spacing.lg,
      paddingVertical: tokens.spacing.sm,
    },
    closeText: {
      color: themeStyles.textPrimary.color,
      fontWeight: '600',
    },
    container: {
      alignItems: 'center',
      backgroundColor: themeStyles.screen.backgroundColor,
      flex: 1,
      justifyContent: 'center',
      padding: tokens.spacing['2xl'],
    },
    subtitle: {
      color: themeStyles.textSecondary.color,
      marginTop: tokens.spacing.sm,
    },
    title: {
      color: themeStyles.textPrimary.color,
      fontSize: 24,
      fontWeight: '700',
    },
  });

  return (
    <View style={styles.container} testID="full-player-screen">
      <Text style={styles.title}>Full Player Placeholder</Text>
      <Text style={styles.subtitle}>Reserved route: FullPlayer</Text>
      <Pressable
        accessibilityRole="button"
        onPress={() => {
          navigation.goBack();
        }}
        style={styles.closeButton}
        testID="full-player-close"
      >
        <Text style={styles.closeText}>Close</Text>
      </Pressable>
    </View>
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
        <RootStack.Screen
          component={FullPlayerScreen}
          name={ROOT_STACK_ROUTES.FullPlayer}
          options={{ presentation: 'modal' }}
        />
      </RootStack.Navigator>
    </NavigationContainer>
  );
}
