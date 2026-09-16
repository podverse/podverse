import { describe, expect, it } from 'vitest';

import {
  episodeProgressRatio,
  episodeProgressTimeKind,
  parsePlaybackSeconds,
  resolveEpisodePlaybackProgress,
} from './episodePlaybackProgress';

describe('parsePlaybackSeconds', () => {
  it('keeps finite positive numbers and numeric strings', () => {
    expect(parsePlaybackSeconds(12)).toBe(12);
    expect(parsePlaybackSeconds('90')).toBe(90);
  });

  it('treats empty, non-numeric, and non-positive values as zero', () => {
    expect(parsePlaybackSeconds(null)).toBe(0);
    expect(parsePlaybackSeconds(undefined)).toBe(0);
    expect(parsePlaybackSeconds('')).toBe(0);
    expect(parsePlaybackSeconds('nope')).toBe(0);
    expect(parsePlaybackSeconds(0)).toBe(0);
    expect(parsePlaybackSeconds(-4)).toBe(0);
  });
});

describe('resolveEpisodePlaybackProgress', () => {
  it('uses live ticks when this episode is playing', () => {
    expect(
      resolveEpisodePlaybackProgress({
        itemDurationSeconds: 300,
        live: { durationSeconds: 310, positionSeconds: 40 },
        storedDurationSeconds: 300,
        storedPositionSeconds: 12,
      })
    ).toEqual({ durationSeconds: 310, positionSeconds: 40 });
  });

  it('falls back to the item duration when live duration is still unknown', () => {
    expect(
      resolveEpisodePlaybackProgress({
        itemDurationSeconds: 300,
        live: { durationSeconds: 0, positionSeconds: 8 },
        storedDurationSeconds: 0,
        storedPositionSeconds: 0,
      })
    ).toEqual({ durationSeconds: 300, positionSeconds: 8 });
  });

  it('uses stored queue progress when the episode is not playing', () => {
    expect(
      resolveEpisodePlaybackProgress({
        itemDurationSeconds: 200,
        live: null,
        storedDurationSeconds: 240,
        storedPositionSeconds: 60,
      })
    ).toEqual({ durationSeconds: 240, positionSeconds: 60 });
  });

  it('falls back to the item duration when nothing is stored', () => {
    expect(
      resolveEpisodePlaybackProgress({
        itemDurationSeconds: 180,
        live: null,
        storedDurationSeconds: 0,
        storedPositionSeconds: 0,
      })
    ).toEqual({ durationSeconds: 180, positionSeconds: 0 });
  });
});

describe('episodeProgressRatio and episodeProgressTimeKind', () => {
  it('returns remaining when both position and duration are known', () => {
    const progress = { durationSeconds: 100, positionSeconds: 25 };
    expect(episodeProgressRatio(progress)).toBe(0.25);
    expect(episodeProgressTimeKind(progress)).toBe('remaining');
  });

  it('returns last when only position is known', () => {
    expect(episodeProgressTimeKind({ durationSeconds: 0, positionSeconds: 15 })).toBe('last');
    expect(episodeProgressRatio({ durationSeconds: 0, positionSeconds: 15 })).toBe(0);
  });

  it('returns duration when nothing has been heard yet', () => {
    expect(episodeProgressTimeKind({ durationSeconds: 90, positionSeconds: 0 })).toBe('duration');
    expect(episodeProgressTimeKind({ durationSeconds: 0, positionSeconds: 0 })).toBe('none');
  });
});
