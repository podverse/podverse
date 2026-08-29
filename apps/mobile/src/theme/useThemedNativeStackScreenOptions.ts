import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import { useMemo } from 'react';

import { ThemedStackHeader } from '../components/screen/ThemedStackHeader';
import { useTheme } from './useTheme';

/**
 * Shared native-stack chrome from design tokens. Uses a custom themed header so the header/back
 * button never flash the iOS native appearance recolor during push transitions; `contentStyle`
 * keeps the screen backdrop themed.
 */
export function useThemedNativeStackScreenOptions(): NativeStackNavigationOptions {
  const { styles: themeStyles } = useTheme();
  const screenBackground = themeStyles.screen.backgroundColor;

  return useMemo(
    () => ({
      contentStyle: {
        backgroundColor: screenBackground,
      },
      header: ThemedStackHeader,
    }),
    [screenBackground]
  );
}
