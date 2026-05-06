import { describe, expect, it } from 'vitest';

import {
  buildMediaPlayerArtworkImageCandidates,
  getMediaPlayerArtworkSources,
  shouldUseChapterArtwork,
} from './mediaPlayerArtwork.js';

describe('shouldUseChapterArtwork', () => {
  it('returns true only when chapter exists and clip/soundbite absent', () => {
    expect(
      shouldUseChapterArtwork({
        mpItemChapter: { img: 'https://x.test/c.jpg' },
        mpClip: null,
        mpItemSoundbite: null,
      })
    ).toBe(true);
    expect(
      shouldUseChapterArtwork({
        mpItemChapter: null,
        mpClip: null,
        mpItemSoundbite: null,
      })
    ).toBe(false);
    expect(
      shouldUseChapterArtwork({
        mpItemChapter: { img: 'https://x.test/c.jpg' },
        mpClip: {},
        mpItemSoundbite: null,
      })
    ).toBe(false);
  });
});

describe('getMediaPlayerArtworkSources', () => {
  it('prefers mpChannel channel_images, then item.channel, then Add-by-RSS resource data', () => {
    const fromChannel = [
      { url: 'https://a.test/ch.jpg', image_width_size: 300, is_resized: false },
    ];
    const fromNested = [{ url: 'https://b.test/n.jpg', image_width_size: 300, is_resized: false }];
    const fromAb = [{ url: 'https://c.test/ab.jpg', image_width_size: 300, is_resized: false }];
    expect(
      getMediaPlayerArtworkSources({
        mpChannel: { channel_images: fromChannel },
        mpItem: null,
        mpAddByRSSResourceData: { channel_images: fromAb },
      }).channelImages
    ).toEqual(fromChannel);
    expect(
      getMediaPlayerArtworkSources({
        mpChannel: null,
        mpItem: { channel: { channel_images: fromNested } },
        mpAddByRSSResourceData: { channel_images: fromAb },
      }).channelImages
    ).toEqual(fromNested);
    expect(
      getMediaPlayerArtworkSources({
        mpChannel: null,
        mpItem: null,
        mpAddByRSSResourceData: { channel_images: fromAb },
      }).channelImages
    ).toEqual(fromAb);
  });

  it('prefers item item_images over Add-by-RSS item_images', () => {
    const item = [{ url: 'https://i.test/1.webp', image_width_size: 300, is_resized: true }];
    const ab = [{ url: 'https://i.test/2.webp', image_width_size: 300, is_resized: true }];
    expect(
      getMediaPlayerArtworkSources({
        mpChannel: null,
        mpItem: { item_images: item },
        mpAddByRSSResourceData: { item_images: ab },
      }).itemImages
    ).toEqual(item);
  });
});

describe('buildMediaPlayerArtworkImageCandidates', () => {
  it('merges item then channel ordering without chapter', () => {
    const item = 'https://cdn.example.com/item.webp';
    const channel = 'https://cdn.example.com/channel.webp';
    const got = buildMediaPlayerArtworkImageCandidates({
      itemImages: [{ url: item, image_width_size: 300, is_resized: true }],
      channelImages: [{ url: channel, image_width_size: 300, is_resized: true }],
      includeChapterImage: false,
      imageSizeTarget: 300,
      imageSizeComparison: 'lesser',
    });
    expect(got.indexOf(item)).toBeLessThan(got.indexOf(channel));
  });

  it('prepends chapter image when included and non-empty', () => {
    const chapter = 'https://chapter.test/img.png';
    const item = 'https://cdn.example.com/item.webp';
    const channel = 'https://cdn.example.com/channel.webp';
    const got = buildMediaPlayerArtworkImageCandidates({
      itemImages: [{ url: item, image_width_size: 300, is_resized: true }],
      channelImages: [{ url: channel, image_width_size: 300, is_resized: true }],
      chapterImageUrl: chapter,
      includeChapterImage: true,
      imageSizeTarget: 300,
      imageSizeComparison: 'lesser',
    });
    expect(got[0]).toBe(chapter);
    expect(got).toContain(item);
    expect(got).toContain(channel);
  });

  it('omits chapter when includeChapterImage is false even if chapter URL set', () => {
    const chapter = 'https://chapter.test/img.png';
    const item = 'https://cdn.example.com/item.webp';
    const got = buildMediaPlayerArtworkImageCandidates({
      itemImages: [{ url: item, image_width_size: 300, is_resized: true }],
      channelImages: [],
      chapterImageUrl: chapter,
      includeChapterImage: false,
      imageSizeTarget: 300,
      imageSizeComparison: 'lesser',
    });
    expect(got.includes(chapter)).toBe(false);
    expect(got[0]).toBe(item);
  });
});
