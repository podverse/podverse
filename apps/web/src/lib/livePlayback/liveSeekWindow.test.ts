import { describe, expect, it } from 'vitest';

import type { SeekableRanges } from './liveSeekWindow';
import { readLiveSeekWindow } from './liveSeekWindow';

function seekableRanges(...ranges: Array<[number, number]>): SeekableRanges {
  const at = (index: number): [number, number] => {
    const range = ranges[index];
    if (range === undefined) {
      throw new RangeError(`No seekable range at ${index}`);
    }
    return range;
  };
  return {
    length: ranges.length,
    start: (index) => at(index)[0],
    end: (index) => at(index)[1],
  };
}

function hlsWindow(params: {
  seekable: SeekableRanges;
  liveSyncPositionSeconds?: number | null;
  nativeJoinOffsetSeconds?: number | null;
}) {
  return readLiveSeekWindow({
    delivery: 'hls',
    seekable: params.seekable,
    liveSyncPositionSeconds: params.liveSyncPositionSeconds ?? null,
    nativeJoinOffsetSeconds: params.nativeJoinOffsetSeconds ?? null,
  });
}

describe('readLiveSeekWindow', () => {
  it('reports no window for a progressive stream even when the browser reports a seekable range', () => {
    expect(
      readLiveSeekWindow({
        delivery: 'file',
        seekable: seekableRanges([0, 90]),
        liveSyncPositionSeconds: 72,
        nativeJoinOffsetSeconds: null,
      })
    ).toBeNull();
  });

  it('reports no window before the stream reports a seekable range', () => {
    expect(hlsWindow({ seekable: seekableRanges() })).toBeNull();
  });

  it('places the live edge at the hls.js live sync position, kept inside the range end', () => {
    expect(hlsWindow({ seekable: seekableRanges([0, 90]), liveSyncPositionSeconds: 72 })).toEqual({
      startSeconds: 0,
      liveEdgeSeconds: 72,
    });
    expect(hlsWindow({ seekable: seekableRanges([0, 90]), liveSyncPositionSeconds: 120 })).toEqual({
      startSeconds: 0,
      liveEdgeSeconds: 90,
    });
  });

  it('places the native HLS live edge the join offset before the range end, or at the end without one', () => {
    expect(hlsWindow({ seekable: seekableRanges([0, 90]), nativeJoinOffsetSeconds: 18 })).toEqual({
      startSeconds: 0,
      liveEdgeSeconds: 72,
    });
    expect(hlsWindow({ seekable: seekableRanges([0, 90]) })).toEqual({
      startSeconds: 0,
      liveEdgeSeconds: 90,
    });
  });

  it('never places the live edge before the window start', () => {
    expect(hlsWindow({ seekable: seekableRanges([50, 90]), liveSyncPositionSeconds: 40 })).toEqual({
      startSeconds: 50,
      liveEdgeSeconds: 50,
    });
    expect(hlsWindow({ seekable: seekableRanges([50, 90]), nativeJoinOffsetSeconds: 60 })).toEqual({
      startSeconds: 50,
      liveEdgeSeconds: 50,
    });
  });

  it('reports no window when the range end is not finite or not after the start', () => {
    expect(hlsWindow({ seekable: seekableRanges([0, Number.POSITIVE_INFINITY]) })).toBeNull();
    expect(hlsWindow({ seekable: seekableRanges([40, 40]) })).toBeNull();
  });

  it('uses the last of several seekable ranges', () => {
    expect(hlsWindow({ seekable: seekableRanges([0, 10], [20, 90]) })).toEqual({
      startSeconds: 20,
      liveEdgeSeconds: 90,
    });
  });
});
