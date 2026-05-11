import { describe, expect, it } from 'vitest';

import {
  appendDistinctImageCandidate,
  buildDTOChannelImageHeroLoadCandidates,
  buildDTOChannelImageLoadCandidates,
  buildDTOItemImageHeroLoadCandidates,
  buildDTOItemImageLoadCandidates,
  findDTOItemImageForList,
  mergeDTOItemThenChannelImageCandidates,
  mergeDTOItemThenChannelImageHeroCandidates,
  prependDistinctImageCandidate,
} from './image.js';

describe('buildDTOItemImageLoadCandidates', () => {
  it('returns empty array when there are no images', () => {
    expect(buildDTOItemImageLoadCandidates(undefined, 300, 'lesser')).toEqual([]);
    expect(buildDTOItemImageLoadCandidates(null, 300, 'lesser')).toEqual([]);
    expect(buildDTOItemImageLoadCandidates([], 300, 'lesser')).toEqual([]);
  });

  it('returns a single URL when only a resized row exists', () => {
    const cdn = 'https://cdn.example.com/images/item/1/a-w300-c1a2b3c4.webp';
    const images = [
      {
        url: cdn,
        image_width_size: 300,
        is_resized: true,
      },
    ];
    expect(buildDTOItemImageLoadCandidates(images, 300, 'lesser')).toEqual([cdn]);
  });

  it('orders resized list pick first then non-resized fallback when both exist', () => {
    const cdn = 'https://cdn.example.com/images/item/1/a-w300-c1a2b3c4.webp';
    const original = 'https://example.com/episode-original.jpg';
    const images = [
      {
        url: cdn,
        image_width_size: 300,
        is_resized: true,
      },
      {
        url: original,
        image_width_size: 600,
        is_resized: false,
      },
    ];
    const got = buildDTOItemImageLoadCandidates(images, 300, 'lesser');
    expect(got[0]).toBe(cdn);
    expect(got).toContain(original);
    expect(got.length).toBe(2);
  });

  it('dedupes when primary is also the only non-resized pick', () => {
    const url = 'https://example.com/only.jpg';
    const images = [
      {
        url,
        image_width_size: 400,
        is_resized: false,
      },
    ];
    expect(buildDTOItemImageLoadCandidates(images, 300, 'lesser')).toEqual([url]);
  });

  it('accepts gif as a default list extension', () => {
    const originalGif = 'https://example.com/list-default.gif';
    const images = [{ url: originalGif, image_width_size: 640, is_resized: false }];

    expect(buildDTOItemImageLoadCandidates(images, 300, 'lesser')[0]).toBe(originalGif);
  });
});

describe('findDTOItemImageForList', () => {
  it('accepts gif as a default list extension', () => {
    const originalGif = 'https://example.com/list-pick.gif';
    const images = [{ url: originalGif, image_width_size: 640, is_resized: false }];

    const selected = findDTOItemImageForList(images, 300, 'lesser');
    expect(selected?.url).toBe(originalGif);
  });
});

describe('mergeDTOItemThenChannelImageCandidates', () => {
  it('places item URLs before channel URLs and dedupes', () => {
    const itemCdn = 'https://cdn.example.com/images/item/1/a-w300-c1a2b3c4.webp';
    const channelCdn = 'https://cdn.example.com/images/channel/2/b-w300-c1a2b3c4.webp';
    const itemImages = [{ url: itemCdn, image_width_size: 300, is_resized: true }];
    const channelImages = [{ url: channelCdn, image_width_size: 300, is_resized: true }];
    const got = mergeDTOItemThenChannelImageCandidates(itemImages, channelImages, 300, 'lesser');
    expect(got).toEqual([itemCdn, channelCdn]);
  });

  it('accepts gif defaults for item and channel candidates', () => {
    const itemGif = 'https://example.com/item-list.gif';
    const channelGif = 'https://example.com/channel-list.gif';
    const itemImages = [{ url: itemGif, image_width_size: 640, is_resized: false }];
    const channelImages = [{ url: channelGif, image_width_size: 640, is_resized: false }];

    const got = mergeDTOItemThenChannelImageCandidates(itemImages, channelImages, 300, 'lesser');
    expect(got).toEqual([itemGif, channelGif]);
  });
});

describe('mergeDTOItemThenChannelImageHeroCandidates', () => {
  it('places item URLs before channel URLs like the list merge', () => {
    const itemUrl = 'https://example.com/item.jpg';
    const chUrl = 'https://example.com/ch.jpg';
    const got = mergeDTOItemThenChannelImageHeroCandidates(
      [{ url: itemUrl, image_width_size: 400, is_resized: false }],
      [{ url: chUrl, image_width_size: 400, is_resized: false }],
      300,
      'lesser'
    );
    expect(got).toEqual([itemUrl, chUrl]);
  });
});

describe('buildDTOItemImageHeroLoadCandidates', () => {
  it('allows gif as the default hero extension', () => {
    const gifOriginal = 'https://example.com/original.gif';
    const webpThumb = 'https://cdn.example.com/thumb-w300.webp';
    const images = [
      { url: webpThumb, image_width_size: 300, is_resized: true },
      { url: gifOriginal, image_width_size: 600, is_resized: false },
    ];

    expect(buildDTOItemImageLoadCandidates(images, 300, 'lesser')[0]).toBe(webpThumb);
    expect(buildDTOItemImageHeroLoadCandidates(images, 300, 'lesser')[0]).toBe(gifOriginal);
  });

  it('prefers non-resized originals over equally sized resized rows', () => {
    const cdn = 'https://cdn.example.com/w256.webp';
    const original = 'https://example.com/original.jpg';
    const images = [
      { url: cdn, image_width_size: 256, is_resized: true },
      { url: original, image_width_size: 800, is_resized: false },
    ];
    expect(buildDTOItemImageLoadCandidates(images, 256, 'greater')[0]).toBe(cdn);
    expect(buildDTOItemImageHeroLoadCandidates(images, 256, 'greater')[0]).toBe(original);
  });

  it('falls back to resized when no non-resized rows exist', () => {
    const cdn = 'https://cdn.example.com/w256.webp';
    const images = [{ url: cdn, image_width_size: 256, is_resized: true }];
    expect(buildDTOItemImageHeroLoadCandidates(images, 256, 'greater')).toEqual([cdn]);
  });

  it('for largest, prefers non-resized row with unset width over numeric-width resized thumbs', () => {
    const original = 'https://example.com/full.webp';
    const cdn = 'https://cdn.example.com/thumb-w400.webp';
    const images = [
      { url: original, image_width_size: null, is_resized: false },
      { url: cdn, image_width_size: 400, is_resized: true },
    ];
    expect(buildDTOItemImageHeroLoadCandidates(images, 'largest', 'greater')[0]).toBe(original);
  });
});

describe('buildDTOChannelImageHeroLoadCandidates', () => {
  it('allows gif as the default hero extension', () => {
    const gifOriginal = 'https://example.com/channel-original.gif';
    const webpThumb = 'https://cdn.example.com/channel-thumb-w300.webp';
    const images = [
      { url: webpThumb, image_width_size: 300, is_resized: true },
      { url: gifOriginal, image_width_size: 600, is_resized: false },
    ];

    expect(buildDTOChannelImageLoadCandidates(images, 300, 'lesser')[0]).toBe(webpThumb);
    expect(buildDTOChannelImageHeroLoadCandidates(images, 300, 'lesser')[0]).toBe(gifOriginal);
  });

  it('prefers non-resized originals over equally sized resized rows', () => {
    const cdn = 'https://cdn.example.com/w256.webp';
    const original = 'https://example.com/original.jpg';
    const images = [
      { url: cdn, image_width_size: 256, is_resized: true },
      { url: original, image_width_size: 800, is_resized: false },
    ];
    expect(buildDTOChannelImageLoadCandidates(images, 256, 'greater')[0]).toBe(cdn);
    expect(buildDTOChannelImageHeroLoadCandidates(images, 256, 'greater')[0]).toBe(original);
  });

  it('for largest, prefers non-resized row with unset width over numeric-width resized thumbs', () => {
    const original = 'https://example.com/full.webp';
    const cdn = 'https://cdn.example.com/thumb-w400.webp';
    const images = [
      { url: original, image_width_size: null, is_resized: false },
      { url: cdn, image_width_size: 400, is_resized: true },
    ];
    expect(buildDTOChannelImageHeroLoadCandidates(images, 'largest', 'greater')[0]).toBe(original);
  });
});

describe('prependDistinctImageCandidate', () => {
  it('prepends when non-empty and drops duplicate from the tail', () => {
    const chapter = 'https://example.com/chapter.jpg';
    const rest = ['https://cdn.example.com/item.webp', 'https://example.com/chapter.jpg'];
    expect(prependDistinctImageCandidate(chapter, rest)).toEqual([
      chapter,
      'https://cdn.example.com/item.webp',
    ]);
  });
});

describe('appendDistinctImageCandidate', () => {
  it('returns candidates unchanged when suffix is missing or blank', () => {
    const base = ['https://cdn.example.com/a.webp'];
    expect(appendDistinctImageCandidate(undefined, base)).toEqual(base);
    expect(appendDistinctImageCandidate(null, base)).toEqual(base);
    expect(appendDistinctImageCandidate('  ', base)).toEqual(base);
  });

  it('appends trimmed suffix when not already present', () => {
    const base = ['https://cdn.example.com/a.webp'];
    expect(appendDistinctImageCandidate('  https://example.com/channel.jpg  ', base)).toEqual([
      'https://cdn.example.com/a.webp',
      'https://example.com/channel.jpg',
    ]);
  });

  it('does not duplicate an existing URL', () => {
    const url = 'https://example.com/same.jpg';
    expect(appendDistinctImageCandidate(url, [url, 'https://other.jpg'])).toEqual([
      url,
      'https://other.jpg',
    ]);
  });
});

describe('buildDTOChannelImageLoadCandidates', () => {
  it('matches item candidate ordering for the same shape', () => {
    const cdn = 'https://cdn.example.com/images/channel/1/a-w300-c1a2b3c4.webp';
    const original = 'https://example.com/podcast-original.jpg';
    const images = [
      {
        url: cdn,
        image_width_size: 300,
        is_resized: true,
      },
      {
        url: original,
        image_width_size: 600,
        is_resized: false,
      },
    ];
    const got = buildDTOChannelImageLoadCandidates(images, 300, 'lesser');
    expect(got[0]).toBe(cdn);
    expect(got[1]).toBe(original);
  });

  it('includes every non-resized URL after resized primary when multiple RSS originals exist', () => {
    const cdn = 'https://cdn.example.com/images/channel/1/a-w300-c1a2b3c4.webp';
    const mid = 'https://example.com/mid.jpg';
    const large = 'https://example.com/large.jpg';
    const images = [
      { url: cdn, image_width_size: 300, is_resized: true },
      { url: mid, image_width_size: 400, is_resized: false },
      { url: large, image_width_size: 1200, is_resized: false },
    ];
    const got = buildDTOChannelImageLoadCandidates(images, 168, 'lesser');
    expect(got).toEqual([cdn, mid, large]);
  });
});
