/**
 * Queue-head loading: same-item guard on play/pause, and automatic loads that give way
 * to a load applied after they start (request-generation).
 */
import { act, cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type {
  DTOChannel,
  DTOClip,
  DTOItem,
  DTOPlaybackState,
  DTOQueueResource,
} from '@podverse/helpers';
import {
  ACCOUNT_PLAYBACK_STREAM_EVENT,
  getAddByRSSHashId,
  LiveItemStatusEnum,
} from '@podverse/helpers';
import { buildMinimalAddByRSSItemFromResourceData } from '@podverse/parser-mapping';

import type { MediaPlayerAddByRSSState } from '../../contexts/MediaPlayer';
import { crossDevicePlaybackStore } from '../../lib/crossDevicePlayback/crossDevicePlaybackStore';
import {
  buildPlaybackHandoffDismissedStateKey,
  readPlaybackHandoffDismissedStateKey,
} from '../../utils/playbackHandoffDismissal';
import {
  clearPlaybackHandoffLocalState,
  readPlaybackHandoffLocalState,
  writePlaybackHandoffLocalState,
} from '../playbackHandoffState';
import type { QueueHeadLoadingState } from '../useMediaPlayerControllerQueueHeadLoading';
import { useMediaPlayerControllerQueueHeadLoading } from '../useMediaPlayerControllerQueueHeadLoading';

type MediaPlayerState = {
  mpChannel: DTOChannel | null;
  mpItem: DTOItem | null;
  mpClip: DTOClip | null;
  mpIsPlaying: boolean;
  mpAddByRSS?: MediaPlayerAddByRSSState;
};

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((innerResolve) => {
    resolve = innerResolve;
  });
  return { promise, resolve };
}

const hoisted = vi.hoisted(() => {
  const player: MediaPlayerState = {
    mpChannel: null,
    mpItem: null,
    mpClip: null,
    mpIsPlaying: false,
  };
  const upcoming: DTOQueueResource[] = [];
  const playbackLoadGenerationRef = { current: 0 };
  const latestState: { current: QueueHeadLoadingState | null } = { current: null };
  return {
    latestState,
    resolveAddByRSSIndexItemFromResourceData: vi.fn(),
    armAddByRSSMetadataUpgrade: vi.fn(),
    playAddByRSS: vi.fn(),
    mediaPlayerResourceUpdate: vi.fn(),
    reqItemGetByIdOrIdText: vi.fn(),
    reqChannelGetByIdOrIdText: vi.fn(),
    reqQueueResourcesPromoteUpcomingToNowPlaying: vi.fn(),
    reqQueueResourceItemAddHistory: vi.fn(),
    queueResourcesLoadActive: vi.fn(),
    updateNowPlaying: vi.fn(),
    player,
    upcoming,
    playbackLoadGenerationRef,
  };
});

vi.mock('../../contexts/AutoQueue', () => ({
  checkIsActiveRowHighestKey: () => false,
  useAutoQueue: () => ({
    autoQueueResources: {},
    autoQueueActiveRow: null,
    autoQueueConfig: {
      playlist_id_text: null,
      disabled: false,
      random: false,
      repeat: false,
      nextPage: 1,
      shuffleHash: '',
    },
  }),
}));

vi.mock('../../contexts/LocalSettings', () => ({
  useLocalSettings: () => ({ preferredMediaType: null }),
}));

const pendingMusicQueueLoadIntentRef = { current: null };
const defaultEnclosureParams = {
  type: 'default',
  enclosureRowSelected: null,
  sourceRowSelected: null,
};

vi.mock('../../contexts/MediaPlayer', () => ({
  useMediaPlayer: () => ({
    mpAddByRSS: null,
    ...hoisted.player,
    mpItemSoundbite: null,
    mpDuration: 180,
    pendingMusicQueueLoadIntentRef,
    playbackLoadGenerationRef: hoisted.playbackLoadGenerationRef,
    mpEnclosureSelectedParams: defaultEnclosureParams,
    setMPEnclosureSelectedParams: vi.fn(),
    setMPItemChapters: vi.fn(),
    setMPItemLabeledItemEnclosures: vi.fn(),
  }),
}));

vi.mock('../../contexts/MediaPlayerCurrentTime', () => ({
  useMediaPlayerCurrentTime: () => ({ mpCurrentTime: 0 }),
}));

const activeQueue = { id_text: 'queue-1' };

vi.mock('../../contexts/Queue', () => ({
  useQueues: () => ({
    activeQueue,
    activeQueueUpcomingResources: hoisted.upcoming,
  }),
}));

vi.mock('../../factories/apiRequestService', () => ({
  getApiRequestService: () => ({
    reqItemGetByIdOrIdText: hoisted.reqItemGetByIdOrIdText,
    reqChannelGetByIdOrIdText: hoisted.reqChannelGetByIdOrIdText,
    reqItemParseAndGetChapters: async () => ({ data: [] }),
    reqQueueResourcesPromoteUpcomingToNowPlaying:
      hoisted.reqQueueResourcesPromoteUpcomingToNowPlaying,
    reqQueueResourceItemAddHistory: hoisted.reqQueueResourceItemAddHistory,
  }),
}));

vi.mock('../../utils/addByRSS/playFromQueueResource', () => ({
  resolveAddByRSSIndexItemFromResourceData: hoisted.resolveAddByRSSIndexItemFromResourceData,
  getAddByRSSResourceDataFeedUrl: (resourceData: Record<string, unknown> | null) =>
    typeof resourceData?.['feed_url'] === 'string' ? resourceData['feed_url'] : null,
}));

vi.mock('../useAddByRSSMetadataUpgrade', () => ({
  useAddByRSSMetadataUpgrade: () => hoisted.armAddByRSSMetadataUpgrade,
}));

vi.mock('../useAutoQueueLoadResources', () => ({
  useAutoQueueLoadResources: () => vi.fn(),
}));

vi.mock('../useMediaPlayerResourceUpdate', () => ({
  useMediaPlayerResourceUpdate: () => hoisted.mediaPlayerResourceUpdate,
}));

vi.mock('../usePlayAddByRSS', () => ({
  usePlayAddByRSS: () => hoisted.playAddByRSS,
}));

vi.mock('../useQueueResourcesLoadActive', () => ({
  useQueueResourcesLoadActive: () => hoisted.queueResourcesLoadActive,
}));

vi.mock('../useQueueResourceUpdateNowPlaying', () => ({
  useQueueResourcesUpdateNowPlaying: () => hoisted.updateNowPlaying,
}));

// Fixtures carry only the fields the hook reads; the full DTOs are far wider.
const channel = { id: 1, id_text: 'channel-1' } as unknown as DTOChannel;
const item = {
  id: 1,
  id_text: 'item-1',
  title: 'Track One',
  channel_id: 1,
  item_enclosures: [],
} as unknown as DTOItem;
const otherItem = {
  id: 2,
  id_text: 'item-2',
  title: 'Track Two',
  channel_id: 1,
  item_enclosures: [],
} as unknown as DTOItem;
const endedLiveItem = {
  id: 3,
  id_text: 'live-ended',
  title: 'Ended Stream',
  channel_id: 1,
  item_enclosures: [],
  live_item: { live_item_status: { id: LiveItemStatusEnum.Ended } },
} as unknown as DTOItem;
const liveItem = {
  id: 4,
  id_text: 'live-now',
  title: 'Live Stream',
  channel_id: 1,
  item_enclosures: [],
  live_item: { live_item_status: { id: LiveItemStatusEnum.Live } },
} as unknown as DTOItem;
const clip = { id: 7, id_text: 'clip-7', item } as unknown as DTOClip;
const queueHead = {
  id: 15,
  list_position: '0',
  playback_position: '0',
  item,
  item_id: 1,
  clip_id: null,
  item_soundbite_id: null,
  last_played_at: null,
} as unknown as DTOQueueResource;
const upcomingQueueHead = {
  ...queueHead,
  id: 16,
  list_position: '1',
} as unknown as DTOQueueResource;
const endedLiveQueueHead = {
  ...queueHead,
  id: 18,
  item: endedLiveItem,
  item_id: 3,
} as unknown as DTOQueueResource;
const ADD_BY_RSS_FEED_URL = 'https://feeds.example.com/show.xml';
const addByRSSResourceData = {
  feed_url: ADD_BY_RSS_FEED_URL,
  channel_id_text: 'phonechan1',
  guid: 'ep-1',
  id_text: 'abr-1',
  title: 'Add by RSS Episode',
  enclosure_url: 'https://cdn.example.com/ep-1.mp3',
};
const ADD_BY_RSS_IDENTITY = getAddByRSSHashId(addByRSSResourceData);
const loadedAddByRSS: MediaPlayerAddByRSSState = {
  idText: 'abr-1',
  resourceData: addByRSSResourceData,
};
const addByRSSQueueHead = {
  id: 17,
  list_position: '0',
  playback_position: '0',
  item: null,
  item_id: null,
  clip_id: null,
  item_soundbite_id: null,
  add_by_rss_hash_id: ADD_BY_RSS_IDENTITY,
  add_by_rss_resource_data: addByRSSResourceData,
  last_played_at: null,
} as unknown as DTOQueueResource;

function Harness() {
  hoisted.latestState.current = useMediaPlayerControllerQueueHeadLoading();
  return null;
}

const THIS_SESSION_ID_TEXT = 'session-this';
const OTHER_SESSION_ID_TEXT = 'session-other';
const PROMPT_FOR_NEWER_SERVER_HEAD = {
  localTitle: 'Track One',
  serverTitle: 'Track Two',
};

function playbackState(revision: number, activeSessionIdText: string | null): DTOPlaybackState {
  return {
    revision,
    active_session_id_text: activeSessionIdText,
    resource: null,
    status: activeSessionIdText === null ? 'paused' : 'playing',
    is_live: false,
    position_seconds: 0,
    duration_seconds: 600,
    rate: 1,
    updated_at_ms: 1_000,
    sent_at_ms: 1_000,
  };
}

function enableCrossDevicePlayback() {
  crossDevicePlaybackStore.reset({ accountId: 1, enabled: true });
}

function checkInWithNoActiveDevice() {
  crossDevicePlaybackStore.applyPresenceResponse(
    {
      session_id_text: THIS_SESSION_ID_TEXT,
      devices: { revision: 1, devices: [] },
      state: null,
    },
    1_000
  );
}

/** This browser's session is the active one, but no tab of the browser holds its audio. */
function checkInAsOrphanedActiveSession() {
  crossDevicePlaybackStore.applyPresenceResponse(
    {
      session_id_text: THIS_SESSION_ID_TEXT,
      devices: { revision: 1, devices: [] },
      state: playbackState(1, THIS_SESSION_ID_TEXT),
    },
    1_000
  );
  crossDevicePlaybackStore.settleAudioTabSearch();
}

function publishOtherSessionActive() {
  crossDevicePlaybackStore.applyStreamEvent(
    {
      type: ACCOUNT_PLAYBACK_STREAM_EVENT.state,
      data: playbackState(2, OTHER_SESSION_ID_TEXT),
    },
    2_000
  );
}

function stagePausedLocalItemAgainstNewerServerHead() {
  writePlaybackHandoffLocalState({
    itemIdText: 'item-1',
    itemTitle: 'Track One',
    lastPlayedAt: '2026-10-19T11:00:00.000Z',
  });
  hoisted.upcoming = [
    {
      ...queueHead,
      item: otherItem,
      item_id: 2,
      last_played_at: '2026-10-19T12:00:00.000Z',
    } as unknown as DTOQueueResource,
  ];
  hoisted.player = { mpChannel: channel, mpItem: item, mpClip: null, mpIsPlaying: false };
}

async function flushQueueHeadEffect() {
  await act(async () => {
    await Promise.resolve();
  });
}

describe('useMediaPlayerControllerQueueHeadLoading', () => {
  beforeEach(() => {
    crossDevicePlaybackStore.reset({ accountId: null, enabled: false });
    clearPlaybackHandoffLocalState();
    hoisted.latestState.current = null;
    hoisted.resolveAddByRSSIndexItemFromResourceData.mockReset().mockResolvedValue(null);
    hoisted.armAddByRSSMetadataUpgrade.mockReset();
    hoisted.playAddByRSS.mockReset().mockResolvedValue(undefined);
    hoisted.mediaPlayerResourceUpdate.mockReset();
    hoisted.reqItemGetByIdOrIdText.mockReset().mockResolvedValue(item);
    hoisted.reqChannelGetByIdOrIdText.mockReset().mockResolvedValue(channel);
    hoisted.reqQueueResourcesPromoteUpcomingToNowPlaying.mockReset().mockResolvedValue(undefined);
    hoisted.reqQueueResourceItemAddHistory.mockReset().mockResolvedValue(undefined);
    hoisted.updateNowPlaying.mockReset();
    hoisted.queueResourcesLoadActive.mockReset().mockResolvedValue({
      activeQueue,
      activeResource: null,
      historyMoved: 0,
      queues: [],
      upcomingResources: [],
      upcomingManualCount: 0,
    });
    hoisted.upcoming = [queueHead];
    hoisted.player = {
      mpChannel: null,
      mpItem: null,
      mpClip: null,
      mpIsPlaying: false,
    };
    hoisted.playbackLoadGenerationRef.current = 0;
  });

  afterEach(() => {
    cleanup();
    crossDevicePlaybackStore.reset({ accountId: null, enabled: false });
  });

  it('does not reload the item already in the player when play state flips', async () => {
    hoisted.player = { mpChannel: channel, mpItem: item, mpClip: null, mpIsPlaying: true };
    const { rerender } = render(<Harness />);

    hoisted.player = { ...hoisted.player, mpIsPlaying: false };
    rerender(<Harness />);
    await Promise.resolve();

    expect(hoisted.reqItemGetByIdOrIdText).not.toHaveBeenCalled();
    expect(hoisted.mediaPlayerResourceUpdate).not.toHaveBeenCalled();
  });

  it('still loads the plain item when the player holds a clip of that item', async () => {
    hoisted.player = { mpChannel: channel, mpItem: item, mpClip: clip, mpIsPlaying: false };
    render(<Harness />);

    await waitFor(() => {
      expect(hoisted.mediaPlayerResourceUpdate).toHaveBeenCalled();
    });
    expect(hoisted.reqItemGetByIdOrIdText).toHaveBeenCalledWith('item-1');
  });

  it('does not apply an empty-player head load after a playback load is applied', async () => {
    const itemDeferred = createDeferred<DTOItem>();
    hoisted.reqItemGetByIdOrIdText.mockReturnValue(itemDeferred.promise);
    writePlaybackHandoffLocalState({
      itemIdText: 'local-before',
      itemTitle: 'Local Before',
      lastPlayedAt: null,
    });

    render(<Harness />);

    await waitFor(() => {
      expect(hoisted.reqItemGetByIdOrIdText).toHaveBeenCalledWith('item-1');
    });

    hoisted.playbackLoadGenerationRef.current += 1;
    itemDeferred.resolve(item);

    await waitFor(() => {
      expect(hoisted.reqChannelGetByIdOrIdText).toHaveBeenCalled();
    });
    expect(hoisted.mediaPlayerResourceUpdate).not.toHaveBeenCalled();
    expect(readPlaybackHandoffLocalState()?.itemIdText).toBe('local-before');
  });

  it('loads a now-playing head paused with skipNowPlayingWrite when the player stays empty', async () => {
    render(<Harness />);

    await waitFor(() => {
      expect(hoisted.mediaPlayerResourceUpdate).toHaveBeenCalled();
    });

    expect(hoisted.mediaPlayerResourceUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        skipNowPlayingWrite: true,
        isPlaying: false,
        shouldPlay: false,
      })
    );
  });

  it('aborts upcoming-head adoption after promote when a playback load is applied', async () => {
    const promoteDeferred = createDeferred<undefined>();
    hoisted.upcoming = [upcomingQueueHead];
    hoisted.reqQueueResourcesPromoteUpcomingToNowPlaying.mockReturnValue(promoteDeferred.promise);

    render(<Harness />);

    await waitFor(() => {
      expect(hoisted.reqQueueResourcesPromoteUpcomingToNowPlaying).toHaveBeenCalledWith('queue-1');
    });

    hoisted.playbackLoadGenerationRef.current += 1;
    promoteDeferred.resolve(undefined);

    await waitFor(() => {
      expect(hoisted.queueResourcesLoadActive).toHaveBeenCalledWith(undefined, {
        queueIdText: 'queue-1',
      });
    });
    expect(hoisted.reqItemGetByIdOrIdText).not.toHaveBeenCalled();
    expect(hoisted.mediaPlayerResourceUpdate).not.toHaveBeenCalled();
  });

  it('applies only the latest automatic load when two dispatches overlap for the same head', async () => {
    const firstItemDeferred = createDeferred<DTOItem>();
    const secondItemDeferred = createDeferred<DTOItem>();
    let itemCallCount = 0;
    hoisted.reqItemGetByIdOrIdText.mockImplementation(() => {
      itemCallCount += 1;
      if (itemCallCount === 1) {
        return firstItemDeferred.promise;
      }
      return secondItemDeferred.promise;
    });

    hoisted.player = { mpChannel: channel, mpItem: item, mpClip: clip, mpIsPlaying: false };
    const { rerender } = render(<Harness />);

    await waitFor(() => {
      expect(hoisted.reqItemGetByIdOrIdText).toHaveBeenCalledTimes(1);
    });

    hoisted.player = { ...hoisted.player, mpIsPlaying: true };
    rerender(<Harness />);

    await waitFor(() => {
      expect(hoisted.reqItemGetByIdOrIdText).toHaveBeenCalledTimes(2);
    });

    firstItemDeferred.resolve(item);
    await waitFor(() => {
      expect(hoisted.reqChannelGetByIdOrIdText).toHaveBeenCalled();
    });
    expect(hoisted.mediaPlayerResourceUpdate).not.toHaveBeenCalled();

    secondItemDeferred.resolve(otherItem);
    await waitFor(() => {
      expect(hoisted.mediaPlayerResourceUpdate).toHaveBeenCalledTimes(1);
    });
  });

  it('keeps a playing Add by RSS episode when a stale handoff record names the server head', async () => {
    writePlaybackHandoffLocalState({
      itemIdText: 'item-1',
      itemTitle: 'Track One',
      lastPlayedAt: '2026-10-19T11:00:00.000Z',
    });
    hoisted.player = {
      mpChannel: null,
      mpItem: null,
      mpClip: null,
      mpIsPlaying: false,
      mpAddByRSS: loadedAddByRSS,
    };
    const { rerender } = render(<Harness />);

    hoisted.player = { ...hoisted.player, mpIsPlaying: true };
    rerender(<Harness />);
    await Promise.resolve();

    expect(hoisted.reqItemGetByIdOrIdText).not.toHaveBeenCalled();
    expect(hoisted.mediaPlayerResourceUpdate).not.toHaveBeenCalled();
    expect(readPlaybackHandoffLocalState()).toBeNull();
  });

  it('offers a newer server item through the prompt instead of loading it into a paused Add by RSS player', async () => {
    writePlaybackHandoffLocalState({
      itemIdText: ADD_BY_RSS_IDENTITY,
      itemTitle: 'Add by RSS Episode',
      lastPlayedAt: '2026-10-19T11:00:00.000Z',
    });
    hoisted.upcoming = [
      { ...queueHead, last_played_at: '2026-10-19T12:00:00.000Z' } as unknown as DTOQueueResource,
    ];
    hoisted.player = {
      mpChannel: null,
      mpItem: null,
      mpClip: null,
      mpIsPlaying: false,
      mpAddByRSS: loadedAddByRSS,
    };
    render(<Harness />);

    await waitFor(() => {
      expect(hoisted.latestState.current?.handoffPrompt).toEqual({
        localTitle: 'Add by RSS Episode',
        serverTitle: 'Track One',
      });
    });
    expect(hoisted.reqItemGetByIdOrIdText).toHaveBeenCalledWith('item-1');
    expect(hoisted.mediaPlayerResourceUpdate).not.toHaveBeenCalled();
  });

  it('does not reload an Add by RSS episode that is already the server head', async () => {
    hoisted.upcoming = [addByRSSQueueHead];
    hoisted.player = {
      mpChannel: null,
      mpItem: null,
      mpClip: null,
      mpIsPlaying: true,
      mpAddByRSS: loadedAddByRSS,
    };
    const { rerender } = render(<Harness />);

    hoisted.player = { ...hoisted.player, mpIsPlaying: false };
    rerender(<Harness />);
    await Promise.resolve();

    expect(hoisted.resolveAddByRSSIndexItemFromResourceData).not.toHaveBeenCalled();
    expect(hoisted.playAddByRSS).not.toHaveBeenCalled();
    expect(hoisted.mediaPlayerResourceUpdate).not.toHaveBeenCalled();
  });

  it('does not reload an Add by RSS episode whose local id_text differs from the server row', async () => {
    hoisted.upcoming = [addByRSSQueueHead];
    hoisted.player = {
      mpChannel: null,
      mpItem: null,
      mpClip: null,
      mpIsPlaying: true,
      mpAddByRSS: {
        idText: 'web-local-9',
        resourceData: { ...addByRSSResourceData, id_text: 'web-local-9', channel_id_text: 'web1' },
      },
    };
    const { rerender } = render(<Harness />);

    hoisted.player = { ...hoisted.player, mpIsPlaying: false };
    rerender(<Harness />);
    await Promise.resolve();

    expect(hoisted.resolveAddByRSSIndexItemFromResourceData).not.toHaveBeenCalled();
    expect(hoisted.playAddByRSS).not.toHaveBeenCalled();
  });

  it('loads a minimal Add by RSS item paused at the row position and arms the metadata upgrade', async () => {
    const minimal = buildMinimalAddByRSSItemFromResourceData(addByRSSResourceData);
    hoisted.resolveAddByRSSIndexItemFromResourceData.mockResolvedValue({
      indexItem: minimal,
      source: 'minimal',
    });
    hoisted.upcoming = [{ ...addByRSSQueueHead, playback_position: '30' } as DTOQueueResource];

    render(<Harness />);

    await waitFor(() => {
      expect(hoisted.armAddByRSSMetadataUpgrade).toHaveBeenCalledWith({
        identity: ADD_BY_RSS_IDENTITY,
        feedUrl: ADD_BY_RSS_FEED_URL,
        resourceData: addByRSSResourceData,
      });
    });
    expect(hoisted.playAddByRSS).toHaveBeenCalledWith(minimal, 30, undefined, {
      recordNowPlaying: false,
      shouldPlay: false,
    });
  });

  it('does not arm the metadata upgrade for an item found in this browser', async () => {
    const minimal = buildMinimalAddByRSSItemFromResourceData(addByRSSResourceData);
    hoisted.resolveAddByRSSIndexItemFromResourceData.mockResolvedValue({
      indexItem: minimal,
      source: 'local',
    });
    hoisted.upcoming = [addByRSSQueueHead];

    render(<Harness />);

    await waitFor(() => {
      expect(hoisted.playAddByRSS).toHaveBeenCalled();
    });
    expect(hoisted.armAddByRSSMetadataUpgrade).not.toHaveBeenCalled();
  });

  it('never shows the Add by RSS hash as a handoff title', async () => {
    writePlaybackHandoffLocalState({
      itemIdText: 'item-1',
      itemTitle: 'Track One',
      lastPlayedAt: '2026-10-19T11:00:00.000Z',
    });
    hoisted.upcoming = [
      {
        ...addByRSSQueueHead,
        add_by_rss_resource_data: { ...addByRSSResourceData, title: '' },
        last_played_at: '2026-10-19T12:00:00.000Z',
      } as DTOQueueResource,
    ];
    hoisted.player = { mpChannel: channel, mpItem: item, mpClip: null, mpIsPlaying: false };

    render(<Harness />);

    await waitFor(() => {
      expect(hoisted.latestState.current?.handoffPrompt).toEqual({
        localTitle: 'Track One',
        serverTitle: null,
      });
    });
  });

  it('still raises the prompt when cross-device playback is off', async () => {
    crossDevicePlaybackStore.reset({ accountId: null, enabled: false });
    stagePausedLocalItemAgainstNewerServerHead();

    render(<Harness />);

    await waitFor(() => {
      expect(hoisted.latestState.current?.handoffPrompt).toEqual(PROMPT_FOR_NEWER_SERVER_HEAD);
    });
    expect(hoisted.mediaPlayerResourceUpdate).not.toHaveBeenCalled();
    expect(crossDevicePlaybackStore.getSnapshot().availability).toBe('off');
  });

  it('adopts the queue head into an empty player while availability is pending', async () => {
    act(() => {
      enableCrossDevicePlayback();
    });
    expect(crossDevicePlaybackStore.getSnapshot().availability).toBe('pending');
    expect(crossDevicePlaybackStore.getSnapshot().role).toBe('idle');

    render(<Harness />);

    await waitFor(() => {
      expect(hoisted.mediaPlayerResourceUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          skipNowPlayingWrite: true,
          isPlaying: false,
          shouldPlay: false,
        })
      );
    });
    expect(hoisted.latestState.current?.handoffPrompt).toBeNull();
  });

  it('does not adopt the queue head or raise the prompt while another session is active', async () => {
    act(() => {
      enableCrossDevicePlayback();
      checkInWithNoActiveDevice();
      publishOtherSessionActive();
    });
    expect(crossDevicePlaybackStore.getSnapshot().role).toBe('remote');

    render(<Harness />);
    await flushQueueHeadEffect();

    expect(hoisted.reqItemGetByIdOrIdText).not.toHaveBeenCalled();
    expect(hoisted.reqQueueResourcesPromoteUpcomingToNowPlaying).not.toHaveBeenCalled();
    expect(hoisted.mediaPlayerResourceUpdate).not.toHaveBeenCalled();
    expect(hoisted.playAddByRSS).not.toHaveBeenCalled();
    expect(hoisted.latestState.current?.handoffPrompt).toBeNull();
  });

  it('holds the prompt while availability is pending and raises it once this tab is idle', async () => {
    stagePausedLocalItemAgainstNewerServerHead();
    act(() => {
      enableCrossDevicePlayback();
    });

    render(<Harness />);
    await flushQueueHeadEffect();

    expect(hoisted.latestState.current?.handoffPrompt).toBeNull();
    expect(hoisted.mediaPlayerResourceUpdate).not.toHaveBeenCalled();
    expect(hoisted.updateNowPlaying).not.toHaveBeenCalled();

    act(() => {
      checkInWithNoActiveDevice();
    });

    await waitFor(() => {
      expect(hoisted.latestState.current?.handoffPrompt).toEqual(PROMPT_FOR_NEWER_SERVER_HEAD);
    });
    expect(crossDevicePlaybackStore.getSnapshot().role).toBe('idle');
    expect(crossDevicePlaybackStore.getSnapshot().availability).toBe('ready');
    expect(hoisted.mediaPlayerResourceUpdate).not.toHaveBeenCalled();
    expect(hoisted.updateNowPlaying).not.toHaveBeenCalled();
  });

  it('closes an open prompt without a write when availability becomes pending, then raises it once idle', async () => {
    stagePausedLocalItemAgainstNewerServerHead();
    render(<Harness />);

    await waitFor(() => {
      expect(hoisted.latestState.current?.handoffPrompt).toEqual(PROMPT_FOR_NEWER_SERVER_HEAD);
    });

    act(() => {
      enableCrossDevicePlayback();
    });

    await waitFor(() => {
      expect(hoisted.latestState.current?.handoffPrompt).toBeNull();
    });
    expect(hoisted.updateNowPlaying).not.toHaveBeenCalled();
    expect(readPlaybackHandoffLocalState()?.itemIdText).toBe('item-1');
    expect(readPlaybackHandoffDismissedStateKey()).toBeNull();

    act(() => {
      checkInWithNoActiveDevice();
    });

    await waitFor(() => {
      expect(hoisted.latestState.current?.handoffPrompt).toEqual(PROMPT_FOR_NEWER_SERVER_HEAD);
    });
    expect(hoisted.updateNowPlaying).not.toHaveBeenCalled();
  });

  it('closes an open prompt without a now-playing write when another session becomes active', async () => {
    stagePausedLocalItemAgainstNewerServerHead();
    act(() => {
      enableCrossDevicePlayback();
      checkInWithNoActiveDevice();
    });

    render(<Harness />);

    await waitFor(() => {
      expect(hoisted.latestState.current?.handoffPrompt).toEqual(PROMPT_FOR_NEWER_SERVER_HEAD);
    });
    const localStateBefore = readPlaybackHandoffLocalState();
    const dismissedBefore = readPlaybackHandoffDismissedStateKey();

    act(() => {
      publishOtherSessionActive();
    });

    await waitFor(() => {
      expect(hoisted.latestState.current?.handoffPrompt).toBeNull();
    });
    expect(crossDevicePlaybackStore.getSnapshot().role).toBe('remote');
    expect(hoisted.updateNowPlaying).not.toHaveBeenCalled();
    expect(hoisted.mediaPlayerResourceUpdate).not.toHaveBeenCalled();
    expect(readPlaybackHandoffLocalState()).toEqual(localStateBefore);
    expect(readPlaybackHandoffDismissedStateKey()).toBe(dismissedBefore);
  });

  describe('livestream queue head', () => {
    it('moves an ended livestream head to history and reloads the queue instead of loading it', async () => {
      hoisted.upcoming = [endedLiveQueueHead];
      hoisted.reqItemGetByIdOrIdText.mockResolvedValue(endedLiveItem);

      render(<Harness />);

      await waitFor(() => {
        expect(hoisted.queueResourcesLoadActive).toHaveBeenCalledWith(undefined, {
          queueIdText: 'queue-1',
        });
      });
      expect(hoisted.reqQueueResourceItemAddHistory).toHaveBeenCalledWith('queue-1', 'live-ended', {
        playback_position: '0',
        completed: true,
      });
      expect(hoisted.mediaPlayerResourceUpdate).not.toHaveBeenCalled();
      expect(hoisted.reqChannelGetByIdOrIdText).not.toHaveBeenCalled();
    });

    it('loads a live head as a livestream target without a saved position', async () => {
      hoisted.upcoming = [
        {
          ...queueHead,
          id: 19,
          item: liveItem,
          item_id: 4,
          playback_position: '42',
        } as unknown as DTOQueueResource,
      ];
      hoisted.reqItemGetByIdOrIdText.mockResolvedValue(liveItem);

      render(<Harness />);

      await waitFor(() => {
        expect(hoisted.mediaPlayerResourceUpdate).toHaveBeenCalledWith(
          expect.objectContaining({
            target: expect.objectContaining({ kind: 'livestream' }),
            explicitPlaybackSeconds: undefined,
            isPlaying: false,
          })
        );
      });
      expect(hoisted.reqQueueResourceItemAddHistory).not.toHaveBeenCalled();
    });

    it('writes nothing and loads nothing when the head item is gone', async () => {
      hoisted.reqItemGetByIdOrIdText.mockRejectedValue({ status: 404 });

      render(<Harness />);
      await flushQueueHeadEffect();
      await flushQueueHeadEffect();

      expect(hoisted.reqQueueResourceItemAddHistory).not.toHaveBeenCalled();
      expect(hoisted.queueResourcesLoadActive).not.toHaveBeenCalled();
      expect(hoisted.mediaPlayerResourceUpdate).not.toHaveBeenCalled();
    });

    it("loads the queue row's copy with the row's channel when the head's status cannot be read", async () => {
      hoisted.reqItemGetByIdOrIdText.mockRejectedValue({ status: 503 });
      hoisted.upcoming = [
        {
          ...queueHead,
          playback_position: '42',
          item: { ...item, channel },
        } as unknown as DTOQueueResource,
      ];

      render(<Harness />);

      await waitFor(() => {
        expect(hoisted.mediaPlayerResourceUpdate).toHaveBeenCalledWith(
          expect.objectContaining({
            target: expect.objectContaining({
              item: expect.objectContaining({ id_text: 'item-1' }),
            }),
            explicitPlaybackSeconds: 42,
            isPlaying: false,
          })
        );
      });
      expect(hoisted.reqChannelGetByIdOrIdText).not.toHaveBeenCalled();
      expect(hoisted.reqQueueResourceItemAddHistory).not.toHaveBeenCalled();
    });

    it("reads the channel for the queue row's copy when the row carries none", async () => {
      hoisted.reqItemGetByIdOrIdText.mockRejectedValue({ status: 503 });

      render(<Harness />);

      await waitFor(() => {
        expect(hoisted.mediaPlayerResourceUpdate).toHaveBeenCalled();
      });
      expect(hoisted.reqChannelGetByIdOrIdText).toHaveBeenCalledWith(1);
    });

    it('does not retire an ended head when another session becomes active during the read', async () => {
      act(() => {
        enableCrossDevicePlayback();
        checkInWithNoActiveDevice();
      });
      hoisted.upcoming = [endedLiveQueueHead];
      const itemDeferred = createDeferred<DTOItem>();
      hoisted.reqItemGetByIdOrIdText.mockReturnValue(itemDeferred.promise);

      render(<Harness />);

      await waitFor(() => {
        expect(hoisted.reqItemGetByIdOrIdText).toHaveBeenCalledWith('live-ended');
      });
      act(() => {
        publishOtherSessionActive();
      });
      itemDeferred.resolve(endedLiveItem);
      await flushQueueHeadEffect();
      await flushQueueHeadEffect();

      expect(hoisted.reqQueueResourceItemAddHistory).not.toHaveBeenCalled();
      expect(hoisted.mediaPlayerResourceUpdate).not.toHaveBeenCalled();
    });

    it('waits for the first check-in before retiring an ended head, then retires it', async () => {
      act(() => {
        enableCrossDevicePlayback();
      });
      hoisted.upcoming = [endedLiveQueueHead];
      hoisted.reqItemGetByIdOrIdText.mockResolvedValue(endedLiveItem);

      render(<Harness />);

      await waitFor(() => {
        expect(hoisted.reqItemGetByIdOrIdText).toHaveBeenCalledWith('live-ended');
      });
      await flushQueueHeadEffect();
      await flushQueueHeadEffect();
      expect(hoisted.reqQueueResourceItemAddHistory).not.toHaveBeenCalled();

      act(() => {
        checkInWithNoActiveDevice();
      });

      await waitFor(() => {
        expect(hoisted.reqQueueResourceItemAddHistory).toHaveBeenCalledWith(
          'queue-1',
          'live-ended',
          { playback_position: '0', completed: true }
        );
      });
      expect(hoisted.reqItemGetByIdOrIdText).toHaveBeenCalledTimes(2);
    });

    it('retires an ended head from an idle tab of the active session', async () => {
      act(() => {
        enableCrossDevicePlayback();
        checkInAsOrphanedActiveSession();
      });
      expect(crossDevicePlaybackStore.getSnapshot().role).toBe('idle');
      hoisted.upcoming = [endedLiveQueueHead];
      hoisted.reqItemGetByIdOrIdText.mockResolvedValue(endedLiveItem);

      render(<Harness />);

      await waitFor(() => {
        expect(hoisted.reqQueueResourceItemAddHistory).toHaveBeenCalledWith(
          'queue-1',
          'live-ended',
          { playback_position: '0', completed: true }
        );
      });
    });
  });

  describe('handoff prompt for a livestream head', () => {
    it('does not offer the prompt for an ended livestream head and remembers the dismissal', async () => {
      stagePausedLocalItemAgainstNewerServerHead();
      hoisted.upcoming = [
        { ...hoisted.upcoming[0], item: endedLiveItem, item_id: 3 } as unknown as DTOQueueResource,
      ];
      hoisted.reqItemGetByIdOrIdText.mockResolvedValue(endedLiveItem);

      const { rerender } = render(<Harness />);

      await waitFor(() => {
        expect(hoisted.reqItemGetByIdOrIdText).toHaveBeenCalledWith('live-ended');
      });
      await flushQueueHeadEffect();

      expect(hoisted.latestState.current?.handoffPrompt).toBeNull();
      expect(hoisted.reqQueueResourceItemAddHistory).not.toHaveBeenCalled();
      expect(hoisted.mediaPlayerResourceUpdate).not.toHaveBeenCalled();
      expect(readPlaybackHandoffDismissedStateKey()).toBe(
        buildPlaybackHandoffDismissedStateKey({
          serverItemIdText: 'live-ended',
          serverLastPlayedAt: '2026-10-19T12:00:00.000Z',
        })
      );

      hoisted.player = { ...hoisted.player, mpIsPlaying: true };
      rerender(<Harness />);
      hoisted.player = { ...hoisted.player, mpIsPlaying: false };
      rerender(<Harness />);
      await flushQueueHeadEffect();

      expect(hoisted.reqItemGetByIdOrIdText).toHaveBeenCalledTimes(1);
    });

    it("offers the prompt from the queue row when the head's status cannot be read", async () => {
      stagePausedLocalItemAgainstNewerServerHead();
      hoisted.reqItemGetByIdOrIdText.mockRejectedValue({ status: 503 });

      render(<Harness />);

      await waitFor(() => {
        expect(hoisted.latestState.current?.handoffPrompt).toEqual(PROMPT_FOR_NEWER_SERVER_HEAD);
      });
    });

    it('does not open the prompt when local playback starts while the head is being read', async () => {
      stagePausedLocalItemAgainstNewerServerHead();
      const itemDeferred = createDeferred<DTOItem>();
      hoisted.reqItemGetByIdOrIdText.mockReturnValue(itemDeferred.promise);

      const { rerender } = render(<Harness />);

      await waitFor(() => {
        expect(hoisted.reqItemGetByIdOrIdText).toHaveBeenCalledWith('item-2');
      });
      hoisted.player = { ...hoisted.player, mpIsPlaying: true };
      rerender(<Harness />);
      itemDeferred.resolve(otherItem);
      await flushQueueHeadEffect();
      await flushQueueHeadEffect();

      expect(hoisted.latestState.current?.handoffPrompt).toBeNull();
    });
  });
});
