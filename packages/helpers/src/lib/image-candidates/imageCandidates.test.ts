import { describe, expect, it } from 'vitest';

import { addByRSSFeedListArtworkCandidates } from './addByRSSFeedListArtworkCandidates.js';
import { addByRSSResourceMergedArtworkCandidates } from './addByRSSResourceMergedArtworkCandidates.js';
import { dedupedTrimmedUrlCandidates } from './dedupedTrimmedUrlCandidates.js';
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

describe('itemHeaderSquareArtworkCandidates', () => {
  it('prepends sized primary when distinct from the load chain', () => {
    const primary = 'https://cdn.example.com/w224.webp';
    const original = 'https://example.com/original.jpg';
    const images = [
      { url: primary, image_width_size: 224, is_resized: true },
      { url: original, image_width_size: 800, is_resized: false },
    ];
    const got = itemHeaderSquareArtworkCandidates(images, 224, 'lesser');
    expect(got[0]).toBe(primary);
    expect(got).toContain(original);
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
