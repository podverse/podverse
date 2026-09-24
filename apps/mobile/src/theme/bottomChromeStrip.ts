import type { TextStyle, ViewStyle } from 'react-native';

import type { ThemeTokens } from '@podverse/design-tokens';

import { typography } from './typography';

/**
 * Shared type and height for the slim status strips above the mini player (offline, chapter/clip,
 * download activity). Colors stay per-bar; size and weight do not.
 */
export const BOTTOM_CHROME_STRIP_ICON_SIZE = 14;

export const BOTTOM_CHROME_STRIP_FONT_SIZE = typography.body.fontSize;

export const BOTTOM_CHROME_STRIP_FONT_WEIGHT = typography.body.fontWeight;

/** Caption line box so the band stays slim while the glyph size matches body. */
export const BOTTOM_CHROME_STRIP_LINE_HEIGHT = typography.caption.lineHeight;

export function bottomChromeStripHeight(spacing: ThemeTokens['spacing']): number {
  return BOTTOM_CHROME_STRIP_LINE_HEIGHT + 2 * spacing.sm;
}

export function bottomChromeStripTextStyle(): TextStyle {
  return {
    fontSize: BOTTOM_CHROME_STRIP_FONT_SIZE,
    fontWeight: BOTTOM_CHROME_STRIP_FONT_WEIGHT,
    includeFontPadding: false,
    lineHeight: BOTTOM_CHROME_STRIP_LINE_HEIGHT,
  };
}

export function bottomChromeStripContainerLayout(
  spacing: ThemeTokens['spacing']
): Pick<ViewStyle, 'height' | 'justifyContent' | 'paddingHorizontal'> {
  return {
    height: bottomChromeStripHeight(spacing),
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  };
}
