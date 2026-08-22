import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';

import { AuthPromptProvider, AuthProvider, useAuth } from './src/auth';
import { MembershipExpiredBanner } from './src/components/feedback/MembershipExpiredBanner';
import { AutoQueueProvider } from './src/contexts/AutoQueueProvider';
import { QueuesProvider } from './src/contexts/QueuesProvider';
import { initializeDatabase } from './src/data/db';
import { initializeI18n } from './src/i18n';
import { MembershipGateProvider } from './src/membership/MembershipGateProvider';
import { MobileTabNavigator, navigateToMembershipScreen } from './src/navigation';
import { isAuthGatedDeepLink } from './src/navigation/deepLinking';
import { PlaybackProvider } from './src/playback';
import {
  getInitialNotificationDeepLinkUrl,
  subscribeToNotificationOpen,
} from './src/push/notificationRouting';
import { LoginScreen } from './src/screens/auth/LoginScreen';
import { SignUpScreen } from './src/screens/auth/SignUpScreen';
import { ThemeProvider } from './src/theme/ThemeProvider';
import { useTheme } from './src/theme/useTheme';

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

    // Cold-start tap: app launched from a notification. Feeds the same pending-URL buffer (453),
    // so it replays through the 452 mapping after the auth gate resolves.
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

  if (!isI18nReady) {
    return null;
  }

  return (
    <ThemeProvider>
      <AuthProvider>
        <AutoQueueProvider>
          <QueuesProvider>
            <PlaybackProvider>
              <AppBody
                onConsumePendingDeepLink={() => {
                  setPendingDeepLinkUrl(null);
                }}
                pendingDeepLinkUrl={pendingDeepLinkUrl}
              />
            </PlaybackProvider>
          </QueuesProvider>
        </AutoQueueProvider>
      </AuthProvider>
    </ThemeProvider>
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

  return (
    <>
      {status === 'unknown' ? null : status === 'anonymous' && authMode === 'login' ? (
        <LoginScreen
          onDismiss={() => {
            setAuthMode('anonymous');
          }}
          onSwitchToSignUp={() => {
            setAuthMode('signup');
          }}
        />
      ) : status === 'anonymous' && authMode === 'signup' ? (
        <SignUpScreen
          onDismiss={() => {
            setAuthMode('anonymous');
          }}
          onSwitchToLogin={() => {
            setAuthMode('login');
          }}
        />
      ) : (
        <AuthPromptProvider
          onRequestLogin={() => {
            setAuthMode('login');
          }}
          onRequestSignUp={() => {
            setAuthMode('signup');
          }}
        >
          <MembershipGateProvider onNavigateToMembership={navigateToMembershipScreen}>
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
      <StatusBar style={statusBarStyle} />
    </>
  );
}

const styles = StyleSheet.create({
  appRoot: {
    flex: 1,
  },
});
