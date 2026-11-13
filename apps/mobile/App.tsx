import { lockAsync, OrientationLock } from 'expo-screen-orientation';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { Image, Linking, Modal, Platform, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { initialWindowMetrics, SafeAreaProvider } from 'react-native-safe-area-context';

import splashBanner from './assets/splash/banner.png';
import splashIcon from './assets/splash/icon.png';
import { AuthPromptProvider, AuthProvider, useAuth } from './src/auth';
import { CrossDevicePlaybackNotice } from './src/components/feedback/CrossDevicePlaybackNotice';
import { ForcedLogoutNotice } from './src/components/feedback/ForcedLogoutNotice';
import { OverlayA11yShield, OverlayHostProvider, OverlayOutlet } from './src/components/overlay';
import { VideoPlaybackChromeBridge } from './src/components/player/VideoPlaybackChromeBridge';
import { ShareSheetPassthroughOverlay } from './src/components/share/ShareSheetPassthroughOverlay';
import { hydrateCustomApiEndpoint } from './src/config/customApiEndpoint';
import { AutoQueueProvider } from './src/contexts/AutoQueueProvider';
import { QueuesProvider } from './src/contexts/QueuesProvider';
import { initializeDatabase } from './src/data/db';
import {
  registerAutoDownloadBackgroundFetch,
  registerAutoDownloadBackgroundNotificationTask,
} from './src/downloads/autoDownloadBackgroundBootstrap';
import { downloadManager } from './src/downloads/downloadManager';
import { ActionErrorProvider } from './src/feedback/ActionErrorProvider';
import { initializeI18n } from './src/i18n';
import { E2eQuickLogin } from './src/lib/e2e/E2eQuickLogin';
import { startPerfUiMonitor } from './src/lib/perf/perfFrames';
import { MembershipGateProvider } from './src/membership/MembershipGateProvider';
import { MobileTabNavigator, navigateToMembershipScreen } from './src/navigation';
import { isAuthGatedDeepLink } from './src/navigation/deepLinking';
import { setPendingDeepLinkHandler } from './src/navigation/pendingDeepLink';
import { TabLayoutProvider, useTabLayout } from './src/navigation/TabLayoutProvider';
import { BannerNotificationHost } from './src/notifications/BannerNotificationHost';
import { NotificationsRuntime } from './src/notifications/NotificationsRuntime';
import { SignInPushPromptHost } from './src/notifications/SignInPushPromptHost';
import { PlaybackProvider } from './src/playback';
import { configureForegroundPushPresentation } from './src/push/configureForegroundPushPresentation';
import {
  getInitialNotificationDeepLinkUrl,
  subscribeToNotificationOpen,
} from './src/push/notificationRouting';
import { ForgotPasswordScreen } from './src/screens/auth/ForgotPasswordScreen';
import { LoginScreen } from './src/screens/auth/LoginScreen';
import { SignUpAddByRssLimitScreen } from './src/screens/auth/SignUpAddByRssLimitScreen';
import { SignUpScreen } from './src/screens/auth/SignUpScreen';
import { SyncProvider } from './src/sync';
import { TermsAcceptanceProvider } from './src/terms/TermsAcceptanceProvider';
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

startPerfUiMonitor();

export default function App() {
  const [isI18nReady, setIsI18nReady] = useState(false);
  const [isCustomApiReady, setIsCustomApiReady] = useState(false);
  const [pendingDeepLinkUrl, setPendingDeepLinkUrl] = useState<string | null>(null);

  useEffect(() => {
    void lockAsync(OrientationLock.PORTRAIT_UP).catch(() => undefined);
  }, []);

  useEffect(() => {
    // Open the offline-first DB in the background; do not gate render on it so a migration
    // failure never blocks the UI. Repositories `await initializeDatabase()` before querying.
    void initializeDatabase()
      .then(() =>
        downloadManager.hydrate().catch((error: unknown) => {
          console.warn('[downloads] hydrate failed', error);
        })
      )
      .then(() =>
        Promise.all([
          registerAutoDownloadBackgroundNotificationTask(),
          registerAutoDownloadBackgroundFetch(),
        ]).catch((error: unknown) => {
          console.warn('[auto-download] background registration failed', error);
        })
      )
      .catch((error) => {
        console.warn('[data] database initialization failed', error);
      });

    void initializeI18n().finally(() => {
      setIsI18nReady(true);
    });

    void hydrateCustomApiEndpoint()
      .catch((error: unknown) => {
        console.warn('[custom-api] hydrate failed', error);
      })
      .finally(() => {
        setIsCustomApiReady(true);
      });
  }, []);

  useEffect(() => {
    configureForegroundPushPresentation();
  }, []);

  useEffect(() => {
    setPendingDeepLinkHandler(setPendingDeepLinkUrl);
    return () => {
      setPendingDeepLinkHandler(null);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    void Linking.getInitialURL().then((initialUrl) => {
      if (!isMounted || initialUrl === null || initialUrl === undefined) {
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
    <GestureHandlerRootView style={styles.appRoot}>
      {/* Insets at the root, not only inside the navigators: overlays render above the navigator and
          still need the window's safe area. */}
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        {/* Outermost overlay provider so any component that can raise an overlay — including the
            playback and membership providers above the navigator — can reach the host. */}
        <OverlayHostProvider>
          <ThemeProvider>
            <TabLayoutProvider>
              {isCustomApiReady ? (
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
              ) : null}
            </TabLayoutProvider>
          </ThemeProvider>
        </OverlayHostProvider>
      </SafeAreaProvider>
      <ShareSheetPassthroughOverlay />
    </GestureHandlerRootView>
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
            <ActionErrorProvider>
              <AppBody
                onConsumePendingDeepLink={onConsumePendingDeepLink}
                pendingDeepLinkUrl={pendingDeepLinkUrl}
              />
            </ActionErrorProvider>
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
  // Login, sign-up, and forgot password are optional overlays for anonymous users.
  // Authenticated users always see tabs.
  const [authMode, setAuthMode] = useState<
    'anonymous' | 'forgot-password' | 'login' | 'signup' | 'signup-add-by-rss-limit'
  >('anonymous');
  const [signUpLimitAccepted, setSignUpLimitAccepted] = useState(false);
  const [authModalAnimation, setAuthModalAnimation] = useState<'none' | 'slide'>('slide');

  useEffect(() => {
    if (status === 'authenticated') {
      setAuthMode('anonymous');
      setSignUpLimitAccepted(false);
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
      setAuthModalAnimation('slide');
      setAuthMode('login');
    }
  }, [authMode, pendingDeepLinkUrl, status]);

  const openAuthSheet = (
    mode: 'forgot-password' | 'login' | 'signup' | 'signup-add-by-rss-limit'
  ) => {
    setAuthModalAnimation('slide');
    setAuthMode(mode);
  };

  const openSignUp = () => {
    openAuthSheet(signUpLimitAccepted ? 'signup' : 'signup-add-by-rss-limit');
  };

  const dismissAuthSheet = () => {
    setAuthMode('anonymous');
    setSignUpLimitAccepted(false);
  };

  const dismissAuthSheetByDrag = () => {
    setAuthModalAnimation('none');
    setAuthMode('anonymous');
    setSignUpLimitAccepted(false);
  };

  const showAuthSheet =
    status === 'anonymous' &&
    (authMode === 'login' ||
      authMode === 'signup' ||
      authMode === 'forgot-password' ||
      authMode === 'signup-add-by-rss-limit');

  useEffect(() => {
    if (!showAuthSheet) {
      setAuthModalAnimation('slide');
    }
  }, [showAuthSheet]);

  return (
    <View style={styles.appRoot}>
      {status === 'unknown' ? null : (
        <AuthPromptProvider
          onRequestLogin={() => {
            // The sheet only presents for anonymous sessions. Calling it while authenticated
            // would set authMode and leave visible=false — a Login button that appears to do
            // nothing.
            if (status !== 'anonymous') {
              return;
            }
            openAuthSheet('login');
          }}
          onRequestSignUp={() => {
            if (status !== 'anonymous') {
              return;
            }
            openSignUp();
          }}
        >
          <MembershipGateProvider onNavigateToMembership={navigateToMembershipScreen}>
            <TermsAcceptanceProvider>
              <NotificationsRuntime />
              <ForcedLogoutNotice />
              <CrossDevicePlaybackNotice />
              <SignInPushPromptHost />
              <OverlayA11yShield>
                <MobileTabNavigator
                  onConsumePendingDeepLink={onConsumePendingDeepLink}
                  pendingDeepLinkUrl={pendingDeepLinkUrl}
                  onRequestLogin={() => {
                    if (status !== 'anonymous') {
                      return;
                    }
                    openAuthSheet('login');
                  }}
                  onRequestLogout={async () => {
                    await logout();
                    setAuthMode('anonymous');
                  }}
                  onRequestSignUp={() => {
                    if (status !== 'anonymous') {
                      return;
                    }
                    openSignUp();
                  }}
                />
              </OverlayA11yShield>
              {/* After the navigator so overlays cover root-stack cards. */}
              <OverlayOutlet />
              {/* Above overlays. Touches outside the card pass through. */}
              <BannerNotificationHost />
            </TermsAcceptanceProvider>
          </MembershipGateProvider>
        </AuthPromptProvider>
      )}
      {/*
        Stays mounted so a successful login closes it through `visible`. Unmounting a presented
        full-screen modal skips the iOS dismissal and leaves an empty window over the tab shell.
      */}
      <Modal
        animationType={authModalAnimation}
        onRequestClose={dismissAuthSheet}
        presentationStyle="fullScreen"
        visible={showAuthSheet}
      >
        <View accessibilityViewIsModal style={styles.authSheet}>
          <SafeAreaProvider>
            {authMode === 'signup-add-by-rss-limit' ? (
              <SignUpAddByRssLimitScreen
                onDismiss={dismissAuthSheet}
                onDragDismiss={dismissAuthSheetByDrag}
                onProceed={(reason) => {
                  if (reason === 'accepted') {
                    setSignUpLimitAccepted(true);
                  }
                  setAuthMode('signup');
                }}
              />
            ) : authMode === 'signup' ? (
              <SignUpScreen
                onDismiss={dismissAuthSheet}
                onDragDismiss={dismissAuthSheetByDrag}
                onSwitchToLogin={() => {
                  openAuthSheet('login');
                }}
              />
            ) : authMode === 'forgot-password' ? (
              <ForgotPasswordScreen
                onBackToLogin={() => {
                  openAuthSheet('login');
                }}
              />
            ) : (
              <LoginScreen
                onDismiss={dismissAuthSheet}
                onDragDismiss={dismissAuthSheetByDrag}
                onForgotPassword={() => {
                  openAuthSheet('forgot-password');
                }}
                onSwitchToSignUp={() => {
                  openSignUp();
                }}
              />
            )}
          </SafeAreaProvider>
          <ShareSheetPassthroughOverlay />
        </View>
      </Modal>
      <E2eQuickLogin />
      <StatusBar style={statusBarStyle} />
      <VideoPlaybackChromeBridge />
    </View>
  );
}

const styles = StyleSheet.create({
  appRoot: {
    flex: 1,
  },
  authSheet: {
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
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    backgroundColor: '#000000',
    justifyContent: 'center',
    zIndex: 1000,
  },
});
