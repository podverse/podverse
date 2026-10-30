/**
 * Database live items stay off the hidden episode element. An Add by RSS livestream that
 * still uses this element does not take a staged seek or a metadata duration.
 */
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type {
  DTOChannel,
  DTOItem,
  EnclosureSelectedParams,
  LabeledItemEnclosure,
  QueueResourcesAbridgedIndex,
} from '@podverse/helpers';
import { LiveItemStatusEnum, MediumEnum } from '@podverse/helpers';

import { AccountContext } from '../../../../contexts/Account';
import type { MediaPlayerAddByRSSState } from '../../../../contexts/MediaPlayer';
import type { PlaybackLoadDecision } from '../../../../lib/playback';
import { installMediaElementFake } from '../../../../test/mediaElementFake';
import { NonLiveMediaOrchestrator } from '../NonLiveMediaOrchestrator';

vi.mock('../../../../contexts/MediaPlayer', () => ({
  useMediaPlayer: () => ({
    activePlaybackTarget: null,
  }),
}));

const podcastChannel = {
  id: 1,
  id_text: 'channel-1',
  medium_id: MediumEnum.Podcast,
  title: 'Test channel',
} as unknown as DTOChannel;

const liveDatabaseItem = {
  id: 10,
  id_text: 'live-1',
  title: 'Live item',
  channel_id: 1,
  live_item: {
    id: 1,
    item_id: 10,
    live_item_status: { id: LiveItemStatusEnum.Live },
    live_item_status_id: LiveItemStatusEnum.Live,
    start_time: '2026-01-01T00:00:00.000Z',
  },
} as unknown as DTOItem;

/** Empty enclosure type skips the surface effect, so a src would come only from elementSource. */
const labeledLiveEnclosure: LabeledItemEnclosure = {
  mediaType: 'audio',
  label: 'audio',
  enclosure: {
    id: 1,
    item_id: 10,
    type: '',
    item_enclosure_default: true,
    item_enclosure_integrity: null,
    item_enclosure_sources: [{ id: 1, item_enclosure_id: 1, uri: 'https://example.com/live.mp3' }],
  },
};

const enclosureParams: EnclosureSelectedParams = {
  type: 'default',
  enclosureRowSelected: null,
  sourceRowSelected: null,
};

const emptyAbridged: QueueResourcesAbridgedIndex = {
  items: {},
  clips: {},
  item_soundbites: {},
  add_by_rss_resource_datas: {},
};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('NonLiveMediaOrchestrator live resources', () => {
  it('renders the non-live audio without a src for a database live item with a labeled enclosure', async () => {
    const view = render(
      <AccountContext.Provider
        value={{ loggedInAccount: null, setLoggedInAccount: () => undefined }}
      >
        <NonLiveMediaOrchestrator
          mediaType="audio"
          hidden
          mpAddByRSS={null}
          mpChannel={podcastChannel}
          mpClip={null}
          setMPClip={() => undefined}
          mpItem={liveDatabaseItem}
          mpItemLabeledEnclosures={[labeledLiveEnclosure]}
          mpEnclosureSelectedParams={enclosureParams}
          mpItemChapter={null}
          setMPItemChapter={() => undefined}
          mpItemChapters={null}
          mpItemChapterShouldSeek={false}
          setMPItemChapterShouldSeek={() => undefined}
          mpItemSoundbite={null}
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
          updateNowPlaying={() => undefined}
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
          queueResourcesAbridgedIndex={emptyAbridged}
          clearNowPlaying={() => undefined}
          pendingPlaybackDecision={null}
          setPendingPlaybackDecision={() => undefined}
          pendingMusicQueueLoadIntentRef={{ current: null }}
        />
      </AccountContext.Provider>
    );

    await act(async () => {
      await Promise.resolve();
    });

    const audio = view.container.querySelector('audio');
    expect(audio).not.toBeNull();
    expect(audio?.getAttribute('src')).toBeNull();
  });

  it('clears a staged seek and duration when an Add by RSS livestream reports metadata', async () => {
    const setMPDuration = vi.fn();
    const setPendingPlaybackDecision = vi.fn();
    const pendingPlaybackDecision: PlaybackLoadDecision = {
      initialSeekSeconds: 30,
      shouldAutoPlay: false,
      shouldClearAutoQueue: false,
      listenSession: 'none',
      reason: 'add-by-rss-resume',
    };
    const mpAddByRSS: MediaPlayerAddByRSSState = {
      idText: 'abr-live-1',
      resourceData: {
        liveItem: { status: 'live' },
        enclosure_url: 'https://example.com/stream',
        duration: 48_000_000,
        medium_id: MediumEnum.Podcast,
      },
    };

    const view = render(
      <AccountContext.Provider
        value={{ loggedInAccount: null, setLoggedInAccount: () => undefined }}
      >
        <NonLiveMediaOrchestrator
          mediaType="audio"
          hidden
          mpAddByRSS={mpAddByRSS}
          mpChannel={null}
          mpClip={null}
          setMPClip={() => undefined}
          mpItem={null}
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
          setMPIsPlaying={() => undefined}
          mpPlaybackSpeed={1}
          mpVolume={1}
          mpIsMuted={false}
          mpShouldPlay={false}
          setMPShouldPlay={() => undefined}
          setMPDuration={setMPDuration}
          mpCurrentTime={0}
          setMPCurrentTime={() => undefined}
          addByRSSSeekToTime={null}
          setAddByRSSSeekToTime={() => undefined}
          updateNowPlaying={() => undefined}
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
          queueResourcesAbridgedIndex={emptyAbridged}
          clearNowPlaying={() => undefined}
          pendingPlaybackDecision={pendingPlaybackDecision}
          setPendingPlaybackDecision={setPendingPlaybackDecision}
          pendingMusicQueueLoadIntentRef={{ current: null }}
        />
      </AccountContext.Provider>
    );

    await act(async () => {
      await Promise.resolve();
    });

    const audio = view.container.querySelector('audio');
    if (audio === null) {
      throw new Error('Expected <audio> element to be rendered by NonLiveMediaOrchestrator');
    }
    const fake = installMediaElementFake(audio);
    fake.resetEventLog();

    await act(async () => {
      fake.fireLoadedMetadata(42);
    });

    expect(setMPDuration).toHaveBeenCalledWith(0);
    expect(setMPDuration).not.toHaveBeenCalledWith(42);
    expect(setPendingPlaybackDecision).toHaveBeenCalledWith(null);
    fake.assertNeverSeeked();
    expect(audio.currentTime).toBe(0);
  });
});
