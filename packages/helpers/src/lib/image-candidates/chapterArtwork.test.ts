import { describe, expect, it } from 'vitest';

import {
  chapterSectionHasImages,
  resolveActiveChapterImageUrl,
  resolveChapterImageUrl,
  resolveChapterRowArtwork,
} from './chapterArtwork.js';

describe('resolveChapterImageUrl', () => {
  it('returns a trimmed URL and treats blank values as missing', () => {
    expect(resolveChapterImageUrl('https://x.test/c.jpg')).toBe('https://x.test/c.jpg');
    expect(resolveChapterImageUrl('  https://x.test/c.jpg  ')).toBe('https://x.test/c.jpg');
    expect(resolveChapterImageUrl('   ')).toBeNull();
    expect(resolveChapterImageUrl(null)).toBeNull();
    expect(resolveChapterImageUrl(undefined)).toBeNull();
  });
});

describe('chapterSectionHasImages', () => {
  it('is true when any chapter has an image', () => {
    expect(
      chapterSectionHasImages([{ img: null }, { img: 'https://x.test/c.jpg' }, { img: '' }])
    ).toBe(true);
    expect(chapterSectionHasImages([{ img: null }, { img: '  ' }])).toBe(false);
    expect(chapterSectionHasImages([])).toBe(false);
  });
});

describe('resolveChapterRowArtwork', () => {
  it('hides every row when the section has no images', () => {
    expect(
      resolveChapterRowArtwork({ img: 'https://x.test/c.jpg' }, 'https://item.test/i.jpg', false)
    ).toEqual({ show: false });
  });

  it('uses chapter image, then fallback, when the section has images', () => {
    expect(
      resolveChapterRowArtwork({ img: 'https://x.test/c.jpg' }, 'https://item.test/i.jpg', true)
    ).toEqual({ show: true, uri: 'https://x.test/c.jpg' });
    expect(resolveChapterRowArtwork({ img: null }, 'https://item.test/i.jpg', true)).toEqual({
      show: true,
      uri: 'https://item.test/i.jpg',
    });
    expect(resolveChapterRowArtwork({ img: null }, null, true)).toEqual({
      show: true,
      uri: null,
    });
  });
});

describe('resolveActiveChapterImageUrl', () => {
  it('prefers the active chapter image, then the matching list row', () => {
    expect(
      resolveActiveChapterImageUrl({ id_text: 'ch-1', img: 'https://active.test/a.jpg' }, [
        { id_text: 'ch-1', img: 'https://list.test/l.jpg' },
      ])
    ).toBe('https://active.test/a.jpg');
    expect(
      resolveActiveChapterImageUrl({ id_text: 'ch-1', img: null }, [
        { id_text: 'ch-1', img: 'https://list.test/l.jpg' },
      ])
    ).toBe('https://list.test/l.jpg');
    expect(resolveActiveChapterImageUrl({ id_text: 'ch-1', img: null }, [])).toBeNull();
    expect(
      resolveActiveChapterImageUrl(null, [{ id_text: 'ch-1', img: 'https://x.test/c.jpg' }])
    ).toBeNull();
  });
});
