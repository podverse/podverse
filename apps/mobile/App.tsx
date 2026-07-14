import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';

import { initializeI18n } from './src/i18n';
import { HelloWorldScreen } from './src/screens/HelloWorldScreen';
import { ThemeProvider } from './src/theme/ThemeProvider';
import { useTheme } from './src/theme/useTheme';

export default function App() {
  const [isI18nReady, setIsI18nReady] = useState(false);

  useEffect(() => {
    void initializeI18n().finally(() => {
      setIsI18nReady(true);
    });
  }, []);

  if (!isI18nReady) {
    return null;
  }

  return (
    <ThemeProvider>
      <AppBody />
    </ThemeProvider>
  );
}

function AppBody() {
  const { statusBarStyle } = useTheme();

  return (
    <>
      <HelloWorldScreen />
      <StatusBar style={statusBarStyle} />
    </>
  );
}
