import { describe, expect, it } from 'vitest';

import type { QueueScreenResource } from '../splitQueueScreenResources.js';
import { splitQueueScreenResources } from '../splitQueueScreenResources.js';

const row = (listPosition: string, itemIdText: string): QueueScreenResource => {
  return {
    item: { id_text: itemIdText },
    list_position: listPosition,
  };
};

describe('splitQueueScreenResources', () => {
  const resources = [row('0', 'now-playing'), row('1', 'upcoming-a'), row('2', 'upcoming-b')];

  it('moves a matching queue head into nowPlaying when the chip matches the player medium', () => {
    expect(
      splitQueueScreenResources(resources, {
        playingContentId: 'now-playing',
        viewedQueueMatchesPlayerMedium: true,
      })
    ).toEqual({
      nowPlaying: row('0', 'now-playing'),
      upcoming: [row('1', 'upcoming-a'), row('2', 'upcoming-b')],
    });
  });

  it('moves a matching upcoming row into nowPlaying', () => {
    expect(
      splitQueueScreenResources(resources, {
        playingContentId: 'upcoming-a',
        viewedQueueMatchesPlayerMedium: true,
      })
    ).toEqual({
      nowPlaying: row('1', 'upcoming-a'),
      upcoming: [row('2', 'upcoming-b')],
    });
  });

  it('omits the queue head when it is not the playing item', () => {
    expect(
      splitQueueScreenResources(resources, {
        playingContentId: 'something-else',
        viewedQueueMatchesPlayerMedium: true,
      })
    ).toEqual({
      nowPlaying: null,
      upcoming: [row('1', 'upcoming-a'), row('2', 'upcoming-b')],
    });
  });

  it('returns null nowPlaying when the chip does not match the player medium', () => {
    expect(
      splitQueueScreenResources(resources, {
        playingContentId: 'now-playing',
        viewedQueueMatchesPlayerMedium: false,
      })
    ).toEqual({
      nowPlaying: null,
      upcoming: [row('1', 'upcoming-a'), row('2', 'upcoming-b')],
    });
  });

  it('returns null nowPlaying when there is no playing content id', () => {
    expect(
      splitQueueScreenResources(resources, {
        playingContentId: null,
        viewedQueueMatchesPlayerMedium: true,
      })
    ).toEqual({
      nowPlaying: null,
      upcoming: [row('1', 'upcoming-a'), row('2', 'upcoming-b')],
    });
  });

  it('matches clip content ids before item ids', () => {
    const clipRow: QueueScreenResource = {
      clip: { id_text: 'clip-1' },
      item: { id_text: 'item-1' },
      list_position: '1',
    };
    expect(
      splitQueueScreenResources([clipRow], {
        playingContentId: 'clip-1',
        viewedQueueMatchesPlayerMedium: true,
      })
    ).toEqual({
      nowPlaying: clipRow,
      upcoming: [],
    });
  });
});
