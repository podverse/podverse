import { parsePlaybackSeconds } from '../playback/parsePlaybackSeconds';

export const EMBED_LIST_VISIBLE_ROWS_MIN = 2;
export const EMBED_LIST_VISIBLE_ROWS_MAX = 10;
export const EMBED_LIST_VISIBLE_ROWS_DEFAULT = 5;

export function parseEmbedListRows(value: unknown): number {
  const parsed = parsePlaybackSeconds(value);
  if (parsed === undefined) {
    return EMBED_LIST_VISIBLE_ROWS_DEFAULT;
  }

  const rows = Math.floor(parsed);
  if (rows < EMBED_LIST_VISIBLE_ROWS_MIN) {
    return EMBED_LIST_VISIBLE_ROWS_MIN;
  }
  if (rows > EMBED_LIST_VISIBLE_ROWS_MAX) {
    return EMBED_LIST_VISIBLE_ROWS_MAX;
  }

  return rows;
}
