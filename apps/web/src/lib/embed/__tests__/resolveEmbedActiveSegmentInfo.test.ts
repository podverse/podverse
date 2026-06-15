import { describe, expect, it } from 'vitest';

import type { DTOClip } from '@podverse/helpers';
import type { DTOItemChapter } from '@podverse/helpers';
import type { DTOItemSoundbite } from '@podverse/helpers';

import { resolveEmbedActiveSegmentInfo } from '../resolveEmbedActiveSegmentInfo';

const baseChapter: DTOItemChapter = {
  id: 1,
  id_text: 'ch1',
  item_chapters_feed_id: 1,
  data_hash: 'hash',
  start_time: '120',
  end_time: '300',
  title: 'Middle Chapter',
  table_of_contents: false,
};

const baseClip: DTOClip = {
  id: 2,
  id_text: 'clip1',
  account: { id: 1, id_text: 'acc1' } as DTOClip['account'],
  item_id: 'item1',
  item: {} as DTOClip['item'],
  start_time: '30',
  end_time: '120',
  title: 'Sample Clip',
  sharable_status: { id: 1 } as DTOClip['sharable_status'],
};

const baseSoundbite: DTOItemSoundbite = {
  id: 3,
  id_text: 'sb1',
  item_id: 1,
  start_time: '10',
  duration: '45',
  title: 'Official Clip',
};

describe('resolveEmbedActiveSegmentInfo', () => {
  it('prefers clip over chapter and soundbite', () => {
    const result = resolveEmbedActiveSegmentInfo({
      currentTimeSeconds: 150,
      fallbackChapter: null,
      fallbackClip: null,
      fallbackSoundbite: null,
      hasPlayerContent: true,
      mpClip: baseClip,
      mpItemChapter: baseChapter,
      mpItemChapters: [baseChapter],
      mpItemSoundbite: baseSoundbite,
    });

    expect(result).toEqual({
      title: 'Sample Clip',
      startSeconds: 30,
      endSeconds: 120,
    });
  });

  it('uses soundbite when no clip is active', () => {
    const result = resolveEmbedActiveSegmentInfo({
      currentTimeSeconds: 0,
      fallbackChapter: null,
      fallbackClip: null,
      fallbackSoundbite: null,
      hasPlayerContent: true,
      mpClip: null,
      mpItemChapter: null,
      mpItemChapters: null,
      mpItemSoundbite: baseSoundbite,
    });

    expect(result).toEqual({
      title: 'Official Clip',
      startSeconds: 10,
      endSeconds: 55,
    });
  });

  it('resolves chapter from playhead when chapters are loaded', () => {
    const result = resolveEmbedActiveSegmentInfo({
      currentTimeSeconds: 150,
      fallbackChapter: null,
      fallbackClip: null,
      fallbackSoundbite: null,
      hasPlayerContent: true,
      mpClip: null,
      mpItemChapter: null,
      mpItemChapters: [baseChapter],
      mpItemSoundbite: null,
    });

    expect(result).toEqual({
      title: 'Middle Chapter',
      startSeconds: 120,
      endSeconds: 300,
    });
  });

  it('returns null when no segment has a title', () => {
    const chapterWithoutTitle: DTOItemChapter = { ...baseChapter, title: '  ' };

    const result = resolveEmbedActiveSegmentInfo({
      currentTimeSeconds: 150,
      fallbackChapter: chapterWithoutTitle,
      fallbackClip: null,
      fallbackSoundbite: null,
      hasPlayerContent: false,
      mpClip: null,
      mpItemChapter: null,
      mpItemChapters: null,
      mpItemSoundbite: null,
    });

    expect(result).toBeNull();
  });

  it('uses fallback clip before player content is ready', () => {
    const result = resolveEmbedActiveSegmentInfo({
      currentTimeSeconds: 0,
      fallbackChapter: null,
      fallbackClip: baseClip,
      fallbackSoundbite: null,
      hasPlayerContent: false,
      mpClip: null,
      mpItemChapter: null,
      mpItemChapters: null,
      mpItemSoundbite: null,
    });

    expect(result).toEqual({
      title: 'Sample Clip',
      startSeconds: 30,
      endSeconds: 120,
    });
  });

  it('omits segment info after clip end when player is loaded', () => {
    const result = resolveEmbedActiveSegmentInfo({
      currentTimeSeconds: 121,
      fallbackChapter: null,
      fallbackClip: baseClip,
      fallbackSoundbite: null,
      hasPlayerContent: true,
      mpClip: null,
      mpItemChapter: null,
      mpItemChapters: null,
      mpItemSoundbite: null,
    });

    expect(result).toBeNull();
  });
});
