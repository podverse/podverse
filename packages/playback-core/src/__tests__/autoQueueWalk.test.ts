import { describe, expect, it } from 'vitest';

import type {
  DTOAccount,
  DTOChannel,
  DTOClip,
  DTOItem,
  DTOItemQueueItem,
  DTOPlaylistResource,
  DTOSharableStatus,
  PlaylistResourceIdTextOptions,
} from '@podverse/helpers';
import { MediumEnum } from '@podverse/helpers/medium';

import type { AutoQueueConfig, AutoQueueResourcesMap, AutoQueueSeed } from '../autoQueue.js';
import {
  type AutoQueueDirection,
  type AutoQueueSourceFetchers,
  fillAutoQueueAhead,
  fillAutoQueueForward,
  resolveAutoQueuePrevious,
} from '../autoQueueWalk.js';

let nextId = 1;

function takeId(): number {
  const id = nextId;
  nextId += 1;
  return id;
}

function createChannel(idText: string, mediumId: number = MediumEnum.Podcast): DTOChannel {
  const id = takeId();
  return {
    id,
    id_text: idText,
    slug: null,
    feed_id: id,
    podcast_guid: null,
    title: idText,
    sortable_title: idText,
    medium_id: mediumId,
    has_value_time_splits: false,
  };
}

function createQueueItem(idText: string, channel?: DTOChannel): DTOItemQueueItem {
  const id = takeId();
  return {
    id,
    id_text: idText,
    channel_id: channel?.id ?? id,
    item_flag_status_id: 1,
    item_about: {
      id,
      item_id: id,
      duration: null,
    },
    item_enclosures: [],
    item_images: [],
    ...(channel ? { channel } : {}),
  };
}

function createItem(idText: string, channel?: DTOChannel): DTOItem {
  const queueItem = createQueueItem(idText, channel);
  return {
    ...queueItem,
    item_chat: {
      id: takeId(),
      item_id: queueItem.id,
      server: '',
    },
    item_license: {
      id: takeId(),
      item_id: queueItem.id,
      identifier: '',
      url: null,
    },
    item_location: {
      id: takeId(),
      item_id: queueItem.id,
      name: null,
    },
    item_season: {
      id: takeId(),
      channel_season_id: takeId(),
      item_id: queueItem.id,
      title: null,
    },
    item_content_links: [],
    item_fundings: [],
    item_persons: [],
    item_social_interacts: [],
    item_soundbites: [],
    item_transcripts: [],
    item_txts: [],
    item_values: [],
  };
}

function createAccount(idText: string): DTOAccount {
  return {
    id: takeId(),
    id_text: idText,
    verified: false,
  };
}

function createSharableStatus(): DTOSharableStatus {
  return {
    id: takeId(),
    status: 'public',
  };
}

function createClip(idText: string, item: DTOItem | null): DTOClip {
  return {
    id: takeId(),
    id_text: idText,
    account: createAccount(`account-${idText}`),
    item_id: item?.id_text ?? null,
    item,
    start_time: '0',
    end_time: '30',
    sharable_status: createSharableStatus(),
  };
}

function createPlaylistResource(options: {
  clip?: DTOClip;
  item?: DTOItem;
  sourceRemovedAt?: string | null;
}): DTOPlaylistResource {
  const id = takeId();
  const inferredItem = options.item ?? options.clip?.item ?? null;
  return {
    id,
    playlist_id: takeId(),
    list_position: `${id}`,
    clip: options.clip,
    clip_id: options.clip?.id ?? null,
    item: inferredItem,
    item_id: inferredItem?.id ?? null,
    item_soundbite: undefined,
    item_soundbite_id: null,
    source_removed_at: options.sourceRemovedAt ?? null,
  };
}

function createSeed(mediumId: number = MediumEnum.Podcast): AutoQueueSeed {
  const channel = createChannel(`channel-${mediumId}-${takeId()}`, mediumId);
  const item = createQueueItem(`item-${mediumId}-${takeId()}`, channel);
  return {
    item,
    channel,
    clip: null,
    item_soundbite: null,
  };
}

function createConfig(overrides: Partial<AutoQueueConfig> = {}): AutoQueueConfig {
  return {
    playlist_id_text: null,
    disabled: false,
    random: false,
    repeat: false,
    nextPage: 1,
    shuffleHash: 'shuffle-hash',
    ...overrides,
  };
}

function createSeedResources(seed: AutoQueueSeed): AutoQueueResourcesMap {
  return {
    0: {
      item: seed.item,
      clip: seed.clip,
      item_soundbite: seed.item_soundbite,
      channel: seed.channel,
    },
  };
}

type FetchCalls = {
  playlistListPosition: Array<{
    playlistIdText: string;
    cursor: PlaylistResourceIdTextOptions;
    direction: AutoQueueDirection;
  }>;
  playlistShuffle: Array<{ playlistIdText: string; page: number; shuffleHash: string }>;
  playlistFirstPage: string[];
  channelShuffle: Array<{ channelIdText: string; page: number; shuffleHash: string }>;
  itemsBySeason: Array<{ itemIdText: string; direction: AutoQueueDirection }>;
  channelSeasonFirstPage: string[];
  itemsByPubDate: Array<{ itemIdText: string; direction: AutoQueueDirection }>;
  channelRecentFirstPage: string[];
};

type FetchResponses = {
  playlistListPosition: DTOPlaylistResource[][];
  playlistShuffle: DTOPlaylistResource[][];
  playlistFirstPage: DTOPlaylistResource[][];
  channelShuffle: DTOItemQueueItem[][];
  itemsBySeason: DTOItemQueueItem[][];
  channelSeasonFirstPage: DTOItemQueueItem[][];
  itemsByPubDate: DTOItemQueueItem[][];
  channelRecentFirstPage: DTOItemQueueItem[][];
};

function createFetchHarness(): {
  fetchers: AutoQueueSourceFetchers;
  calls: FetchCalls;
  responses: FetchResponses;
} {
  const calls: FetchCalls = {
    playlistListPosition: [],
    playlistShuffle: [],
    playlistFirstPage: [],
    channelShuffle: [],
    itemsBySeason: [],
    channelSeasonFirstPage: [],
    itemsByPubDate: [],
    channelRecentFirstPage: [],
  };

  const responses: FetchResponses = {
    playlistListPosition: [],
    playlistShuffle: [],
    playlistFirstPage: [],
    channelShuffle: [],
    itemsBySeason: [],
    channelSeasonFirstPage: [],
    itemsByPubDate: [],
    channelRecentFirstPage: [],
  };

  const fetchers: AutoQueueSourceFetchers = {
    fetchPlaylistResourcesByListPosition: async (playlistIdText, cursor, direction) => {
      calls.playlistListPosition.push({ playlistIdText, cursor, direction });
      return responses.playlistListPosition.shift() ?? [];
    },
    fetchPlaylistResourcesByShuffle: async (playlistIdText, params) => {
      calls.playlistShuffle.push({
        playlistIdText,
        page: params.page,
        shuffleHash: params.shuffleHash,
      });
      return responses.playlistShuffle.shift() ?? [];
    },
    fetchPlaylistResourcesFirstPage: async (playlistIdText) => {
      calls.playlistFirstPage.push(playlistIdText);
      return responses.playlistFirstPage.shift() ?? [];
    },
    fetchChannelItemsByShuffle: async (channelIdText, params) => {
      calls.channelShuffle.push({
        channelIdText,
        page: params.page,
        shuffleHash: params.shuffleHash,
      });
      return responses.channelShuffle.shift() ?? [];
    },
    fetchItemsBySeason: async (itemIdText, direction) => {
      calls.itemsBySeason.push({ itemIdText, direction });
      return responses.itemsBySeason.shift() ?? [];
    },
    fetchChannelItemsBySeasonFirstPage: async (channelIdText) => {
      calls.channelSeasonFirstPage.push(channelIdText);
      return responses.channelSeasonFirstPage.shift() ?? [];
    },
    fetchItemsByPubDate: async (itemIdText, direction) => {
      calls.itemsByPubDate.push({ itemIdText, direction });
      return responses.itemsByPubDate.shift() ?? [];
    },
    fetchChannelItemsRecentFirstPage: async (channelIdText) => {
      calls.channelRecentFirstPage.push(channelIdText);
      return responses.channelRecentFirstPage.shift() ?? [];
    },
  };

  return {
    fetchers,
    calls,
    responses,
  };
}

describe('fillAutoQueueForward', () => {
  it('empties resources when seed is null, and seeds key 0 when needed', async () => {
    const harness = createFetchHarness();
    const seed = createSeed();
    const existing = createSeedResources(seed);

    const withoutSeed = await fillAutoQueueForward({
      config: createConfig(),
      seed: null,
      resources: existing,
      fetchers: harness.fetchers,
    });
    expect(withoutSeed.resources).toEqual({});
    expect(withoutSeed.exhausted).toBe(true);
    expect(withoutSeed.fetchedCount).toBe(0);
    expect(withoutSeed.appendedCount).toBe(0);

    const nextItem = createQueueItem('item-next', seed.channel);
    harness.responses.itemsByPubDate.push([nextItem]);
    const seeded = await fillAutoQueueForward({
      config: createConfig(),
      seed,
      resources: {},
      fetchers: harness.fetchers,
    });

    expect(seeded.resources[0]?.item.id_text).toBe(seed.item.id_text);
    expect(seeded.resources[1]?.item.id_text).toBe('item-next');
    expect(seeded.fetchedCount).toBe(1);
    expect(seeded.appendedCount).toBe(1);
  });

  it('walks playlist list-position from the highest key and skips unplayable rows', async () => {
    const harness = createFetchHarness();
    const seed = createSeed();
    const cursorItem = createQueueItem('item-cursor', seed.channel);
    const resources: AutoQueueResourcesMap = {
      ...createSeedResources(seed),
      1: {
        item: cursorItem,
        clip: null,
        item_soundbite: null,
        channel: seed.channel,
      },
    };

    harness.responses.playlistListPosition.push([
      createPlaylistResource({
        item: createItem('item-removed', seed.channel),
        sourceRemovedAt: '2026-01-01T00:00:00.000Z',
      }),
      createPlaylistResource({
        item: createItem('item-playable', seed.channel),
      }),
    ]);

    const result = await fillAutoQueueForward({
      config: createConfig({
        playlist_id_text: 'playlist-1',
      }),
      seed,
      resources,
      fetchers: harness.fetchers,
    });

    expect(harness.calls.playlistListPosition[0]?.cursor.item_id_text).toBe('item-cursor');
    expect(result.resources[2]?.item.id_text).toBe('item-playable');
    expect(result.resources[3]).toBeUndefined();
    expect(result.fetchedCount).toBe(2);
    expect(result.appendedCount).toBe(1);
  });

  it('wraps playlist list-position only when repeat is enabled, otherwise exhausts', async () => {
    const repeatHarness = createFetchHarness();
    const repeatSeed = createSeed();
    repeatHarness.responses.playlistListPosition.push([]);
    repeatHarness.responses.playlistFirstPage.push([
      createPlaylistResource({
        item: createItem('item-repeat-wrap', repeatSeed.channel),
      }),
    ]);

    const repeated = await fillAutoQueueForward({
      config: createConfig({
        playlist_id_text: 'playlist-1',
        repeat: true,
      }),
      seed: repeatSeed,
      resources: {},
      fetchers: repeatHarness.fetchers,
    });
    expect(repeatHarness.calls.playlistFirstPage).toEqual(['playlist-1']);
    expect(repeated.fetchedCount).toBe(1);
    expect(repeated.exhausted).toBe(false);

    const noRepeatHarness = createFetchHarness();
    const noRepeatSeed = createSeed();
    noRepeatHarness.responses.playlistListPosition.push([]);
    const exhausted = await fillAutoQueueForward({
      config: createConfig({
        playlist_id_text: 'playlist-1',
        repeat: false,
      }),
      seed: noRepeatSeed,
      resources: {},
      fetchers: noRepeatHarness.fetchers,
    });
    expect(noRepeatHarness.calls.playlistFirstPage).toEqual([]);
    expect(exhausted.fetchedCount).toBe(0);
    expect(exhausted.exhausted).toBe(true);
  });

  it('pages shuffle sources and keeps shuffle hash when wrapping', async () => {
    const playlistHarness = createFetchHarness();
    const playlistSeed = createSeed();
    playlistHarness.responses.playlistShuffle.push([
      createPlaylistResource({ item: createItem('item-playlist-shuffle', playlistSeed.channel) }),
    ]);
    const playlistResult = await fillAutoQueueForward({
      config: createConfig({
        playlist_id_text: 'playlist-1',
        random: true,
        nextPage: 3,
        shuffleHash: 'hash-playlist',
      }),
      seed: playlistSeed,
      resources: {},
      fetchers: playlistHarness.fetchers,
    });
    expect(playlistHarness.calls.playlistShuffle.map((call) => call.page)).toEqual([3]);
    expect(playlistResult.config.nextPage).toBe(4);
    expect(playlistResult.config.shuffleHash).toBe('hash-playlist');

    const channelHarness = createFetchHarness();
    const channelSeed = createSeed();
    channelHarness.responses.channelShuffle.push(
      [],
      [createQueueItem('item-channel-wrap', channelSeed.channel)]
    );
    const channelResult = await fillAutoQueueForward({
      config: createConfig({
        random: true,
        repeat: true,
        nextPage: 9,
        shuffleHash: 'hash-channel',
      }),
      seed: channelSeed,
      resources: {},
      fetchers: channelHarness.fetchers,
    });
    expect(channelHarness.calls.channelShuffle.map((call) => call.page)).toEqual([9, 1]);
    expect(channelResult.config.nextPage).toBe(2);
    expect(channelResult.config.shuffleHash).toBe('hash-channel');
  });

  it('walks season and publish-date from the highest key and wraps to first pages', async () => {
    const seasonHarness = createFetchHarness();
    const seasonSeed = createSeed(MediumEnum.Music);
    const seasonCursor = createQueueItem('item-season-cursor', seasonSeed.channel);
    const seasonResources: AutoQueueResourcesMap = {
      ...createSeedResources(seasonSeed),
      1: {
        item: seasonCursor,
        clip: null,
        item_soundbite: null,
        channel: seasonSeed.channel,
      },
    };
    seasonHarness.responses.itemsBySeason.push([]);
    seasonHarness.responses.channelSeasonFirstPage.push([
      createQueueItem('item-season-wrap', seasonSeed.channel),
    ]);
    const seasonResult = await fillAutoQueueForward({
      config: createConfig({
        repeat: true,
      }),
      seed: seasonSeed,
      resources: seasonResources,
      fetchers: seasonHarness.fetchers,
    });
    expect(seasonHarness.calls.itemsBySeason[0]?.itemIdText).toBe('item-season-cursor');
    expect(seasonHarness.calls.channelSeasonFirstPage).toEqual([seasonSeed.channel.id_text]);
    expect(seasonResult.resources[2]?.item.id_text).toBe('item-season-wrap');

    const pubDateHarness = createFetchHarness();
    const pubDateSeed = createSeed(MediumEnum.Podcast);
    const pubDateCursor = createQueueItem('item-pubdate-cursor', pubDateSeed.channel);
    const pubDateResources: AutoQueueResourcesMap = {
      ...createSeedResources(pubDateSeed),
      1: {
        item: pubDateCursor,
        clip: null,
        item_soundbite: null,
        channel: pubDateSeed.channel,
      },
    };
    pubDateHarness.responses.itemsByPubDate.push([]);
    pubDateHarness.responses.channelRecentFirstPage.push([
      createQueueItem('item-pubdate-wrap', pubDateSeed.channel),
    ]);
    const pubDateResult = await fillAutoQueueForward({
      config: createConfig({
        repeat: true,
      }),
      seed: pubDateSeed,
      resources: pubDateResources,
      fetchers: pubDateHarness.fetchers,
    });
    expect(pubDateHarness.calls.itemsByPubDate[0]?.itemIdText).toBe('item-pubdate-cursor');
    expect(pubDateHarness.calls.channelRecentFirstPage).toEqual([pubDateSeed.channel.id_text]);
    expect(pubDateResult.resources[2]?.item.id_text).toBe('item-pubdate-wrap');
  });

  it('dedupes random-mode rows after append', async () => {
    const harness = createFetchHarness();
    const seed = createSeed();
    const duplicate = createQueueItem(seed.item.id_text, seed.channel);
    const unique = createQueueItem('item-unique', seed.channel);
    harness.responses.channelShuffle.push([duplicate, unique]);

    const result = await fillAutoQueueForward({
      config: createConfig({
        random: true,
      }),
      seed,
      resources: createSeedResources(seed),
      fetchers: harness.fetchers,
    });

    expect(Object.keys(result.resources)).toEqual(['0', '1']);
    expect(result.resources[0]?.item.id_text).toBe(seed.item.id_text);
    expect(result.resources[1]?.item.id_text).toBe('item-unique');
    expect(result.fetchedCount).toBe(2);
    expect(result.appendedCount).toBe(1);
  });

  it('seeds and fetches nothing when auto-queue config is disabled', async () => {
    const harness = createFetchHarness();
    const seed = createSeed();
    const result = await fillAutoQueueForward({
      config: createConfig({
        disabled: true,
      }),
      seed,
      resources: {},
      fetchers: harness.fetchers,
    });

    expect(result.resources[0]?.item.id_text).toBe(seed.item.id_text);
    expect(result.fetchedCount).toBe(0);
    expect(result.exhausted).toBe(true);
    expect(harness.calls.playlistListPosition.length).toBe(0);
    expect(harness.calls.channelShuffle.length).toBe(0);
    expect(harness.calls.itemsByPubDate.length).toBe(0);
  });
});

describe('fillAutoQueueAhead', () => {
  it('returns without fetching when enough rows are already ahead', async () => {
    const harness = createFetchHarness();
    const seed = createSeed();
    const resources: AutoQueueResourcesMap = {
      ...createSeedResources(seed),
      1: {
        item: createQueueItem('item-ahead', seed.channel),
        clip: null,
        item_soundbite: null,
        channel: seed.channel,
      },
    };

    const result = await fillAutoQueueAhead({
      config: createConfig(),
      seed,
      resources,
      fetchers: harness.fetchers,
      activeRow: 0,
      minRowsAhead: 1,
    });

    expect(result.fetchedCount).toBe(0);
    expect(result.appendedCount).toBe(0);
    expect(result.exhausted).toBe(false);
    expect(harness.calls.itemsByPubDate.length).toBe(0);
  });

  it('stops at maxFetches and carries nextPage between fills', async () => {
    const harness = createFetchHarness();
    const seed = createSeed();
    harness.responses.playlistShuffle.push(
      [createPlaylistResource({ item: createItem('item-shuffle-1', seed.channel) })],
      [createPlaylistResource({ item: createItem('item-shuffle-2', seed.channel) })],
      [createPlaylistResource({ item: createItem('item-shuffle-3', seed.channel) })]
    );

    const result = await fillAutoQueueAhead({
      config: createConfig({
        playlist_id_text: 'playlist-1',
        random: true,
        nextPage: 1,
        shuffleHash: 'hash-ahead',
      }),
      seed,
      resources: {},
      fetchers: harness.fetchers,
      activeRow: 0,
      minRowsAhead: 3,
      maxFetches: 2,
    });

    expect(harness.calls.playlistShuffle.map((call) => call.page)).toEqual([1, 2]);
    expect(result.fetchedCount).toBe(2);
    expect(result.appendedCount).toBe(2);
    expect(result.config.nextPage).toBe(3);
    expect(result.exhausted).toBe(false);
  });

  it('stops when the source is exhausted', async () => {
    const harness = createFetchHarness();
    const seed = createSeed();
    harness.responses.playlistListPosition.push([]);

    const result = await fillAutoQueueAhead({
      config: createConfig({
        playlist_id_text: 'playlist-1',
      }),
      seed,
      resources: {},
      fetchers: harness.fetchers,
      activeRow: 0,
      minRowsAhead: 1,
      maxFetches: 5,
    });

    expect(harness.calls.playlistListPosition.length).toBe(1);
    expect(result.fetchedCount).toBe(0);
    expect(result.appendedCount).toBe(0);
    expect(result.exhausted).toBe(true);
  });

  it('stops when a fill appends no rows', async () => {
    const harness = createFetchHarness();
    const seed = createSeed();
    harness.responses.channelShuffle.push([createQueueItem(seed.item.id_text, seed.channel)]);

    const result = await fillAutoQueueAhead({
      config: createConfig({
        random: true,
      }),
      seed,
      resources: {},
      fetchers: harness.fetchers,
      activeRow: 0,
      minRowsAhead: 1,
      maxFetches: 5,
    });

    expect(harness.calls.channelShuffle.length).toBe(1);
    expect(result.fetchedCount).toBe(1);
    expect(result.appendedCount).toBe(0);
    expect(result.exhausted).toBe(false);
  });
});

describe('resolveAutoQueuePrevious', () => {
  it('steps back a loaded row without fetching, and restarts under shuffle', async () => {
    const harness = createFetchHarness();
    const seed = createSeed();

    const stepped = await resolveAutoQueuePrevious({
      config: createConfig(),
      seed,
      activeRow: 2,
      fetchers: harness.fetchers,
    });
    expect(stepped).toEqual({
      kind: 'step-back-row',
      row: 1,
    });
    expect(harness.calls.playlistListPosition.length).toBe(0);
    expect(harness.calls.itemsByPubDate.length).toBe(0);

    const shuffled = await resolveAutoQueuePrevious({
      config: createConfig({
        random: true,
      }),
      seed,
      activeRow: 0,
      fetchers: harness.fetchers,
    });
    expect(shuffled).toEqual({
      kind: 'restart',
    });
    expect(harness.calls.playlistListPosition.length).toBe(0);
    expect(harness.calls.itemsByPubDate.length).toBe(0);
  });

  it('loads the first playable playlist row when walking backward', async () => {
    const harness = createFetchHarness();
    const seed = createSeed();
    const playableItem = createItem('item-playable-backward', seed.channel);

    harness.responses.playlistListPosition.push([
      createPlaylistResource({
        item: createItem('item-removed-backward', seed.channel),
        sourceRemovedAt: '2026-01-01T00:00:00.000Z',
      }),
      createPlaylistResource({
        clip: createClip('clip-playable-backward', playableItem),
      }),
    ]);

    const result = await resolveAutoQueuePrevious({
      config: createConfig({
        playlist_id_text: 'playlist-1',
      }),
      seed,
      activeRow: 0,
      fetchers: harness.fetchers,
    });

    expect(harness.calls.playlistListPosition[0]?.direction).toBe('backward');
    expect(harness.calls.playlistListPosition[0]?.cursor.item_id_text).toBe(seed.item.id_text);
    expect(result.kind).toBe('load-previous');
    if (result.kind === 'load-previous') {
      expect(result.resource.item.id_text).toBe('item-playable-backward');
      expect(result.resource.channel.id_text).toBe(seed.channel.id_text);
    }
  });

  it('loads backward season and publish-date rows', async () => {
    const seasonHarness = createFetchHarness();
    const seasonSeed = createSeed(MediumEnum.Music);
    seasonHarness.responses.itemsBySeason.push([
      createQueueItem('item-season-prev', seasonSeed.channel),
    ]);
    const seasonResult = await resolveAutoQueuePrevious({
      config: createConfig(),
      seed: seasonSeed,
      activeRow: 0,
      fetchers: seasonHarness.fetchers,
    });
    expect(seasonHarness.calls.itemsBySeason[0]?.direction).toBe('backward');
    expect(seasonResult.kind).toBe('load-previous');

    const pubDateHarness = createFetchHarness();
    const pubDateSeed = createSeed(MediumEnum.Podcast);
    pubDateHarness.responses.itemsByPubDate.push([
      createQueueItem('item-pubdate-prev', pubDateSeed.channel),
    ]);
    const pubDateResult = await resolveAutoQueuePrevious({
      config: createConfig(),
      seed: pubDateSeed,
      activeRow: 0,
      fetchers: pubDateHarness.fetchers,
    });
    expect(pubDateHarness.calls.itemsByPubDate[0]?.direction).toBe('backward');
    expect(pubDateResult.kind).toBe('load-previous');
  });

  it('restarts when no backward row exists or when a row has no channel', async () => {
    const emptyHarness = createFetchHarness();
    const musicSeed = createSeed(MediumEnum.Music);
    emptyHarness.responses.itemsBySeason.push([]);
    const emptyResult = await resolveAutoQueuePrevious({
      config: createConfig(),
      seed: musicSeed,
      activeRow: 0,
      fetchers: emptyHarness.fetchers,
    });
    expect(emptyResult).toEqual({
      kind: 'restart',
    });

    const noChannelHarness = createFetchHarness();
    const podcastSeed = createSeed(MediumEnum.Podcast);
    noChannelHarness.responses.itemsByPubDate.push([createQueueItem('item-no-channel')]);
    const noChannelResult = await resolveAutoQueuePrevious({
      config: createConfig(),
      seed: podcastSeed,
      activeRow: 0,
      fetchers: noChannelHarness.fetchers,
    });
    expect(noChannelResult).toEqual({
      kind: 'restart',
    });
  });
});

describe('fetcher failures', () => {
  it('propagates fetcher errors from fillAutoQueueForward', async () => {
    const seed = createSeed();
    const error = new Error('fetch failed');
    const fetchers: AutoQueueSourceFetchers = {
      fetchPlaylistResourcesByListPosition: async () => {
        throw error;
      },
      fetchPlaylistResourcesByShuffle: async () => [],
      fetchPlaylistResourcesFirstPage: async () => [],
      fetchChannelItemsByShuffle: async () => [],
      fetchItemsBySeason: async () => [],
      fetchChannelItemsBySeasonFirstPage: async () => [],
      fetchItemsByPubDate: async () => [],
      fetchChannelItemsRecentFirstPage: async () => [],
    };

    await expect(
      fillAutoQueueForward({
        config: createConfig({
          playlist_id_text: 'playlist-1',
        }),
        seed,
        resources: {},
        fetchers,
      })
    ).rejects.toThrow('fetch failed');
  });
});
