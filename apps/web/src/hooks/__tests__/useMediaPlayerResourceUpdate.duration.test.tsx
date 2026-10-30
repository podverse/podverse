/**
 * Every local load writes `mpDuration` for the item that just loaded. A live item writes 0
 * even when an earlier episode left a duration behind, and even when the load is not a
 * `livestream` target.
 */
import { cleanup, render } from '@testing-library/react';
import { useEffect } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type {
  DTOChannel,
  DTOItem,
  EnclosureSelectedParams,
  QueueResourcesAbridgedIndex,
} from '@podverse/helpers';
import { LiveItemStatusEnum, MediumEnum } from '@podverse/helpers';

import type { PlaybackLoadRequest, PlaybackTarget } from '../../lib/playback';
import {
  playbackTargetFromStandardLoad,
  playbackTargetLivestream,
  resolvePlaybackLoadDecision,
} from '../../lib/playback';
import type { MediaPlayerPlaybackLoadInput } from '../useMediaPlayerResourceUpdate';
import { useMediaPlayerResourceUpdate } from '../useMediaPlayerResourceUpdate';

const hoisted = vi.hoisted(() => ({
  setMPCurrentTime: vi.fn<(t: number) => void>(),
  setMPDuration: vi.fn<(duration: number) => void>(),
  updateNowPlaying: vi.fn(),
  abridgedRef: {
    current: {
      items: {},
      clips: {},
      item_soundbites: {},
      add_by_rss_resource_datas: {},
    } as QueueResourcesAbridgedIndex,
  },
}));

vi.mock('../../contexts/AddByRSSListContext', () => ({
  useAddByRSSListContext: () => ({
    setAddByRSSListContext: vi.fn(),
  }),
}));

vi.mock('../../contexts/AutoQueue', () => ({
  useAutoQueue: () => ({
    autoQueueConfig: {
      playlist_id_text: null,
      disabled: false,
      random: false,
      repeat: false,
      nextPage: 1,
      shuffleHash: '',
    },
    setAutoQueueConfig: vi.fn(),
    setAutoQueueResources: vi.fn(),
    setAutoQueueActiveRow: vi.fn(),
  }),
}));

vi.mock('../../contexts/MediaPlayer', () => ({
  useMediaPlayer: () => ({
    applyPlaybackLoad: (req: PlaybackLoadRequest) =>
      resolvePlaybackLoadDecision(req, { abridged: hoisted.abridgedRef.current }),
    setActivePlaybackTarget: vi.fn(),
    setPendingPlaybackDecision: vi.fn(),
    setMPAddByRSS: vi.fn(),
    setMPShouldPlay: vi.fn(),
    setMPChannel: vi.fn(),
    setMPClip: vi.fn(),
    setMPItem: vi.fn(),
    setMPItemChapter: vi.fn(),
    setMPItemChapterShouldSeek: vi.fn(),
    setMPItemSoundbite: vi.fn(),
    setMPItemLabeledItemEnclosures: vi.fn(),
    setMPEnclosureSelectedParams: vi.fn(),
    setMPIsPlaying: vi.fn(),
    setMPDuration: hoisted.setMPDuration,
    mpDuration: 999,
    mpEnclosureSelectedParams: null,
    mpItem: null,
  }),
}));

vi.mock('../../contexts/MediaPlayerCurrentTime', () => ({
  useMediaPlayerCurrentTime: () => ({
    setMPCurrentTime: hoisted.setMPCurrentTime,
  }),
}));

vi.mock('../../contexts/QueueResourcesAbridgedIndex', () => ({
  useQueueResourcesAbridgedIndex: () => ({
    queueResourcesAbridgedIndex: hoisted.abridgedRef.current,
  }),
}));

vi.mock('../useQueueResourceUpdateNowPlaying', () => ({
  useQueueResourcesUpdateNowPlaying: () => hoisted.updateNowPlaying,
}));

const defaultEnclosureParams: EnclosureSelectedParams = {
  type: 'default',
  enclosureRowSelected: null,
  sourceRowSelected: null,
};

const emptyAbridged = (): QueueResourcesAbridgedIndex => ({
  items: {},
  clips: {},
  item_soundbites: {},
  add_by_rss_resource_datas: {},
});

const channel = (mediumId: number): DTOChannel =>
  ({
    id: 1,
    medium_id: mediumId,
    podcast_index_id: '0',
  }) as unknown as DTOChannel;

const item = (id: number, live = false): DTOItem =>
  ({
    id,
    id_text: `item-${id}`,
    ...(live
      ? {
          live_item: {
            id,
            item_id: id,
            live_item_status: { id: LiveItemStatusEnum.Live },
            live_item_status_id: LiveItemStatusEnum.Live,
            start_time: '2026-01-01T00:00:00.000Z',
          },
        }
      : {}),
  }) as unknown as DTOItem;

const autoQueueConfig = {
  playlist_id_text: null,
  disabled: false,
  random: false,
  repeat: false,
  nextPage: 1,
  shuffleHash: '',
};

function Probe({ args }: { args: MediaPlayerPlaybackLoadInput }) {
  const update = useMediaPlayerResourceUpdate();
  useEffect(() => {
    update(args);
  }, [update, args]);
  return null;
}

function load(args: {
  target: PlaybackTarget;
  abridged?: QueueResourcesAbridgedIndex;
  mediaFileDurationHintSeconds?: number;
}) {
  hoisted.abridgedRef.current = args.abridged ?? emptyAbridged();
  const input: MediaPlayerPlaybackLoadInput = {
    target: args.target,
    mediaFileDurationHintSeconds: args.mediaFileDurationHintSeconds,
    itemChapterShouldSeek: false,
    enclosureSelectedParams: defaultEnclosureParams,
    skipMoveNowPlayingToHistory: false,
    newAutoQueueConfig: autoQueueConfig,
    autoQueueShouldClear: false,
  };
  render(<Probe args={input} />);
}

beforeEach(() => {
  hoisted.setMPCurrentTime.mockClear();
  hoisted.setMPDuration.mockClear();
  hoisted.updateNowPlaying.mockClear();
  hoisted.abridgedRef.current = emptyAbridged();
});

afterEach(() => {
  cleanup();
});

describe('useMediaPlayerResourceUpdate duration on load', () => {
  it('sets mpDuration from the abridged row when the previous duration was a different number', () => {
    load({
      target: playbackTargetFromStandardLoad({
        channel: channel(MediumEnum.Podcast),
        clip: null,
        item: item(10),
        itemChapter: null,
        itemSoundbite: null,
        musicIntent: 'explicit_play',
      }),
      abridged: {
        ...emptyAbridged(),
        items: { 10: { p: '40', d: '3000' } },
      },
    });

    expect(hoisted.setMPDuration).toHaveBeenCalledWith(3000);
    expect(hoisted.setMPDuration).not.toHaveBeenCalledWith(999);
    expect(hoisted.setMPCurrentTime).toHaveBeenCalledWith(40);
    expect(hoisted.updateNowPlaying).toHaveBeenCalledWith(
      expect.objectContaining({ mpDuration: 3000, mpCurrentTime: 40 })
    );
  });

  it('sets mpDuration and mpCurrentTime to 0 for a livestream target', () => {
    load({
      target: playbackTargetLivestream(channel(MediumEnum.Podcast), item(40, true)),
      abridged: {
        ...emptyAbridged(),
        items: { 40: { p: '90', d: '1800' } },
      },
      mediaFileDurationHintSeconds: 5400,
    });

    expect(hoisted.setMPDuration).toHaveBeenCalledWith(0);
    expect(hoisted.setMPDuration).not.toHaveBeenCalledWith(5400);
    expect(hoisted.setMPCurrentTime).toHaveBeenCalledWith(0);
    expect(hoisted.updateNowPlaying).toHaveBeenCalledWith(
      expect.objectContaining({ mpDuration: 0, mpCurrentTime: 0 })
    );
  });

  it('sets mpDuration to 0 when an item-podcast target item has live_item set', () => {
    load({
      target: playbackTargetFromStandardLoad({
        channel: channel(MediumEnum.Podcast),
        clip: null,
        item: item(10, true),
        itemChapter: null,
        itemSoundbite: null,
        musicIntent: 'explicit_play',
      }),
      abridged: {
        ...emptyAbridged(),
        items: { 10: { p: '150', d: '3000' } },
      },
    });

    expect(hoisted.setMPDuration).toHaveBeenCalledWith(0);
    expect(hoisted.setMPDuration).not.toHaveBeenCalledWith(3000);
    expect(hoisted.setMPCurrentTime).toHaveBeenCalledWith(0);
    expect(hoisted.setMPCurrentTime).not.toHaveBeenCalledWith(150);
    expect(hoisted.updateNowPlaying).toHaveBeenCalledWith(
      expect.objectContaining({ mpDuration: 0, mpCurrentTime: 0 })
    );
  });

  it('sets mpDuration to 0 when the load has no hint and no row duration', () => {
    load({
      target: playbackTargetFromStandardLoad({
        channel: channel(MediumEnum.Podcast),
        clip: null,
        item: item(7),
        itemChapter: null,
        itemSoundbite: null,
        musicIntent: 'explicit_play',
      }),
    });

    expect(hoisted.setMPDuration).toHaveBeenCalledWith(0);
    expect(hoisted.updateNowPlaying).toHaveBeenCalledWith(
      expect.objectContaining({ mpDuration: 0, mpCurrentTime: 0 })
    );
  });
});
