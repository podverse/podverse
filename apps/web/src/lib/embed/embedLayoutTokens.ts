/**
 * Canonical embed layout literals at 16px root (--spacing-lg = 16, --spacing-md = 8).
 * Keep in sync with apps/web/src/styles/components/embed/_embedLayoutTokens.scss.
 */
export const EMBED_ROOT_FONT_SIZE_PX = 16;

export const EMBED_PANEL_PADDING_BLOCK_PX = 16;
/** Vertical gap between embed player info (art/titles) and controls / video placeholder. */
export const EMBED_PLAYER_INFO_CONTROLS_GAP_PX = 8;

/** @deprecated Use EMBED_PLAYER_INFO_CONTROLS_GAP_PX */
export const EMBED_PANEL_SECTION_GAP_PX = EMBED_PLAYER_INFO_CONTROLS_GAP_PX;

export const EMBED_PLAYER_ART_SIZE_PX = 78;
export const EMBED_PLAY_BUTTON_SIZE_REM = 3;
export const EMBED_PLAY_BUTTON_SIZE_PX = EMBED_PLAY_BUTTON_SIZE_REM * EMBED_ROOT_FONT_SIZE_PX;

export const EMBED_SINGLE_VIDEO_PLACEHOLDER_PX = 334;
export const EMBED_LIST_VIDEO_REFERENCE_WIDTH_PX = 640;
export const EMBED_LIST_VIDEO_PLACEHOLDER_PX = 360;
export const EMBED_VIDEO_OVERLAY_FADE_DURATION_MS = 1000;
export const EMBED_VIDEO_OVERLAY_TRANSITION_MS = 300;

export const EMBED_PRESENTATION_SELECTOR_HEIGHT_PX = 52;

/** Bottom controls overlay strip in video embed (progress + transport). */
export const EMBED_CONTROLS_OVERLAY_HEIGHT_PX = 60;

/** Segment info bar (chapter / clip / soundbite) flush above bottom controls in video embed. */
export const EMBED_SEGMENT_INFO_BAR_HEIGHT_PX = 28;

/** Matches global --text-line-height (1.35) at 16px root. */
export const EMBED_TEXT_LINE_HEIGHT = 1.35;
/** Vertical padding on each list row (--spacing-md, one side). */
export const EMBED_LIST_ROW_PADDING_BLOCK_PX = 8;
/** Gap between title and meta in list row content (--spacing-sm). */
export const EMBED_LIST_ROW_INNER_GAP_PX = 4;
/** Title line uses --font-size-base (1rem). */
export const EMBED_LIST_ROW_TITLE_FONT_SIZE_PX = 16;
/** Matches $embed-meta-line-min-height (1.25rem). */
export const EMBED_META_LINE_MIN_HEIGHT_PX = 20;

/** Derived from EmbedListRow.module.scss layout (padding + title + gap + meta). */
export const EMBED_LIST_ROW_HEIGHT_PX =
  EMBED_LIST_ROW_PADDING_BLOCK_PX * 2 +
  Math.round(EMBED_LIST_ROW_TITLE_FONT_SIZE_PX * EMBED_TEXT_LINE_HEIGHT) +
  EMBED_LIST_ROW_INNER_GAP_PX +
  EMBED_META_LINE_MIN_HEIGHT_PX;

export const EMBED_LIST_VISIBLE_ROWS_DEFAULT = 5;
