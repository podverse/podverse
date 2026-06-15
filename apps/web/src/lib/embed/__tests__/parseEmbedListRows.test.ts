import { describe, expect, it } from 'vitest';

import {
  EMBED_LIST_VISIBLE_ROWS_DEFAULT,
  EMBED_LIST_VISIBLE_ROWS_MAX,
  EMBED_LIST_VISIBLE_ROWS_MIN,
  parseEmbedListRows,
} from '../parseEmbedListRows';

describe('parseEmbedListRows', () => {
  it('returns defaults for undefined and invalid values', () => {
    expect(parseEmbedListRows(undefined)).toBe(EMBED_LIST_VISIBLE_ROWS_DEFAULT);
    expect(parseEmbedListRows('invalid')).toBe(EMBED_LIST_VISIBLE_ROWS_DEFAULT);
  });

  it('clamps lower and upper bounds', () => {
    expect(parseEmbedListRows('1')).toBe(EMBED_LIST_VISIBLE_ROWS_MIN);
    expect(parseEmbedListRows('99')).toBe(EMBED_LIST_VISIBLE_ROWS_MAX);
  });

  it('parses in-range values', () => {
    expect(parseEmbedListRows('2')).toBe(2);
    expect(parseEmbedListRows('5')).toBe(5);
    expect(parseEmbedListRows('10')).toBe(10);
  });
});
