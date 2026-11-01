import { describe, expect, it, vi } from 'vitest';

import { MediumEnum } from '@podverse/helpers';

import type {
  ListenSessionReport,
  ListenSessionTarget,
  ListenSessionTracker,
} from '../listenSession.js';
import {
  createListenSessionTracker,
  LISTEN_SESSION_MAX_SECONDS_HEARD,
  listenSessionTargetForClip,
  listenSessionTargetFromPlaybackTarget,
} from '../listenSession.js';
import type { PlaybackTarget } from '../playbackTarget.js';

const itemTarget: ListenSessionTarget = {
  kind: 'item',
  idText: 'item-1',
  mediumId: MediumEnum.Music,
};

const podcastTarget: ListenSessionTarget = {
  kind: 'item',
  idText: 'item-podcast',
  mediumId: MediumEnum.Podcast,
};

function createHarness(onReportImpl?: (report: ListenSessionReport) => void) {
  let nowMs = 0;
  let nextId = 0;
  const onReport = vi.fn<(report: ListenSessionReport) => void>((report) => {
    onReportImpl?.(report);
  });
  const tracker = createListenSessionTracker({
    now: () => nowMs,
    createClientListenId: () => {
      nextId += 1;
      return `listen-${nextId}`;
    },
    onReport,
  });
  return {
    tracker,
    onReport,
    advance(ms: number) {
      nowMs += ms;
    },
    idsCreated: () => nextId,
  };
}

/** One sample at `from`, then one sample per later second through `through`. */
function playEachSecond(
  tracker: ListenSessionTracker,
  advance: (ms: number) => void,
  from: number,
  through: number
): void {
  for (let position = from; position <= through; position += 1) {
    if (position > from) {
      advance(1000);
    }
    tracker.recordPosition({ positionSeconds: position, isPlaying: true, playbackRate: 1 });
  }
}

describe('createListenSessionTracker', () => {
  it('reports a long music item at 60 seconds and again on pause after 60 more', () => {
    const harness = createHarness();
    harness.tracker.load({
      directive: 'start',
      target: itemTarget,
      mediaDurationSeconds: 3_600,
    });
    playEachSecond(harness.tracker, harness.advance, 0, 119);

    expect(harness.onReport).toHaveBeenCalledTimes(1);
    expect(harness.onReport).toHaveBeenNthCalledWith(1, {
      target: itemTarget,
      clientListenId: 'listen-1',
      secondsHeard: 60,
      completed: false,
      countedAtMs: 60_000,
      firstReport: true,
      mediaDurationSeconds: 3_600,
    });

    for (let second = 120; second <= 125; second += 1) {
      harness.advance(1000);
      harness.tracker.recordPosition({
        positionSeconds: second,
        isPlaying: true,
        playbackRate: 1,
      });
    }
    harness.tracker.recordPause();

    expect(harness.onReport).toHaveBeenCalledTimes(2);
    expect(harness.onReport).toHaveBeenLastCalledWith({
      target: itemTarget,
      clientListenId: 'listen-1',
      secondsHeard: 125,
      completed: false,
      countedAtMs: 60_000,
      firstReport: false,
      mediaDurationSeconds: 3_600,
    });
  });

  it('reports a 90-second music track at 45 seconds and again at the 60-second cap', () => {
    const harness = createHarness();
    harness.tracker.load({
      directive: 'start',
      target: itemTarget,
      mediaDurationSeconds: 90,
    });
    playEachSecond(harness.tracker, harness.advance, 0, 44);
    expect(harness.onReport).not.toHaveBeenCalled();

    harness.advance(1000);
    harness.tracker.recordPosition({ positionSeconds: 45, isPlaying: true, playbackRate: 1 });
    expect(harness.onReport).toHaveBeenCalledTimes(1);
    expect(harness.onReport).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ secondsHeard: 45, countedAtMs: 45_000, firstReport: true })
    );

    playEachSecond(harness.tracker, harness.advance, 46, 59);
    expect(harness.onReport).toHaveBeenCalledTimes(1);

    harness.advance(1000);
    harness.tracker.recordPosition({ positionSeconds: 60, isPlaying: true, playbackRate: 1 });
    expect(harness.onReport).toHaveBeenCalledTimes(2);
    expect(harness.onReport).toHaveBeenLastCalledWith(
      expect.objectContaining({ secondsHeard: 60, firstReport: false, countedAtMs: 45_000 })
    );

    playEachSecond(harness.tracker, harness.advance, 61, 80);
    expect(harness.onReport).toHaveBeenCalledTimes(2);
  });

  it('reports a long episode at 5 minutes and again at the cap when the first report was earlier', () => {
    const harness = createHarness();
    harness.tracker.load({
      directive: 'start',
      target: podcastTarget,
      mediaDurationSeconds: 3_600,
    });
    playEachSecond(harness.tracker, harness.advance, 0, 299);
    expect(harness.onReport).not.toHaveBeenCalled();

    harness.advance(1000);
    harness.tracker.recordPosition({ positionSeconds: 300, isPlaying: true, playbackRate: 1 });
    expect(harness.onReport).toHaveBeenCalledTimes(1);
    expect(harness.onReport).toHaveBeenCalledWith(
      expect.objectContaining({
        secondsHeard: 300,
        mediaDurationSeconds: 3_600,
        firstReport: true,
      })
    );

    const shorter = createHarness();
    shorter.tracker.load({
      directive: 'start',
      target: podcastTarget,
      mediaDurationSeconds: 480,
    });
    playEachSecond(shorter.tracker, shorter.advance, 0, 239);
    expect(shorter.onReport).not.toHaveBeenCalled();
    shorter.advance(1000);
    shorter.tracker.recordPosition({ positionSeconds: 240, isPlaying: true, playbackRate: 1 });
    expect(shorter.onReport).toHaveBeenCalledTimes(1);

    playEachSecond(shorter.tracker, shorter.advance, 241, 299);
    expect(shorter.onReport).toHaveBeenCalledTimes(1);
    shorter.advance(1000);
    shorter.tracker.recordPosition({ positionSeconds: 300, isPlaying: true, playbackRate: 1 });
    expect(shorter.onReport).toHaveBeenCalledTimes(2);
    expect(shorter.onReport).toHaveBeenLastCalledWith(
      expect.objectContaining({ secondsHeard: 300, firstReport: false, countedAtMs: 240_000 })
    );
  });

  it('ignores a forward jump and the sample after a seek, and counts a throttled sample', () => {
    const jump = createHarness();
    jump.tracker.load({ directive: 'start', target: itemTarget, mediaDurationSeconds: 3_600 });
    jump.tracker.recordPosition({ positionSeconds: 0, isPlaying: true, playbackRate: 1 });
    jump.advance(1000);
    jump.tracker.recordPosition({ positionSeconds: 300, isPlaying: true, playbackRate: 1 });
    for (let step = 1; step <= 59; step += 1) {
      jump.advance(1000);
      jump.tracker.recordPosition({
        positionSeconds: 300 + step,
        isPlaying: true,
        playbackRate: 1,
      });
    }
    expect(jump.onReport).not.toHaveBeenCalled();
    jump.advance(1000);
    jump.tracker.recordPosition({ positionSeconds: 360, isPlaying: true, playbackRate: 1 });
    expect(jump.onReport).toHaveBeenCalledTimes(1);
    expect(jump.onReport).toHaveBeenCalledWith(expect.objectContaining({ secondsHeard: 60 }));

    const seek = createHarness();
    seek.tracker.load({ directive: 'start', target: itemTarget, mediaDurationSeconds: 3_600 });
    playEachSecond(seek.tracker, seek.advance, 0, 20);
    seek.tracker.recordSeek();
    seek.advance(1000);
    seek.tracker.recordPosition({ positionSeconds: 22, isPlaying: true, playbackRate: 1 });
    for (let position = 23; position <= 61; position += 1) {
      seek.advance(1000);
      seek.tracker.recordPosition({ positionSeconds: position, isPlaying: true, playbackRate: 1 });
    }
    expect(seek.onReport).not.toHaveBeenCalled();
    seek.advance(1000);
    seek.tracker.recordPosition({ positionSeconds: 62, isPlaying: true, playbackRate: 1 });
    expect(seek.onReport).toHaveBeenCalledTimes(1);
    expect(seek.onReport).toHaveBeenCalledWith(expect.objectContaining({ secondsHeard: 60 }));

    const throttled = createHarness();
    throttled.tracker.load({
      directive: 'start',
      target: itemTarget,
      mediaDurationSeconds: 3_600,
    });
    throttled.tracker.recordPosition({ positionSeconds: 0, isPlaying: true, playbackRate: 1 });
    throttled.advance(30_000);
    throttled.tracker.recordPosition({ positionSeconds: 30, isPlaying: true, playbackRate: 1 });
    expect(throttled.onReport).not.toHaveBeenCalled();
    throttled.advance(30_000);
    throttled.tracker.recordPosition({ positionSeconds: 60, isPlaying: true, playbackRate: 1 });
    expect(throttled.onReport).toHaveBeenCalledTimes(1);
    expect(throttled.onReport).toHaveBeenCalledWith(expect.objectContaining({ secondsHeard: 60 }));
  });

  it('ignores paused samples and treats the next playing sample as a baseline', () => {
    const harness = createHarness();
    harness.tracker.load({ directive: 'start', target: itemTarget, mediaDurationSeconds: 3_600 });
    playEachSecond(harness.tracker, harness.advance, 0, 50);
    harness.advance(5_000);
    harness.tracker.recordPosition({ positionSeconds: 54, isPlaying: false, playbackRate: 1 });
    harness.advance(1_000);
    harness.tracker.recordPosition({ positionSeconds: 55, isPlaying: true, playbackRate: 1 });
    for (let position = 56; position <= 64; position += 1) {
      harness.advance(1000);
      harness.tracker.recordPosition({
        positionSeconds: position,
        isPlaying: true,
        playbackRate: 1,
      });
    }
    expect(harness.onReport).not.toHaveBeenCalled();
    harness.advance(1000);
    harness.tracker.recordPosition({ positionSeconds: 65, isPlaying: true, playbackRate: 1 });
    expect(harness.onReport).toHaveBeenCalledTimes(1);
    expect(harness.onReport).toHaveBeenCalledWith(expect.objectContaining({ secondsHeard: 60 }));
  });

  it('counts a two-second advance per wall second at double speed, and a four-second advance only then', () => {
    const doubled = createHarness();
    doubled.tracker.load({ directive: 'start', target: itemTarget, mediaDurationSeconds: 3_600 });
    doubled.tracker.recordPosition({ positionSeconds: 0, isPlaying: true, playbackRate: 2 });
    for (let step = 1; step <= 30; step += 1) {
      doubled.advance(1000);
      doubled.tracker.recordPosition({
        positionSeconds: step * 2,
        isPlaying: true,
        playbackRate: 2,
      });
    }
    expect(doubled.onReport).toHaveBeenCalledTimes(1);
    expect(doubled.onReport).toHaveBeenCalledWith(
      expect.objectContaining({ secondsHeard: 60, countedAtMs: 30_000 })
    );

    const limited = createHarness();
    limited.tracker.load({ directive: 'start', target: itemTarget, mediaDurationSeconds: 3_600 });
    limited.tracker.recordPosition({ positionSeconds: 0, isPlaying: true, playbackRate: 1 });
    limited.advance(1000);
    limited.tracker.recordPosition({ positionSeconds: 4, isPlaying: true, playbackRate: 1 });
    for (let step = 1; step <= 59; step += 1) {
      limited.advance(1000);
      limited.tracker.recordPosition({
        positionSeconds: 4 + step,
        isPlaying: true,
        playbackRate: 1,
      });
    }
    expect(limited.onReport).not.toHaveBeenCalled();
    limited.advance(1000);
    limited.tracker.recordPosition({ positionSeconds: 64, isPlaying: true, playbackRate: 1 });
    expect(limited.onReport).toHaveBeenCalledWith(expect.objectContaining({ secondsHeard: 60 }));

    const fast = createHarness();
    fast.tracker.load({ directive: 'start', target: itemTarget, mediaDurationSeconds: 3_600 });
    fast.tracker.recordPosition({ positionSeconds: 0, isPlaying: true, playbackRate: 2 });
    for (let step = 1; step <= 15; step += 1) {
      fast.advance(1000);
      fast.tracker.recordPosition({
        positionSeconds: step * 4,
        isPlaying: true,
        playbackRate: 2,
      });
    }
    expect(fast.onReport).toHaveBeenCalledTimes(1);
    expect(fast.onReport).toHaveBeenCalledWith(expect.objectContaining({ secondsHeard: 60 }));
  });

  it('keeps the client listen id on continue and issues a new one on start', () => {
    const continued = createHarness();
    continued.tracker.load({
      directive: 'start',
      target: itemTarget,
      mediaDurationSeconds: 3_600,
    });
    playEachSecond(continued.tracker, continued.advance, 0, 30);
    continued.tracker.load({
      directive: 'continue',
      target: itemTarget,
      mediaDurationSeconds: 3_600,
    });
    expect(continued.idsCreated()).toBe(1);
    continued.tracker.recordPosition({ positionSeconds: 30, isPlaying: true, playbackRate: 1 });
    for (let second = 31; second <= 60; second += 1) {
      continued.advance(1000);
      continued.tracker.recordPosition({
        positionSeconds: second,
        isPlaying: true,
        playbackRate: 1,
      });
    }
    expect(continued.onReport).toHaveBeenCalledTimes(1);
    expect(continued.onReport).toHaveBeenCalledWith(
      expect.objectContaining({ clientListenId: 'listen-1', secondsHeard: 60, firstReport: true })
    );

    const replaced = createHarness();
    replaced.tracker.load({ directive: 'start', target: itemTarget, mediaDurationSeconds: 3_600 });
    playEachSecond(replaced.tracker, replaced.advance, 0, 60);
    replaced.tracker.load({ directive: 'start', target: itemTarget, mediaDurationSeconds: 3_600 });
    expect(replaced.idsCreated()).toBe(2);
    expect(replaced.onReport).toHaveBeenCalledTimes(1);
    playEachSecond(replaced.tracker, replaced.advance, 0, 60);
    expect(replaced.onReport).toHaveBeenLastCalledWith(
      expect.objectContaining({
        clientListenId: 'listen-2',
        secondsHeard: 60,
        firstReport: true,
      })
    );
  });

  it('starts a session when continue has no matching session', () => {
    const fresh = createHarness();
    fresh.tracker.load({ directive: 'continue', target: itemTarget, mediaDurationSeconds: 3_600 });
    expect(fresh.idsCreated()).toBe(1);
    playEachSecond(fresh.tracker, fresh.advance, 0, 60);
    expect(fresh.onReport).toHaveBeenCalledWith(
      expect.objectContaining({ clientListenId: 'listen-1', secondsHeard: 60 })
    );

    const mismatched = createHarness();
    mismatched.tracker.load({
      directive: 'start',
      target: itemTarget,
      mediaDurationSeconds: 3_600,
    });
    playEachSecond(mismatched.tracker, mismatched.advance, 0, 30);
    mismatched.tracker.load({
      directive: 'continue',
      target: { kind: 'item', idText: 'item-2', mediumId: MediumEnum.Music },
      mediaDurationSeconds: 3_600,
    });
    expect(mismatched.idsCreated()).toBe(2);
    expect(mismatched.onReport).not.toHaveBeenCalled();
    playEachSecond(mismatched.tracker, mismatched.advance, 0, 60);
    expect(mismatched.onReport).toHaveBeenCalledWith(
      expect.objectContaining({ clientListenId: 'listen-2', secondsHeard: 60 })
    );
  });

  it('tracks nothing for a none directive or a null target', () => {
    const none = createHarness();
    none.tracker.load({ directive: 'none', target: itemTarget, mediaDurationSeconds: 3_600 });
    playEachSecond(none.tracker, none.advance, 0, 120);
    expect(none.onReport).not.toHaveBeenCalled();
    expect(none.idsCreated()).toBe(0);

    const missing = createHarness();
    missing.tracker.load({ directive: 'start', target: null, mediaDurationSeconds: 3_600 });
    playEachSecond(missing.tracker, missing.advance, 0, 120);
    expect(missing.onReport).not.toHaveBeenCalled();
    expect(missing.idsCreated()).toBe(0);

    const closed = createHarness();
    closed.tracker.load({ directive: 'start', target: itemTarget, mediaDurationSeconds: 3_600 });
    playEachSecond(closed.tracker, closed.advance, 0, 20);
    closed.tracker.load({ directive: 'none', target: null, mediaDurationSeconds: null });
    closed.tracker.recordPosition({ positionSeconds: 20, isPlaying: true, playbackRate: 1 });
    for (let position = 21; position <= 120; position += 1) {
      closed.advance(1000);
      closed.tracker.recordPosition({
        positionSeconds: position,
        isPlaying: true,
        playbackRate: 1,
      });
    }
    expect(closed.onReport).not.toHaveBeenCalled();
  });

  it('completes a clip when playback reaches its end and then ignores later samples', () => {
    const harness = createHarness();
    const target = listenSessionTargetForClip({
      id_text: 'clip-1',
      start_time: '0',
      end_time: '200',
    });
    harness.tracker.load({ directive: 'start', target, mediaDurationSeconds: 3_600 });
    playEachSecond(harness.tracker, harness.advance, 0, 200);

    expect(harness.onReport).toHaveBeenCalledTimes(2);
    expect(harness.onReport).toHaveBeenLastCalledWith({
      target,
      clientListenId: 'listen-1',
      secondsHeard: 200,
      completed: true,
      countedAtMs: 100_000,
      firstReport: false,
      mediaDurationSeconds: 3_600,
    });

    harness.advance(1000);
    harness.tracker.recordPosition({ positionSeconds: 250, isPlaying: true, playbackRate: 1 });
    harness.tracker.recordCompleted();
    expect(harness.onReport).toHaveBeenCalledTimes(2);
  });

  it('reports item completion after the listen counted, and nothing before that', () => {
    const counted = createHarness();
    counted.tracker.load({ directive: 'start', target: itemTarget, mediaDurationSeconds: 3_600 });
    playEachSecond(counted.tracker, counted.advance, 0, 70);
    counted.tracker.recordCompleted();
    expect(counted.onReport).toHaveBeenLastCalledWith(
      expect.objectContaining({ secondsHeard: 70, completed: true, firstReport: false })
    );

    const early = createHarness();
    early.tracker.load({ directive: 'start', target: itemTarget, mediaDurationSeconds: 3_600 });
    playEachSecond(early.tracker, early.advance, 0, 10);
    early.tracker.recordCompleted();
    playEachSecond(early.tracker, early.advance, 0, 120);
    expect(early.onReport).not.toHaveBeenCalled();
  });

  it('does not throw when the reporter throws', () => {
    const harness = createHarness(() => {
      throw new Error('send failed');
    });
    harness.tracker.load({ directive: 'start', target: itemTarget, mediaDurationSeconds: 3_600 });
    expect(() => {
      playEachSecond(harness.tracker, harness.advance, 0, 60);
    }).not.toThrow();
    expect(harness.onReport).toHaveBeenCalled();
  });

  it('reports whole seconds and never more than a day', () => {
    const fractional = createHarness();
    fractional.tracker.load({
      directive: 'start',
      target: itemTarget,
      mediaDurationSeconds: 3_600,
    });
    fractional.tracker.recordPosition({ positionSeconds: 0, isPlaying: true, playbackRate: 1 });
    fractional.advance(59_900);
    fractional.tracker.recordPosition({ positionSeconds: 59.9, isPlaying: true, playbackRate: 1 });
    expect(fractional.onReport).not.toHaveBeenCalled();
    fractional.advance(1000);
    fractional.tracker.recordPosition({ positionSeconds: 60.9, isPlaying: true, playbackRate: 1 });
    expect(fractional.onReport).toHaveBeenCalledWith(expect.objectContaining({ secondsHeard: 60 }));
    const reported = fractional.onReport.mock.calls[0]?.[0];
    expect(Number.isInteger(reported?.secondsHeard)).toBe(true);

    const capped = createHarness();
    capped.tracker.load({ directive: 'start', target: itemTarget, mediaDurationSeconds: null });
    capped.tracker.recordPosition({ positionSeconds: 0, isPlaying: true, playbackRate: 100_000 });
    capped.advance(1000);
    capped.tracker.recordPosition({
      positionSeconds: 100_000,
      isPlaying: true,
      playbackRate: 100_000,
    });
    expect(capped.onReport).toHaveBeenCalledWith(
      expect.objectContaining({ secondsHeard: LISTEN_SESSION_MAX_SECONDS_HEARD })
    );
    capped.advance(10_000);
    capped.tracker.recordPosition({
      positionSeconds: 200_000,
      isPlaying: true,
      playbackRate: 100_000,
    });
    capped.tracker.recordPause();
    expect(capped.onReport).toHaveBeenCalledTimes(1);
  });

  it('drops the session on reset without an update report', () => {
    const harness = createHarness();
    harness.tracker.load({ directive: 'start', target: itemTarget, mediaDurationSeconds: 3_600 });
    playEachSecond(harness.tracker, harness.advance, 0, 125);
    expect(harness.onReport).toHaveBeenCalledTimes(1);
    harness.tracker.reset();
    harness.tracker.recordPause();
    playEachSecond(harness.tracker, harness.advance, 0, 120);
    expect(harness.onReport).toHaveBeenCalledTimes(1);
  });

  it('applies media duration that arrives after the load', () => {
    const harness = createHarness();
    harness.tracker.load({ directive: 'start', target: itemTarget, mediaDurationSeconds: null });
    playEachSecond(harness.tracker, harness.advance, 0, 50);
    expect(harness.onReport).not.toHaveBeenCalled();
    harness.tracker.setMediaDuration(90);
    harness.advance(1000);
    harness.tracker.recordPosition({ positionSeconds: 51, isPlaying: true, playbackRate: 1 });
    expect(harness.onReport).toHaveBeenCalledTimes(1);
    expect(harness.onReport).toHaveBeenCalledWith(
      expect.objectContaining({ secondsHeard: 51, firstReport: true })
    );
  });
});

describe('listenSessionTargetFromPlaybackTarget', () => {
  it('counts a clip toward the clip, catalog items toward the item, and skips the rest', () => {
    const clip = { id_text: 'clip-9', start_time: '12', end_time: '40' };
    expect(listenSessionTargetForClip(clip)).toEqual({
      kind: 'clip',
      idText: 'clip-9',
      startSeconds: 12,
      endSeconds: 40,
      mediumId: null,
    });
    expect(listenSessionTargetForClip({ id_text: 'clip-9', start_time: '4' })).toEqual({
      kind: 'clip',
      idText: 'clip-9',
      startSeconds: 4,
      endSeconds: null,
      mediumId: null,
    });

    // These objects carry only the fields the helper reads.
    expect(
      listenSessionTargetFromPlaybackTarget({
        kind: 'clip',
        clip,
        item: { id_text: 'item-9' },
        channel: { id_text: 'channel-1' },
      } as PlaybackTarget)
    ).toEqual({
      kind: 'clip',
      idText: 'clip-9',
      startSeconds: 12,
      endSeconds: 40,
      mediumId: null,
    });

    expect(
      listenSessionTargetFromPlaybackTarget({
        kind: 'soundbite',
        soundbite: { id: 1, id_text: 'sb-1', item_id: 1, start_time: '1', duration: '2' },
        item: { id_text: 'item-sb' },
        channel: { id_text: 'channel-1' },
      } as PlaybackTarget)
    ).toEqual({ kind: 'item', idText: 'item-sb', mediumId: null });

    expect(
      listenSessionTargetFromPlaybackTarget({
        kind: 'chapter',
        chapter: {
          id: 1,
          id_text: 'ch-1',
          item_chapters_feed_id: 1,
          data_hash: 'hash',
          start_time: '3',
          table_of_contents: false,
        },
        item: { id_text: 'item-ch' },
        channel: { id_text: 'channel-1' },
      } as PlaybackTarget)
    ).toEqual({ kind: 'item', idText: 'item-ch', mediumId: null });

    for (const kind of ['item-podcast', 'item-video'] as const) {
      expect(
        listenSessionTargetFromPlaybackTarget({
          kind,
          item: { id_text: 'item-1' },
          channel: { id_text: 'channel-1' },
        } as PlaybackTarget)
      ).toEqual({ kind: 'item', idText: 'item-1', mediumId: null });
    }

    expect(
      listenSessionTargetFromPlaybackTarget({
        kind: 'item-music',
        intent: 'session_restore',
        item: { id_text: 'item-1' },
        channel: { id_text: 'channel-1', medium_id: MediumEnum.Music },
      } as PlaybackTarget)
    ).toEqual({ kind: 'item', idText: 'item-1', mediumId: MediumEnum.Music });

    expect(
      listenSessionTargetFromPlaybackTarget({
        kind: 'add-by-rss',
        resourceData: {},
      } as PlaybackTarget)
    ).toBeNull();
    expect(
      listenSessionTargetFromPlaybackTarget({
        kind: 'livestream',
        channel: { id_text: 'channel-1' },
        item: null,
      } as PlaybackTarget)
    ).toBeNull();
  });
});
