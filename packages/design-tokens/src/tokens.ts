import type { UITheme } from './uiTheme.js';

type BackgroundTokens = {
  primary: string;
  secondary: string;
  tertiary: string;
  quaternary: string;
  special: string;
  glow: string;
  opaque: string;
  contrast: string;
  error: string;
  success: string;
  warning: string;
};

type TextTokens = {
  primary: string;
  secondary: string;
  tertiary: string;
  accent: string;
  link: string;
  linkHover: string;
  contrast: string;
  highlighted: string;
  danger: string;
  success: string;
  warning: string;
};

type BorderTokens = {
  primary: string;
  secondary: string;
  tertiary: string;
  warning: string;
  error: string;
  opaque: string;
};

type ButtonTokens = {
  primaryBg: string;
  primaryColor: string;
  primaryBgHover: string;
  secondaryBg: string;
  secondaryColor: string;
  secondaryBgHover: string;
  successBg: string;
  successColor: string;
  successBgHover: string;
  warningBg: string;
  warningColor: string;
  warningBgHover: string;
  highlightBg: string;
  highlightBgHover: string;
  dangerBg: string;
  dangerColor: string;
  dangerBgHover: string;
  outlineColor: string;
  opaqueBg: string;
  opaqueWarningBg: string;
  opaqueWarningColor: string;
  opaqueDangerBg: string;
  opaqueDangerBorder: string;
  enabledIconColor: string;
};

type SpacingScaleTokens = {
  none: number;
  xs: number;
  sm: number;
  md: number;
  base: number;
  lg: number;
  xl: number;
  '2xl': number;
  '3xl': number;
  '4xl': number;
};

type RadiiScaleTokens = {
  sm: number;
  md: number;
  artwork: number;
  round: number;
};

export type ThemeTokens = {
  background: BackgroundTokens;
  text: TextTokens;
  border: BorderTokens;
  button: ButtonTokens;
  spacing: SpacingScaleTokens;
  radii: RadiiScaleTokens;
};

const SPACING_SCALE: SpacingScaleTokens = {
  none: 0,
  xs: 2,
  sm: 4,
  md: 8,
  base: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 28,
  '4xl': 32,
};

const RADII_SCALE: RadiiScaleTokens = {
  sm: 10,
  md: 10,
  artwork: 0,
  round: 1600,
};

const THEME_TOKENS_BY_THEME: Record<UITheme, Omit<ThemeTokens, 'spacing' | 'radii'>> = {
  dark: {
    background: {
      primary: '#030626',
      secondary: '#000000',
      tertiary: '#0f1235',
      quaternary: '#20244e',
      special: '#1e2a44',
      glow: 'rgba(37, 42, 100, 0.6)',
      opaque: 'rgba(255, 255, 255, 0.15)',
      contrast: '#ffffff',
      error: 'rgba(227, 52, 47, 0.18)',
      success: 'rgba(80, 250, 123, 0.18)',
      warning: 'rgba(244, 162, 79, 0.18)',
    },
    text: {
      primary: '#ffffff',
      secondary: '#cccccc',
      tertiary: '#000000',
      accent: '#3d9dfe',
      link: '#74a8dc',
      linkHover: '#49a4ff',
      contrast: '#333333',
      highlighted: '#f4a24f',
      danger: '#e3342f',
      success: '#50fa7b',
      warning: '#f4a24f',
    },
    border: {
      primary: '#3d9dfe',
      secondary: '#ffffff',
      tertiary: '#444444',
      warning: '#f4a24f',
      error: '#aa1e2b',
      opaque: 'rgba(255, 255, 255, 0.15)',
    },
    button: {
      primaryBg: '#3d9dfe',
      primaryColor: '#000000',
      primaryBgHover: '#49a4ff',
      secondaryBg: 'rgba(37, 42, 100, 0.6)',
      secondaryColor: '#ffffff',
      secondaryBgHover: '#34397b',
      successBg: '#15803d',
      successColor: '#ffffff',
      successBgHover: '#1e9c53',
      warningBg: '#f4a24f',
      warningColor: '#ffffff',
      warningBgHover: '#ffb84d',
      highlightBg: '#ffd600',
      highlightBgHover: '#ffe066',
      dangerBg: '#bd2130',
      dangerColor: '#ffffff',
      dangerBgHover: '#e3342f',
      outlineColor: '#3d9dfe',
      opaqueBg: 'rgba(30, 128, 227, 0.16)',
      opaqueWarningBg: 'rgba(244, 162, 79, 0.16)',
      opaqueWarningColor: '#ffffff',
      opaqueDangerBg: 'rgba(196, 55, 69, 0.16)',
      opaqueDangerBorder: '#aa1e2b',
      enabledIconColor: '#3d9dfe',
    },
  },
  light: {
    background: {
      primary: '#f5f5f7',
      secondary: '#ffffff',
      tertiary: '#e8e8ed',
      quaternary: '#d1d1d6',
      special: '#dce4ed',
      glow: 'rgba(200, 205, 230, 0.6)',
      opaque: 'rgba(0, 0, 0, 0.08)',
      contrast: '#1d1d1f',
      error: 'rgba(214, 48, 49, 0.12)',
      success: 'rgba(39, 174, 96, 0.12)',
      warning: 'rgba(230, 126, 34, 0.12)',
    },
    text: {
      primary: '#1d1d1f',
      secondary: '#515154',
      tertiary: '#ffffff',
      accent: '#0071e3',
      link: '#0066cc',
      linkHover: '#0077ed',
      contrast: '#f5f5f7',
      highlighted: '#e67e22',
      danger: '#d63031',
      success: '#27ae60',
      warning: '#e67e22',
    },
    border: {
      primary: '#0071e3',
      secondary: '#1d1d1f',
      tertiary: '#c7c7cc',
      warning: '#e67e22',
      error: '#c0392b',
      opaque: 'rgba(0, 0, 0, 0.12)',
    },
    button: {
      primaryBg: '#0071e3',
      primaryColor: '#ffffff',
      primaryBgHover: '#0077ed',
      secondaryBg: 'rgba(200, 205, 230, 0.6)',
      secondaryColor: '#1d1d1f',
      secondaryBgHover: '#c4c9de',
      successBg: '#27ae60',
      successColor: '#ffffff',
      successBgHover: '#2ecc71',
      warningBg: '#e67e22',
      warningColor: '#ffffff',
      warningBgHover: '#f39c12',
      highlightBg: '#f1c40f',
      highlightBgHover: '#f4d03f',
      dangerBg: '#c0392b',
      dangerColor: '#ffffff',
      dangerBgHover: '#e74c3c',
      outlineColor: '#0071e3',
      opaqueBg: 'rgba(0, 113, 227, 0.1)',
      opaqueWarningBg: 'rgba(230, 126, 34, 0.1)',
      opaqueWarningColor: '#ffffff',
      opaqueDangerBg: 'rgba(192, 57, 43, 0.1)',
      opaqueDangerBorder: '#a93226',
      enabledIconColor: '#0071e3',
    },
  },
  dracula: {
    background: {
      primary: '#282a36',
      secondary: '#1e1f29',
      tertiary: '#343746',
      quaternary: '#44475a',
      special: '#3d4158',
      glow: 'rgba(68, 71, 90, 0.7)',
      opaque: 'rgba(255, 255, 255, 0.1)',
      contrast: '#f8f8f2',
      error: 'rgba(255, 85, 85, 0.18)',
      success: 'rgba(80, 250, 123, 0.18)',
      warning: 'rgba(255, 184, 108, 0.18)',
    },
    text: {
      primary: '#f8f8f2',
      secondary: '#bfc9db',
      tertiary: '#282a36',
      accent: '#bd93f9',
      link: '#8be9fd',
      linkHover: '#a4f4ff',
      contrast: '#282a36',
      highlighted: '#ffb86c',
      danger: '#ff5555',
      success: '#50fa7b',
      warning: '#ffb86c',
    },
    border: {
      primary: '#bd93f9',
      secondary: '#f8f8f2',
      tertiary: '#6272a4',
      warning: '#ffb86c',
      error: '#cc4444',
      opaque: 'rgba(255, 255, 255, 0.15)',
    },
    button: {
      primaryBg: '#bd93f9',
      primaryColor: '#282a36',
      primaryBgHover: '#caa8fc',
      secondaryBg: 'rgba(68, 71, 90, 0.7)',
      secondaryColor: '#f8f8f2',
      secondaryBgHover: '#565970',
      successBg: '#50fa7b',
      successColor: '#282a36',
      successBgHover: '#69fb8f',
      warningBg: '#ffb86c',
      warningColor: '#f8f8f2',
      warningBgHover: '#ffc98a',
      highlightBg: '#f1fa8c',
      highlightBgHover: '#f5fba8',
      dangerBg: '#ff5555',
      dangerColor: '#f8f8f2',
      dangerBgHover: '#ff6e6e',
      outlineColor: '#bd93f9',
      opaqueBg: 'rgba(189, 147, 249, 0.16)',
      opaqueWarningBg: 'rgba(255, 184, 108, 0.16)',
      opaqueWarningColor: '#f8f8f2',
      opaqueDangerBg: 'rgba(255, 85, 85, 0.16)',
      opaqueDangerBorder: '#cc4444',
      enabledIconColor: '#bd93f9',
    },
  },
  violet: {
    background: {
      primary: '#000000',
      secondary: '#000000',
      tertiary: '#12081c',
      quaternary: '#1f1430',
      special: '#2a1c3d',
      glow: 'rgba(124, 58, 237, 0.22)',
      opaque: 'rgba(255, 255, 255, 0.1)',
      contrast: '#f5f3ff',
      error: 'rgba(227, 52, 47, 0.18)',
      success: 'rgba(80, 250, 123, 0.18)',
      warning: 'rgba(244, 162, 79, 0.18)',
    },
    text: {
      primary: '#f5f3ff',
      secondary: '#c4b8d4',
      tertiary: '#f5f3ff',
      accent: '#7c3aed',
      link: '#a78bfa',
      linkHover: '#c4b5fd',
      contrast: '#0a0a0f',
      highlighted: '#f4a24f',
      danger: '#e3342f',
      success: '#50fa7b',
      warning: '#f4a24f',
    },
    border: {
      primary: '#7c3aed',
      secondary: '#f5f3ff',
      tertiary: '#3f3a4d',
      warning: '#f4a24f',
      error: '#aa1e2b',
      opaque: 'rgba(255, 255, 255, 0.15)',
    },
    button: {
      primaryBg: '#7c3aed',
      primaryColor: '#f5f3ff',
      primaryBgHover: '#8b5cf6',
      secondaryBg: 'rgba(124, 58, 237, 0.22)',
      secondaryColor: '#f5f3ff',
      secondaryBgHover: '#2d1f3d',
      successBg: '#15803d',
      successColor: '#f5f3ff',
      successBgHover: '#1e9c53',
      warningBg: '#f4a24f',
      warningColor: '#0a0a0f',
      warningBgHover: '#ffb84d',
      highlightBg: '#ffd600',
      highlightBgHover: '#ffe066',
      dangerBg: '#bd2130',
      dangerColor: '#f5f3ff',
      dangerBgHover: '#e3342f',
      outlineColor: '#7c3aed',
      opaqueBg: 'rgba(124, 58, 237, 0.18)',
      opaqueWarningBg: 'rgba(244, 162, 79, 0.16)',
      opaqueWarningColor: '#f5f3ff',
      opaqueDangerBg: 'rgba(196, 55, 69, 0.16)',
      opaqueDangerBorder: '#aa1e2b',
      enabledIconColor: '#7c3aed',
    },
  },
  ember: {
    background: {
      primary: '#140606',
      secondary: '#0a0303',
      tertiary: '#241010',
      quaternary: '#381818',
      special: '#2e1212',
      glow: 'rgba(214, 40, 40, 0.28)',
      opaque: 'rgba(255, 184, 0, 0.12)',
      contrast: '#ffffff',
      error: 'rgba(227, 52, 47, 0.2)',
      success: 'rgba(80, 250, 123, 0.18)',
      warning: 'rgba(255, 184, 0, 0.2)',
    },
    text: {
      primary: '#ffffff',
      secondary: '#d4bdb0',
      tertiary: '#140606',
      accent: '#ffb800',
      link: '#ffd055',
      linkHover: '#ffe08a',
      contrast: '#140606',
      highlighted: '#ffb800',
      danger: '#ff6b6b',
      success: '#50fa7b',
      warning: '#ffb800',
    },
    border: {
      primary: '#ffb800',
      secondary: '#ffffff',
      tertiary: '#5c3030',
      warning: '#ffb800',
      error: '#aa1e2b',
      opaque: 'rgba(255, 184, 0, 0.18)',
    },
    button: {
      primaryBg: '#ffb800',
      primaryColor: '#140606',
      primaryBgHover: '#ffc933',
      secondaryBg: 'rgba(214, 40, 40, 0.28)',
      secondaryColor: '#ffffff',
      secondaryBgHover: '#4a2020',
      successBg: '#15803d',
      successColor: '#ffffff',
      successBgHover: '#1e9c53',
      warningBg: '#ffb800',
      warningColor: '#140606',
      warningBgHover: '#ffc933',
      highlightBg: '#ffd600',
      highlightBgHover: '#ffe066',
      dangerBg: '#bd2130',
      dangerColor: '#ffffff',
      dangerBgHover: '#e3342f',
      outlineColor: '#ffb800',
      opaqueBg: 'rgba(255, 184, 0, 0.16)',
      opaqueWarningBg: 'rgba(255, 184, 0, 0.16)',
      opaqueWarningColor: '#ffffff',
      opaqueDangerBg: 'rgba(196, 55, 69, 0.16)',
      opaqueDangerBorder: '#aa1e2b',
      enabledIconColor: '#ffb800',
    },
  },
  dawn: {
    background: {
      primary: '#fdf6ee',
      secondary: '#ffffff',
      tertiary: '#fce8d4',
      quaternary: '#f0d4bc',
      special: '#fae8dc',
      glow: 'rgba(255, 184, 0, 0.35)',
      opaque: 'rgba(196, 30, 30, 0.08)',
      contrast: '#1a1a1a',
      error: 'rgba(214, 48, 49, 0.12)',
      success: 'rgba(39, 174, 96, 0.12)',
      warning: 'rgba(230, 168, 0, 0.14)',
    },
    text: {
      primary: '#1a1a1a',
      secondary: '#5c4033',
      tertiary: '#ffffff',
      accent: '#c41e1e',
      link: '#9a1818',
      linkHover: '#c41e1e',
      contrast: '#fdf6ee',
      highlighted: '#c98700',
      danger: '#c0392b',
      success: '#27ae60',
      warning: '#c98700',
    },
    border: {
      primary: '#c41e1e',
      secondary: '#1a1a1a',
      tertiary: '#e8c4b0',
      warning: '#c98700',
      error: '#a93226',
      opaque: 'rgba(196, 30, 30, 0.12)',
    },
    button: {
      primaryBg: '#c41e1e',
      primaryColor: '#ffffff',
      primaryBgHover: '#d62828',
      secondaryBg: 'rgba(255, 184, 0, 0.35)',
      secondaryColor: '#1a1a1a',
      secondaryBgHover: '#f5dcc8',
      successBg: '#27ae60',
      successColor: '#ffffff',
      successBgHover: '#2ecc71',
      warningBg: '#e6a800',
      warningColor: '#1a1a1a',
      warningBgHover: '#f1c40f',
      highlightBg: '#ffb800',
      highlightBgHover: '#ffc933',
      dangerBg: '#c0392b',
      dangerColor: '#ffffff',
      dangerBgHover: '#e74c3c',
      outlineColor: '#c41e1e',
      opaqueBg: 'rgba(196, 30, 30, 0.1)',
      opaqueWarningBg: 'rgba(230, 168, 0, 0.12)',
      opaqueWarningColor: '#1a1a1a',
      opaqueDangerBg: 'rgba(192, 57, 43, 0.1)',
      opaqueDangerBorder: '#a93226',
      enabledIconColor: '#c41e1e',
    },
  },
};

export const getThemeTokens = (theme: UITheme): ThemeTokens => ({
  ...THEME_TOKENS_BY_THEME[theme],
  spacing: SPACING_SCALE,
  radii: RADII_SCALE,
});
