/**
 * Orchestration tests for `NonLiveMediaOrchestrator`'s `loadedmetadata`
 * seek policy. Locks the matrix at
 * [`MEDIA-PLAYER-DECISION-MATRIX.md`](../../MEDIA-PLAYER-DECISION-MATRIX.md)
 * § 1 (initial load) in place as an executable contract.
 *
 * The controller is rendered through `@testing-library/react`. The real DOM
 * `<audio>` element it owns is decorated with `installMediaElementFake`
 * (see [`mediaElementFake.ts`](../../../../test/mediaElementFake.ts)) so
 * tests can fire synthetic `loadedmetadata` and assert exact `currentTime`
 * writes.
 *
 * Stats tracking is suppressed by keeping `loggedInAccount` null (the
 * controller's tracking branch short-circuits for unauthenticated users).
 * No queue / auto-queue context is required because these scenarios stop
 * at the `loadedmetadata` decision; the `ended` and `play`/`pause` paths
 * are covered in adjacent test files.
 */
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, describe, it, vi } from 'vitest';

import type {
  DTOAccount,
  DTOChannel,
  DTOClip,
  DTOItem,
  DTOItemChapter,
  DTOItemSoundbite,
  EnclosureSelectedParams,
  QueueResourcesAbridgedIndex,
} from '@podverse/helpers';
import { MediumEnum } from '@podverse/helpers';

import { AccountContext } from '../../../../contexts/Account';
import type { MediaPlayerAddByRSSState } from '../../../../contexts/MediaPlayer';
import type { PlaybackLoadDecision } from '../../../../lib/playback';
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

type RenderOverrides = Partial<{
  loggedInAccount: DTOAccount | null;
  mpAddByRSS: MediaPlayerAddByRSSState;
  mpChannel: DTOChannel | null;
  mpClip: DTOClip | null;
  mpItem: DTOItem | null;
  mpItemChapter: DTOItemChapter | null;
  mpItemSoundbite: DTOItemSoundbite | null;
  mpItemChapterShouldSeek: boolean;
  mpShouldPlay: boolean;
  abridgedItems: QueueResourcesAbridgedIndex['items'];
  addByRSSSeekToTime: number | null;
  pendingPlaybackDecision: PlaybackLoadDecision | null;
}>;

const noopChannel = (mediumId: number): DTOChannel =>
  ({
    id: 1,
    id_text: 'channel-1',
    medium_id: mediumId,
    title: 'Test channel',
  }) as unknown as DTOChannel;

const noopItem = (id: number, idText: string): DTOItem =>
  ({
    id,
    id_text: idText,
    title: 'Test item',
    channel_id: 1,
  }) as unknown as DTOItem;

const noopClip = (startTime: number, endTime: number): DTOClip =>
  ({
    id: 100,
    id_text: 'clip-1',
    start_time: startTime,
    end_time: endTime,
    item: { id: 10, id_text: 'item-1' },
  }) as unknown as DTOClip;

const noopSoundbite = (startTime: number, duration: number): DTOItemSoundbite =>
  ({
    id: 200,
    id_text: 'soundbite-1',
    start_time: startTime,
    duration,
    item: { id: 10, id_text: 'item-1' },
  }) as unknown as DTOItemSoundbite;

const noopChapter = (startTime: number, endTime?: number): DTOItemChapter =>
  ({
    id: 300,
    id_text: 'chapter-1',
    start_time: startTime,
    end_time: endTime ?? 9999,
    title: 'Test chapter',
    table_of_contents: false,
  }) as unknown as DTOItemChapter;

interface RenderResult {
  audio: HTMLMediaElement;
  fake: InstalledMediaElementFake;
}

async function renderAV(overrides: RenderOverrides = {}): Promise<RenderResult> {
  const loggedInAccount = overrides.loggedInAccount ?? null;
  const abridgedIndex: QueueResourcesAbridgedIndex = {
    items: overrides.abridgedItems ?? {},
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
    <AccountContext.Provider value={{ loggedInAccount, setLoggedInAccount: () => undefined }}>
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
        mpItemChapter={overrides.mpItemChapter ?? null}
        setMPItemChapter={() => undefined}
        mpItemChapters={null}
        mpItemChapterShouldSeek={overrides.mpItemChapterShouldSeek ?? false}
        setMPItemChapterShouldSeek={() => undefined}
        mpItemSoundbite={overrides.mpItemSoundbite ?? null}
        setMPItemSoundbite={() => undefined}
        mpIsPlaying={false}
        setMPIsPlaying={() => undefined}
        mpPlaybackSpeed={1}
        mpVolume={1}
        mpIsMuted={false}
        mpShouldPlay={overrides.mpShouldPlay ?? false}
        setMPShouldPlay={() => undefined}
        setMPDuration={() => undefined}
        mpCurrentTime={0}
        setMPCurrentTime={() => undefined}
        addByRSSSeekToTime={overrides.addByRSSSeekToTime ?? null}
        setAddByRSSSeekToTime={() => undefined}
        updateNowPlaying={() => undefined}
        moveNowPlayingToHistory={() => Promise.resolve()}
        queueResourcesLoadActive={() =>
          Promise.resolve({
            activeResource: null,
            historyMoved: 0,
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

  // Allow mount effects (refs being written) to settle before firing media events.
  await act(async () => {
    await Promise.resolve();
  });

  const audio = renderResult.container.querySelector('audio');
  if (audio === null) {
    throw new Error('Expected <audio> element to be rendered by NonLiveMediaOrchestrator');
  }
  const fake = installMediaElementFake(audio);
  // Reset so per-test currentTime writes do not include any initial setup writes.
  fake.resetEventLog();
  return { audio, fake };
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('NonLiveMediaOrchestrator — loadedmetadata seek policy (matrix § 1)', () => {
  it('clip: seeks to Number(mpClip.start_time) regardless of abridged data', async () => {
    const { fake } = await renderAV({
      mpChannel: noopChannel(MediumEnum.Podcast),
      mpItem: noopItem(10, 'item-1'),
      mpClip: noopClip(42, 60),
    });

    await act(async () => {
      fake.fireLoadedMetadata(180);
    });

    fake.assertSeekedTo(42);
  });

  it('soundbite: seeks to Number(mpItemSoundbite.start_time)', async () => {
    const { fake } = await renderAV({
      mpChannel: noopChannel(MediumEnum.Podcast),
      mpItem: noopItem(10, 'item-1'),
      mpItemSoundbite: noopSoundbite(33, 12),
    });

    await act(async () => {
      fake.fireLoadedMetadata(600);
    });

    fake.assertSeekedTo(33);
  });

  it('chapter only (no clip / soundbite): seeks to Number(mpItemChapter.start_time)', async () => {
    const { fake } = await renderAV({
      mpChannel: noopChannel(MediumEnum.Podcast),
      mpItem: noopItem(10, 'item-1'),
      mpItemChapter: noopChapter(120),
    });

    await act(async () => {
      fake.fireLoadedMetadata(900);
    });

    fake.assertSeekedTo(120);
  });

  it('item-music: always seeks to 0 regardless of abridged p', async () => {
    const { fake } = await renderAV({
      mpChannel: noopChannel(MediumEnum.Music),
      mpItem: noopItem(10, 'music-track-1'),
      abridgedItems: { 10: { p: '75', d: '240' } },
    });

    await act(async () => {
      fake.fireLoadedMetadata(240);
    });

    fake.assertSeekedTo(0);
  });

  it('item-podcast: seeks to abridged p when p > 0', async () => {
    const { fake } = await renderAV({
      mpChannel: noopChannel(MediumEnum.Podcast),
      mpItem: noopItem(10, 'pod-1'),
      abridgedItems: { 10: { p: '150', d: '3000' } },
    });

    await act(async () => {
      fake.fireLoadedMetadata(3000);
    });

    fake.assertSeekedTo(150);
  });

  it('item-podcast: seeks to 0 when abridged p is 0 or absent', async () => {
    const { fake } = await renderAV({
      mpChannel: noopChannel(MediumEnum.Podcast),
      mpItem: noopItem(10, 'pod-2'),
    });

    await act(async () => {
      fake.fireLoadedMetadata(1800);
    });

    fake.assertSeekedTo(0);
  });

  it('item-video: seeks to abridged p when p > 0 (same policy as item-podcast)', async () => {
    const { fake } = await renderAV({
      mpChannel: noopChannel(MediumEnum.Video),
      mpItem: noopItem(11, 'vid-1'),
      abridgedItems: { 11: { p: '88', d: '2400' } },
    });

    await act(async () => {
      fake.fireLoadedMetadata(2400);
    });

    fake.assertSeekedTo(88);
  });

  it('clip precedence: clip start beats item-music 0 and item-podcast abridged p', async () => {
    const { fake } = await renderAV({
      mpChannel: noopChannel(MediumEnum.Music),
      mpItem: noopItem(10, 'music-1'),
      mpClip: noopClip(7, 13),
      abridgedItems: { 10: { p: '100', d: '200' } },
    });

    await act(async () => {
      fake.fireLoadedMetadata(200);
    });

    fake.assertSeekedTo(7);
  });

  it('soundbite precedence: soundbite start beats item abridged p', async () => {
    const { fake } = await renderAV({
      mpChannel: noopChannel(MediumEnum.Podcast),
      mpItem: noopItem(10, 'pod-3'),
      mpItemSoundbite: noopSoundbite(50, 10),
      abridgedItems: { 10: { p: '600', d: '3600' } },
    });

    await act(async () => {
      fake.fireLoadedMetadata(3600);
    });

    fake.assertSeekedTo(50);
  });

  it('chapter precedence: chapter start beats item abridged p', async () => {
    const { fake } = await renderAV({
      mpChannel: noopChannel(MediumEnum.Podcast),
      mpItem: noopItem(10, 'pod-4'),
      mpItemChapter: noopChapter(75),
      abridgedItems: { 10: { p: '200', d: '1800' } },
    });

    await act(async () => {
      fake.fireLoadedMetadata(1800);
    });

    fake.assertSeekedTo(75);
  });

  it('add-by-RSS: never writes currentTime via handleLoadedMetadata (saved-position seek lives in the add-by-RSS effect)', async () => {
    const { fake } = await renderAV({
      mpAddByRSS: {
        idText: 'arrs-1',
        resourceData: { medium_id: MediumEnum.Podcast },
      } as unknown as MediaPlayerAddByRSSState,
    });

    await act(async () => {
      fake.fireLoadedMetadata(1200);
    });

    fake.assertNeverSeeked();
  });

  it('nothing loaded: handleLoadedMetadata does not write currentTime', async () => {
    const { fake } = await renderAV();

    await act(async () => {
      fake.fireLoadedMetadata(60);
    });

    fake.assertNeverSeeked();
  });
});

describe('NonLiveMediaOrchestrator — add-by-RSS saved-position resume on loadedmetadata (matrix § 1, addByRSSSeekToTime)', () => {
  const addByRSSWithEnclosure = (): MediaPlayerAddByRSSState =>
    ({
      idText: 'arrs-1',
      resourceData: {
        medium_id: MediumEnum.Podcast,
        enclosure_url: 'https://example.com/test.mp3',
      },
    }) as unknown as MediaPlayerAddByRSSState;

  it('positive saved position: applySeek writes that exact value on loadedmetadata', async () => {
    const { fake } = await renderAV({
      mpAddByRSS: addByRSSWithEnclosure(),
      addByRSSSeekToTime: 240,
    });

    await act(async () => {
      fake.fireLoadedMetadata(3600);
    });

    fake.assertSeekedTo(240);
  });

  it('zero saved position: applySeek writes 0 on loadedmetadata', async () => {
    const { fake } = await renderAV({
      mpAddByRSS: addByRSSWithEnclosure(),
      addByRSSSeekToTime: 0,
    });

    await act(async () => {
      fake.fireLoadedMetadata(3600);
    });

    fake.assertSeekedTo(0);
  });

  it('negative saved position: applySeek clamps to 0 on loadedmetadata', async () => {
    const { fake } = await renderAV({
      mpAddByRSS: addByRSSWithEnclosure(),
      addByRSSSeekToTime: -5,
    });

    await act(async () => {
      fake.fireLoadedMetadata(3600);
    });

    fake.assertSeekedTo(0);
  });

  it('null saved position: applySeek is a no-op; no currentTime write on loadedmetadata', async () => {
    const { fake } = await renderAV({
      mpAddByRSS: addByRSSWithEnclosure(),
      addByRSSSeekToTime: null,
    });

    await act(async () => {
      fake.fireLoadedMetadata(3600);
    });

    fake.assertNeverSeeked();
  });
});

describe('NonLiveMediaOrchestrator — enclosure switch resume', () => {
  it('enclosure-switch-resume: seeks to the staged resume seconds on loadedmetadata', async () => {
    const { fake } = await renderAV({
      mpChannel: noopChannel(MediumEnum.Podcast),
      mpItem: noopItem(10, 'item-1'),
      pendingPlaybackDecision: {
        initialSeekSeconds: 83,
        reason: 'enclosure-switch-resume',
        shouldAutoPlay: false,
        shouldClearAutoQueue: false,
        shouldRecordPlaybackStat: false,
      },
    });

    await act(async () => {
      fake.fireLoadedMetadata(3600);
    });

    fake.assertSeekedTo(83);
  });
});
