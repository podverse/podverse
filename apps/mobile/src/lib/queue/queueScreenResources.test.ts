import { describe, expect, it } from 'vitest';

import type { QueueScreenResource } from './queueScreenResources';
import { splitQueueScreenResources } from './queueScreenResources';

const row = (listPosition: string, itemIdText: string): QueueScreenResource => {
  return {
    item: { id_text: itemIdText },
    list_position: listPosition,
  };
};

describe('splitQueueScreenResources', () => {
  const resources = [row('0', 'now-playing'), row('1', 'upcoming')];

  it('moves a matching queue head into nowPlaying when the chip matches the player medium', () => {
    expect(
      splitQueueScreenResources(resources, {
        playingContentId: 'now-playing',
        viewedQueueMatchesPlayerMedium: true,
      })
    ).toEqual({
      nowPlaying: row('0', 'now-playing'),
      upcoming: [row('1', 'upcoming')],
    });
  });

  it('omits the queue head when the chip does not match the player medium', () => {
    expect(
      splitQueueScreenResources(resources, {
        playingContentId: 'now-playing',
        viewedQueueMatchesPlayerMedium: false,
      })
    ).toEqual({
      nowPlaying: null,
      upcoming: [row('1', 'upcoming')],
    });
  });

  it('returns null nowPlaying when no queue row matches the playing item', () => {
    expect(
      splitQueueScreenResources(resources, {
        playingContentId: 'player-only',
        viewedQueueMatchesPlayerMedium: true,
      })
    ).toEqual({
      nowPlaying: null,
      upcoming: [row('1', 'upcoming')],
    });
  });
});
