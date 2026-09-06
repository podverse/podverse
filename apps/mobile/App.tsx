import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { Image, Linking, Modal, Platform, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import splashBanner from './assets/splash/banner.png';
import splashIcon from './assets/splash/icon.png';
import { AuthPromptProvider, AuthProvider, useAuth } from './src/auth';
import { ForcedLogoutNotice } from './src/components/feedback/ForcedLogoutNotice';
import { MembershipExpiredBanner } from './src/components/feedback/MembershipExpiredBanner';
import { AutoQueueProvider } from './src/contexts/AutoQueueProvider';
import { QueuesProvider } from './src/contexts/QueuesProvider';
import { initializeDatabase } from './src/data/db';
import { initializeI18n } from './src/i18n';
import { MembershipGateProvider } from './src/membership/MembershipGateProvider';
import { MobileTabNavigator, navigateToMembershipScreen } from './src/navigation';
import { isAuthGatedDeepLink } from './src/navigation/deepLinking';
import { TabLayoutProvider, useTabLayout } from './src/navigation/TabLayoutProvider';
import { PlaybackProvider } from './src/playback';
import {
  getInitialNotificationDeepLinkUrl,
  subscribeToNotificationOpen,
} from './src/push/notificationRouting';
import { LoginScreen } from './src/screens/auth/LoginScreen';
import { SignUpScreen } from './src/screens/auth/SignUpScreen';
import { SyncProvider } from './src/sync';
import { ThemeProvider } from './src/theme/ThemeProvider';
import { useTheme } from './src/theme/useTheme';

/** Minimum time splash stays up after JS mounts (UX; boot is often faster than this). */
const SPLASH_MIN_VISIBLE_MS = 1000;

// Keep the native splash up until i18n, the tab-bar layout pref, and the auth resolve finish
// (SplashController), and at least SPLASH_MIN_VISIBLE_MS. Those are local reads, so this waits on
// no network. Soft-fail so a missing native module never blocks boot.
void SplashScreen.preventAutoHideAsync().catch((error: unknown) => {
  console.warn('[splash] preventAutoHideAsync failed', error);
});

export default function App() {
  const [isI18nReady, setIsI18nReady] = useState(false);
  const [pendingDeepLinkUrl, setPendingDeepLinkUrl] = useState<string | null>(null);

  useEffect(() => {
    // Open the offline-first DB in the background; do not gate render on it so a migration
    // failure never blocks the UI. Repositories `await initializeDatabase()` before querying.
    void initializeDatabase().catch((error) => {
      console.warn('[data] database initialization failed', error);
    });

    void initializeI18n().finally(() => {
      setIsI18nReady(true);
    });
  }, []);

  useEffect(() => {
    let isMounted = true;

    void Linking.getInitialURL().then((initialUrl) => {
      if (!isMounted || initialUrl === null) {
        return;
      }
      // Multiple inbound links while booting resolve with last-wins semantics.
      setPendingDeepLinkUrl(initialUrl);
    });

    const subscription = Linking.addEventListener('url', ({ url }) => {
      setPendingDeepLinkUrl(url);
    });

    return () => {
      isMounted = false;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    // Cold-start tap: app launched from a notification. Feeds the same pending-URL buffer, so it
    // replays through the navigation mapping after the auth gate resolves.
    void getInitialNotificationDeepLinkUrl().then((url) => {
      if (isMounted && url !== null) {
        setPendingDeepLinkUrl(url);
      }
    });

    // Warm/background tap: last-wins into the same buffer as universal links.
    const unsubscribe = subscribeToNotificationOpen((url) => {
      setPendingDeepLinkUrl(url);
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  // Mount AuthProvider and TabLayoutProvider immediately so local reads run under the splash; gate
  // product UI on i18n plus the stored tab order so the first tab bar is never a default flash.
  // SplashController covers both native hide + a JS overlay (needed for Dev Client, which often
  // dismisses the launch storyboard before the JS bundle runs).
  return (
    <ThemeProvider>
      <TabLayoutProvider>
        <AuthProvider>
          {isI18nReady ? (
            <AppReadyGate
              onConsumePendingDeepLink={() => {
                setPendingDeepLinkUrl(null);
              }}
              pendingDeepLinkUrl={pendingDeepLinkUrl}
            />
          ) : null}
          <SplashController isI18nReady={isI18nReady} />
        </AuthProvider>
      </TabLayoutProvider>
    </ThemeProvider>
  );
}

type AppReadyGateProps = {
  onConsumePendingDeepLink: () => void;
  pendingDeepLinkUrl: string | null;
};

function AppReadyGate({ onConsumePendingDeepLink, pendingDeepLinkUrl }: AppReadyGateProps) {
  const { isReady: isTabLayoutReady } = useTabLayout();

  if (!isTabLayoutReady) {
    return null;
  }

  return (
    <AutoQueueProvider>
      <QueuesProvider>
        <SyncProvider>
          <PlaybackProvider>
            <AppBody
              onConsumePendingDeepLink={onConsumePendingDeepLink}
              pendingDeepLinkUrl={pendingDeepLinkUrl}
            />
          </PlaybackProvider>
        </SyncProvider>
      </QueuesProvider>
    </AutoQueueProvider>
  );
}

type SplashControllerProps = {
  isI18nReady: boolean;
};

function SplashController({ isI18nReady }: SplashControllerProps) {
  const { status } = useAuth();
  const { isReady: isTabLayoutReady } = useTabLayout();
  const mountedAtMsRef = useRef(Date.now());
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (!isI18nReady || !isTabLayoutReady || status === 'unknown') {
      return;
    }

    const elapsedMs = Date.now() - mountedAtMsRef.current;
    const remainingMs = Math.max(0, SPLASH_MIN_VISIBLE_MS - elapsedMs);
    const timeoutId = setTimeout(() => {
      setIsVisible(false);
      void SplashScreen.hideAsync().catch((error: unknown) => {
        console.warn('[splash] hideAsync failed', error);
      });
    }, remainingMs);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [isI18nReady, isTabLayoutReady, status]);

  if (!isVisible) {
    return null;
  }

  // Match the native splash: Android 12+ is a circular icon; iOS is the wordmark.
  const isAndroidSplash = Platform.OS === 'android';

  return (
    <View pointerEvents="none" style={styles.splashOverlay}>
      <Image
        resizeMode="contain"
        source={isAndroidSplash ? splashIcon : splashBanner}
        style={isAndroidSplash ? styles.splashIcon : styles.splashBanner}
      />
    </View>
  );
}

type AppBodyProps = {
  onConsumePendingDeepLink: () => void;
  pendingDeepLinkUrl: string | null;
};

function AppBody({ onConsumePendingDeepLink, pendingDeepLinkUrl }: AppBodyProps) {
  const { statusBarStyle } = useTheme();
  const { logout, status } = useAuth();
  // Login/signup are optional overlays for anonymous users; authenticated users always see tabs.
  const [authMode, setAuthMode] = useState<'anonymous' | 'login' | 'signup'>('anonymous');

  useEffect(() => {
    if (status === 'authenticated') {
      setAuthMode('anonymous');
    }
  }, [status]);

  useEffect(() => {
    if (pendingDeepLinkUrl === null || status !== 'anonymous') {
      return;
    }
    if (authMode !== 'anonymous') {
      return;
    }
    if (isAuthGatedDeepLink(pendingDeepLinkUrl)) {
      setAuthMode('login');
    }
  }, [authMode, pendingDeepLinkUrl, status]);

  const dismissAuthSheet = () => {
    setAuthMode('anonymous');
  };
  const showAuthSheet = status === 'anonymous' && (authMode === 'login' || authMode === 'signup');

  return (
    <>
      {status === 'unknown' ? null : (
        <AuthPromptProvider
          onRequestLogin={() => {
            setAuthMode('login');
          }}
          onRequestSignUp={() => {
            setAuthMode('signup');
          }}
        >
          <MembershipGateProvider onNavigateToMembership={navigateToMembershipScreen}>
            <ForcedLogoutNotice />
            <View style={styles.appRoot}>
              <MembershipExpiredBanner onRenew={navigateToMembershipScreen} />
              <MobileTabNavigator
                onConsumePendingDeepLink={onConsumePendingDeepLink}
                pendingDeepLinkUrl={pendingDeepLinkUrl}
                onRequestLogin={() => {
                  setAuthMode('login');
                }}
                onRequestLogout={async () => {
                  await logout();
                  setAuthMode('anonymous');
                }}
                onRequestSignUp={() => {
                  setAuthMode('signup');
                }}
              />
            </View>
          </MembershipGateProvider>
        </AuthPromptProvider>
      )}
      {status === 'anonymous' ? (
        <Modal
          animationType="slide"
          onRequestClose={dismissAuthSheet}
          presentationStyle="fullScreen"
          visible={showAuthSheet}
        >
          <SafeAreaProvider>
            {authMode === 'signup' ? (
              <SignUpScreen
                onDismiss={dismissAuthSheet}
                onSwitchToLogin={() => {
                  setAuthMode('login');
                }}
              />
            ) : (
              <LoginScreen
                onDismiss={dismissAuthSheet}
                onSwitchToSignUp={() => {
                  setAuthMode('signup');
                }}
              />
            )}
          </SafeAreaProvider>
        </Modal>
      ) : null}
      <StatusBar style={statusBarStyle} />
    </>
  );
}

const styles = StyleSheet.create({
  appRoot: {
    flex: 1,
  },
  splashBanner: {
    height: 56,
    width: 300,
  },
  splashIcon: {
    height: 200,
    width: 200,
  },
  splashOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    backgroundColor: '#000000',
    justifyContent: 'center',
    zIndex: 1000,
  },
});
