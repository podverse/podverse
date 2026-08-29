import { describe, expect, it } from 'vitest';

import {
  addUtcMonthsClamped,
  formatDateTimeAbbrevOrFallback,
  getRelativeTimeParts,
  laterOfDates,
  toEpochMsOrNull,
} from './date.js';

describe('addUtcMonthsClamped', () => {
  it('adds whole calendar months in UTC', () => {
    const base = new Date('2026-01-15T12:34:56.789Z');
    const result = addUtcMonthsClamped(base, 1);
    expect(result.toISOString()).toBe('2026-02-15T12:34:56.789Z');
  });

  it('clamps Jan 31 + 1 month to Feb 28 in non-leap years', () => {
    const base = new Date('2026-01-31T00:00:00.000Z');
    const result = addUtcMonthsClamped(base, 1);
    expect(result.toISOString()).toBe('2026-02-28T00:00:00.000Z');
  });

  it('clamps Jan 31 + 1 month to Feb 29 in leap years', () => {
    const base = new Date('2024-01-31T00:00:00.000Z');
    const result = addUtcMonthsClamped(base, 1);
    expect(result.toISOString()).toBe('2024-02-29T00:00:00.000Z');
  });

  it('rolls over the year when adding months crosses December', () => {
    const base = new Date('2026-11-15T00:00:00.000Z');
    const result = addUtcMonthsClamped(base, 3);
    expect(result.toISOString()).toBe('2027-02-15T00:00:00.000Z');
  });

  it('preserves UTC time-of-day across the addition', () => {
    const base = new Date('2026-03-10T08:15:30.250Z');
    const result = addUtcMonthsClamped(base, 6);
    expect(result.toISOString()).toBe('2026-09-10T08:15:30.250Z');
  });

  it('clamps Aug 31 + 1 month to Sep 30', () => {
    const base = new Date('2026-08-31T23:59:59.999Z');
    const result = addUtcMonthsClamped(base, 1);
    expect(result.toISOString()).toBe('2026-09-30T23:59:59.999Z');
  });
});

describe('formatDateTimeAbbrevOrFallback', () => {
  it('returns fallback for null, undefined, blank, or invalid strings', () => {
    expect(formatDateTimeAbbrevOrFallback(null, 'en-US', '—')).toBe('—');
    expect(formatDateTimeAbbrevOrFallback(undefined, 'en-US', '—')).toBe('—');
    expect(formatDateTimeAbbrevOrFallback('   ', 'en-US', '—')).toBe('—');
    expect(formatDateTimeAbbrevOrFallback('not-a-date', 'en-US', '—')).toBe('—');
  });

  it('delegates to formatDateTimeAbbrev for valid ISO strings', () => {
    const out = formatDateTimeAbbrevOrFallback('2026-01-15T12:00:00.000Z', 'en-US', '—');
    expect(out).not.toBe('—');
    expect(out.length).toBeGreaterThan(0);
  });
});

describe('laterOfDates', () => {
  it('returns b when b is later', () => {
    const a = new Date('2026-01-01T00:00:00.000Z');
    const b = new Date('2026-06-01T00:00:00.000Z');
    expect(laterOfDates(a, b).toISOString()).toBe(b.toISOString());
  });

  it('returns a when a is later', () => {
    const a = new Date('2026-06-01T00:00:00.000Z');
    const b = new Date('2026-01-01T00:00:00.000Z');
    expect(laterOfDates(a, b).toISOString()).toBe(a.toISOString());
  });

  it('returns a on tie (stable for equal instants)', () => {
    const a = new Date('2026-01-01T00:00:00.000Z');
    const b = new Date('2026-01-01T00:00:00.000Z');
    expect(laterOfDates(a, b)).toBe(a);
  });
});

describe('toEpochMsOrNull', () => {
  it('parses an ISO timestamp', () => {
    expect(toEpochMsOrNull('2026-01-01T00:00:00.000Z')).toBe(Date.UTC(2026, 0, 1));
  });

  it.each([
    ['null', null],
    ['undefined', undefined],
    ['empty', ''],
    ['whitespace', '   '],
    ['unparseable', 'not a date'],
  ])('reads %s as an absence rather than NaN', (_label, value) => {
    expect(toEpochMsOrNull(value)).toBeNull();
  });
});

describe('getRelativeTimeParts', () => {
  const nowMs = Date.UTC(2026, 0, 15, 12, 0, 0);
  const agoBy = (ms: number) => new Date(nowMs - ms).toISOString();

  it.each([
    ['seconds under a minute', agoBy(30_000), 'second', -30],
    ['minutes at the one-minute boundary', agoBy(60_000), 'minute', -1],
    ['hours at the one-hour boundary', agoBy(60 * 60_000), 'hour', -1],
    ['days at the one-day boundary', agoBy(24 * 60 * 60_000), 'day', -1],
    ['days for a week-old timestamp', agoBy(7 * 24 * 60 * 60_000), 'day', -7],
  ])('reports %s', (_label, iso, unit, value) => {
    expect(getRelativeTimeParts(iso, nowMs)).toEqual({ unit, value });
  });

  it('signs a future timestamp positively', () => {
    expect(getRelativeTimeParts(new Date(nowMs + 2 * 60 * 60_000).toISOString(), nowMs)).toEqual({
      unit: 'hour',
      value: 2,
    });
  });

  it('returns null for an unparseable date so no caller formats NaN', () => {
    expect(getRelativeTimeParts('not a date', nowMs)).toBeNull();
  });
});
