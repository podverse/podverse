/**
 * `NonLiveMediaOrchestrator` play / pause event handling. Media events are queued, so a fast
 * pause-then-play can deliver an event that no longer matches the element. The handlers must
 * follow the element's live `paused` state, or `mpIsPlaying` and the element drive each other in
 * an endless play/pause loop.
 */
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';

import type {
  DTOChannel,
  DTOItem,
  EnclosureSelectedParams,
  QueueResourcesAbridgedIndex,
} from '@podverse/helpers';
import { MediumEnum } from '@podverse/helpers';

import { AccountContext } from '../../../../contexts/Account';
import type { UpdateNowPlayingParams } from '../../../../hooks/useQueueResourceUpdateNowPlaying';
import { installMediaElementFake } from '../../../../test/mediaElementFake';
import type { InstalledMediaElementFake } from '../../../../test/mediaElementFake';
import { NonLiveMediaOrchestrator } from '../NonLiveMediaOrchestrator';

vi.mock('../../../../contexts/MediaPlayer', () => ({
  useMediaPlayer: () => ({
    activePlaybackTarget: null,
  }),
}));

const channel = {
  id: 1,
  id_text: 'channel-1',
  medium_id: MediumEnum.Podcast,
  title: 'Test channel',
} as unknown as DTOChannel;

const item = {
  id: 10,
  id_text: 'item-1',
  title: 'Test item',
  channel_id: 1,
} as unknown as DTOItem;

type Spies = {
  setMPIsPlaying: Mock<(playing: boolean) => void>;
  updateNowPlaying: Mock<(args: UpdateNowPlayingParams) => void>;
};

async function renderAV(): Promise<{
  audio: HTMLMediaElement;
  fake: InstalledMediaElementFake;
  spies: Spies;
}> {
  const spies: Spies = {
    setMPIsPlaying: vi.fn<(playing: boolean) => void>(),
    updateNowPlaying: vi.fn<(args: UpdateNowPlayingParams) => void>(),
  };
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
        mpAddByRSS={null}
        mpChannel={channel}
        mpClip={null}
        setMPClip={() => undefined}
        mpItem={item}
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
        setMPIsPlaying={spies.setMPIsPlaying}
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
        updateNowPlaying={spies.updateNowPlaying}
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
        pendingMusicQueueLoadIntentRef={{ current: null }}
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
  const fake = installMediaElementFake(audio, { duration: 60 });
  return { audio, fake, spies };
}

function clearSpies(spies: Spies): void {
  spies.setMPIsPlaying.mockClear();
  spies.updateNowPlaying.mockClear();
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('NonLiveMediaOrchestrator — play and pause events', () => {
  it('ignores a pause event delivered after the element is playing again', async () => {
    const { audio, fake, spies } = await renderAV();
    await act(async () => {
      fake.firePlay();
    });
    clearSpies(spies);

    await act(async () => {
      audio.dispatchEvent(new Event('pause'));
    });

    expect(spies.setMPIsPlaying).not.toHaveBeenCalled();
    expect(spies.updateNowPlaying).not.toHaveBeenCalled();
  });

  it('ignores a play event delivered after the element is paused again', async () => {
    const { audio, fake, spies } = await renderAV();
    await act(async () => {
      fake.firePause();
    });
    clearSpies(spies);

    await act(async () => {
      audio.dispatchEvent(new Event('play'));
    });

    expect(spies.setMPIsPlaying).not.toHaveBeenCalled();
    expect(spies.updateNowPlaying).not.toHaveBeenCalled();
  });

  it('follows play and pause events that match the element', async () => {
    const { fake, spies } = await renderAV();
    clearSpies(spies);

    await act(async () => {
      fake.firePlay();
    });
    expect(spies.setMPIsPlaying).toHaveBeenLastCalledWith(true);

    await act(async () => {
      fake.firePause();
    });
    expect(spies.setMPIsPlaying).toHaveBeenLastCalledWith(false);
    expect(spies.updateNowPlaying).toHaveBeenCalledWith(
      expect.objectContaining({ eventKind: 'pause' })
    );
  });
});
