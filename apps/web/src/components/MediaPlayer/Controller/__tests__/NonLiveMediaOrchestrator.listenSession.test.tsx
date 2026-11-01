/**
 * The orchestrator feeds one shared listen session from media events.
 * Counting and the decision to report live in the session tracker.
 */
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type {
  DTOChannel,
  DTOClip,
  DTOItem,
  DTOItemSoundbite,
  EnclosureSelectedParams,
  QueueResourcesAbridgedIndex,
} from '@podverse/helpers';
import { MediumEnum } from '@podverse/helpers';

import { AccountContext } from '../../../../contexts/Account';
import type { MediaPlayerAddByRSSState } from '../../../../contexts/MediaPlayer';
import type { ListenSessionDirective, PlaybackLoadDecision } from '../../../../lib/playback';
import type { InstalledMediaElementFake } from '../../../../test/mediaElementFake';
import { installMediaElementFake } from '../../../../test/mediaElementFake';
import { NonLiveMediaOrchestrator } from '../NonLiveMediaOrchestrator';

const session = vi.hoisted(() => ({
  load: vi.fn(),
  recordPosition: vi.fn(),
  recordSeek: vi.fn(),
  recordPause: vi.fn(),
  recordCompleted: vi.fn(),
}));

vi.mock('../../../../utils/statsTracking/statsTracking', () => ({
  webListenSession: session,
}));

vi.mock('../../../../contexts/MediaPlayer', () => ({
  useMediaPlayer: () => ({
    activePlaybackTarget: null,
  }),
}));

const item = {
  id: 10,
  id_text: 'item-1',
  title: 'Test item',
  channel_id: 1,
} as unknown as DTOItem;

const clip = {
  id: 100,
  id_text: 'clip-1',
  start_time: 12,
  end_time: 40,
} as unknown as DTOClip;

const soundbite = {
  id: 200,
  id_text: 'soundbite-1',
  start_time: 10,
  duration: 20,
  item: { id: 10, id_text: 'item-1' },
} as unknown as DTOItemSoundbite;

const addByRss = {
  idText: 'arrs-1',
  resourceData: { medium_id: MediumEnum.Podcast },
} as unknown as MediaPlayerAddByRSSState;

function loadDecision(listenSession: ListenSessionDirective): PlaybackLoadDecision {
  return {
    initialSeekSeconds: 0,
    shouldAutoPlay: false,
    shouldClearAutoQueue: false,
    listenSession,
    reason: 'item-podcast-fresh',
  };
}

type RenderOverrides = Partial<{
  mpAddByRSS: MediaPlayerAddByRSSState;
  mpChannel: DTOChannel | null;
  mpClip: DTOClip | null;
  mpItem: DTOItem | null;
  mpItemSoundbite: DTOItemSoundbite | null;
  pendingPlaybackDecision: PlaybackLoadDecision | null;
}>;

async function renderAV(overrides: RenderOverrides = {}): Promise<{
  audio: HTMLMediaElement;
  fake: InstalledMediaElementFake;
  updateNowPlaying: ReturnType<typeof vi.fn>;
}> {
  const updateNowPlaying = vi.fn();
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

  const renderResult = render(
    <AccountContext.Provider value={{ loggedInAccount: null, setLoggedInAccount: () => undefined }}>
      <NonLiveMediaOrchestrator
        mediaType="audio"
        hidden
        mpAddByRSS={overrides.mpAddByRSS ?? null}
        mpChannel={overrides.mpChannel ?? null}
        mpClip={overrides.mpClip ?? null}
        setMPClip={() => undefined}
        mpItem={overrides.mpItem ?? null}
        mpItemLabeledEnclosures={[]}
        mpEnclosureSelectedParams={enclosureParams}
        mpItemChapter={null}
        setMPItemChapter={() => undefined}
        mpItemChapters={null}
        mpItemChapterShouldSeek={false}
        setMPItemChapterShouldSeek={() => undefined}
        mpItemSoundbite={overrides.mpItemSoundbite ?? null}
        setMPItemSoundbite={() => undefined}
        mpIsPlaying={false}
        setMPIsPlaying={() => undefined}
        mpPlaybackSpeed={1}
        mpVolume={1}
        mpIsMuted={false}
        mpShouldPlay={false}
        setMPShouldPlay={() => undefined}
        setMPDuration={() => undefined}
        mpCurrentTime={0}
        setMPCurrentTime={() => undefined}
        addByRSSSeekToTime={null}
        setAddByRSSSeekToTime={() => undefined}
        updateNowPlaying={updateNowPlaying}
        moveNowPlayingToHistory={() => Promise.resolve()}
        queueResourcesLoadActive={() =>
          Promise.resolve({
            activeResource: null,
            activeQueue: null,
            historyMoved: 0,
            queues: [],
            upcomingManualCount: 0,
            upcomingResources: [],
          })
        }
        queueResourcesAbridgedIndex={abridgedIndex}
        clearNowPlaying={() => undefined}
        pendingPlaybackDecision={overrides.pendingPlaybackDecision ?? null}
        setPendingPlaybackDecision={() => undefined}
        pendingMusicQueueLoadIntentRef={{ current: null }}
      />
    </AccountContext.Provider>
  );

  await act(async () => {
    await Promise.resolve();
  });

  const audio = renderResult.container.querySelector('audio');
  if (audio === null) {
    throw new Error('Expected <audio> element to be rendered by NonLiveMediaOrchestrator');
  }
  const fake = installMediaElementFake(audio);
  fake.resetEventLog();
  return { audio, fake, updateNowPlaying };
}

beforeEach(() => {
  session.load.mockClear();
  session.recordPosition.mockClear();
  session.recordSeek.mockClear();
  session.recordPause.mockClear();
  session.recordCompleted.mockClear();
});

afterEach(() => {
  cleanup();
});

describe('NonLiveMediaOrchestrator listen session', () => {
  it('starts an item session with the media duration on loadedmetadata', async () => {
    const { fake } = await renderAV({
      mpItem: item,
      mpChannel: { id_text: 'channel-1', medium_id: MediumEnum.Podcast } as unknown as DTOChannel,
      pendingPlaybackDecision: loadDecision('start'),
    });

    await act(async () => {
      fake.fireLoadedMetadata(240);
    });

    expect(session.load).toHaveBeenCalledWith({
      directive: 'start',
      target: { kind: 'item', idText: 'item-1', mediumId: MediumEnum.Podcast },
      mediaDurationSeconds: 240,
    });
  });

  it('passes a clip target with its start and end', async () => {
    const { fake } = await renderAV({
      mpClip: clip,
      pendingPlaybackDecision: loadDecision('start'),
    });

    await act(async () => {
      fake.fireLoadedMetadata(180);
    });

    expect(session.load).toHaveBeenCalledWith({
      directive: 'start',
      target: {
        kind: 'clip',
        idText: 'clip-1',
        startSeconds: 12,
        endSeconds: 40,
        mediumId: null,
      },
      mediaDurationSeconds: 180,
    });
  });

  it('counts a soundbite toward its item', async () => {
    const { fake } = await renderAV({
      mpItemSoundbite: soundbite,
      pendingPlaybackDecision: loadDecision('start'),
    });

    await act(async () => {
      fake.fireLoadedMetadata(180);
    });

    expect(session.load).toHaveBeenCalledWith({
      directive: 'start',
      target: { kind: 'item', idText: 'item-1', mediumId: null },
      mediaDurationSeconds: 180,
    });
  });

  it('passes a staged continue directive', async () => {
    const { fake } = await renderAV({
      mpItem: item,
      pendingPlaybackDecision: loadDecision('continue'),
    });

    await act(async () => {
      fake.fireLoadedMetadata(180);
    });

    expect(session.load).toHaveBeenCalledWith({
      directive: 'continue',
      target: { kind: 'item', idText: 'item-1', mediumId: null },
      mediaDurationSeconds: 180,
    });
  });

  it('passes none for add-by-RSS so nothing is reported', async () => {
    const { fake } = await renderAV({
      mpAddByRSS: addByRss,
      mpItem: item,
      pendingPlaybackDecision: loadDecision('start'),
    });

    await act(async () => {
      fake.fireLoadedMetadata(180);
    });

    expect(session.load).toHaveBeenCalledWith({
      directive: 'none',
      target: null,
      mediaDurationSeconds: 180,
    });
  });

  it('records the playhead with the element paused state and playback rate', async () => {
    const { audio, fake } = await renderAV({ mpItem: item });
    audio.playbackRate = 1.5;

    await act(async () => {
      fake.fireTimeUpdate(12);
    });

    expect(session.recordPosition).toHaveBeenCalledWith({
      positionSeconds: 12,
      isPlaying: false,
      playbackRate: 1.5,
    });

    await act(async () => {
      fake.firePlay();
      fake.fireTimeUpdate(20);
    });

    expect(session.recordPosition).toHaveBeenLastCalledWith({
      positionSeconds: 20,
      isPlaying: true,
      playbackRate: 1.5,
    });
  });

  it('records a seek, including one the player made itself', async () => {
    const { audio, fake, updateNowPlaying } = await renderAV({
      mpItem: item,
      pendingPlaybackDecision: loadDecision('start'),
    });

    await act(async () => {
      fake.fireLoadedMetadata(180);
    });

    await act(async () => {
      audio.dispatchEvent(new Event('seeked'));
    });

    expect(session.recordSeek).toHaveBeenCalledTimes(1);
    expect(updateNowPlaying).not.toHaveBeenCalled();

    await act(async () => {
      audio.dispatchEvent(new Event('seeked'));
    });

    expect(session.recordSeek).toHaveBeenCalledTimes(2);
    expect(updateNowPlaying).toHaveBeenCalledWith(expect.objectContaining({ eventKind: 'seek' }));
  });

  it('records pause and completion', async () => {
    const { fake } = await renderAV({ mpItem: item });

    await act(async () => {
      fake.firePause();
    });
    expect(session.recordPause).toHaveBeenCalledTimes(1);

    await act(async () => {
      fake.fireEnded();
      await Promise.resolve();
    });
    expect(session.recordCompleted).toHaveBeenCalledTimes(1);
  });
});
