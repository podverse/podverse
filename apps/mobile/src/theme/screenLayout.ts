import type { ViewStyle } from 'react-native';

import type { ThemeTokens } from '@podverse/design-tokens';

/**
 * Square edge length for media list-row artwork (`HomeFeedRow`, podroll, and peers). Keep this the
 * single source so a density change does not leave one list at a different size.
 */
export const LIST_ROW_ARTWORK_SIZE = 78;

/**
 * Square edge for the in-app banner thumbnail. A little taller than one title line plus the
 * time line: body 21, the xs gap, and caption 16.
 */
export const NOTIFICATION_ARTWORK_SIZE = 44;

/**
 * Square edge for an inbox row. Two body lines, the xs gap, the caption, and a little extra
 * so the art covers that stack. The banner stays on `NOTIFICATION_ARTWORK_SIZE`.
 */
export const NOTIFICATION_INBOX_ARTWORK_SIZE = 64;

/**
 * Inset above and below the artwork on a podcast, album, or artist row. With
 * `LIST_ROW_ARTWORK_SIZE` the row is 98pt: the date, title, and footer sit inside the artwork,
 * and each hairline sits this far from the art.
 */
export const LIST_ROW_SHOW_VERTICAL_INSET = 10;

/**
 * Square edge of a stacked preview cover. The view size and `CoverImage` `decodeEdge` both read
 * this.
 */
export const PREVIEW_IDENTITY_ARTWORK_EDGE = 160;

/**
 * Caps the item-detail (episode / track / livestream) header square on tablet. Phone uses the
 * full window width. Same number as the full-player tablet artwork cap so the two large squares
 * stay aligned without the header importing the player layout module.
 */
export const ITEM_DETAIL_ARTWORK_MAX_TABLET = 520;

/**
 * Painted edge of the item-detail header square. Phone is edge-to-edge; tablet is capped and
 * centered in the page column.
 */
export function itemDetailArtworkEdge(windowWidth: number, isTablet: boolean): number {
  if (isTablet) {
    return Math.min(ITEM_DETAIL_ARTWORK_MAX_TABLET, windowWidth);
  }
  return windowWidth;
}

/**
 * Hit target for icon-only row controls (Play circle, More, Download / trash). Matches legacy
 * TimeRemainingWidget / MoreButton (44) so bordered and bare faces share one finger target.
 */
export const LIST_ROW_ACTION_SIZE = 44;

/**
 * Form, dialog, and checkout decision buttons. 52pt is above the 44pt tap floor and below an
 * eyebrow field (~66pt), with room for a 17pt label.
 */
export const FORM_BUTTON_MIN_HEIGHT = 52;

/**
 * Glyph size for bare icon controls (More, Download, trash). Slightly under the hit target so the
 * icon reads clearly without looking cramped — same optical weight for More and trash.
 */
export const LIST_ROW_ACTION_ICON_SIZE = 26;

/**
 * Channel-header settings gear. One step under the stack-header glyph so the icon can sit on the
 * title's top edge beside a two-line name.
 */
export const CHANNEL_HEADER_SETTINGS_ICON_SIZE = 22;

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
export const MINI_PLAYER_ARTWORK_SIZE = 60;

/**
 * The mini player's playhead doubles as its top border, so it is the only thing between the bar and
 * whatever stacks above it.
 */
export const MINI_PLAYER_PROGRESS_EDGE_HEIGHT = 2;

/**
 * Vertical padding for a text-bearing list row. Top and bottom are the same value so artwork and
 * text sit in an even band. See even-content-spacing.
 */
export function listRowVerticalPadding(
  padding: number
): Pick<ViewStyle, 'paddingTop' | 'paddingBottom'> {
  return {
    paddingBottom: padding,
    paddingTop: padding,
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
 * Space from the identity block down to an item description. The description is full width, so
 * this is the minimum clearance under the artwork when the paragraph wraps beneath it. Same
 * width as the gap beside the artwork.
 */
export function listRowDescriptionGap(spacing: ThemeTokens['spacing']): number {
  return spacing.base;
}

/** Cover to title on a stacked preview. The cover is a block, so the seam is the page gutter. */
export function previewIdentityArtworkGap(spacing: ThemeTokens['spacing']): number {
  return spacing.lg;
}

/** Title to the author byline on a stacked preview. */
export function previewIdentityBylineGap(spacing: ThemeTokens['spacing']): number {
  return spacing.base;
}

/**
 * Seam above the description paragraph on a stacked preview. It sits under the author, or under
 * the title when the author is absent.
 */
export function previewIdentityDescriptionGap(spacing: ThemeTokens['spacing']): number {
  return spacing.xl;
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
 * screens cannot omit it. Same distance as `listFilterContentGap`, which is the space from a
 * filter field down to the first row or tile, so the field sits equally between the chips and
 * that content.
 */
export function listChipRowBottomGap(spacing: ThemeTokens['spacing']): number {
  return listFilterContentGap(spacing);
}

/**
 * Horizontal space between chips in a row (`SectionChip`, `MenuSelectChip`, `OptionChipGroup`).
 * Between `spacing.sm` (4) and `spacing.md` (8), so it is not a scale step.
 */
export function chipRowGap(): number {
  return 6;
}

/**
 * `marginBottom` for a `ListFilterHeader` so the visual gap from the field to the first row or tile
 * equals `listFilterContentGap`, after subtracting top padding the next content already carries.
 * Put it on the header wrapper, not the field. The header's own `paddingBottom` (only when content
 * follows) is that same gap above the first row or tile. A list row's top hairline sits at the
 * bottom of that gap. The header does not paint the line.
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

/**
 * Extra margin above a disclosure that follows prose. The last paragraph already carries
 * `spacing.lg` below it, so this second `spacing.lg` opens the seam to `spacing['4xl']` — the
 * same width as `formActionsTopGap` under the disclosure. Do not add `formActionsTopGap` here;
 * that stacks on the paragraph margin and leaves the card too far from the reading.
 */
export function proseDisclosureGap(spacing: ThemeTokens['spacing']): number {
  return spacing.md;
}

/**
 * Seam above an agreement checkbox and the action column, and between those two. Wider than
 * in-body gaps so the decision reads apart from the reading. A disclosure that follows prose
 * uses `proseDisclosureGap` instead, which reaches this same width once the paragraph margin
 * is counted.
 */
export function formActionsTopGap(spacing: ThemeTokens['spacing']): number {
  return spacing['4xl'];
}

/**
 * Space between stacked full-width CTAs on a static form-style screen, including the gap
 * inside `FormActions`. Tighter than the content→actions seam; wider than in-body prose gaps.
 */
export function formActionsGap(spacing: ThemeTokens['spacing']): number {
  return spacing.lg;
}

/** Space between settings cards. */
export function settingsCardGap(spacing: ThemeTokens['spacing']): number {
  return spacing['2xl'];
}

/**
 * Column gap inside a settings card, from the heading to the description to the button.
 * Apply it as `gap` so a missing description leaves no margin behind.
 */
export function settingsCardInnerGap(spacing: ThemeTokens['spacing']): number {
  return spacing.lg;
}
