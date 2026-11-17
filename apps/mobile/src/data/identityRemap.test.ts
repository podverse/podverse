import { describe, expect, it } from 'vitest';

import type { IdentityRemapSnapshot } from './identityRemap';
import { directoryIdentityIds, remapIdentity } from './identityRemap';

const emptySnapshot = (): IdentityRemapSnapshot => ({
  applied: [],
  autoDownloadChannels: [],
  autoDownloadItems: [],
  channelItemChannelIds: [],
  channelLive: [],
  channelSeen: [],
  chrome: [],
  downloads: [],
  lastPlaybackIdText: null,
  playableItems: [],
  playback: [],
  playbackOutbox: [],
  playlistPayloads: [],
  playlistResourcePayloads: [],
  queueCachePresent: false,
  sectionChrome: [],
  sortKeys: [],
  subscribedChannels: [],
});

describe('directoryIdentityIds', () => {
  it('keeps directory ids and drops an Add by RSS download key that would fail the batch', () => {
    const addByRssDownloadId =
      'http://localhost:2111/e2e/v4-carryover/podcasting20.xml::PC20-276';

    expect(
      directoryIdentityIds([
        'e2ePc20Ep275',
        ' e2ePc20Ep274 ',
        addByRssDownloadId,
        'e2ePc20Ep275',
        '',
        'http://short.example/feed.xml::ep',
      ])
    ).toEqual(['e2ePc20Ep275', 'e2ePc20Ep274']);
  });
});

describe('remapIdentity', () => {
  it('keeps one subscription, the download file, and the further progress', () => {
    const snapshot: IdentityRemapSnapshot = {
      ...emptySnapshot(),
      channelSeen: [{ at: 5, key: 'https://example.com/feed.xml', kind: 'add-by-rss' }],
      downloads: [
        {
          channelIdText: 'old-channel',
          filePath: '/keep.mp3',
          itemIdText: 'old-item',
        },
      ],
      playback: [
        {
          accountIdText: 'acct',
          completed: false,
          lastMeaningfulAt: 1,
          mediaFileDuration: null,
          playbackPosition: 10,
          queueIdText: 'q',
          resourceIdText: 'old-item',
          resourceKind: 'item',
          zone: 'now_playing',
        },
        {
          accountIdText: 'acct',
          completed: true,
          lastMeaningfulAt: 2,
          mediaFileDuration: 60,
          playbackPosition: 40,
          queueIdText: 'q',
          resourceIdText: 'survivor-item',
          resourceKind: 'item',
          zone: 'history',
        },
      ],
      queueCachePresent: true,
      sortKeys: [{ idText: 'old-channel', scopeKind: 'channel' }],
      subscribedChannels: [
        {
          idText: 'old-channel',
          imageUrl: 'old.png',
          kind: 'podcasts',
          medium: 'podcasts',
          popularityRank: null,
          source: 'directory',
          title: 'Old',
        },
        {
          idText: 'survivor-channel',
          imageUrl: 'sur.png',
          kind: 'podcasts',
          medium: 'podcasts',
          popularityRank: 1,
          source: 'directory',
          title: 'Survivor',
        },
      ],
    };
    const incoming = {
      channels: [{ fromIdText: 'old-channel', toIdText: 'survivor-channel' }],
      items: [{ fromIdText: 'old-item', toIdText: 'survivor-item' }],
    };

    const first = remapIdentity(snapshot, incoming);

    expect(first.snapshot.subscribedChannels.map((channel) => channel.idText)).toEqual([
      'survivor-channel',
    ]);
    expect(first.snapshot.subscribedChannels[0]?.title).toBe('Survivor');
    expect(first.snapshot.downloads).toEqual([
      {
        channelIdText: 'survivor-channel',
        filePath: '/keep.mp3',
        itemIdText: 'survivor-item',
      },
    ]);
    expect(first.snapshot.playback).toEqual([
      {
        accountIdText: 'acct',
        completed: true,
        lastMeaningfulAt: 2,
        mediaFileDuration: 60,
        playbackPosition: 40,
        queueIdText: 'q',
        resourceIdText: 'survivor-item',
        resourceKind: 'item',
        zone: 'history',
      },
    ]);
    expect(first.snapshot.sortKeys).toEqual([{ idText: 'survivor-channel', scopeKind: 'channel' }]);
    expect(first.snapshot.channelSeen).toEqual([
      { at: 5, key: 'https://example.com/feed.xml', kind: 'add-by-rss' },
    ]);
    expect(first.snapshot.queueCachePresent).toBe(false);

    const second = remapIdentity(first.snapshot, incoming);

    expect(second.newMoves).toEqual({ channels: [], items: [] });
    expect(second.snapshot).toEqual(first.snapshot);
  });
});
