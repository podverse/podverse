import { describe, expect, it } from 'vitest';

import type { DTOItemChapter } from '@podverse/helpers/dto';
import type { PlaybackTarget } from '@podverse/playback-core';

import {
  chaptersForTrackButtons,
  hasEpisodeChaptersForTrackButtons,
  PREVIOUS_CHAPTER_GRACE_SECONDS,
  resolveJumpTarget,
  resolveNextAction,
  resolvePreviousAction,
} from './previousAction';

const chapter = ({
  endTime = '60',
  id = 1,
  idText = 'c1',
  startTime = '0',
  tableOfContents = true,
  title = 'Chapter',
}: {
  endTime?: string | null;
  id?: number;
  idText?: string;
  startTime?: string;
  tableOfContents?: boolean;
  title?: string | null;
}): DTOItemChapter => ({
  data_hash: `hash-${idText}`,
  end_time: endTime,
  id,
  id_text: idText,
  item_chapters_feed_id: 1,
  start_time: startTime,
  table_of_contents: tableOfContents,
  title,
});

const itemTarget = {
  channel: { id_text: 'channel-1' },
  item: { id_text: 'item-1' },
  kind: 'item-podcast',
} as PlaybackTarget;

const clipTarget = {
  channel: { id_text: 'channel-1' },
  clip: { id_text: 'clip-1' },
  item: { id_text: 'item-1' },
  kind: 'clip',
} as PlaybackTarget;

describe('resolvePreviousAction', () => {
  it('restarts the active chapter once beyond the grace window', () => {
    const chapters = [
      chapter({ endTime: '30', id: 1, idText: 'intro', startTime: '0' }),
      chapter({ endTime: '90', id: 2, idText: 'topic', startTime: '30' }),
    ];

    expect(
      resolvePreviousAction({
        chapters,
        hasPreviousQueueItem: true,
        positionSeconds: 40,
      })
    ).toEqual({
      kind: 'seek-chapter-start',
      seekSeconds: 30,
    });
  });

  it('steps to the previous chapter within the grace window', () => {
    const chapters = [
      chapter({ endTime: '30', id: 1, idText: 'intro', startTime: '0' }),
      chapter({ endTime: '90', id: 2, idText: 'topic', startTime: '30' }),
    ];

    expect(
      resolvePreviousAction({
        chapters,
        hasPreviousQueueItem: true,
        positionSeconds: 30 + PREVIOUS_CHAPTER_GRACE_SECONDS,
      })
    ).toEqual({
      kind: 'seek-previous-chapter',
      seekSeconds: 0,
    });
  });

  it('falls back to the previous queue item from the first chapter', () => {
    expect(
      resolvePreviousAction({
        chapters: [chapter({ endTime: '40', id: 1, idText: 'only', startTime: '0' })],
        hasPreviousQueueItem: true,
        positionSeconds: 1,
      })
    ).toEqual({ kind: 'previous-queue-item' });
  });

  it('falls back to zero from the first chapter when there is no queue predecessor', () => {
    expect(
      resolvePreviousAction({
        chapters: [chapter({ endTime: '40', id: 1, idText: 'only', startTime: '0' })],
        hasPreviousQueueItem: false,
        positionSeconds: 1,
      })
    ).toEqual({ kind: 'seek-zero', seekSeconds: 0 });
  });

  it('restarts from zero when there are no chapters and playhead is past the grace window', () => {
    expect(
      resolvePreviousAction({
        chapters: [],
        hasPreviousQueueItem: true,
        positionSeconds: 75,
      })
    ).toEqual({ kind: 'seek-zero', seekSeconds: 0 });
  });

  it('uses the queue predecessor when there are no chapters and playhead is within grace', () => {
    expect(
      resolvePreviousAction({
        chapters: [],
        hasPreviousQueueItem: true,
        positionSeconds: PREVIOUS_CHAPTER_GRACE_SECONDS,
      })
    ).toEqual({ kind: 'previous-queue-item' });
  });
});

describe('resolveNextAction', () => {
  it('steps to the next chapter start', () => {
    const chapters = [
      chapter({ endTime: '30', id: 1, idText: 'intro', startTime: '0' }),
      chapter({ endTime: '90', id: 2, idText: 'topic', startTime: '30' }),
    ];

    expect(
      resolveNextAction({
        chapters,
        positionSeconds: 10,
      })
    ).toEqual({
      kind: 'seek-next-chapter',
      seekSeconds: 30,
    });
  });

  it('returns none on the last chapter', () => {
    const chapters = [
      chapter({ endTime: '30', id: 1, idText: 'intro', startTime: '0' }),
      chapter({ endTime: '90', id: 2, idText: 'topic', startTime: '30' }),
    ];

    expect(
      resolveNextAction({
        chapters,
        positionSeconds: 45,
      })
    ).toEqual({ kind: 'none' });
  });

  it('falls through to the next queue item when there are no chapters', () => {
    expect(
      resolveNextAction({
        chapters: [],
        positionSeconds: 10,
      })
    ).toEqual({ kind: 'next-queue-item' });
  });
});

describe('hasEpisodeChaptersForTrackButtons', () => {
  it('is true for whole-item playback with chapters', () => {
    expect(
      hasEpisodeChaptersForTrackButtons(itemTarget, [
        chapter({ endTime: '30', id: 1, idText: 'intro', startTime: '0' }),
      ])
    ).toBe(true);
  });

  it('is false for clip playback even when chapters exist', () => {
    expect(
      hasEpisodeChaptersForTrackButtons(clipTarget, [
        chapter({ endTime: '30', id: 1, idText: 'intro', startTime: '0' }),
      ])
    ).toBe(false);
    expect(
      chaptersForTrackButtons(clipTarget, [
        chapter({ endTime: '30', id: 1, idText: 'intro', startTime: '0' }),
      ])
    ).toEqual([]);
  });
});

describe('resolveJumpTarget', () => {
  it('clamps item jumps to zero and duration bounds', () => {
    expect(
      resolveJumpTarget({
        deltaSeconds: -10,
        lowerBoundSeconds: 0,
        positionSeconds: 5,
        upperBoundSeconds: 100,
      })
    ).toBe(0);

    expect(
      resolveJumpTarget({
        deltaSeconds: 20,
        lowerBoundSeconds: 0,
        positionSeconds: 95,
        upperBoundSeconds: 100,
      })
    ).toBe(100);
  });

  it('clamps bounded-target jumps to the bounded window', () => {
    expect(
      resolveJumpTarget({
        deltaSeconds: -10,
        lowerBoundSeconds: 60,
        positionSeconds: 62,
        upperBoundSeconds: 100,
      })
    ).toBe(60);

    expect(
      resolveJumpTarget({
        deltaSeconds: 10,
        lowerBoundSeconds: 60,
        positionSeconds: 98,
        upperBoundSeconds: 100,
      })
    ).toBe(100);
  });

  it('keeps unknown-duration live forward jumps at the live edge', () => {
    const liveEdge = 120;
    expect(
      resolveJumpTarget({
        deltaSeconds: 30,
        lowerBoundSeconds: 0,
        positionSeconds: liveEdge,
        upperBoundSeconds: liveEdge,
      })
    ).toBe(liveEdge);
  });
});
