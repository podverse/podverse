/**
 * Add by RSS plays record themselves: the handoff record names the episode, the now-playing write
 * lands in the podcast queue when the feed has no medium, and the active queue refreshes after
 * the write unless another item started first.
 */
import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ACCOUNT_PLAYBACK_STREAM_EVENT, getAddByRSSHashId, MediumEnum } from '@podverse/helpers';
import type { AddByRSSItemIndexItem, AddByRSSLivestreamIndexItem } from '@podverse/parser-mapping';

import { crossDevicePlaybackStore } from '../../lib/crossDevicePlayback/crossDevicePlaybackStore';
import {
  clearPlaybackHandoffLocalState,
  readPlaybackHandoffLocalState,
} from '../playbackHandoffState';
import { usePlayAddByRSS } from '../usePlayAddByRSS';

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((innerResolve) => {
    resolve = innerResolve;
  });
  return { promise, resolve };
}

const hoisted = vi.hoisted(() => {
  const playbackLoadGenerationRef = { current: 0 };
  return {
    playbackLoadGenerationRef,
    applyPlaybackLoad: vi.fn(
      (_request: { explicitPlaybackSeconds?: number; mediaFileDurationHintSeconds?: number }) => {
        playbackLoadGenerationRef.current += 1;
        return { initialSeekSeconds: 0 };
      }
    ),
    reqQueueResourceItemAddByRSSAddNowPlaying: vi.fn(),
    reqAccountPlaybackSendCommand: vi.fn(() => Promise.resolve()),
    queueResourcesLoadActive: vi.fn(),
    setMPAddByRSS: vi.fn(),
    setMPCurrentTime: vi.fn(),
    setMPDuration: vi.fn(),
    setMPShouldPlay: vi.fn(),
    reqQueueResourcesGetNowPlayingByQueueIdText: vi.fn(),
    reqQueueResourcesGetAllUpcomingByQueueIdText: vi.fn(),
    reqQueueResourcesGetHistoryByQueueIdTextPaginated: vi.fn(),
  };
});

vi.mock('@podverse/parser-mapping', () => ({
  buildAddByRSSResourceData: (item: {
    idText: string;
    mediumId: number | null;
    liveItem?: unknown;
    duration?: unknown;
  }) => {
    const resourceData: {
      feed_url: string;
      guid: string;
      id_text: string;
      title: string;
      medium_id: number | null;
      liveItem?: unknown;
      duration?: number;
    } = {
      feed_url: 'https://feeds.example.com/show.xml',
      guid: 'ep-1',
      id_text: item.idText,
      title: 'Add by RSS Episode',
      medium_id: item.mediumId,
    };
    if (item.liveItem !== undefined) {
      resourceData.liveItem = item.liveItem;
    }
    if (typeof item.duration === 'number') {
      resourceData.duration = item.duration;
    }
    return resourceData;
  },
  getAddByRSSHashIds: () => ['abr-hash-1'],
}));

vi.mock('../../contexts/Account', () => ({
  useAccount: () => ({ loggedInAccount: { id: 1 } }),
}));

vi.mock('../../contexts/AutoQueue', () => ({
  useAutoQueue: () => ({ setAutoQueueResources: vi.fn(), setAutoQueueActiveRow: vi.fn() }),
}));

vi.mock('../../contexts/LocalSettings', () => ({
  useLocalSettings: () => ({ preferredMediaType: null }),
}));

vi.mock('../../contexts/MediaPlayer', () => ({
  useMediaPlayer: () => ({
    applyPlaybackLoad: hoisted.applyPlaybackLoad,
    playbackLoadGenerationRef: hoisted.playbackLoadGenerationRef,
    setMPAddByRSS: hoisted.setMPAddByRSS,
    setMPChannel: vi.fn(),
    setMPClip: vi.fn(),
    setMPItem: vi.fn(),
    setMPItemChapter: vi.fn(),
    setMPItemChapters: vi.fn(),
    setMPItemChapterShouldSeek: vi.fn(),
    setMPItemSoundbite: vi.fn(),
    setMPItemLabeledItemEnclosures: vi.fn(),
    setMPEnclosureSelectedParams: vi.fn(),
    setMPShouldPlay: hoisted.setMPShouldPlay,
    setMPDuration: hoisted.setMPDuration,
  }),
}));

vi.mock('../../contexts/MediaPlayerCurrentTime', () => ({
  useMediaPlayerCurrentTime: () => ({ setMPCurrentTime: hoisted.setMPCurrentTime }),
}));

vi.mock('../../contexts/Queue', () => ({
  useQueues: () => ({
    queues: [
      { id: 1, id_text: 'queue-av', medium_id: MediumEnum.AV },
      { id: 2, id_text: 'queue-music', medium_id: MediumEnum.Music },
    ],
  }),
}));

vi.mock('../../factories/apiRequestService', () => ({
  getApiRequestService: () => ({
    reqQueueResourceItemAddByRSSAddNowPlaying: hoisted.reqQueueResourceItemAddByRSSAddNowPlaying,
    reqQueueResourcesGetNowPlayingByQueueIdText:
      hoisted.reqQueueResourcesGetNowPlayingByQueueIdText,
    reqQueueResourcesGetAllUpcomingByQueueIdText:
      hoisted.reqQueueResourcesGetAllUpcomingByQueueIdText,
    reqQueueResourcesGetHistoryByQueueIdTextPaginated:
      hoisted.reqQueueResourcesGetHistoryByQueueIdTextPaginated,
    reqAccountPlaybackSendCommand: hoisted.reqAccountPlaybackSendCommand,
  }),
}));

vi.mock('../useQueueResourcesLoadActive', () => ({
  useQueueResourcesLoadActive: () => hoisted.queueResourcesLoadActive,
}));

// The fixture carries only the fields the hook reads; a parsed index item is far wider.
const indexItemWithoutMedium = {
  idText: 'abr-1',
  mediumId: null,
} as unknown as AddByRSSItemIndexItem;

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

describe('usePlayAddByRSS', () => {
  beforeEach(() => {
    crossDevicePlaybackStore.reset({ accountId: null, enabled: false });
    clearPlaybackHandoffLocalState();
    hoisted.playbackLoadGenerationRef.current = 0;
    hoisted.applyPlaybackLoad.mockClear();
    hoisted.setMPAddByRSS.mockClear();
    hoisted.setMPCurrentTime.mockClear();
    hoisted.setMPDuration.mockClear();
    hoisted.setMPShouldPlay.mockClear();
    hoisted.reqQueueResourcesGetNowPlayingByQueueIdText.mockReset().mockResolvedValue(null);
    hoisted.reqQueueResourcesGetAllUpcomingByQueueIdText.mockReset().mockResolvedValue([]);
    hoisted.reqQueueResourcesGetHistoryByQueueIdTextPaginated.mockReset().mockResolvedValue({
      data: [],
    });
    hoisted.reqAccountPlaybackSendCommand.mockClear();
    hoisted.reqQueueResourceItemAddByRSSAddNowPlaying.mockReset().mockResolvedValue(undefined);
    hoisted.queueResourcesLoadActive.mockReset().mockResolvedValue(undefined);
  });

  afterEach(() => {
    crossDevicePlaybackStore.reset({ accountId: null, enabled: false });
  });

  it('writes the handoff record with the Add by RSS hash, not the id_text, when the episode loads', () => {
    const { result } = renderHook(() => usePlayAddByRSS());

    result.current(indexItemWithoutMedium, 0);

    expect(readPlaybackHandoffLocalState()).toEqual({
      itemIdText: getAddByRSSHashId({
        feed_url: 'https://feeds.example.com/show.xml',
        guid: 'ep-1',
      }),
      itemTitle: 'Add by RSS Episode',
      lastPlayedAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
    });
  });

  it('records now-playing in the podcast queue when the feed has no medium', async () => {
    const { result } = renderHook(() => usePlayAddByRSS());

    result.current(indexItemWithoutMedium, 0);

    await waitFor(() => {
      expect(hoisted.reqQueueResourceItemAddByRSSAddNowPlaying).toHaveBeenCalledWith(
        'queue-av',
        expect.objectContaining({
          playback_event_kind: 'play',
          last_played_at: readPlaybackHandoffLocalState()?.lastPlayedAt,
        })
      );
    });
  });

  it('refreshes the active queue only after the now-playing write resolves', async () => {
    const postDeferred = createDeferred<undefined>();
    hoisted.reqQueueResourceItemAddByRSSAddNowPlaying.mockReturnValue(postDeferred.promise);
    const { result } = renderHook(() => usePlayAddByRSS());

    result.current(indexItemWithoutMedium, 0);

    await waitFor(() => {
      expect(hoisted.reqQueueResourceItemAddByRSSAddNowPlaying).toHaveBeenCalled();
    });
    expect(hoisted.queueResourcesLoadActive).not.toHaveBeenCalled();

    postDeferred.resolve(undefined);

    await waitFor(() => {
      expect(hoisted.queueResourcesLoadActive).toHaveBeenCalledWith(undefined, {
        queueIdText: 'queue-av',
      });
    });
  });

  it('skips the queue refresh when another item started before the write resolved', async () => {
    const postDeferred = createDeferred<undefined>();
    hoisted.reqQueueResourceItemAddByRSSAddNowPlaying.mockReturnValue(postDeferred.promise);
    const { result } = renderHook(() => usePlayAddByRSS());

    result.current(indexItemWithoutMedium, 0);

    await waitFor(() => {
      expect(hoisted.reqQueueResourceItemAddByRSSAddNowPlaying).toHaveBeenCalled();
    });

    hoisted.playbackLoadGenerationRef.current += 1;
    postDeferred.resolve(undefined);
    await postDeferred.promise;
    await Promise.resolve();

    expect(hoisted.queueResourcesLoadActive).not.toHaveBeenCalled();
  });

  it('sends play_item and sets no player state while another device is playing', () => {
    setRoleRemote();
    expect(crossDevicePlaybackStore.getSnapshot().role).toBe('remote');
    const { result } = renderHook(() => usePlayAddByRSS());

    result.current(indexItemWithoutMedium);

    expect(hoisted.reqAccountPlaybackSendCommand).toHaveBeenCalledWith({
      command: {
        type: 'play_item',
        resource: {
          kind: 'add_by_rss',
          add_by_rss_hash_id: getAddByRSSHashId({
            feed_url: 'https://feeds.example.com/show.xml',
            guid: 'ep-1',
          }),
        },
        add_by_rss_resource_data: {
          feed_url: 'https://feeds.example.com/show.xml',
          guid: 'ep-1',
          id_text: 'abr-1',
          title: 'Add by RSS Episode',
          medium_id: null,
        },
        start_seconds: null,
      },
    });
    expect(hoisted.applyPlaybackLoad).not.toHaveBeenCalled();
    expect(hoisted.setMPAddByRSS).not.toHaveBeenCalled();
    expect(hoisted.setMPCurrentTime).not.toHaveBeenCalled();
    expect(hoisted.setMPShouldPlay).not.toHaveBeenCalled();
    expect(hoisted.reqQueueResourceItemAddByRSSAddNowPlaying).not.toHaveBeenCalled();
    expect(readPlaybackHandoffLocalState()).toBeNull();
    expect(crossDevicePlaybackStore.getSnapshot().displayState).toBe(
      crossDevicePlaybackStore.getSnapshot().state
    );
  });

  it('starts an Add by RSS livestream at 0 and ignores the enclosure byte length and a stored position', async () => {
    const livestreamIndexItem = {
      idText: 'abr-live',
      mediumId: null,
      liveItem: { status: 'live' },
      duration: 48_000_000,
    } as unknown as AddByRSSLivestreamIndexItem;
    const { result } = renderHook(() => usePlayAddByRSS());

    result.current(livestreamIndexItem, 120);

    expect(hoisted.setMPDuration).toHaveBeenCalledTimes(1);
    expect(hoisted.setMPDuration).toHaveBeenCalledWith(0);
    const [loadRequest] = hoisted.applyPlaybackLoad.mock.calls[0] ?? [];
    expect(loadRequest).toEqual(
      expect.objectContaining({
        explicitPlaybackSeconds: 0,
      })
    );
    expect(loadRequest?.mediaFileDurationHintSeconds).toBeUndefined();
    expect(hoisted.setMPCurrentTime).toHaveBeenCalledWith(0);

    await waitFor(() => {
      expect(hoisted.reqQueueResourceItemAddByRSSAddNowPlaying).toHaveBeenCalledWith(
        'queue-av',
        expect.objectContaining({ playback_position: '0' })
      );
    });
    expect(hoisted.reqQueueResourcesGetNowPlayingByQueueIdText).not.toHaveBeenCalled();
    expect(hoisted.reqQueueResourcesGetAllUpcomingByQueueIdText).not.toHaveBeenCalled();
    expect(hoisted.reqQueueResourcesGetHistoryByQueueIdTextPaginated).not.toHaveBeenCalled();
  });
});
