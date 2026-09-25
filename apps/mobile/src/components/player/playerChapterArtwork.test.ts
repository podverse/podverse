import { describe, expect, it } from 'vitest';

import type { DTOItemChapter } from '@podverse/helpers/dto';

import { resolvePlayerChapterArtworkUri } from './playerChapterArtwork';

const chapter: DTOItemChapter = {
  data_hash: 'h',
  end_time: '60',
  id: 1,
  id_text: 'ch-1',
  img: 'https://chapter.test/c.jpg',
  item_chapters_feed_id: 1,
  start_time: '0',
  table_of_contents: true,
};

describe('resolvePlayerChapterArtworkUri', () => {
  it('replaces item art when the active chapter has an image', () => {
    expect(
      resolvePlayerChapterArtworkUri({
        activeChapter: chapter,
        chapters: [chapter],
        fallbackUri: 'https://item.test/i.jpg',
        mpClip: null,
        mpItemSoundbite: null,
      })
    ).toBe('https://chapter.test/c.jpg');
  });

  it('keeps item art when the chapter has no image', () => {
    expect(
      resolvePlayerChapterArtworkUri({
        activeChapter: { ...chapter, img: null },
        chapters: [{ ...chapter, img: null }],
        fallbackUri: 'https://item.test/i.jpg',
        mpClip: null,
        mpItemSoundbite: null,
      })
    ).toBe('https://item.test/i.jpg');
  });

  it('does not swap art while a clip is the target', () => {
    expect(
      resolvePlayerChapterArtworkUri({
        activeChapter: chapter,
        chapters: [chapter],
        fallbackUri: 'https://item.test/i.jpg',
        mpClip: {},
        mpItemSoundbite: null,
      })
    ).toBe('https://item.test/i.jpg');
  });
});
