/**
 * Pins the 5-second near-end clamp behavior for playback loads routed through
 * `resolvePlaybackLoadDecision` + `useMediaPlayerResourceUpdate`.
 *
 * Matrix reference:
 * [MEDIA-PLAYER-DECISION-MATRIX.md](../../components/MediaPlayer/MEDIA-PLAYER-DECISION-MATRIX.md)
 * § 6 "Near-end clamp / 5-second rule".
 */
import { cleanup, render } from '@testing-library/react';
import { useEffect } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type {
  DTOChannel,
  DTOClip,
  DTOItem,
  DTOItemSoundbite,
  EnclosureSelectedParams,
  QueueResourcesAbridgedIndex,
} from '@podverse/helpers';
import { ACCOUNT_PLAYBACK_STREAM_EVENT, MediumEnum } from '@podverse/helpers';

import { crossDevicePlaybackStore } from '../../lib/crossDevicePlayback/crossDevicePlaybackStore';
import type { PlaybackLoadRequest } from '../../lib/playback';
import { playbackTargetFromStandardLoad, resolvePlaybackLoadDecision } from '../../lib/playback';
import type { MediaPlayerPlaybackLoadInput } from '../useMediaPlayerResourceUpdate';
import { useMediaPlayerResourceUpdate } from '../useMediaPlayerResourceUpdate';

const hoisted = vi.hoisted(() => ({
  setMPCurrentTime: vi.fn<(t: number) => void>(),
  setMPItemLabeledItemEnclosures: vi.fn(),
  updateNowPlaying: vi.fn(),
  reqAccountPlaybackSendCommand: vi.fn(() => Promise.resolve()),
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
    setMPItemLabeledItemEnclosures: hoisted.setMPItemLabeledItemEnclosures,
    setMPEnclosureSelectedParams: vi.fn(),
    setMPIsPlaying: vi.fn(),
    setMPDuration: vi.fn(),
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

vi.mock('../../factories/apiRequestService', () => ({
  getApiRequestService: () => ({
    reqAccountPlaybackSendCommand: hoisted.reqAccountPlaybackSendCommand,
  }),
}));

const defaultEnclosureParams: EnclosureSelectedParams = {
  type: 'default',
  enclosureRowSelected: null,
  sourceRowSelected: null,
};

const channel = (mediumId: number): DTOChannel =>
  ({
    id: 1,
    medium_id: mediumId,
    podcast_index_id: '0',
  }) as unknown as DTOChannel;

const item = (id: number): DTOItem =>
  ({
    id,
    id_text: `item-${id}`,
  }) as unknown as DTOItem;

const clip = (id: number, clipItem: DTOItem): DTOClip =>
  ({
    id,
    id_text: `clip-${id}`,
    start_time: 0,
    end_time: 60,
    item: clipItem,
  }) as unknown as DTOClip;

const soundbite = (id: number, sbItem: DTOItem): DTOItemSoundbite =>
  ({
    id,
    start_time: 0,
    duration: 15,
    item: sbItem,
  }) as unknown as DTOItemSoundbite;

type UpdateArgs = MediaPlayerPlaybackLoadInput;

function Probe({ args }: { args: UpdateArgs }) {
  const update = useMediaPlayerResourceUpdate();
  useEffect(() => {
    update(args);
  }, [update, args]);
  return null;
}

function dispatch(
  abridged: QueueResourcesAbridgedIndex,
  args: {
    channel: DTOChannel;
    clip?: DTOClip | null;
    item: DTOItem;
    itemSoundbite?: DTOItemSoundbite | null;
  }
) {
  hoisted.abridgedRef.current = abridged;
  const merged: UpdateArgs = {
    target: playbackTargetFromStandardLoad({
      channel: args.channel,
      clip: args.clip ?? null,
      item: args.item,
      itemChapter: null,
      itemSoundbite: args.itemSoundbite ?? null,
      musicIntent: 'explicit_play',
    }),
    itemChapterShouldSeek: false,
    enclosureSelectedParams: defaultEnclosureParams,
    skipMoveNowPlayingToHistory: false,
    newAutoQueueConfig: {
      playlist_id_text: null,
      disabled: false,
      random: false,
      repeat: false,
      nextPage: 1,
      shuffleHash: '',
    },
    autoQueueShouldClear: false,
  };
  render(<Probe args={merged} />);
}

/** Puts this tab in the remote role: checked in as `session-this` while `session-other` plays. */
function setRoleRemote() {
  crossDevicePlaybackStore.reset({ accountId: 1, enabled: true });
  crossDevicePlaybackStore.applyPresenceResponse(
    { session_id_text: 'session-this', devices: { revision: 1, devices: [] }, state: null },
    Date.now()
  );
  crossDevicePlaybackStore.applyStreamEvent(
    {
      type: ACCOUNT_PLAYBACK_STREAM_EVENT.state,
      data: {
        revision: 1,
        active_session_id_text: 'session-other',
        resource: {
          ref: { kind: 'item', item_id_text: 'item-20' },
          medium: MediumEnum.Podcast,
          title: 'Other item',
          channel_title: 'Other channel',
          image_url: null,
        },
        status: 'playing',
        is_live: false,
        position_seconds: 10,
        duration_seconds: 600,
        rate: 1,
        updated_at_ms: 0,
        sent_at_ms: 0,
      },
    },
    Date.now()
  );
}

beforeEach(() => {
  crossDevicePlaybackStore.reset({ accountId: null, enabled: false });
  hoisted.setMPCurrentTime.mockClear();
  hoisted.setMPItemLabeledItemEnclosures.mockClear();
  hoisted.updateNowPlaying.mockClear();
  hoisted.reqAccountPlaybackSendCommand.mockClear();
  hoisted.abridgedRef.current = {
    items: {},
    clips: {},
    item_soundbites: {},
    add_by_rss_resource_datas: {},
  };
});

afterEach(() => {
  cleanup();
  crossDevicePlaybackStore.reset({ accountId: null, enabled: false });
});

describe('useMediaPlayerResourceUpdate near-end clamp (matrix § 6)', () => {
  it('item-podcast: p well below d-5 -> setMPCurrentTime(p)', () => {
    dispatch(
      {
        items: { 10: { p: '150', d: '3000' } },
        clips: {},
        item_soundbites: {},
        add_by_rss_resource_datas: {},
      },
      { channel: channel(MediumEnum.Podcast), item: item(10) }
    );
    expect(hoisted.setMPCurrentTime).toHaveBeenCalledWith(150);
  });

  it('item-podcast: p exactly at d-5 -> clamped to 0', () => {
    dispatch(
      {
        items: { 10: { p: '2995', d: '3000' } },
        clips: {},
        item_soundbites: {},
        add_by_rss_resource_datas: {},
      },
      { channel: channel(MediumEnum.Podcast), item: item(10) }
    );
    expect(hoisted.setMPCurrentTime).toHaveBeenCalledWith(0);
  });

  it('item-podcast: p just under d-5 -> not clamped', () => {
    dispatch(
      {
        items: { 10: { p: '2994', d: '3000' } },
        clips: {},
        item_soundbites: {},
        add_by_rss_resource_datas: {},
      },
      { channel: channel(MediumEnum.Podcast), item: item(10) }
    );
    expect(hoisted.setMPCurrentTime).toHaveBeenCalledWith(2994);
  });

  it('item-video: clamp applies the same way', () => {
    dispatch(
      {
        items: { 11: { p: '2999', d: '3000' } },
        clips: {},
        item_soundbites: {},
        add_by_rss_resource_datas: {},
      },
      { channel: channel(MediumEnum.Video), item: item(11) }
    );
    expect(hoisted.setMPCurrentTime).toHaveBeenCalledWith(0);
  });

  it('clip: clamp applies against clip-row abridged p/d', () => {
    const it = item(10);
    dispatch(
      {
        items: {},
        clips: { 7: { p: '58', d: '60' } },
        item_soundbites: {},
        add_by_rss_resource_datas: {},
      },
      { channel: channel(MediumEnum.Podcast), item: it, clip: clip(7, it) }
    );
    expect(hoisted.setMPCurrentTime).toHaveBeenCalledWith(0);
  });

  it('soundbite: clamp applies against soundbite-row abridged p/d', () => {
    const it = item(10);
    dispatch(
      {
        items: {},
        clips: {},
        item_soundbites: { 8: { p: '14', d: '15' } },
        add_by_rss_resource_datas: {},
      },
      { channel: channel(MediumEnum.Podcast), item: it, itemSoundbite: soundbite(8, it) }
    );
    expect(hoisted.setMPCurrentTime).toHaveBeenCalledWith(0);
  });

  it('item-music: always 0 regardless of abridged p (music skip path, not clamp)', () => {
    dispatch(
      {
        items: { 12: { p: '200', d: '240' } },
        clips: {},
        item_soundbites: {},
        add_by_rss_resource_datas: {},
      },
      { channel: channel(MediumEnum.Music), item: item(12) }
    );
    expect(hoisted.setMPCurrentTime).toHaveBeenCalledWith(0);
  });

  it('item-podcast: zero duration -> clamp gate is false, setMPCurrentTime(p)', () => {
    dispatch(
      {
        items: { 13: { p: '2995', d: '0' } },
        clips: {},
        item_soundbites: {},
        add_by_rss_resource_datas: {},
      },
      { channel: channel(MediumEnum.Podcast), item: item(13) }
    );
    expect(hoisted.setMPCurrentTime).toHaveBeenCalledWith(2995);
  });

  it('item-podcast: missing abridged row -> setMPCurrentTime(0)', () => {
    dispatch(
      {
        items: {},
        clips: {},
        item_soundbites: {},
        add_by_rss_resource_datas: {},
      },
      { channel: channel(MediumEnum.Podcast), item: item(99) }
    );
    expect(hoisted.setMPCurrentTime).toHaveBeenCalledWith(0);
  });

  it('keeps the item file list when playback starts on a different item', () => {
    const next = item(11);
    next.item_enclosures = [
      {
        id: 1,
        item_id: 11,
        type: 'audio/mpeg',
        item_enclosure_default: true,
        item_enclosure_integrity: null,
        item_enclosure_sources: [
          { id: 1, item_enclosure_id: 1, uri: 'http://localhost:2111/e2e/audio/a.mp3' },
        ],
      },
    ];
    const args: UpdateArgs = {
      target: playbackTargetFromStandardLoad({
        channel: channel(MediumEnum.Podcast),
        clip: null,
        item: next,
        itemChapter: null,
        itemSoundbite: null,
        musicIntent: 'explicit_play',
      }),
      itemChapterShouldSeek: false,
      enclosureSelectedParams: 'use-active-item-or-default',
      skipMoveNowPlayingToHistory: false,
      shouldPlay: true,
      isPlaying: true,
      newAutoQueueConfig: {
        playlist_id_text: null,
        disabled: false,
        random: false,
        repeat: false,
        nextPage: 1,
        shuffleHash: '',
      },
      autoQueueShouldClear: false,
    };
    render(<Probe args={args} />);
    expect(hoisted.setMPItemLabeledItemEnclosures).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          mediaType: 'audio',
          enclosure: expect.objectContaining({
            item_enclosure_sources: expect.arrayContaining([
              expect.objectContaining({ uri: 'http://localhost:2111/e2e/audio/a.mp3' }),
            ]),
          }),
        }),
      ])
    );
  });

  it('sends play_item and sets no player state while another device is playing', () => {
    setRoleRemote();
    expect(crossDevicePlaybackStore.getSnapshot().role).toBe('remote');
    dispatch(
      {
        items: { 10: { p: '150', d: '3000' } },
        clips: {},
        item_soundbites: {},
        add_by_rss_resource_datas: {},
      },
      { channel: channel(MediumEnum.Podcast), item: item(10) }
    );

    expect(hoisted.reqAccountPlaybackSendCommand).toHaveBeenCalledWith({
      command: {
        type: 'play_item',
        resource: { kind: 'item', item_id_text: 'item-10' },
        add_by_rss_resource_data: null,
        start_seconds: null,
      },
    });
    expect(hoisted.setMPCurrentTime).not.toHaveBeenCalled();
    expect(hoisted.setMPItemLabeledItemEnclosures).not.toHaveBeenCalled();
    expect(hoisted.updateNowPlaying).not.toHaveBeenCalled();
    expect(crossDevicePlaybackStore.getSnapshot().displayState).toBe(
      crossDevicePlaybackStore.getSnapshot().state
    );
  });
});
