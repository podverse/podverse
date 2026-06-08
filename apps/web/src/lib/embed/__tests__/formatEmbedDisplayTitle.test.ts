import { describe, expect, it } from 'vitest';

import type { EmbedSingleResourcePayload } from '../fetchEmbedSingleResource';
import { formatEmbedDisplayTitle } from '../formatEmbedDisplayTitle';

const basePayload = (): EmbedSingleResourcePayload => ({
  channel: { id: 1, id_text: 'ch', title: 'Channel' } as EmbedSingleResourcePayload['channel'],
  item: { id: 1, id_text: 'item', title: 'Episode Title' } as EmbedSingleResourcePayload['item'],
  clip: null,
  itemChapter: null,
  itemSoundbite: null,
});

describe('formatEmbedDisplayTitle', () => {
  it('appends chapter title to item title with em dash', () => {
    const resource = basePayload();
    resource.itemChapter = {
      id_text: 'chap',
      title: 'Chapter One',
    } as EmbedSingleResourcePayload['itemChapter'];

    expect(formatEmbedDisplayTitle(resource)).toBe('Episode Title — Chapter One');
  });

  it('uses clip title when present', () => {
    const resource = basePayload();
    resource.clip = { id_text: 'clip', title: 'Clip Title' } as EmbedSingleResourcePayload['clip'];

    expect(formatEmbedDisplayTitle(resource)).toBe('Clip Title');
  });
});
