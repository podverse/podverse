import { describe, expect, it } from 'vitest';

import { MediumEnum } from './medium.js';
import {
  countsTowardTooSoonSignal,
  fadeTasteScore,
  getCountedListenThresholdSeconds,
  isCountedListen,
  isPopularityFlagReason,
  isStoredCapReachedFast,
  POPULARITY_COUNTED_LISTEN_LONG_CAP_SECONDS,
  POPULARITY_COUNTED_LISTEN_SHORT_CAP_SECONDS,
  POPULARITY_DEFAULT_LISTEN_MIN_INTERVAL_SECONDS,
  POPULARITY_TASTE_HALF_LIFE_DAYS,
  resolveCountedListenDurationSeconds,
} from './popularityListen.js';

const MS_PER_DAY = 86_400_000;

describe('getCountedListenThresholdSeconds', () => {
  it('uses the medium cap when the duration is unknown, zero, negative, or non-finite', () => {
    for (const duration of [null, undefined, 0, -5, Number.NaN]) {
      expect(getCountedListenThresholdSeconds(duration, MediumEnum.Podcast)).toBe(
        POPULARITY_COUNTED_LISTEN_LONG_CAP_SECONDS
      );
      expect(getCountedListenThresholdSeconds(duration, null)).toBe(
        POPULARITY_COUNTED_LISTEN_LONG_CAP_SECONDS
      );
      expect(getCountedListenThresholdSeconds(duration, MediumEnum.Music)).toBe(
        POPULARITY_COUNTED_LISTEN_SHORT_CAP_SECONDS
      );
    }
  });

  it('is the cap or half the length, whichever is smaller', () => {
    expect(getCountedListenThresholdSeconds(3_600, MediumEnum.Podcast)).toBe(300);
    expect(getCountedListenThresholdSeconds(480, MediumEnum.Podcast)).toBe(240);
    expect(getCountedListenThresholdSeconds(200, MediumEnum.Video)).toBe(100);
    expect(getCountedListenThresholdSeconds(20, null)).toBe(10);
    expect(getCountedListenThresholdSeconds(3_600, MediumEnum.Music)).toBe(60);
    expect(getCountedListenThresholdSeconds(90, MediumEnum.MusicL)).toBe(45);
    expect(getCountedListenThresholdSeconds(200, MediumEnum.PublisherMusic)).toBe(60);
  });
});

describe('isCountedListen', () => {
  it('counts a long episode at 5 minutes and not a second earlier', () => {
    expect(
      isCountedListen({ secondsHeard: 300, durationSeconds: 3_600, mediumId: MediumEnum.Podcast })
    ).toBe(true);
    expect(
      isCountedListen({ secondsHeard: 299, durationSeconds: 3_600, mediumId: MediumEnum.Podcast })
    ).toBe(false);
  });

  it('counts an 8-minute episode at half its length', () => {
    expect(
      isCountedListen({ secondsHeard: 240, durationSeconds: 480, mediumId: MediumEnum.Podcast })
    ).toBe(true);
    expect(
      isCountedListen({ secondsHeard: 239, durationSeconds: 480, mediumId: MediumEnum.Podcast })
    ).toBe(false);
  });

  it('counts a long track at 60 seconds and a 90-second track at 45', () => {
    expect(
      isCountedListen({ secondsHeard: 60, durationSeconds: 3_600, mediumId: MediumEnum.Music })
    ).toBe(true);
    expect(
      isCountedListen({ secondsHeard: 59, durationSeconds: 3_600, mediumId: MediumEnum.Music })
    ).toBe(false);
    expect(
      isCountedListen({ secondsHeard: 45, durationSeconds: 90, mediumId: MediumEnum.Music })
    ).toBe(true);
    expect(
      isCountedListen({ secondsHeard: 44, durationSeconds: 90, mediumId: MediumEnum.Music })
    ).toBe(false);
  });

  it('counts an unknown duration at the medium cap', () => {
    expect(isCountedListen({ secondsHeard: 300, durationSeconds: null, mediumId: null })).toBe(
      true
    );
    expect(
      isCountedListen({ secondsHeard: 299, durationSeconds: undefined, mediumId: MediumEnum.Film })
    ).toBe(false);
    expect(
      isCountedListen({ secondsHeard: 60, durationSeconds: null, mediumId: MediumEnum.Music })
    ).toBe(true);
  });

  it('never counts zero or non-finite seconds heard', () => {
    expect(
      isCountedListen({ secondsHeard: 0, durationSeconds: 3_600, mediumId: MediumEnum.Podcast })
    ).toBe(false);
    expect(
      isCountedListen({
        secondsHeard: Number.NaN,
        durationSeconds: 20,
        mediumId: MediumEnum.Music,
      })
    ).toBe(false);
  });
});

describe('resolveCountedListenDurationSeconds', () => {
  it('uses the player length inside half to double of the rss duration, including the edges', () => {
    expect(
      resolveCountedListenDurationSeconds({ playerDurationSeconds: 150, rssDurationSeconds: 200 })
    ).toBe(150);
    expect(
      resolveCountedListenDurationSeconds({ playerDurationSeconds: 100, rssDurationSeconds: 200 })
    ).toBe(100);
    expect(
      resolveCountedListenDurationSeconds({ playerDurationSeconds: 400, rssDurationSeconds: 200 })
    ).toBe(400);
  });

  it('keeps the rss duration outside that band', () => {
    expect(
      resolveCountedListenDurationSeconds({ playerDurationSeconds: 99, rssDurationSeconds: 200 })
    ).toBe(200);
    expect(
      resolveCountedListenDurationSeconds({ playerDurationSeconds: 401, rssDurationSeconds: 200 })
    ).toBe(200);
  });

  it('uses whichever length is present, and null when neither is', () => {
    expect(
      resolveCountedListenDurationSeconds({ playerDurationSeconds: 80, rssDurationSeconds: null })
    ).toBe(80);
    expect(
      resolveCountedListenDurationSeconds({
        playerDurationSeconds: null,
        rssDurationSeconds: 200,
      })
    ).toBe(200);
    expect(
      resolveCountedListenDurationSeconds({ playerDurationSeconds: 0, rssDurationSeconds: null })
    ).toBeNull();
    expect(
      resolveCountedListenDurationSeconds({
        playerDurationSeconds: Number.NaN,
        rssDurationSeconds: undefined,
      })
    ).toBeNull();
  });
});

describe('fadeTasteScore', () => {
  const from = new Date('2026-01-01T00:00:00.000Z');
  const halfLifeDays = POPULARITY_TASTE_HALF_LIFE_DAYS.recent;

  it('halves the score after one half-life and quarters it after two', () => {
    const oneHalfLife = new Date(from.getTime() + halfLifeDays * MS_PER_DAY);
    const twoHalfLives = new Date(from.getTime() + halfLifeDays * 2 * MS_PER_DAY);

    expect(fadeTasteScore({ score: 8, from, to: oneHalfLife, halfLifeDays })).toBeCloseTo(4);
    expect(fadeTasteScore({ score: 8, from, to: twoHalfLives, halfLifeDays })).toBeCloseTo(2);
  });

  it('returns the score unchanged when the end is not after the start', () => {
    const before = new Date(from.getTime() - MS_PER_DAY);

    expect(fadeTasteScore({ score: 8, from, to: from, halfLifeDays })).toBe(8);
    expect(fadeTasteScore({ score: 8, from, to: before, halfLifeDays })).toBe(8);
  });
});

describe('POPULARITY_TASTE_HALF_LIFE_DAYS', () => {
  it('keeps recent taste shorter than long-term taste', () => {
    expect(POPULARITY_TASTE_HALF_LIFE_DAYS.recent).toBeLessThan(
      POPULARITY_TASTE_HALF_LIFE_DAYS.longTerm
    );
  });
});

describe('isPopularityFlagReason', () => {
  it('accepts both flag reasons and rejects anything else', () => {
    expect(isPopularityFlagReason('stored_cap_reached')).toBe(true);
    expect(isPopularityFlagReason('too_soon_minutes')).toBe(true);
    expect(isPopularityFlagReason('daily_cap_reached')).toBe(false);
    expect(isPopularityFlagReason(1)).toBe(false);
    expect(isPopularityFlagReason(null)).toBe(false);
  });
});

describe('countsTowardTooSoonSignal', () => {
  const interval = POPULARITY_DEFAULT_LISTEN_MIN_INTERVAL_SECONDS;

  it('leaves out a listen whose rss threshold is shorter than the interval', () => {
    expect(
      countsTowardTooSoonSignal({
        rssDurationSeconds: 30,
        mediumId: MediumEnum.Podcast,
        minIntervalSeconds: interval,
      })
    ).toBe(false);
    expect(
      countsTowardTooSoonSignal({
        rssDurationSeconds: 50,
        mediumId: MediumEnum.Podcast,
        minIntervalSeconds: interval,
      })
    ).toBe(true);
    expect(
      countsTowardTooSoonSignal({
        rssDurationSeconds: null,
        mediumId: MediumEnum.Podcast,
        minIntervalSeconds: interval,
      })
    ).toBe(true);
    expect(
      countsTowardTooSoonSignal({
        rssDurationSeconds: 90,
        mediumId: MediumEnum.Music,
        minIntervalSeconds: interval,
      })
    ).toBe(true);
  });

  it('counts nothing when the interval is off', () => {
    expect(
      countsTowardTooSoonSignal({
        rssDurationSeconds: 3_600,
        mediumId: MediumEnum.Podcast,
        minIntervalSeconds: 0,
      })
    ).toBe(false);
  });
});

describe('isStoredCapReachedFast', () => {
  const firstStoredAt = new Date('2026-01-01T00:00:00.000Z');

  it('is true up to exactly the window and false a second later', () => {
    expect(
      isStoredCapReachedFast({
        firstStoredAt,
        reachedAt: new Date('2026-01-01T03:00:00.000Z'),
        withinHours: 3,
      })
    ).toBe(true);
    expect(
      isStoredCapReachedFast({
        firstStoredAt,
        reachedAt: new Date('2026-01-01T03:00:01.000Z'),
        withinHours: 3,
      })
    ).toBe(false);
  });

  it('is never true when the window is 0', () => {
    expect(
      isStoredCapReachedFast({ firstStoredAt, reachedAt: firstStoredAt, withinHours: 0 })
    ).toBe(false);
  });
});
