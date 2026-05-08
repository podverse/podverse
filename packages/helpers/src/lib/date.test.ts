import { describe, expect, it } from 'vitest';

import { addUtcMonthsClamped, formatDateTimeAbbrevOrFallback, laterOfDates } from './date.js';

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
