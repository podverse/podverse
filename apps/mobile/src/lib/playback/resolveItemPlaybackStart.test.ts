import { describe, expect, it } from 'vitest';

import type { DTOChannel, DTOItem, DTOItemEnclosure, DTOLiveItem } from '@podverse/helpers/dto';
import { LiveItemStatusEnum } from '@podverse/helpers/dto';
import { MediumEnum } from '@podverse/helpers/medium';
import type { QueueResourcesAbridgedIndex } from '@podverse/helpers/queue/abridged';
import { resolvePlaybackLoadDecision } from '@podverse/playback-core/resolvePlaybackLoadDecision';

import {
  playbackReloadSource,
  resolveItemPlaybackStart,
} from './buildPlaybackTarget';
import { lastPlaybackSnapshotFromTarget } from './lastPlaybackStorage';
import {
  buildItemLabeledEnclosures,
  resolveItemEnclosureUrl,
} from './resolveEnclosureUrl';

const emptyAbridged: QueueResourcesAbridgedIndex = {
  add_by_rss_resource_datas: {},
  clips: {},
  items: {},
  item_soundbites: {},
};

const liveItemFixture: DTOLiveItem = {
  id: 1,
  item_id: 1,
  live_item_status: { id: LiveItemStatusEnum.Live },
  live_item_status_id: LiveItemStatusEnum.Live,
  start_time: '2026-01-01T00:00:00.000Z',
};

const enclosureWithSource = (uri: string, type: string): DTOItemEnclosure => ({
  bitrate: null,
  codecs: null,
  height: null,
  id: 1,
  item_enclosure_default: true,
  item_enclosure_integrity: null,
  item_enclosure_sources: [{ content_type: type, id: 1, item_enclosure_id: 1, uri }],
  item_id: 1,
  language: null,
  length: null,
  rel: null,
  title: null,
  type,
});

const buildItem = (overrides: Partial<DTOItem> = {}): DTOItem => {
  const item: Partial<DTOItem> = {
    id: 1,
    id_text: 'itemABC',
    item_enclosures: [enclosureWithSource('https://cdn.example/ep.mp3', 'audio/mpeg')],
    live_item: null,
    ...overrides,
  };
  // Only the fields the start decision reads are populated.
  return item as DTOItem;
};

const channel = (mediumId: MediumEnum): DTOChannel => {
  const value: Partial<DTOChannel> = {
    id_text: 'ch1',
    medium_id: mediumId,
  };
  // Only medium_id is read when choosing an item target.
  return value as DTOChannel;
};

describe('resolveItemPlaybackStart', () => {
  it('loads a live item at the live edge and drops file resume', () => {
    const item = buildItem({
      item_enclosures: [
        enclosureWithSource(
          'https://cdn.example/live.m3u8?token=1',
          'application/vnd.apple.mpegurl'
        ),
      ],
      live_item: liveItemFixture,
    });
    const start = resolveItemPlaybackStart({
      channel: channel(MediumEnum.Music),
      explicitPlaybackSeconds: 90,
      intent: 'explicit_play',
      item,
      mediaFileDurationHintSeconds: 3600,
    });

    expect(start.target).toEqual({
      channel: channel(MediumEnum.Music),
      item,
      kind: 'livestream',
    });
    expect(start.explicitPlaybackSeconds).toBeUndefined();
    expect(start.mediaFileDurationHintSeconds).toBeUndefined();
    expect(lastPlaybackSnapshotFromTarget(start.target, 90, 3600)).toBeNull();
    expect(
      resolvePlaybackLoadDecision(
        { explicitPlaybackSeconds: 90, target: start.target },
        { abridged: emptyAbridged }
      )
    ).toMatchObject({
      initialSeekSeconds: 0,
      pauseAtSeconds: undefined,
      reason: 'livestream',
    });
  });

  it('keeps resume seconds and a file duration for a non-live item', () => {
    const item = buildItem();
    const start = resolveItemPlaybackStart({
      channel: channel(MediumEnum.Podcast),
      explicitPlaybackSeconds: 42,
      intent: 'explicit_play',
      item,
      mediaFileDurationHintSeconds: 1800,
    });

    expect(start.target.kind).toBe('item-podcast');
    expect(start.explicitPlaybackSeconds).toBe(42);
    expect(start.mediaFileDurationHintSeconds).toBe(1800);
  });

  it('selects the remote HLS enclosure for a live item', () => {
    const item = buildItem({
      item_enclosures: [
        enclosureWithSource('https://cdn.example/live.m3u8?token=1', 'audio/mpeg'),
      ],
      live_item: liveItemFixture,
    });
    const url = resolveItemEnclosureUrl({
      labeledItemEnclosures: buildItemLabeledEnclosures(item),
      selectedParams: {
        enclosureRowSelected: null,
        sourceRowSelected: null,
        type: 'default',
      },
    });

    expect(url).toBe('https://cdn.example/live.m3u8?token=1');
  });
});

describe('playbackReloadSource', () => {
  it('omits a start seek when reloading a livestream', () => {
    const item = buildItem({ live_item: liveItemFixture });
    const start = resolveItemPlaybackStart({
      channel: channel(MediumEnum.Podcast),
      intent: 'explicit_play',
      item,
    });

    expect(playbackReloadSource(start.target, 'https://cdn.example/live.m3u8', 40)).toEqual({
      url: 'https://cdn.example/live.m3u8',
    });
  });

  it('restores the file position when reloading a non-live item', () => {
    const start = resolveItemPlaybackStart({
      channel: channel(MediumEnum.Podcast),
      intent: 'explicit_play',
      item: buildItem(),
    });

    expect(playbackReloadSource(start.target, 'https://cdn.example/ep.mp3', 40)).toEqual({
      initialSeekSeconds: 40,
      url: 'https://cdn.example/ep.mp3',
    });
  });
});
