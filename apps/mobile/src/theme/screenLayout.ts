import type { ViewStyle } from 'react-native';

import type { ThemeTokens } from '@podverse/design-tokens';

/**
 * Square edge length for media list-row artwork (`HomeFeedRow`, podroll, and peers). Keep this the
 * single source so a density change does not leave one list at a different size.
 */
export const LIST_ROW_ARTWORK_SIZE = 60;

/**
 * Hit target for icon-only row controls (Play circle, More, Download / trash). Matches legacy
 * TimeRemainingWidget / MoreButton (44) so bordered and bare faces share one finger target.
 */
export const LIST_ROW_ACTION_SIZE = 44;

/**
 * Glyph size for bare icon controls (More, Download, trash). Slightly under the hit target so the
 * icon reads clearly without looking cramped — same optical weight for More and trash.
 */
export const LIST_ROW_ACTION_ICON_SIZE = 26;

/**
 * Glyph size for the Play / Pause triangle inside the glowing circle. Smaller than bare-row glyphs
 * on purpose: legacy keeps the play mark compact inside the ring.
 */
export const LIST_ROW_PLAY_ICON_SIZE = 16;

/**
 * Diameter of the player's play / pause circle (`Button` size `xl`). Larger than any list-row
 * control because it is the one target a listener reaches for without looking.
 */
export const PLAYER_TRANSPORT_CIRCLE_SIZE = 64;

/**
 * Mini-player artwork edge, which is also the height of the bar's content row: the image is flush
 * left and spans the full row, so the bar's height and its artwork are one number.
 */
export const MINI_PLAYER_ARTWORK_SIZE = 56;

/**
 * The mini player's playhead doubles as its top border, so it is the only thing between the bar and
 * whatever stacks above it.
 */
export const MINI_PLAYER_PROGRESS_EDGE_HEIGHT = 2;

/**
 * Extra bottom padding on text-bearing list rows (dp). System fonts leave more empty air above ink
 * inside the line box than below, so equal `paddingVertical` reads top-heavy. Add this to the bottom
 * only — do not put it on every `Text`, grid tiles, or icon-only rows.
 */
export const LIST_ROW_OPTICAL_BOTTOM_EXTRA = 2;

/**
 * Vertical padding for a text-bearing list row: equal token top, bottom = top + optical extra.
 */
export function listRowVerticalPadding(
  paddingTop: number
): Pick<ViewStyle, 'paddingTop' | 'paddingBottom'> {
  return {
    paddingBottom: paddingTop + LIST_ROW_OPTICAL_BOTTOM_EXTRA,
    paddingTop,
  };
}

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
 * Vertical gap between stacked blocks under a channel header (header → chips → next). One value
 * so those seams do not drift independently. Prefer **`listChipRowBottomGap`** for space *below*
 * a chip row — that gap lives on `SectionChipRow` itself.
 */
export function listHeaderStackGap(spacing: ThemeTokens['spacing']): number {
  return spacing.lg;
}

/**
 * Target distance from a `ListFilterField` bottom edge to the first content below it (list-row
 * artwork or grid tile). Midway between a bare filter margin (tight grid) and filter margin plus
 * list-row top padding (loose list). Prefer this over a raw `spacing.md` / `spacing.lg` pick.
 */
export function listFilterContentGap(spacing: ThemeTokens['spacing']): number {
  return spacing.base;
}

/**
 * Space below a `SectionChipRow` / `MediaTypeSelector` before the next block (filter, list, about
 * prose). Applied as the row's own `paddingBottom` so every chip surface shares one seam and
 * screens cannot omit it. Three-quarters of `listFilterContentGap`.
 */
export function listChipRowBottomGap(spacing: ThemeTokens['spacing']): number {
  return Math.round(listFilterContentGap(spacing) * 0.75);
}

/**
 * `marginBottom` for a `ListFilterHeader` so the **visual** gap *below* the hairline equals
 * `listFilterContentGap`, after subtracting top padding the first row/tile already carries. Put it
 * on the header wrapper, not the field. The header's own `paddingBottom` keeps the same gap
 * *above* the hairline so the line does not sit on the field border.
 *
 * List rows that use `listRowVerticalPadding(spacing.base)` pass `spacing.base`; grid tiles with no
 * top padding pass `0`.
 */
export function listFilterFieldBottomMargin(
  spacing: ThemeTokens['spacing'],
  nextContentTopPadding = 0
): number {
  return Math.max(0, listFilterContentGap(spacing) - nextContentTopPadding);
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
