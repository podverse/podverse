import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';

import { AuthProvider, useAuth } from './src/auth';
import { initializeDatabase } from './src/data/db';
import { initializeI18n } from './src/i18n';
import { MobileTabNavigator } from './src/navigation';
import { LoginScreen } from './src/screens/auth/LoginScreen';
import { SignUpScreen } from './src/screens/auth/SignUpScreen';
import { HelloWorldScreen } from './src/screens/HelloWorldScreen';
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
        <AppBody />
      </AuthProvider>
    </ThemeProvider>
  );
}

function AppBody() {
  const { statusBarStyle } = useTheme();
  const { logout, status } = useAuth();
  const [authMode, setAuthMode] = useState<'anonymous' | 'login' | 'signup'>('anonymous');

  return (
    <>
      {status === 'authenticated' ? (
        <MobileTabNavigator
          onRequestLogout={async () => {
            await logout();
            setAuthMode('anonymous');
          }}
        />
      ) : status === 'unknown' ? null : authMode === 'login' ? (
        <LoginScreen
          onSwitchToSignUp={() => {
            setAuthMode('signup');
          }}
        />
      ) : (
        <>
          {authMode === 'signup' ? (
            <SignUpScreen
              onSwitchToLogin={() => {
                setAuthMode('login');
              }}
            />
          ) : (
            <HelloWorldScreen
              authMode="anonymous"
              onRequestLogin={() => {
                setAuthMode('login');
              }}
              onRequestSignUp={() => {
                setAuthMode('signup');
              }}
            />
          )}
        </>
      )}
      <StatusBar style={statusBarStyle} />
    </>
  );
}
