/**
 * Orchestration tests for `MediaPlayerControllerAV`'s `timeupdate` handler.
 * Locks the matrix at
 * [`MEDIA-PLAYER-DECISION-MATRIX.md`](../../MEDIA-PLAYER-DECISION-MATRIX.md)
 * § 6 (time-update side effects) and the clip / soundbite "+ 1 second"
 * end-time pause buffer.
 *
 * Rendering strategy is identical to the seek-policy test file:
 * `MediaPlayerControllerAV` is rendered directly with explicit props and
 * its real DOM `<audio>` is decorated with `installMediaElementFake`.
 */
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

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
import {
  type InstalledMediaElementFake,
  installMediaElementFake,
} from '../../../../test/mediaElementFake';
import { MediaPlayerControllerAV } from '../MediaPlayerControllerAV';

type RenderOverrides = Partial<{
  loggedInAccount: DTOAccount | null;
  mpChannel: DTOChannel | null;
  mpClip: DTOClip | null;
  setMPClip: (clip: DTOClip | null) => void;
  mpItem: DTOItem | null;
  mpItemChapter: DTOItemChapter | null;
  setMPItemChapter: (chapter: DTOItemChapter | null) => void;
  mpItemChapters: DTOItemChapter[] | null;
  mpItemSoundbite: DTOItemSoundbite | null;
  setMPItemSoundbite: (soundbite: DTOItemSoundbite | null) => void;
  setMPIsPlaying: (playing: boolean) => void;
}>;

const channel = (mediumId: number): DTOChannel =>
  ({
    id: 1,
    id_text: 'channel-1',
    medium_id: mediumId,
    title: 'Test channel',
  }) as unknown as DTOChannel;

const item = (id: number, idText: string): DTOItem =>
  ({
    id,
    id_text: idText,
    title: 'Test item',
    channel_id: 1,
  }) as unknown as DTOItem;

const clip = (startTime: number, endTime: number): DTOClip =>
  ({
    id: 100,
    id_text: 'clip-1',
    start_time: startTime,
    end_time: endTime,
    item: { id: 10, id_text: 'item-1' },
  }) as unknown as DTOClip;

const soundbite = (startTime: number, duration: number): DTOItemSoundbite =>
  ({
    id: 200,
    id_text: 'soundbite-1',
    start_time: startTime,
    duration,
    item: { id: 10, id_text: 'item-1' },
  }) as unknown as DTOItemSoundbite;

const chapter = (
  id: number,
  startTime: number,
  endTime: number,
  title = 'Test chapter'
): DTOItemChapter =>
  ({
    id,
    id_text: `chapter-${id}`,
    start_time: startTime,
    end_time: endTime,
    title,
    table_of_contents: false,
  }) as unknown as DTOItemChapter;

interface RenderResult {
  audio: HTMLMediaElement;
  fake: InstalledMediaElementFake;
}

async function renderAV(overrides: RenderOverrides = {}): Promise<RenderResult> {
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
    <AccountContext.Provider
      value={{
        loggedInAccount: overrides.loggedInAccount ?? null,
        setLoggedInAccount: () => undefined,
      }}
    >
      <MediaPlayerControllerAV
        mediaType="audio"
        hidden
        mpAddByRSS={null}
        mpChannel={overrides.mpChannel ?? channel(MediumEnum.Podcast)}
        mpClip={overrides.mpClip ?? null}
        setMPClip={overrides.setMPClip ?? (() => undefined)}
        mpItem={overrides.mpItem ?? item(10, 'item-1')}
        mpItemLabeledEnclosures={[]}
        mpEnclosureSelectedParams={enclosureParams}
        mpItemChapter={overrides.mpItemChapter ?? null}
        setMPItemChapter={overrides.setMPItemChapter ?? (() => undefined)}
        mpItemChapters={overrides.mpItemChapters ?? null}
        mpItemChapterShouldSeek={false}
        setMPItemChapterShouldSeek={() => undefined}
        mpItemSoundbite={overrides.mpItemSoundbite ?? null}
        setMPItemSoundbite={overrides.setMPItemSoundbite ?? (() => undefined)}
        mpIsPlaying={false}
        setMPIsPlaying={overrides.setMPIsPlaying ?? (() => undefined)}
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
      />
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
  return { audio, fake };
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('MediaPlayerControllerAV — timeupdate (matrix § 6)', () => {
  it('clip: clears mpClip and pauses one second after end_time', async () => {
    const setMPClip = vi.fn<(clip: DTOClip | null) => void>();
    const setMPIsPlaying = vi.fn<(playing: boolean) => void>();
    const { fake } = await renderAV({
      mpClip: clip(5, 10),
      setMPClip,
      setMPIsPlaying,
    });
    // Discard mount-time setMPIsPlaying(false) from the mpIsPlaying=false
    // effect in MediaPlayerControllerAV (lines 648–657); we only care about
    // timeupdate-driven calls in this test.
    setMPIsPlaying.mockClear();

    // Inside the clip range (before end_time) — neither the globalPauseAtTime
    // pause nor the end_time + 1 clear has fired.
    await act(async () => {
      fake.fireTimeUpdate(9.5);
    });
    expect(setMPClip).not.toHaveBeenCalled();
    expect(setMPIsPlaying).not.toHaveBeenCalled();

    // At end + 1 — clears mpClip and pauses (the +1 buffer step).
    // Note: the controller also pauses at end_time exactly via
    // globalPauseAtTime; that intermediate step is documented in
    // MEDIA-PLAYER-DECISION-MATRIX.md § 6 but is not asserted here to keep
    // this test focused on the clear-on-end+1 contract.
    await act(async () => {
      fake.fireTimeUpdate(11);
    });
    expect(setMPClip).toHaveBeenCalledWith(null);
    expect(setMPIsPlaying).toHaveBeenCalledWith(false);
  });

  it('soundbite: clears mpItemSoundbite and pauses one second after start + duration', async () => {
    const setMPItemSoundbite = vi.fn<(s: DTOItemSoundbite | null) => void>();
    const setMPIsPlaying = vi.fn<(playing: boolean) => void>();
    const { fake } = await renderAV({
      mpItemSoundbite: soundbite(30, 10),
      setMPItemSoundbite,
      setMPIsPlaying,
    });
    // Discard mount-time setMPIsPlaying(false) — see clip case above.
    setMPIsPlaying.mockClear();

    // 39.5 — still inside the +1 buffer.
    await act(async () => {
      fake.fireTimeUpdate(39.5);
    });
    expect(setMPItemSoundbite).not.toHaveBeenCalled();

    // 41 — reaches start (30) + duration (10) + 1.
    await act(async () => {
      fake.fireTimeUpdate(41);
    });
    expect(setMPItemSoundbite).toHaveBeenCalledWith(null);
    expect(setMPIsPlaying).toHaveBeenCalledWith(false);
  });

  it('chapter sync: chooses chapter whose [start, end) contains currentTime', async () => {
    const setMPItemChapter = vi.fn<(c: DTOItemChapter | null) => void>();
    const ch1 = chapter(1, 0, 60, 'Intro');
    const ch2 = chapter(2, 60, 120, 'Body');
    const { fake } = await renderAV({
      mpItemChapters: [ch1, ch2],
      setMPItemChapter,
    });

    await act(async () => {
      fake.fireTimeUpdate(30);
    });
    expect(setMPItemChapter).toHaveBeenLastCalledWith(ch1);

    await act(async () => {
      fake.fireTimeUpdate(90);
    });
    expect(setMPItemChapter).toHaveBeenLastCalledWith(ch2);
  });

  it('chapter sync: clears mpItemChapter when time is past the last chapter end', async () => {
    const setMPItemChapter = vi.fn<(c: DTOItemChapter | null) => void>();
    const ch1 = chapter(1, 0, 30, 'Only');
    const { fake } = await renderAV({
      mpItemChapter: ch1,
      mpItemChapters: [ch1],
      setMPItemChapter,
    });

    await act(async () => {
      fake.fireTimeUpdate(45);
    });

    expect(setMPItemChapter).toHaveBeenLastCalledWith(null);
  });
});
