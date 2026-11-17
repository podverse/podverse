import { describe, expect, it } from 'vitest';

import type { DTOLegacyEpisodeLookupRef, DTOLegacyPodcastLookupChannel } from '@podverse/helpers';

import type { LegacyEpisodeLookupInputs } from './legacyEpisodeLookup.js';
import { orderLegacyEpisodeLookupAnswers } from './legacyEpisodeLookup.js';
import type { LegacyPodcastResolution } from './legacyPodcastLookup.js';

const SHOW: DTOLegacyPodcastLookupChannel = {
  id_text: 'show0001',
  title: 'Listed Show',
  medium_id: 1,
  image_url: 'https://cdn.example.com/listed.jpg',
};

const MAPPED_SHOW: DTOLegacyPodcastLookupChannel = {
  id_text: 'mapped01',
  title: 'Mapped Show',
  medium_id: 1,
  image_url: 'https://cdn.example.com/mapped.jpg',
};

function ref(
  episodeId: string,
  podcastId: string,
  guid: string | null = null,
  mediaUrl: string | null = null
): DTOLegacyEpisodeLookupRef {
  return { episode_id: episodeId, podcast_id: podcastId, guid, media_url: mediaUrl };
}

function inputs(
  podcastAnswers: ReadonlyMap<string, LegacyPodcastResolution<DTOLegacyPodcastLookupChannel>>,
  mappedItems: LegacyEpisodeLookupInputs['mappedItems'] = new Map(),
  matchedItemIdTexts: readonly (string | null)[] = []
): LegacyEpisodeLookupInputs {
  return { podcastAnswers, mappedItems, matchedItemIdTexts };
}

describe('orderLegacyEpisodeLookupAnswers', () => {
  it('keeps input order and answers a duplicate episode id once for each copy', () => {
    const answers = orderLegacyEpisodeLookupAnswers(
      [ref('ep-a', 'pod-a'), ref('ep-b', 'pod-b'), ref('ep-a', 'pod-a')],
      inputs(
        new Map([
          ['pod-a', { kind: 'not_here' }],
          ['pod-b', { kind: 'feed_url', feed_url: 'https://example.com/b.xml' }],
        ]),
        new Map([['ep-a', { itemIdText: 'itemA', channel: MAPPED_SHOW }]]),
        [null, null, null]
      )
    );

    expect(answers.map((answer) => answer.episode_id)).toEqual(['ep-a', 'ep-b', 'ep-a']);
    expect(answers).toEqual([
      { episode_id: 'ep-a', kind: 'item', item_id_text: 'itemA', channel: MAPPED_SHOW },
      { episode_id: 'ep-b', kind: 'feed_url', feed_url: 'https://example.com/b.xml' },
      { episode_id: 'ep-a', kind: 'item', item_id_text: 'itemA', channel: MAPPED_SHOW },
    ]);
  });

  it('lets a blocked show win over a mapped item', () => {
    const [answer] = orderLegacyEpisodeLookupAnswers(
      [ref('ep-blocked', 'pod-blocked')],
      inputs(
        new Map([['pod-blocked', { kind: 'blocked' }]]),
        new Map([['ep-blocked', { itemIdText: 'itemBlocked', channel: MAPPED_SHOW }]]),
        ['guid-hit']
      )
    );

    expect(answer).toEqual({ episode_id: 'ep-blocked', kind: 'blocked' });
  });

  it('lets a mapped item win over a guid-pass hit and returns the mapped item channel', () => {
    const [answer] = orderLegacyEpisodeLookupAnswers(
      [ref('ep-mapped', 'pod-listed', 'guid-hit', 'https://cdn.example.com/other.mp3')],
      inputs(
        new Map([['pod-listed', { kind: 'channel', channel: SHOW }]]),
        new Map([['ep-mapped', { itemIdText: 'itemMapped', channel: MAPPED_SHOW }]]),
        ['guid-item']
      )
    );

    expect(answer).toEqual({
      episode_id: 'ep-mapped',
      kind: 'item',
      item_id_text: 'itemMapped',
      channel: MAPPED_SHOW,
    });
  });

  it('returns the guid match on the podcast channel, or the channel when nothing matches', () => {
    const answers = orderLegacyEpisodeLookupAnswers(
      [ref('ep-hit', 'pod-listed'), ref('ep-miss', 'pod-listed')],
      inputs(new Map([['pod-listed', { kind: 'channel', channel: SHOW }]]), new Map(), [
        'guid-item',
        null,
      ])
    );

    expect(answers).toEqual([
      { episode_id: 'ep-hit', kind: 'item', item_id_text: 'guid-item', channel: SHOW },
      { episode_id: 'ep-miss', kind: 'channel', channel: SHOW },
    ]);
  });

  it('returns feed_url for a feed URL show and not_here when the podcast id is absent', () => {
    const answers = orderLegacyEpisodeLookupAnswers(
      [ref('ep-feed', 'pod-feed'), ref('ep-missing', 'pod-missing')],
      inputs(
        new Map([['pod-feed', { kind: 'feed_url', feed_url: 'https://example.com/missing.xml' }]]),
        new Map(),
        [null, null]
      )
    );

    expect(answers).toEqual([
      {
        episode_id: 'ep-feed',
        kind: 'feed_url',
        feed_url: 'https://example.com/missing.xml',
      },
      { episode_id: 'ep-missing', kind: 'not_here' },
    ]);
  });
});
