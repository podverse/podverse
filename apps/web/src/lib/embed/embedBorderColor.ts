export const EMBED_BORDER_COLOR_PRESET_KEYS = [
  'black',
  'darker-gray',
  'lighter-gray',
  'white',
  'none',
] as const;

export type EmbedBorderColorPresetKey = (typeof EMBED_BORDER_COLOR_PRESET_KEYS)[number];

/**
 * Resolved CSS color for each preset. `none` is a sentinel meaning "no border".
 * These map to the radio options offered in the embed builder.
 */
export const EMBED_BORDER_COLOR_PRESET_VALUES: Record<EmbedBorderColorPresetKey, string> = {
  black: '#000000',
  'darker-gray': '#444444',
  'lighter-gray': '#888888',
  white: '#ffffff',
  none: 'none',
};

/** Builder default: darker gray. */
export const DEFAULT_EMBED_BORDER_COLOR = EMBED_BORDER_COLOR_PRESET_VALUES['darker-gray'];

/** Border width applied by the copy/paste embed code when a color is selected. */
export const EMBED_BORDER_WIDTH = '1px';

// Only allow characters that can appear in a CSS color (hex, rgb()/rgba()/hsl(),
// named colors). This keeps a user-typed custom value from breaking out of the
// inline style attribute in the generated iframe HTML.
const SAFE_EMBED_BORDER_COLOR_PATTERN = /^[#A-Za-z0-9(),.%\s]+$/;
const MAX_EMBED_BORDER_COLOR_LENGTH = 64;

/**
 * Normalize a stored/typed border color into a value safe to inline in the
 * generated iframe HTML. Empty stays empty (treated as no border); `none` is
 * preserved; anything with unexpected characters falls back to the default.
 */
export function sanitizeEmbedBorderColor(value: string): string {
  const trimmed = value.trim();
  if (trimmed === '') {
    return '';
  }

  if (trimmed.length > MAX_EMBED_BORDER_COLOR_LENGTH) {
    return DEFAULT_EMBED_BORDER_COLOR;
  }

  if (!SAFE_EMBED_BORDER_COLOR_PATTERN.test(trimmed)) {
    return DEFAULT_EMBED_BORDER_COLOR;
  }

  return trimmed;
}

/**
 * Build the CSS `border` value for the embed copy/paste code, or `null` when no
 * border should be applied (the `none` preset or an empty custom value).
 */
export function buildEmbedBorderStyleValue(borderColor: string): string | null {
  const sanitized = sanitizeEmbedBorderColor(borderColor);
  if (sanitized === '' || sanitized.toLowerCase() === 'none') {
    return null;
  }

  return `${EMBED_BORDER_WIDTH} solid ${sanitized}`;
}

/**
 * Return the preset key matching the given color, or `null` when the value is a
 * custom color. Used by the builder to highlight the active radio option.
 */
export function resolveEmbedBorderPresetKey(borderColor: string): EmbedBorderColorPresetKey | null {
  const normalized = borderColor.trim().toLowerCase();
  for (const key of EMBED_BORDER_COLOR_PRESET_KEYS) {
    if (EMBED_BORDER_COLOR_PRESET_VALUES[key].toLowerCase() === normalized) {
      return key;
    }
  }

  return null;
}
