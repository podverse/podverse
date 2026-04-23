import { describe, expect, it } from 'vitest';

import {
  createParsedItemStableKeySet,
  dedupeByStableKey,
  getParsedItemStableKey,
} from './itemStableKey.js';

describe('itemStableKey helpers', () => {
  it('prefers guid over enclosure url for stable key', () => {
    const stableKey = getParsedItemStableKey({
      guid: '  abc-123  ',
      enclosure: { url: 'https://example.com/episode.mp3' },
    });

    expect(stableKey).toBe('guid:abc-123');
  });

  it('falls back to enclosure url when guid is missing', () => {
    const stableKey = getParsedItemStableKey({
      enclosure: { url: 'https://example.com/live.mp3' },
    });

    expect(stableKey).toBe('enclosure:https://example.com/live.mp3');
  });

  it('builds a unique stable-key set from parsed items', () => {
    const keySet = createParsedItemStableKeySet([
      { guid: 'item-guid-1', enclosure: { url: 'https://example.com/a.mp3' } },
      { guid: 'item-guid-1', enclosure: { url: 'https://example.com/b.mp3' } },
      { enclosure: { url: 'https://example.com/c.mp3' } },
      { enclosure: { url: 'https://example.com/c.mp3' } },
    ]);

    expect(Array.from(keySet).sort()).toEqual([
      'enclosure:https://example.com/c.mp3',
      'guid:item-guid-1',
    ]);
  });

  it('dedupes repeated live items and skips keys already seen in regular items', () => {
    const regularItemKeys = new Set(['guid:shared-guid']);
    const liveItems = [
      { guid: 'shared-guid', enclosure: { url: 'https://example.com/shared.mp3' }, marker: 'skip' },
      {
        guid: 'live-guid-1',
        enclosure: { url: 'https://example.com/live-1.mp3' },
        marker: 'keep-first',
      },
      {
        guid: 'live-guid-1',
        enclosure: { url: 'https://example.com/live-1-duplicate.mp3' },
        marker: 'drop-duplicate',
      },
      { enclosure: { url: 'https://example.com/live-2.mp3' }, marker: 'keep-second' },
    ];

    const deduped = dedupeByStableKey(liveItems, getParsedItemStableKey, regularItemKeys);

    expect(deduped.map((item) => item.marker)).toEqual(['keep-first', 'keep-second']);
  });
});
