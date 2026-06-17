import { describe, expect, it } from 'vitest';

import type { EmbedListRow } from '../embedListTypes';
import {
  resolveEmbedListDefaultRow,
  resolveEmbedListInitialRow,
} from '../resolveEmbedListDefaultRow';

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

describe('resolveEmbedListInitialRow', () => {
  it('uses playIdTextOverrideRow when play_id_text is not on the loaded page', () => {
    const rows = [row('first'), row('second')];
    const overrideRow = row('off-page');

    expect(resolveEmbedListInitialRow(rows, 'off-page', overrideRow)?.playIdText).toBe('off-page');
  });

  it('prefers a loaded row over override when play_id_text is on the page', () => {
    const rows = [row('first'), row('second')];
    const overrideRow = row('second-override');

    expect(resolveEmbedListInitialRow(rows, 'second', overrideRow)?.playIdText).toBe('second');
  });

  it('returns override row when the list is empty and play_id_text is set', () => {
    const overrideRow = row('only-track');

    expect(resolveEmbedListInitialRow([], 'only-track', overrideRow)?.playIdText).toBe(
      'only-track'
    );
  });
});
