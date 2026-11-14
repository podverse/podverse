import { describe, expect, it } from 'vitest';

import type { Episode } from '../../types/partytime.js';
import { compatItemAboutDto, compatItemSoundbiteDtos } from './item.js';

function episode(overrides: Partial<Episode> = {}): Episode {
  return {
    guid: 'ep-1',
    enclosure: {
      url: 'https://example.com/a.mp3',
      type: 'audio/mpeg',
      length: 1,
    },
    duration: 1,
    explicit: false,
    ...overrides,
  };
}

describe('compatItemAboutDto duration', () => {
  it('stores an ordinary duration and drops one that cannot fit media_player_time', () => {
    expect(compatItemAboutDto(episode({ duration: 1e8 })).duration).toBeNull();
    expect(compatItemAboutDto(episode({ duration: 3600 })).duration).toBe('3600.00');
  });

  it('stores a zero duration as unknown', () => {
    expect(compatItemAboutDto(episode({ duration: 0 })).duration).toBeNull();
  });
});

describe('compatItemSoundbiteDtos', () => {
  it('drops a soundbite whose duration cannot fit and keeps its sibling', () => {
    const dtos = compatItemSoundbiteDtos(
      episode({
        podcastSoundbites: [
          { startTime: 1, duration: 1e9, title: 'huge' },
          { startTime: 5, duration: 10, title: 'kept' },
        ],
      })
    );

    expect(dtos).toEqual([{ start_time: '5.00', duration: '10.00', title: 'kept' }]);
  });
});
