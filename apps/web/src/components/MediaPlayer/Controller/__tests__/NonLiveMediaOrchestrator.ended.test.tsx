/**
 * Orchestration tests for `NonLiveMediaOrchestrator`'s `ended` handler.
 * Locks matrix § 5 (track-ended) and the auto-queue / clear-now-playing
 * branches.
 *
 * Each scenario observes the props the controller calls after `ended`,
 * since those calls fan out to queue / auto-queue context and `mpShouldPlay`
 * state in production.
 */
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type {
  DTOAccount,
  DTOChannel,
  DTOItem,
  EnclosureSelectedParams,
  QueueResourcesAbridgedIndex,
} from '@podverse/helpers';
import { MediumEnum } from '@podverse/helpers';

import { AccountContext } from '../../../../contexts/Account';
import { EmbedPlaybackModeProvider } from '../../../../contexts/EmbedPlaybackMode';
import type { MediaPlayerAddByRSSState } from '../../../../contexts/MediaPlayer';
import type { QueueResourcesLoadActiveResult } from '../../../../hooks/useQueueResourcesLoadActive';
import {
  type InstalledMediaElementFake,
  installMediaElementFake,
} from '../../../../test/mediaElementFake';
import { NonLiveMediaOrchestrator } from '../NonLiveMediaOrchestrator';

vi.mock('../../../../contexts/MediaPlayer', () => ({
  useMediaPlayer: () => ({
    activePlaybackTarget: null,
  }),
}));

interface SpyProps {
  moveNowPlayingToHistory: ReturnType<typeof vi.fn>;
  queueResourcesLoadActive: ReturnType<typeof vi.fn>;
  clearNowPlaying: ReturnType<typeof vi.fn>;
  setMPShouldPlay: ReturnType<typeof vi.fn>;
  setMPIsPlaying: ReturnType<typeof vi.fn>;
  setMPCurrentTime: ReturnType<typeof vi.fn>;
  onAddByRSSEnded: ReturnType<typeof vi.fn>;
  onAddByRSSPlayNext: ReturnType<typeof vi.fn>;
}

type RenderOverrides = Partial<{
  loggedInAccount: DTOAccount | null;
  mpAddByRSS: MediaPlayerAddByRSSState;
  mpItem: DTOItem | null;
  mpChannel: DTOChannel | null;
  queueResult: QueueResourcesLoadActiveResult;
  addByRSSPlayedNext: boolean;
  embedRoute: boolean;
}>;

const channel: DTOChannel = {
  id: 1,
  id_text: 'channel-1',
  medium_id: MediumEnum.Podcast,
  title: 'Test channel',
} as unknown as DTOChannel;

const item: DTOItem = {
  id: 10,
  id_text: 'item-1',
  title: 'Test item',
  channel_id: 1,
} as unknown as DTOItem;

async function renderAV(overrides: RenderOverrides = {}): Promise<{
  fake: InstalledMediaElementFake;
  spies: SpyProps;
}> {
  const moveNowPlayingToHistory = vi.fn(() => Promise.resolve());
  const queueResult: QueueResourcesLoadActiveResult = overrides.queueResult ?? {
    activeResource: null,
    historyMoved: 0,
    upcomingManualCount: 0,
    upcomingResources: [],
  };
  const queueResourcesLoadActive = vi.fn(() => Promise.resolve(queueResult));
  const clearNowPlaying = vi.fn();
  const setMPShouldPlay = vi.fn();
  const setMPIsPlaying = vi.fn();
  const setMPCurrentTime = vi.fn();
  const onAddByRSSEnded = vi.fn(() => Promise.resolve());
  const onAddByRSSPlayNext = vi.fn(() => Promise.resolve(overrides.addByRSSPlayedNext ?? false));

  const abridgedIndex: QueueResourcesAbridgedIndex = {
    items: {},
    clips: {},
    item_soundbites: {},
    add_by_rss_resource_datas: {},
  };
  const enclosureParams: EnclosureSelectedParams = {
    type: 'default',
    enclosureRowSelected: null,
    sourceRowSelected: null,
  };

  const orchestrator = (
    <NonLiveMediaOrchestrator
      mediaType="audio"
      hidden
      mpAddByRSS={overrides.mpAddByRSS ?? null}
      mpChannel={overrides.mpChannel ?? channel}
      mpClip={null}
      setMPClip={() => undefined}
      mpItem={overrides.mpItem ?? item}
      mpItemLabeledEnclosures={[]}
      mpEnclosureSelectedParams={enclosureParams}
      mpItemChapter={null}
      setMPItemChapter={() => undefined}
      mpItemChapters={null}
      mpItemChapterShouldSeek={false}
      setMPItemChapterShouldSeek={() => undefined}
      mpItemSoundbite={null}
      setMPItemSoundbite={() => undefined}
      mpIsPlaying={false}
      setMPIsPlaying={setMPIsPlaying}
      mpPlaybackSpeed={1}
      mpVolume={1}
      mpIsMuted={false}
      mpShouldPlay={false}
      setMPShouldPlay={setMPShouldPlay}
      setMPDuration={() => undefined}
      mpCurrentTime={0}
      setMPCurrentTime={setMPCurrentTime}
      addByRSSSeekToTime={null}
      setAddByRSSSeekToTime={() => undefined}
      updateNowPlaying={() => undefined}
      moveNowPlayingToHistory={moveNowPlayingToHistory}
      queueResourcesLoadActive={queueResourcesLoadActive}
      queueResourcesAbridgedIndex={abridgedIndex}
      onAddByRSSEnded={onAddByRSSEnded}
      onAddByRSSPlayNext={onAddByRSSPlayNext}
      clearNowPlaying={clearNowPlaying}
      pendingMusicQueueLoadIntentRef={{ current: null }}
    />
  );

  const renderResult = render(
    <AccountContext.Provider
      value={{
        loggedInAccount: overrides.loggedInAccount ?? null,
        setLoggedInAccount: () => undefined,
      }}
    >
      {overrides.embedRoute ? (
        <EmbedPlaybackModeProvider>{orchestrator}</EmbedPlaybackModeProvider>
      ) : (
        orchestrator
      )}
    </AccountContext.Provider>
  );

  await act(async () => {
    await Promise.resolve();
  });

  const audio = renderResult.container.querySelector('audio');
  if (audio === null) {
    throw new Error('Expected <audio> element to be rendered');
  }
  const fake = installMediaElementFake(audio);
  fake.resetEventLog();

  return {
    fake,
    spies: {
      moveNowPlayingToHistory,
      queueResourcesLoadActive,
      clearNowPlaying,
      setMPShouldPlay,
      setMPIsPlaying,
      setMPCurrentTime,
      onAddByRSSEnded,
      onAddByRSSPlayNext,
    },
  };
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('NonLiveMediaOrchestrator — ended (matrix § 5)', () => {
  it('non add-by-RSS, both queues empty: moves to history, calls load, then clearNowPlaying', async () => {
    const { fake, spies } = await renderAV({
      queueResult: {
        activeResource: null,
        historyMoved: 0,
        upcomingManualCount: 0,
        upcomingResources: [],
      },
    });

    await act(async () => {
      fake.fireEnded();
      await Promise.resolve();
    });

    expect(spies.moveNowPlayingToHistory).toHaveBeenCalledWith(
      expect.objectContaining({ completed: true })
    );
    expect(spies.queueResourcesLoadActive).toHaveBeenCalledTimes(1);
    expect(spies.clearNowPlaying).toHaveBeenCalledTimes(1);
    expect(spies.setMPShouldPlay).not.toHaveBeenCalledWith(true);
  });

  it('non add-by-RSS, manual queue has next: setMPShouldPlay(true), does not clearNowPlaying', async () => {
    const { fake, spies } = await renderAV({
      queueResult: {
        activeResource: null,
        historyMoved: 0,
        upcomingManualCount: 2,
        upcomingResources: [],
        hasAutoQueueNext: false,
      },
    });

    await act(async () => {
      fake.fireEnded();
      await Promise.resolve();
    });

    expect(spies.setMPShouldPlay).toHaveBeenCalledWith(true);
    expect(spies.clearNowPlaying).not.toHaveBeenCalled();
  });

  it('non add-by-RSS, only auto-queue has next: setMPShouldPlay(true), does not clearNowPlaying', async () => {
    const { fake, spies } = await renderAV({
      queueResult: {
        activeResource: null,
        historyMoved: 0,
        upcomingManualCount: 0,
        upcomingResources: [],
        hasAutoQueueNext: true,
      },
    });

    await act(async () => {
      fake.fireEnded();
      await Promise.resolve();
    });

    expect(spies.setMPShouldPlay).toHaveBeenCalledWith(true);
    expect(spies.clearNowPlaying).not.toHaveBeenCalled();
  });

  it('add-by-RSS, manual queue has next: calls onAddByRSSEnded, then queue path, does not invoke onAddByRSSPlayNext', async () => {
    const { fake, spies } = await renderAV({
      mpAddByRSS: {
        idText: 'arrs-1',
        resourceData: { medium_id: MediumEnum.Podcast },
      } as unknown as MediaPlayerAddByRSSState,
      queueResult: {
        activeResource: null,
        historyMoved: 0,
        upcomingManualCount: 1,
        upcomingResources: [],
        hasAutoQueueNext: false,
      },
    });

    await act(async () => {
      fake.fireEnded();
      await Promise.resolve();
    });

    expect(spies.onAddByRSSEnded).toHaveBeenCalledTimes(1);
    expect(spies.setMPShouldPlay).toHaveBeenCalledWith(false);
    expect(spies.queueResourcesLoadActive).toHaveBeenCalledWith(MediumEnum.Podcast);
    expect(spies.onAddByRSSPlayNext).not.toHaveBeenCalled();
    expect(spies.clearNowPlaying).not.toHaveBeenCalled();
  });

  it('add-by-RSS, no upcoming, play-next succeeds: does not clearNowPlaying', async () => {
    const { fake, spies } = await renderAV({
      mpAddByRSS: {
        idText: 'arrs-1',
        resourceData: { medium_id: MediumEnum.Podcast },
      } as unknown as MediaPlayerAddByRSSState,
      queueResult: {
        activeResource: null,
        historyMoved: 0,
        upcomingManualCount: 0,
        upcomingResources: [],
        hasAutoQueueNext: false,
      },
      addByRSSPlayedNext: true,
    });

    await act(async () => {
      fake.fireEnded();
      await Promise.resolve();
    });

    expect(spies.onAddByRSSPlayNext).toHaveBeenCalledTimes(1);
    expect(spies.clearNowPlaying).not.toHaveBeenCalled();
  });

  it('add-by-RSS, nothing else to play: clears now playing', async () => {
    const { fake, spies } = await renderAV({
      mpAddByRSS: {
        idText: 'arrs-1',
        resourceData: { medium_id: MediumEnum.Podcast },
      } as unknown as MediaPlayerAddByRSSState,
      queueResult: {
        activeResource: null,
        historyMoved: 0,
        upcomingManualCount: 0,
        upcomingResources: [],
        hasAutoQueueNext: false,
      },
      addByRSSPlayedNext: false,
    });

    await act(async () => {
      fake.fireEnded();
      await Promise.resolve();
    });

    expect(spies.onAddByRSSPlayNext).toHaveBeenCalledTimes(1);
    expect(spies.clearNowPlaying).toHaveBeenCalledTimes(1);
  });

  it('embed route: pauses at end, rewinds to start, without queue advance or clearNowPlaying', async () => {
    const { fake, spies } = await renderAV({
      embedRoute: true,
      queueResult: {
        activeResource: null,
        historyMoved: 0,
        upcomingManualCount: 0,
        upcomingResources: [],
      },
    });

    await act(async () => {
      fake.fireEnded();
      await Promise.resolve();
    });

    expect(spies.setMPIsPlaying).toHaveBeenCalledWith(false);
    expect(spies.setMPShouldPlay).toHaveBeenCalledWith(false);
    expect(spies.setMPCurrentTime).toHaveBeenCalledWith(0);
    expect(spies.moveNowPlayingToHistory).not.toHaveBeenCalled();
    expect(spies.queueResourcesLoadActive).not.toHaveBeenCalled();
    expect(spies.clearNowPlaying).not.toHaveBeenCalled();
  });
});
