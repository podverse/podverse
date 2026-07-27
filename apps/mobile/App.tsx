import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';

import { AuthPromptProvider, AuthProvider, useAuth } from './src/auth';
import { AutoQueueProvider } from './src/contexts/AutoQueueProvider';
import { QueuesProvider } from './src/contexts/QueuesProvider';
import { initializeDatabase } from './src/data/db';
import { initializeI18n } from './src/i18n';
import { MobileTabNavigator } from './src/navigation';
import { PlaybackProvider } from './src/playback';
import { LoginScreen } from './src/screens/auth/LoginScreen';
import { SignUpScreen } from './src/screens/auth/SignUpScreen';
import { ThemeProvider } from './src/theme/ThemeProvider';
import { useTheme } from './src/theme/useTheme';

export default function App() {
  const [isI18nReady, setIsI18nReady] = useState(false);

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

  if (!isI18nReady) {
    return null;
  }

  return (
    <ThemeProvider>
      <AuthProvider>
        <AutoQueueProvider>
          <QueuesProvider>
            <PlaybackProvider>
              <AppBody />
            </PlaybackProvider>
          </QueuesProvider>
        </AutoQueueProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

function AppBody() {
  const { statusBarStyle } = useTheme();
  const { logout, status } = useAuth();
  // Login/signup are optional overlays for anonymous users; authenticated users always see tabs.
  const [authMode, setAuthMode] = useState<'anonymous' | 'login' | 'signup'>('anonymous');

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
          <MobileTabNavigator
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
        </AuthPromptProvider>
      )}
      <StatusBar style={statusBarStyle} />
    </>
  );
}
