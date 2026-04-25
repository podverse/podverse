import { describe, expect, it } from 'vitest';

import type { AddByRSSResourceDataImageEntry } from '@podverse/helpers';

import {
  buildMediaPlayerArtworkImageCandidates,
  getMediaPlayerArtworkSources,
  shouldUseChapterArtwork,
} from './mediaPlayerArtwork';

const image = (url: string, imageWidthSize: number | null): AddByRSSResourceDataImageEntry => ({
  url,
  image_width_size: imageWidthSize,
});

describe('mediaPlayerArtwork helpers', () => {
  it('uses modal source precedence: channel -> item.channel -> add-by-rss for channel images', () => {
    const channelImagesPrimary = [image('https://example.com/channel-primary.jpg', 400)];
    const channelImagesSecondary = [image('https://example.com/channel-secondary.jpg', 300)];
    const channelImagesAddByRSS = [image('https://example.com/channel-addbyrss.jpg', 200)];
    const itemImages = [image('https://example.com/item.jpg', 500)];

    const sources = getMediaPlayerArtworkSources({
      mpChannel: { channel_images: channelImagesPrimary },
      mpItem: {
        item_images: itemImages,
        channel: {
          channel_images: channelImagesSecondary,
        },
      },
      mpAddByRSSResourceData: {
        channel_images: channelImagesAddByRSS,
        item_images: [image('https://example.com/item-addbyrss.jpg', 250)],
      },
    });

    expect(sources.channelImages).toEqual(channelImagesPrimary);
    expect(sources.itemImages).toEqual(itemImages);
  });

  it('falls back to item.channel channel_images when mpChannel is not present', () => {
    const itemChannelImages = [image('https://example.com/channel-from-item.jpg', 280)];

    const sources = getMediaPlayerArtworkSources({
      mpChannel: null,
      mpItem: {
        item_images: [image('https://example.com/item.jpg', 320)],
        channel: {
          channel_images: itemChannelImages,
        },
      },
      mpAddByRSSResourceData: {
        channel_images: [image('https://example.com/channel-from-addbyrss.jpg', 260)],
      },
    });

    expect(sources.channelImages).toEqual(itemChannelImages);
  });

  it('returns true for chapter artwork only in chapter context (no clip and no soundbite)', () => {
    expect(
      shouldUseChapterArtwork({
        mpItemChapter: { img: 'https://example.com/chapter.jpg' },
        mpClip: null,
        mpItemSoundbite: null,
      })
    ).toBe(true);

    expect(
      shouldUseChapterArtwork({
        mpItemChapter: { img: 'https://example.com/chapter.jpg' },
        mpClip: {},
        mpItemSoundbite: null,
      })
    ).toBe(false);
  });

  it('builds candidates in chapter -> item -> channel order and de-duplicates', () => {
    const chapterUrl = 'https://example.com/shared.jpg';
    const candidates = buildMediaPlayerArtworkImageCandidates({
      channelImages: [image('https://example.com/channel.jpg', 200)],
      itemImages: [image(chapterUrl, 300)],
      chapterImageUrl: chapterUrl,
      includeChapterImage: true,
      imageSizeTarget: 150,
      imageSizeComparison: 'greater',
    });

    expect(candidates).toEqual([chapterUrl, 'https://example.com/channel.jpg']);
  });

  it('returns empty candidate list when no valid image URL is available', () => {
    const candidates = buildMediaPlayerArtworkImageCandidates({
      channelImages: [],
      itemImages: [],
      chapterImageUrl: '   ',
      includeChapterImage: true,
      imageSizeTarget: 'largest',
    });

    expect(candidates).toEqual([]);
  });
});
