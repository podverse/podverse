import { describe, expect, it } from 'vitest';

import type {
  DTOAccount,
  DTOChannel,
  DTOClip,
  DTOItem,
  DTOItemChapter,
  DTOItemQueueItem,
  DTOItemSoundbite,
  DTOPlaylistResource,
  DTOSharableStatus,
} from '@podverse/helpers';
import { MediumEnum } from '@podverse/helpers/medium';

import {
  type AutoQueueConfig,
  type AutoQueueResourcesMap,
  type AutoQueueResourcesMapRow,
  autoQueueRowFromPlaylistResource,
  type AutoQueueSeed,
  autoQueueSeedFromPlaybackTarget,
  countAutoQueueRowsAhead,
  createDefaultAutoQueueConfig,
  dedupeAutoQueueResources,
  hasAutoQueueRowAfter,
  isPlayablePlaylistResource,
  resolveAutoQueueConfigForExplicitPlay,
  resolveAutoQueueSource,
  selectAutoQueueRowsAhead,
  toggleAutoQueueRepeat,
  toggleAutoQueueShuffle,
} from '../autoQueue.js';

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

function createSoundbite(idText: string, item: DTOItem | null): DTOItemSoundbite {
  return {
    id: takeId(),
    id_text: idText,
    item_id: item?.id ?? takeId(),
    start_time: '0',
    duration: '30',
    item,
  };
}

function createPlaylistResource(options: {
  clip?: DTOClip;
  itemSoundbite?: DTOItemSoundbite;
  item?: DTOItem;
  sourceRemovedAt?: string | null;
}): DTOPlaylistResource {
  const id = takeId();
  const inferredItem = options.item ?? options.clip?.item ?? options.itemSoundbite?.item ?? null;
  return {
    id,
    playlist_id: takeId(),
    list_position: `${id}`,
    clip: options.clip,
    clip_id: options.clip?.id ?? null,
    item: inferredItem,
    item_id: inferredItem?.id ?? null,
    item_soundbite: options.itemSoundbite,
    item_soundbite_id: options.itemSoundbite?.id ?? null,
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

function createRowFromItem(item: DTOItemQueueItem): AutoQueueResourcesMapRow {
  return {
    item,
    clip: null,
    item_soundbite: null,
    channel: item.channel ?? null,
  };
}

describe('autoQueue policy helpers', () => {
  it('resolves each auto-queue source and respects disabled config', () => {
    const podcastSeed = createSeed(MediumEnum.Podcast);
    const musicSeed = createSeed(MediumEnum.Music);

    expect(
      resolveAutoQueueSource(
        createConfig({
          playlist_id_text: 'playlist-1',
        }),
        podcastSeed
      )
    ).toEqual({
      kind: 'playlist-list-position',
      playlistIdText: 'playlist-1',
    });

    expect(
      resolveAutoQueueSource(
        createConfig({
          playlist_id_text: 'playlist-1',
          random: true,
        }),
        podcastSeed
      )
    ).toEqual({
      kind: 'playlist-shuffle',
      playlistIdText: 'playlist-1',
    });

    expect(
      resolveAutoQueueSource(
        createConfig({
          random: true,
        }),
        podcastSeed
      )
    ).toEqual({
      kind: 'channel-shuffle',
      channelIdText: podcastSeed.channel.id_text,
    });

    expect(resolveAutoQueueSource(createConfig(), musicSeed)).toEqual({
      kind: 'channel-season',
      channelIdText: musicSeed.channel.id_text,
    });

    expect(resolveAutoQueueSource(createConfig(), podcastSeed)).toEqual({
      kind: 'channel-pub-date',
      channelIdText: podcastSeed.channel.id_text,
    });

    expect(resolveAutoQueueSource(createConfig({ disabled: true }), podcastSeed)).toBeNull();

    expect(resolveAutoQueueSource(createConfig({ playlist_id_text: '' }), podcastSeed)).toEqual({
      kind: 'channel-pub-date',
      channelIdText: podcastSeed.channel.id_text,
    });
  });

  it('checks whether a playlist resource is playable', () => {
    const channel = createChannel('channel-playable');
    const item = createItem('item-playable', channel);

    expect(
      isPlayablePlaylistResource(
        createPlaylistResource({
          item,
          sourceRemovedAt: '2026-01-01T00:00:00.000Z',
        })
      )
    ).toBe(false);

    const removedClip = createClip('clip-removed', item);
    removedClip.source_removed_at = '2026-01-02T00:00:00.000Z';
    expect(
      isPlayablePlaylistResource(
        createPlaylistResource({
          clip: removedClip,
        })
      )
    ).toBe(false);

    expect(
      isPlayablePlaylistResource(
        createPlaylistResource({
          clip: createClip('clip-no-item', null),
        })
      )
    ).toBe(false);

    expect(
      isPlayablePlaylistResource(
        createPlaylistResource({
          itemSoundbite: createSoundbite('soundbite-no-item', null),
        })
      )
    ).toBe(false);

    expect(
      isPlayablePlaylistResource(
        createPlaylistResource({
          item,
        })
      )
    ).toBe(true);
  });

  it('maps playlist resources by clip, then soundbite, then item', () => {
    const channelA = createChannel('channel-a');
    const channelB = createChannel('channel-b');
    const channelC = createChannel('channel-c');

    const clipItem = createItem('clip-item', channelA);
    const soundbiteItem = createItem('soundbite-item', channelB);
    const plainItem = createItem('plain-item', channelC);

    const clipRow = autoQueueRowFromPlaylistResource(
      createPlaylistResource({
        clip: createClip('clip-1', clipItem),
        itemSoundbite: createSoundbite('soundbite-1', soundbiteItem),
        item: plainItem,
      })
    );
    expect(clipRow?.clip?.id_text).toBe('clip-1');
    expect(clipRow?.item.id_text).toBe('clip-item');
    expect(clipRow?.channel?.id_text).toBe('channel-a');

    const soundbiteRow = autoQueueRowFromPlaylistResource(
      createPlaylistResource({
        itemSoundbite: createSoundbite('soundbite-2', soundbiteItem),
        item: plainItem,
      })
    );
    expect(soundbiteRow?.item_soundbite?.id_text).toBe('soundbite-2');
    expect(soundbiteRow?.item.id_text).toBe('soundbite-item');
    expect(soundbiteRow?.channel?.id_text).toBe('channel-b');

    const itemRow = autoQueueRowFromPlaylistResource(
      createPlaylistResource({
        item: plainItem,
      })
    );
    expect(itemRow?.clip).toBeNull();
    expect(itemRow?.item_soundbite).toBeNull();
    expect(itemRow?.item.id_text).toBe('plain-item');
    expect(itemRow?.channel?.id_text).toBe('channel-c');
  });

  it('dedupes rows by clip, soundbite, then item and renumbers keys', () => {
    const clipItemA = createItem('clip-item-a', createChannel('channel-clip-a'));
    const clipItemB = createItem('clip-item-b', createChannel('channel-clip-b'));
    const clipA = createClip('clip-a', clipItemA);
    const clipB = createClip('clip-b', clipItemB);
    const soundbiteItem = createItem('soundbite-item', createChannel('channel-soundbite'));
    const soundbiteA = createSoundbite('soundbite-a', soundbiteItem);
    const itemX = createQueueItem('item-x', createChannel('channel-item-x'));

    const deduped = dedupeAutoQueueResources({
      0: { item: clipItemA, clip: clipA, item_soundbite: null, channel: clipItemA.channel ?? null },
      1: { item: clipItemA, clip: clipA, item_soundbite: null, channel: clipItemA.channel ?? null },
      2: {
        item: soundbiteItem,
        clip: null,
        item_soundbite: soundbiteA,
        channel: soundbiteItem.channel ?? null,
      },
      3: {
        item: soundbiteItem,
        clip: null,
        item_soundbite: soundbiteA,
        channel: soundbiteItem.channel ?? null,
      },
      4: createRowFromItem(itemX),
      5: createRowFromItem(createQueueItem('item-x', createChannel('channel-item-x-2'))),
      6: { item: clipItemB, clip: clipB, item_soundbite: null, channel: clipItemB.channel ?? null },
    });

    expect(Object.keys(deduped)).toEqual(['0', '1', '2', '3']);
    expect(deduped[0]?.clip?.id_text).toBe('clip-a');
    expect(deduped[1]?.item_soundbite?.id_text).toBe('soundbite-a');
    expect(deduped[2]?.item.id_text).toBe('item-x');
    expect(deduped[3]?.clip?.id_text).toBe('clip-b');
  });

  it('selects contiguous rows ahead with count and limit semantics', () => {
    const channel = createChannel('channel-ahead');
    const resourcesWithGap: AutoQueueResourcesMap = {
      0: createRowFromItem(createQueueItem('item-0', channel)),
      1: createRowFromItem(createQueueItem('item-1', channel)),
      3: createRowFromItem(createQueueItem('item-3', channel)),
    };

    expect(countAutoQueueRowsAhead(resourcesWithGap, 0)).toBe(1);
    expect(selectAutoQueueRowsAhead(resourcesWithGap, 0, 5).map((row) => row.item.id_text)).toEqual(
      ['item-1']
    );
    expect(hasAutoQueueRowAfter(resourcesWithGap, 1)).toBe(false);

    const contiguous: AutoQueueResourcesMap = {
      0: createRowFromItem(createQueueItem('item-c0', channel)),
      1: createRowFromItem(createQueueItem('item-c1', channel)),
      2: createRowFromItem(createQueueItem('item-c2', channel)),
      3: createRowFromItem(createQueueItem('item-c3', channel)),
    };
    expect(countAutoQueueRowsAhead(contiguous, 1)).toBe(2);
    expect(selectAutoQueueRowsAhead(contiguous, 1, 1).map((row) => row.item.id_text)).toEqual([
      'item-c2',
    ]);
    expect(countAutoQueueRowsAhead(contiguous, null)).toBe(3);
  });

  it('applies config transitions for default, explicit play, shuffle, and repeat', () => {
    let hashCounter = 0;
    const nextShuffleHash = () => {
      hashCounter += 1;
      return `hash-${hashCounter}`;
    };

    expect(createDefaultAutoQueueConfig(nextShuffleHash)).toEqual({
      playlist_id_text: null,
      disabled: false,
      random: false,
      repeat: false,
      nextPage: 1,
      shuffleHash: 'hash-1',
    });

    const current = createConfig({
      playlist_id_text: 'playlist-old',
      disabled: true,
      random: true,
      repeat: true,
      nextPage: 9,
      shuffleHash: 'hash-seed',
    });

    expect(resolveAutoQueueConfigForExplicitPlay(current, 'playlist-new', nextShuffleHash)).toEqual(
      {
        playlist_id_text: 'playlist-new',
        disabled: false,
        random: true,
        repeat: true,
        nextPage: 1,
        shuffleHash: 'hash-2',
      }
    );

    expect(toggleAutoQueueShuffle(current, nextShuffleHash)).toEqual({
      playlist_id_text: 'playlist-old',
      disabled: true,
      random: false,
      repeat: true,
      nextPage: 1,
      shuffleHash: 'hash-3',
    });

    expect(toggleAutoQueueRepeat(current)).toEqual({
      playlist_id_text: 'playlist-old',
      disabled: true,
      random: true,
      repeat: false,
      nextPage: 1,
      shuffleHash: 'hash-seed',
    });
  });

  it('builds an auto-queue seed from playback targets and skips add-by-rss/livestream', () => {
    const channel = createChannel('channel-target');
    const item = createItem('item-target', channel);
    const clip = createClip('clip-target', item);
    const soundbite = createSoundbite('soundbite-target', item);
    const chapter: DTOItemChapter = {
      id: takeId(),
      id_text: 'chapter-target',
      item_chapters_feed_id: takeId(),
      data_hash: 'hash',
      start_time: '30',
      table_of_contents: false,
    };

    expect(
      autoQueueSeedFromPlaybackTarget({
        kind: 'clip',
        clip,
        item,
        channel,
      })
    ).toEqual({
      item,
      channel,
      clip,
      item_soundbite: null,
    });

    expect(
      autoQueueSeedFromPlaybackTarget({
        kind: 'soundbite',
        soundbite,
        item,
        channel,
      })
    ).toEqual({
      item,
      channel,
      clip: null,
      item_soundbite: soundbite,
    });

    expect(
      autoQueueSeedFromPlaybackTarget({
        kind: 'chapter',
        chapter,
        item,
        channel,
      })
    ).toEqual({
      item,
      channel,
      clip: null,
      item_soundbite: null,
    });

    expect(
      autoQueueSeedFromPlaybackTarget({
        kind: 'item-podcast',
        item,
        channel,
      })
    ).toEqual({
      item,
      channel,
      clip: null,
      item_soundbite: null,
    });

    expect(
      autoQueueSeedFromPlaybackTarget({
        kind: 'add-by-rss',
        resourceData: {},
      })
    ).toBeNull();

    expect(
      autoQueueSeedFromPlaybackTarget({
        kind: 'livestream',
        channel,
        item: null,
      })
    ).toBeNull();
  });
});
