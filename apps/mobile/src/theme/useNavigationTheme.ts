import { DarkTheme, DefaultTheme } from '@react-navigation/native';
import type { Theme } from '@react-navigation/native';
import { useMemo } from 'react';

import type { UITheme } from '@podverse/design-tokens';

import { useTheme } from './useTheme';

const LIGHT_UI_THEMES: readonly UITheme[] = ['light', 'dawn'];

/**
 * React Navigation theme from design tokens. Keeps default back-button / header chrome from
 * flashing system LightTheme colors during stack transitions (notably on iOS 26).
 */
export function useNavigationTheme(): Theme {
  const { styles, tokens, uiTheme } = useTheme();

  return useMemo(() => {
    const base = LIGHT_UI_THEMES.includes(uiTheme) ? DefaultTheme : DarkTheme;
    const screenBackground = styles.screen.backgroundColor;

    return {
      ...base,
      colors: {
        ...base.colors,
        background: screenBackground,
        border: styles.border.borderColor,
        card: tokens.background.secondary,
        primary: tokens.text.accent,
        text: styles.textPrimary.color,
      },
    };
  }, [styles, tokens, uiTheme]);
}
