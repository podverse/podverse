import type { ViewStyle } from 'react-native';

import type { ThemeTokens } from '@podverse/design-tokens';

/**
 * Square edge length for media list-row artwork (`HomeFeedRow`, podroll, and peers). Keep this the
 * single source so a density change does not leave one list at a different size.
 */
export const LIST_ROW_ARTWORK_SIZE = 60;

/**
 * Hit target for icon-only controls (outlined Play / More, bare Download, and peers). Matches
 * `Button` `size="sm"` + `iconOnly` so bordered and borderless faces share one finger target.
 */
export const LIST_ROW_ACTION_SIZE = 36;

/** Glyph size inside {@link LIST_ROW_ACTION_SIZE} controls. */
export const LIST_ROW_ACTION_ICON_SIZE = 18;

/**
 * Horizontal gap between leading square artwork and the text/actions column.
 *
 * Used by media list rows, channel headers, and mini-player chrome so those surfaces stay aligned.
 * Prefer this helper over a raw `tokens.spacing.*` pick at each callsite.
 */
export function listRowArtworkGap(spacing: ThemeTokens['spacing']): number {
  return spacing.base;
}

/**
 * Vertical gap between stacked blocks under a channel header (header → chips → filter). One value
 * so those seams do not drift independently.
 */
export function listHeaderStackGap(spacing: ThemeTokens['spacing']): number {
  return spacing.lg;
}

/**
 * Page-body gutter under HeaderBar and around screen lists: `spacing.lg` above the first content
 * and on both sides. Internal gaps (input → results, row → row) stay on the screen.
 */
export function screenBodyInsets(
  spacing: ThemeTokens['spacing']
): Pick<ViewStyle, 'paddingHorizontal' | 'paddingTop'> {
  return {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  };
}
