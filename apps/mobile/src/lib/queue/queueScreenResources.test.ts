import { describe, expect, it } from 'vitest';

import type { QueueScreenResource } from './queueScreenResources';
import { queueResourcesForQueueScreen } from './queueScreenResources';

const row = (listPosition: string, itemIdText: string): QueueScreenResource => {
  return {
    item: { id_text: itemIdText },
    list_position: listPosition,
  };
};

describe('queueResourcesForQueueScreen', () => {
  const resources = [row('0', 'now-playing'), row('1', 'upcoming')];

  it('hides now-playing when the viewed queue is the active queue', () => {
    expect(
      queueResourcesForQueueScreen(resources, {
        playingContentId: null,
        viewedQueueIsActive: true,
      })
    ).toEqual([row('1', 'upcoming')]);
  });

  it('keeps now-playing on a queue the player is not using', () => {
    expect(
      queueResourcesForQueueScreen(resources, {
        playingContentId: 'something-else',
        viewedQueueIsActive: false,
      })
    ).toEqual(resources);
  });

  it('hides now-playing when that row is the item in the player', () => {
    expect(
      queueResourcesForQueueScreen(resources, {
        playingContentId: 'now-playing',
        viewedQueueIsActive: false,
      })
    ).toEqual([row('1', 'upcoming')]);
  });
});
