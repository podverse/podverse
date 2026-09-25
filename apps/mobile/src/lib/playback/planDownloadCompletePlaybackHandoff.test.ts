import { describe, expect, it } from 'vitest';

import type { PlaybackTarget } from '@podverse/playback-core';

import type { DownloadCompleteHandoffRecord } from './planDownloadCompletePlaybackHandoff';
import {
  DOWNLOAD_HANDOFF_POSITION_TOLERANCE_SECONDS,
  isDownloadHandoffProgressLanded,
  planDownloadCompletePlaybackHandoff,
} from './planDownloadCompletePlaybackHandoff';

const identity = (uri: string): string => uri;

const itemTarget = {
  channel: { id_text: 'channel-1' },
  item: { id_text: 'item-1' },
  kind: 'item-podcast',
} as PlaybackTarget;

const clipTarget = {
  channel: { id_text: 'channel-1' },
  clip: { id_text: 'clip-1' },
  item: { id_text: 'item-1' },
  kind: 'clip',
} as PlaybackTarget;

const chapterTarget = {
  channel: { id_text: 'channel-1' },
  chapter: { id_text: 'chapter-1' },
  item: { id_text: 'item-1' },
  kind: 'chapter',
} as PlaybackTarget;

const soundbiteTarget = {
  channel: { id_text: 'channel-1' },
  item: { id_text: 'item-1' },
  kind: 'soundbite',
  soundbite: { id_text: 'soundbite-1' },
} as PlaybackTarget;

const addByRssTarget = {
  kind: 'add-by-rss',
  resourceData: { title: 'Local RSS' },
} as PlaybackTarget;

const livestreamTarget = {
  channel: { id_text: 'channel-1' },
  item: { id_text: 'item-1' },
  kind: 'livestream',
} as PlaybackTarget;

const completeRecord = (
  patch: Partial<DownloadCompleteHandoffRecord> = {}
): DownloadCompleteHandoffRecord => ({
  enclosureUri: 'https://cdn.example.com/ep.mp3',
  filePath: 'file:///downloads/item-1.mp3',
  itemIdText: 'item-1',
  status: 'complete',
  ...patch,
});

const plan = (patch: Partial<Parameters<typeof planDownloadCompletePlaybackHandoff>[0]> = {}) =>
  planDownloadCompletePlaybackHandoff({
    advancing: false,
    lastSourceUrl: 'https://cdn.example.com/ep.mp3',
    record: completeRecord(),
    rewriteEnclosureUrl: identity,
    target: itemTarget,
    ...patch,
  });

describe('planDownloadCompletePlaybackHandoff', () => {
  it('returns the local file when the streaming item and enclosure match', () => {
    expect(plan()).toEqual({ localUrl: 'file:///downloads/item-1.mp3' });
  });

  it('matches a clip, chapter, or soundbite through the parent item file', () => {
    expect(plan({ target: clipTarget })).toEqual({ localUrl: 'file:///downloads/item-1.mp3' });
    expect(plan({ target: chapterTarget })).toEqual({
      localUrl: 'file:///downloads/item-1.mp3',
    });
    expect(plan({ target: soundbiteTarget })).toEqual({
      localUrl: 'file:///downloads/item-1.mp3',
    });
  });

  it('compares the enclosure after the playback rewrite', () => {
    expect(
      plan({
        lastSourceUrl: 'http://127.0.0.1:2111/ep.mp3',
        record: completeRecord({ enclosureUri: 'http://localhost:2111/ep.mp3' }),
        rewriteEnclosureUrl: (uri) => uri.replace('localhost', '127.0.0.1'),
      })
    ).toEqual({ localUrl: 'file:///downloads/item-1.mp3' });
  });

  it('does not swap when the source is already local', () => {
    expect(plan({ lastSourceUrl: 'file:///downloads/item-1.mp3' })).toBeNull();
  });

  it('does not swap a different item or a different enclosure', () => {
    expect(plan({ record: completeRecord({ itemIdText: 'item-2' }) })).toBeNull();
    expect(
      plan({
        record: completeRecord({ enclosureUri: 'https://cdn.example.com/other.mp3' }),
      })
    ).toBeNull();
  });

  it('does not swap while the queue is advancing', () => {
    expect(plan({ advancing: true })).toBeNull();
  });

  it('ignores add-by-rss and livestream targets', () => {
    expect(plan({ target: addByRssTarget })).toBeNull();
    expect(plan({ target: livestreamTarget })).toBeNull();
    expect(plan({ target: null })).toBeNull();
  });

  it('ignores a row that is not a completed file URL', () => {
    expect(plan({ record: completeRecord({ status: 'downloading' }) })).toBeNull();
    expect(plan({ record: completeRecord({ filePath: null }) })).toBeNull();
    expect(plan({ record: completeRecord({ filePath: '/var/mobile/item-1.mp3' }) })).toBeNull();
  });
});

describe('isDownloadHandoffProgressLanded', () => {
  const tolerance = DOWNLOAD_HANDOFF_POSITION_TOLERANCE_SECONDS;

  it('drops samples until the engine is ready and near the captured seek', () => {
    expect(
      isDownloadHandoffProgressLanded({
        positionSeconds: 120,
        sawReady: false,
        seekSeconds: 120,
        toleranceSeconds: tolerance,
      })
    ).toBe(false);
    expect(
      isDownloadHandoffProgressLanded({
        positionSeconds: 0,
        sawReady: true,
        seekSeconds: 120,
        toleranceSeconds: tolerance,
      })
    ).toBe(false);
    expect(
      isDownloadHandoffProgressLanded({
        positionSeconds: 119.6,
        sawReady: true,
        seekSeconds: 120,
        toleranceSeconds: tolerance,
      })
    ).toBe(true);
  });

  it('accepts a near-zero seek once the engine is ready', () => {
    expect(
      isDownloadHandoffProgressLanded({
        positionSeconds: 0,
        sawReady: true,
        seekSeconds: 0.2,
        toleranceSeconds: tolerance,
      })
    ).toBe(true);
  });
});
