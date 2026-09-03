import type { PropsWithChildren } from 'react';
import { createContext, useCallback, useEffect, useMemo, useState } from 'react';

import type { ThemeTokens, UITheme } from '@podverse/design-tokens';
import { getThemeTokens } from '@podverse/design-tokens';

import { readUIThemePref, writeUIThemePref } from '../prefs/uiTheme';
import type { MobileThemeStyles } from './createStyles';
import { createStyles } from './createStyles';

type MobileStatusBarStyle = 'dark' | 'light';

type ThemeContextValue = {
  setUITheme: (theme: UITheme) => void;
  statusBarStyle: MobileStatusBarStyle;
  styles: MobileThemeStyles;
  tokens: ThemeTokens;
  uiTheme: UITheme;
};

export const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const DEFAULT_UI_THEME: UITheme = 'dark';

const getStatusBarStyle = (theme: UITheme): MobileStatusBarStyle => {
  if (theme === 'light' || theme === 'dawn') {
    return 'dark';
  }

  return 'light';
};

export function ThemeProvider({ children }: PropsWithChildren) {
  const [uiTheme, setUIThemeState] = useState<UITheme>(DEFAULT_UI_THEME);

  const setUITheme = useCallback((theme: UITheme) => {
    setUIThemeState(theme);
    void writeUIThemePref(theme);
  }, []);

  useEffect(() => {
    let isMounted = true;

    // Unset `uit` stays on dark. The OS color scheme does not pick a theme.
    void (async () => {
      const storedTheme = await readUIThemePref();
      if (!isMounted || storedTheme === null) {
        return;
      }

      setUIThemeState(storedTheme);
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  const value = useMemo<ThemeContextValue>(() => {
    return {
      setUITheme,
      statusBarStyle: getStatusBarStyle(uiTheme),
      styles: createStyles(uiTheme),
      tokens: getThemeTokens(uiTheme),
      uiTheme,
    };
  }, [uiTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
