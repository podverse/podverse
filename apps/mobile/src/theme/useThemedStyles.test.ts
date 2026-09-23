import { describe, expect, it, vi } from 'vitest';

import type { UITheme } from '@podverse/design-tokens';
import { getThemeTokens } from '@podverse/design-tokens';

vi.mock('react-native', () => {
  return {
    StyleSheet: {
      create: <T extends object>(styles: T): T => styles,
    },
  };
});

vi.mock('./useTheme', () => {
  return {
    useTheme: () => {
      throw new Error('useTheme is not used by resolveThemedStyles');
    },
  };
});

import { createStyles } from './createStyles';
import type { ThemedStylesTheme } from './useThemedStyles';
import { resolveThemedStyles } from './useThemedStyles';

const themeValue = (uiTheme: UITheme): ThemedStylesTheme => {
  return {
    setUITheme: (nextTheme: UITheme) => {
      void nextTheme;
    },
    statusBarStyle: uiTheme === 'light' || uiTheme === 'dawn' ? 'dark' : 'light',
    styles: createStyles(uiTheme),
    tokens: getThemeTokens(uiTheme),
    uiTheme,
  };
};

const rowStyles = (theme: ThemedStylesTheme) => {
  return {
    row: {
      backgroundColor: theme.styles.screen.backgroundColor,
    },
  };
};

const titleStyles = (theme: ThemedStylesTheme) => {
  return {
    title: {
      color: theme.styles.textPrimary.color,
    },
  };
};

describe('resolveThemedStyles', () => {
  it('returns the same stylesheet for the same factory and theme', () => {
    const dark = themeValue('dark');
    const first = resolveThemedStyles(rowStyles, dark);
    const second = resolveThemedStyles(rowStyles, dark);

    expect(second).toBe(first);
    expect(first.row.backgroundColor).toBe(createStyles('dark').screen.backgroundColor);
  });

  it('returns a new stylesheet when the theme changes and the original when it changes back', () => {
    const dark = themeValue('dark');
    const light = themeValue('light');
    const darkStyles = resolveThemedStyles(rowStyles, dark);
    const lightStyles = resolveThemedStyles(rowStyles, light);
    const darkAgain = resolveThemedStyles(rowStyles, dark);

    expect(lightStyles).not.toBe(darkStyles);
    expect(lightStyles.row.backgroundColor).toBe(createStyles('light').screen.backgroundColor);
    expect(darkStyles.row.backgroundColor).toBe(createStyles('dark').screen.backgroundColor);
    expect(darkAgain).toBe(darkStyles);
  });

  it('does not collide two factories under the same theme', () => {
    const dark = themeValue('dark');
    const rows = resolveThemedStyles(rowStyles, dark);
    const titles = resolveThemedStyles(titleStyles, dark);

    expect(titles).not.toBe(rows);
    expect(titles.title.color).toBe(createStyles('dark').textPrimary.color);
    expect(rows.row.backgroundColor).toBe(createStyles('dark').screen.backgroundColor);
  });
});
