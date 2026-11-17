import { describe, expect, it } from 'vitest';

import type { Episode } from '../../types/partytime.js';
import { convertParsedRSSFeedToCompat } from './compatFull.js';
import { itemImagesNotOnChannel } from './item.js';

const SHOW_IMAGE = 'https://cdn.example.com/show.jpg';
const EPISODE_IMAGE = 'https://cdn.example.com/episode.jpg';

function episode(overrides: Partial<Episode> = {}): Episode {
  return {
    guid: 'ep-1',
    enclosure: { url: 'https://cdn.example.com/ep-1.mp3', type: 'audio/mpeg', length: 1 },
    duration: 1,
    explicit: false,
    ...overrides,
  };
}

describe('itemImagesNotOnChannel', () => {
  it('drops an episode image whose URL matches a channel image and keeps a different one', () => {
    const channelUrls = new Set([` ${SHOW_IMAGE} `]);
    const kept = itemImagesNotOnChannel(
      [
        { url: SHOW_IMAGE, image_width_size: null },
        { url: ` ${EPISODE_IMAGE} `, image_width_size: 600 },
      ],
      channelUrls
    );

    expect(kept).toEqual([{ url: ` ${EPISODE_IMAGE} `, image_width_size: 600 }]);
  });

  it('omits a duplicate episode image from an Add by RSS bundle', () => {
    const mapped = convertParsedRSSFeedToCompat({
      title: 'Show',
      explicit: false,
      link: 'https://example.com',
      itunesImage: SHOW_IMAGE,
      items: [
        episode({ guid: 'same', itunesImage: SHOW_IMAGE }),
        episode({
          guid: 'other',
          itunesImage: EPISODE_IMAGE,
          enclosure: { url: 'https://cdn.example.com/ep-2.mp3', type: 'audio/mpeg', length: 1 },
        }),
      ],
    });

    expect(mapped.channel.images.map((image) => image.url)).toEqual([SHOW_IMAGE]);
    expect(mapped.items[0]?.images).toEqual([]);
    expect(mapped.items[1]?.images).toEqual([{ url: EPISODE_IMAGE, image_width_size: null }]);
  });
});
