import { describe, expect, it } from 'vitest';

import { addByRSSFeedListArtworkCandidates } from './addByRSSFeedListArtworkCandidates.js';
import { addByRSSResourceMergedArtworkCandidates } from './addByRSSResourceMergedArtworkCandidates.js';
import { dedupedTrimmedUrlCandidates } from './dedupedTrimmedUrlCandidates.js';
import { itemHeaderLightboxArtworkCandidates } from './itemHeaderLightboxArtworkCandidates.js';
import { itemHeaderSquareArtworkCandidates } from './itemHeaderSquareArtworkCandidates.js';
import { resolveImageCandidates } from './resolveImageCandidates.js';

describe('dedupedTrimmedUrlCandidates', () => {
  it('keeps first-seen trimmed strings and skips empties', () => {
    expect(
      dedupedTrimmedUrlCandidates([
        '  https://a.test/x  ',
        'https://a.test/x',
        '',
        null,
        undefined,
        'https://b.test/y',
      ])
    ).toEqual(['https://a.test/x', 'https://b.test/y']);
  });
});

describe('resolveImageCandidates', () => {
  it('uses candidates when defined (even empty), else single src', () => {
    expect(resolveImageCandidates(['  https://x.test/a  ', ''], undefined)).toEqual([
      'https://x.test/a',
    ]);
    expect(resolveImageCandidates([], undefined)).toEqual([]);
    expect(resolveImageCandidates(undefined, ' https://y.test/b ')).toEqual(['https://y.test/b']);
    expect(resolveImageCandidates(undefined, undefined)).toEqual([]);
  });
});

describe('itemHeaderLightboxArtworkCandidates', () => {
  it('uses non-resized largest artwork as the first candidate', () => {
    const primary = 'https://example.com/original.jpg';
    const images = [
      { url: 'https://cdn.example.com/w224.webp', image_width_size: 224, is_resized: true },
      { url: primary, image_width_size: 800, is_resized: false },
    ];
    const got = itemHeaderLightboxArtworkCandidates(images);
    expect(got[0]).toBe(primary);
  });
});

describe('itemHeaderSquareArtworkCandidates', () => {
  it('accepts gif originals for hero/header candidates by default', () => {
    const shrunken = 'https://cdn.example.com/w256.webp';
    const originalGif = 'https://example.com/original.gif';
    const images = [
      { url: shrunken, image_width_size: 256, is_resized: true },
      { url: originalGif, image_width_size: 800, is_resized: false },
    ];
    const got = itemHeaderSquareArtworkCandidates(images, 256, 'greater');
    expect(got[0]).toBe(originalGif);
  });

  it('prefers non-resized hero artwork over equally sized resized rows', () => {
    const shrunken = 'https://cdn.example.com/w256.webp';
    const original = 'https://example.com/original.jpg';
    const images = [
      { url: shrunken, image_width_size: 256, is_resized: true },
      { url: original, image_width_size: 800, is_resized: false },
    ];
    const got = itemHeaderSquareArtworkCandidates(images, 256, 'greater');
    expect(got[0]).toBe(original);
  });
});

describe('addByRSSResourceMergedArtworkCandidates', () => {
  it('merges item and channel rows then prepends distinct channel_image_url', () => {
    const item = 'https://cdn.example.com/item.webp';
    const channel = 'https://cdn.example.com/channel.webp';
    const legacy = 'https://feed.example.com/itunes.jpg';
    const got = addByRSSResourceMergedArtworkCandidates(
      {
        item_images: [{ url: item, image_width_size: 300, is_resized: true }],
        channel_images: [{ url: channel, image_width_size: 300, is_resized: true }],
        channel_image_url: legacy,
      },
      300,
      'lesser'
    );
    expect(got[0]).toBe(legacy);
    expect(got).toContain(item);
    expect(got).toContain(channel);
  });

  it('returns empty when resource data is absent', () => {
    expect(addByRSSResourceMergedArtworkCandidates(undefined, 300, 'lesser')).toEqual([]);
  });

  it('accepts gif defaults for merged list candidates', () => {
    const itemGif = 'https://example.com/add-by-rss-item.gif';
    const channelGif = 'https://example.com/add-by-rss-channel.gif';
    const got = addByRSSResourceMergedArtworkCandidates(
      {
        item_images: [{ url: itemGif, image_width_size: 600, is_resized: false }],
        channel_images: [{ url: channelGif, image_width_size: 600, is_resized: false }],
      },
      300,
      'lesser'
    );

    expect(got).toEqual([itemGif, channelGif]);
  });
});

describe('addByRSSFeedListArtworkCandidates', () => {
  it('places feed imageUrl before channel chain', () => {
    const feedOverride = 'https://feed.example.com/cover.jpg';
    const channel = 'https://cdn.example.com/w168.webp';
    const got = addByRSSFeedListArtworkCandidates({
      channelImages: [{ url: channel, image_width_size: 168, is_resized: true }],
      feedImageUrl: feedOverride,
      sizeFindTarget: 168,
      comparison: 'lesser',
    });
    expect(got[0]).toBe(feedOverride);
    expect(got).toContain(channel);
  });
});
