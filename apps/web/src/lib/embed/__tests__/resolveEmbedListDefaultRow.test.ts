import { describe, expect, it } from 'vitest';

import type { EmbedListRow } from '../embedListTypes';
import { resolveEmbedListDefaultRow } from '../resolveEmbedListDefaultRow';

const row = (playIdText: string): EmbedListRow => ({
  rowKey: playIdText,
  playIdText,
  listLabel: playIdText,
  channel: { id: 1, id_text: 'ch', title: 'Channel' } as EmbedListRow['channel'],
  item: { id: 1, id_text: playIdText, title: playIdText } as EmbedListRow['item'],
  clip: null,
  itemChapter: null,
  itemSoundbite: null,
  mediaType: 'audio',
});

describe('resolveEmbedListDefaultRow', () => {
  it('returns the first row when play_id_text is absent', () => {
    const rows = [row('first'), row('second')];

    expect(resolveEmbedListDefaultRow(rows, null)?.playIdText).toBe('first');
  });

  it('returns the matching row when play_id_text is present', () => {
    const rows = [row('first'), row('second')];

    expect(resolveEmbedListDefaultRow(rows, 'second')?.playIdText).toBe('second');
  });

  it('falls back to the first row when play_id_text is invalid', () => {
    const rows = [row('first'), row('second')];

    expect(resolveEmbedListDefaultRow(rows, 'missing')?.playIdText).toBe('first');
  });
});
