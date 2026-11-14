import { describe, expect, it } from 'vitest';

import {
  DEVICE_PLAYBACK_ACCOUNT_ID,
  DEVICE_PLAYBACK_QUEUE_ID,
} from '../lib/playback/devicePlaybackKey';
import type { AddByRssPromotionMove, AddByRssPromotionSnapshot } from './addByRssPromotionRemap';
import { addByRssPromotionRemap } from './addByRssPromotionRemap';
import type { IdentityPlayback } from './identityRemap';

const FEED = 'https://example.com/show.xml';
const CHANNEL = 'chan1';
const HASH = 'hash-ep';
const DOWNLOAD = `${FEED}::ep-1`;
const UNMATCHED = `${FEED}::ep-2`;
const ITEM = 'item-1';

const move: AddByRssPromotionMove = {
  channelIdText: CHANNEL,
  channelTitle: 'Directory Show',
  feedUrl: FEED,
  items: [{ downloadIdText: DOWNLOAD, hashId: HASH, itemIdText: ITEM }],
  mediumId: 1,
};

const emptySnapshot = (): AddByRssPromotionSnapshot => ({
  autoDownloadCandidates: [],
  autoDownloadChannels: [],
  channelLive: [],
  channelSeen: [],
  downloads: [],
  feedPlaybackPosition: null,
  listedFeeds: [],
  playableItems: [],
  playback: [],
  playbackOutbox: [],
  sectionChrome: [],
  subscribedChannelIds: [],
});

const playback = (
  resourceKind: string,
  resourceIdText: string,
  playbackPosition: number,
  completed = false
): IdentityPlayback => ({
  accountIdText: 'acct',
  completed,
  lastMeaningfulAt: 4,
  mediaFileDuration: null,
  playbackPosition,
  queueIdText: 'queue',
  resourceIdText,
  resourceKind,
  zone: 'history',
});

describe('addByRssPromotionRemap', () => {
  it('rewrites every local table and leaves an unmatched episode alone', () => {
    const snapshot: AddByRssPromotionSnapshot = {
      ...emptySnapshot(),
      autoDownloadCandidates: [
        { channelIdText: FEED, itemIdText: DOWNLOAD, status: 'downloaded' },
        { channelIdText: FEED, itemIdText: UNMATCHED, status: 'skipped' },
      ],
      autoDownloadChannels: [
        {
          allowCellular: 0,
          channelIdText: FEED,
          enabled: 1,
          enabledAt: 3,
          source: 'add_by_rss',
        },
      ],
      channelLive: [{ at: 6, key: FEED, kind: 'add-by-rss', statusId: 2 }],
      channelSeen: [{ at: 5, key: FEED, kind: 'add-by-rss' }],
      downloads: [
        { channelIdText: FEED, filePath: '/matched.mp3', itemIdText: DOWNLOAD },
        { channelIdText: FEED, filePath: '/unmatched.mp3', itemIdText: UNMATCHED },
      ],
      feedPlaybackPosition: `{"${HASH}":90}`,
      listedFeeds: [
        {
          artworkChecked: false,
          channelIdText: null,
          channelTitle: null,
          feedGuid: 'artist-guid',
          feedUrl: null,
          imageUrl: null,
          itemGuids: [],
          kind: 'add_by_rss',
          listedAtChannelLevel: true,
          mediumId: null,
          pendingRequestId: null,
          position: 0,
          publisherFeedUrl: FEED,
          title: 'Artist',
          unresolvedReason: null,
        },
        {
          artworkChecked: false,
          channelIdText: null,
          channelTitle: null,
          feedGuid: 'album-guid',
          feedUrl: FEED,
          imageUrl: null,
          itemGuids: [],
          kind: 'add_by_rss',
          listedAtChannelLevel: true,
          mediumId: null,
          pendingRequestId: 'pending',
          position: 1,
          publisherFeedUrl: 'https://example.com/artist.xml',
          title: 'Album',
          unresolvedReason: null,
        },
      ],
      playableItems: [
        { itemIdText: DOWNLOAD, payloadJson: '{"id_text":"hash-ep"}', source: 'download' },
        { itemIdText: 'live-1', payloadJson: '{}', source: 'live' },
      ],
      playback: [playback('add_by_rss', HASH, 12)],
      playbackOutbox: [
        {
          completed: false,
          id: 7,
          playbackPosition: 4,
          resourceIdText: HASH,
          resourceKind: 'add_by_rss',
        },
      ],
      sectionChrome: [
        { flagsJson: '{"hasPeople":true}', key: `channel:${FEED}`, updatedAt: 1 },
        { flagsJson: '{"hasChapters":true}', key: `item:${DOWNLOAD}`, updatedAt: 2 },
      ],
    };

    const result = addByRssPromotionRemap(snapshot, move);

    expect(result.snapshot.subscribedChannelIds).toEqual([CHANNEL]);
    expect(result.snapshot.feedPlaybackPosition).toBeNull();
    expect(result.snapshot.downloads).toEqual([
      { channelIdText: CHANNEL, filePath: '/matched.mp3', itemIdText: ITEM },
      { channelIdText: FEED, filePath: '/unmatched.mp3', itemIdText: UNMATCHED },
    ]);
    expect(result.movedDownloadItemIds).toEqual([{ fromItemIdText: DOWNLOAD, toItemIdText: ITEM }]);
    expect(result.snapshot.playableItems).toEqual([
      { itemIdText: ITEM, payloadJson: `{"id_text":"${ITEM}"}`, source: 'download' },
      { itemIdText: 'live-1', payloadJson: '{}', source: 'live' },
    ]);
    expect(result.snapshot.playback).toEqual([
      { ...playback('item', ITEM, 90), accountIdText: 'acct', queueIdText: 'queue' },
    ]);
    expect(result.snapshot.playbackOutbox).toEqual([
      {
        completed: false,
        id: 7,
        playbackPosition: 4,
        resourceIdText: ITEM,
        resourceKind: 'item',
      },
    ]);
    expect(result.snapshot.channelSeen).toEqual([{ at: 5, key: CHANNEL, kind: 'channel' }]);
    expect(result.snapshot.channelLive).toEqual([
      { at: 6, key: CHANNEL, kind: 'channel', statusId: 2 },
    ]);
    expect(result.snapshot.autoDownloadChannels).toEqual([
      {
        allowCellular: 0,
        channelIdText: CHANNEL,
        enabled: 1,
        enabledAt: 3,
        source: 'directory',
      },
    ]);
    expect(result.snapshot.autoDownloadCandidates).toEqual([
      { channelIdText: CHANNEL, itemIdText: ITEM, status: 'downloaded' },
      { channelIdText: FEED, itemIdText: UNMATCHED, status: 'skipped' },
    ]);
    expect(result.snapshot.sectionChrome).toEqual([
      { flagsJson: '{"hasPeople":true}', key: `channel:${CHANNEL}`, updatedAt: 1 },
      { flagsJson: '{"hasChapters":true}', key: `item:${ITEM}`, updatedAt: 2 },
    ]);
    expect(result.snapshot.listedFeeds).toEqual([
      {
        artworkChecked: false,
        channelIdText: CHANNEL,
        channelTitle: 'Directory Show',
        feedGuid: 'album-guid',
        feedUrl: null,
        imageUrl: null,
        itemGuids: [],
        kind: 'directory',
        listedAtChannelLevel: true,
        mediumId: 1,
        pendingRequestId: null,
        position: 1,
        publisherFeedUrl: 'https://example.com/artist.xml',
        title: 'Album',
        unresolvedReason: null,
      },
    ]);

    const again = addByRssPromotionRemap(result.snapshot, move);
    expect(again.snapshot).toEqual(result.snapshot);
    expect(again.downloadFilesToDelete).toEqual([]);
    expect(again.movedDownloadItemIds).toEqual([]);
  });

  it('keeps a completed playback row, otherwise the further position', () => {
    const completed = addByRssPromotionRemap(
      {
        ...emptySnapshot(),
        playback: [playback('add_by_rss', HASH, 99), playback('item', ITEM, 3, true)],
      },
      move
    );
    expect(completed.snapshot.playback).toEqual([playback('item', ITEM, 3, true)]);

    const further = addByRssPromotionRemap(
      {
        ...emptySnapshot(),
        playback: [playback('add_by_rss', HASH, 10), playback('item', ITEM, 50)],
      },
      move
    );
    expect(further.snapshot.playback).toEqual([playback('item', ITEM, 50)]);
  });

  it('stores a feed-level position on the device playback key when no row exists yet', () => {
    const result = addByRssPromotionRemap({ ...emptySnapshot(), feedPlaybackPosition: '15' }, move);
    expect(result.snapshot.playback).toEqual([
      {
        accountIdText: DEVICE_PLAYBACK_ACCOUNT_ID,
        completed: false,
        lastMeaningfulAt: 0,
        mediaFileDuration: null,
        playbackPosition: 15,
        queueIdText: DEVICE_PLAYBACK_QUEUE_ID,
        resourceIdText: ITEM,
        resourceKind: 'item',
        zone: 'history',
      },
    ]);
  });

  it('keeps the later seen and live rows', () => {
    const result = addByRssPromotionRemap(
      {
        ...emptySnapshot(),
        channelLive: [
          { at: 1, key: CHANNEL, kind: 'channel', statusId: 1 },
          { at: 9, key: FEED, kind: 'add-by-rss', statusId: 2 },
        ],
        channelSeen: [
          { at: 2, key: CHANNEL, kind: 'channel' },
          { at: 8, key: FEED, kind: 'add-by-rss' },
        ],
      },
      move
    );
    expect(result.snapshot.channelSeen).toEqual([{ at: 8, key: CHANNEL, kind: 'channel' }]);
    expect(result.snapshot.channelLive).toEqual([
      { at: 9, key: CHANNEL, kind: 'channel', statusId: 2 },
    ]);
  });

  it('keeps the directory download and deletes the other file only when the paths differ', () => {
    const different = addByRssPromotionRemap(
      {
        ...emptySnapshot(),
        downloads: [
          { channelIdText: CHANNEL, filePath: '/keep.mp3', itemIdText: ITEM },
          { channelIdText: FEED, filePath: '/drop.mp3', itemIdText: DOWNLOAD },
        ],
      },
      move
    );
    expect(different.snapshot.downloads).toEqual([
      { channelIdText: CHANNEL, filePath: '/keep.mp3', itemIdText: ITEM },
    ]);
    expect(different.downloadFilesToDelete).toEqual(['/drop.mp3']);
    expect(different.movedDownloadItemIds).toEqual([]);

    const shared = addByRssPromotionRemap(
      {
        ...emptySnapshot(),
        downloads: [
          { channelIdText: CHANNEL, filePath: '/same.mp3', itemIdText: ITEM },
          { channelIdText: FEED, filePath: '/same.mp3', itemIdText: DOWNLOAD },
        ],
      },
      move
    );
    expect(shared.downloadFilesToDelete).toEqual([]);
    expect(shared.snapshot.downloads).toEqual([
      { channelIdText: CHANNEL, filePath: '/same.mp3', itemIdText: ITEM },
    ]);
  });

  it('keeps the directory auto-download row', () => {
    const result = addByRssPromotionRemap(
      {
        ...emptySnapshot(),
        autoDownloadChannels: [
          {
            allowCellular: 1,
            channelIdText: CHANNEL,
            enabled: 1,
            enabledAt: 2,
            source: 'directory',
          },
          {
            allowCellular: 0,
            channelIdText: FEED,
            enabled: 0,
            enabledAt: 1,
            source: 'add_by_rss',
          },
        ],
      },
      move
    );
    expect(result.snapshot.autoDownloadChannels).toEqual([
      {
        allowCellular: 1,
        channelIdText: CHANNEL,
        enabled: 1,
        enabledAt: 2,
        source: 'directory',
      },
    ]);
  });
});
