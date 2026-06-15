import { FindOperator } from 'typeorm';
import { describe, expect, it } from 'vitest';

import { buildEndedLiveItemTimeVariants } from './liveItemWhere.js';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const CUTOFF = new Date('2026-06-12T12:00:00.000Z');

describe('buildEndedLiveItemTimeVariants', () => {
  it('returns two OR variants for the ended visibility window', () => {
    expect(buildEndedLiveItemTimeVariants(CUTOFF)).toHaveLength(2);
  });

  it('keeps items whose end_time is at or after the cutoff (first variant)', () => {
    const [withEndTime] = buildEndedLiveItemTimeVariants(CUTOFF);
    const endTime = withEndTime.end_time;

    expect(endTime).toBeInstanceOf(FindOperator);
    if (endTime instanceof FindOperator) {
      expect(endTime.type).toBe('moreThanOrEqual');
      expect(endTime.value).toBe(CUTOFF);
    }
    expect('start_time' in withEndTime).toBe(false);
  });

  it('falls back to start_time when end_time is null (second variant)', () => {
    const variants = buildEndedLiveItemTimeVariants(CUTOFF);
    const nullEndTime = variants[1];
    const endTime = nullEndTime.end_time;
    const startTime = nullEndTime.start_time;

    expect(endTime).toBeInstanceOf(FindOperator);
    if (endTime instanceof FindOperator) {
      expect(endTime.type).toBe('isNull');
    }

    expect(startTime).toBeInstanceOf(FindOperator);
    if (startTime instanceof FindOperator) {
      expect(startTime.type).toBe('moreThanOrEqual');
      expect(startTime.value).toBe(CUTOFF);
    }
  });

  it('defaults the cutoff to roughly one day before now', () => {
    const before = Date.now() - ONE_DAY_MS;
    const [withEndTime] = buildEndedLiveItemTimeVariants();
    const after = Date.now() - ONE_DAY_MS;

    const endTime = withEndTime.end_time;
    expect(endTime).toBeInstanceOf(FindOperator);
    if (endTime instanceof FindOperator) {
      const value = endTime.value;
      expect(value).toBeInstanceOf(Date);
      if (value instanceof Date) {
        expect(value.getTime()).toBeGreaterThanOrEqual(before);
        expect(value.getTime()).toBeLessThanOrEqual(after);
      }
    }
  });
});
