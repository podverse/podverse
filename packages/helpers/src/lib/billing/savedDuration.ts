import { DAYS_PER_YEAR, SECONDS_PER_DAY } from '../timeConstants.js';

/** Calendar-style month length for saved-time copy, not a billing period. */
const DAYS_PER_MONTH = 30;

export type SavedDurationParts = {
  years: number;
  months: number;
  days: number;
};

export type SavedDurationUnit = 'days' | 'months' | 'years';

export type SavedDurationSegment = {
  count: number;
  unit: SavedDurationUnit;
};

/**
 * Splits a banked or remaining membership duration into years, 30-day months, and leftover days.
 * Negative or non-finite values are empty. A remainder shorter than a day still counts as one day
 * so copy can say the time is kept.
 */
export function splitSavedDuration(seconds: number): SavedDurationParts {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return { days: 0, months: 0, years: 0 };
  }
  const totalDays = Math.floor(seconds / SECONDS_PER_DAY);
  if (totalDays <= 0) {
    return { days: 1, months: 0, years: 0 };
  }
  const years = Math.floor(totalDays / DAYS_PER_YEAR);
  const afterYears = totalDays - years * DAYS_PER_YEAR;
  const months = Math.floor(afterYears / DAYS_PER_MONTH);
  const days = afterYears - months * DAYS_PER_MONTH;
  return { days, months, years };
}

/** Non-zero units in years, then months, then days, for joining localized labels. */
export function savedDurationSegments(seconds: number): SavedDurationSegment[] {
  const parts = splitSavedDuration(seconds);
  const segments: SavedDurationSegment[] = [];
  if (parts.years > 0) {
    segments.push({ count: parts.years, unit: 'years' });
  }
  if (parts.months > 0) {
    segments.push({ count: parts.months, unit: 'months' });
  }
  if (parts.days > 0) {
    segments.push({ count: parts.days, unit: 'days' });
  }
  return segments;
}

/** Joins localized unit labels, or null when there is no saved time to describe. */
export function formatSavedDuration(
  seconds: number,
  label: (segment: SavedDurationSegment) => string
): string | null {
  const segments = savedDurationSegments(seconds);
  if (segments.length === 0) {
    return null;
  }
  return segments.map(label).join(', ');
}
