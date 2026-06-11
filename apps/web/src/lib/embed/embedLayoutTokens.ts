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
export const EMBED_LIST_VIDEO_PLACEHOLDER_PX = 234;

export const EMBED_LIST_REGION_AUDIO_PX = 588;
export const EMBED_LIST_REGION_VIDEO_PX = 542;
