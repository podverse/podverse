import { DATABASE_CONSTANTS } from './constants/databaseConstants.js';

export const PLAYLIST_TAG_NAME_MAX_LENGTH = DATABASE_CONSTANTS.varchar_short;

export const PLAYLIST_TAG_MAX_PER_PLAYLIST = 5;

/** Highest `smallint`, matching `playlist_tag_assignment.list_position`. */
export const PLAYLIST_TAG_MAX_PER_PLAYLIST_ENV_CEILING = 32767;

export const PLAYLIST_TAG_SEARCH_LIMIT = 10;

const WHITESPACE_RUN = /\s+/g;
const LIKE_SPECIAL = /[\\%_]/g;

/** C0 controls and DEL become spaces so the whitespace collapse can drop them. */
function replaceControlCharacters(value: string): string {
  let result = '';
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    result += code <= 0x1f || code === 0x7f ? ' ' : value.charAt(index);
  }
  return result;
}

export type NormalizePlaylistTagNameResult =
  { ok: true; name: string } | { ok: false; reason: 'empty' | 'too_long' };

export type NormalizePlaylistTagListResult =
  { ok: true; tags: string[] } | { ok: false; reason: 'too_many' | 'too_long' };

export type PlaylistTagListLimits = {
  maxCount?: number;
  maxLength?: number;
};

export function playlistTagCountLimitMessage(maxCount: number): string {
  return `A playlist has at most ${maxCount} tags.`;
}

export function playlistTagNameLengthLimitMessage(maxLength: number): string {
  return `A tag is at most ${maxLength} characters.`;
}

/** Trim, collapse whitespace, and fold case with `toLowerCase()` (no locale). */
export function normalizePlaylistTagName(
  raw: string,
  maxLength: number = PLAYLIST_TAG_NAME_MAX_LENGTH
): NormalizePlaylistTagNameResult {
  const name = replaceControlCharacters(raw).replace(WHITESPACE_RUN, ' ').trim().toLowerCase();
  if (name.length === 0) {
    return { ok: false, reason: 'empty' };
  }
  if (name.length > maxLength) {
    return { ok: false, reason: 'too_long' };
  }
  return { ok: true, name };
}

/**
 * Drops blank names and later copies of a repeated name.
 * `raw.length` above the count limit is `too_many` before blanks are dropped.
 * Any name past the length limit is `too_long`.
 */
export function normalizePlaylistTagList(
  raw: readonly string[],
  limits?: PlaylistTagListLimits
): NormalizePlaylistTagListResult {
  const maxCount = limits?.maxCount ?? PLAYLIST_TAG_MAX_PER_PLAYLIST;
  const maxLength = limits?.maxLength ?? PLAYLIST_TAG_NAME_MAX_LENGTH;
  if (raw.length > maxCount) {
    return { ok: false, reason: 'too_many' };
  }

  const tags: string[] = [];
  const seen = new Set<string>();
  for (const entry of raw) {
    const normalized = normalizePlaylistTagName(entry, maxLength);
    if (!normalized.ok) {
      if (normalized.reason === 'too_long') {
        return { ok: false, reason: 'too_long' };
      }
      continue;
    }
    if (seen.has(normalized.name)) {
      continue;
    }
    seen.add(normalized.name);
    tags.push(normalized.name);
  }

  return { ok: true, tags };
}

/** Prefixes `\`, `%`, and `_` with `\`. Does not add the trailing wildcard. */
export function escapePlaylistTagLikePrefix(folded: string): string {
  return folded.replace(LIKE_SPECIAL, (character) => `\\${character}`);
}
