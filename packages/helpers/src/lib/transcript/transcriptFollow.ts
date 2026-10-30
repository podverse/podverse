import type { TranscriptRow } from '../../dtos/item/itemTranscript.js';

/** Rows whose body contains the search term (case-insensitive). Empty term returns all rows. */
export function filterTranscriptRowsByBody(
  rows: readonly TranscriptRow[],
  searchTerm: string
): TranscriptRow[] {
  const trimmed = searchTerm.trim();
  if (trimmed.length === 0) {
    return rows.slice();
  }
  const lowerSearch = trimmed.toLowerCase();
  return rows.filter((row) => row.body.toLowerCase().includes(lowerSearch));
}

/**
 * Index of the cue that contains `playheadSeconds` (`startTime <= t < endTime`), or `-1`.
 * Prefer a binary search when start times are non-decreasing; otherwise scan linearly.
 * The first matching cue wins when ranges overlap.
 */
export function findActiveTranscriptRowIndex(
  rows: readonly TranscriptRow[],
  playheadSeconds: number
): number {
  if (rows.length === 0) {
    return -1;
  }

  if (areStartTimesNonDecreasing(rows)) {
    return findActiveIndexBinary(rows, playheadSeconds);
  }

  return findActiveIndexLinear(rows, playheadSeconds);
}

export type TranscriptScrollAlign = 'start' | 'end';

/**
 * Whether the active cue is above, below, or inside the visible index range.
 * Returns `null` when there is no active cue or it is already in view.
 * `visibleStartIndex` and `visibleEndIndex` are inclusive.
 */
export function resolveTranscriptScrollAlign(params: {
  activeIndex: number;
  visibleStartIndex: number;
  visibleEndIndex: number;
}): TranscriptScrollAlign | null {
  const { activeIndex, visibleStartIndex, visibleEndIndex } = params;
  if (activeIndex < 0) {
    return null;
  }
  if (activeIndex < visibleStartIndex) {
    return 'start';
  }
  if (activeIndex > visibleEndIndex) {
    return 'end';
  }
  return null;
}

function areStartTimesNonDecreasing(rows: readonly TranscriptRow[]): boolean {
  for (let i = 1; i < rows.length; i += 1) {
    const prev = rows[i - 1];
    const curr = rows[i];
    if (prev === undefined || curr === undefined) {
      return false;
    }
    if (curr.startTime < prev.startTime) {
      return false;
    }
  }
  return true;
}

function cueContainsPlayhead(row: TranscriptRow, playheadSeconds: number): boolean {
  return playheadSeconds >= row.startTime && playheadSeconds < row.endTime;
}

function findActiveIndexLinear(rows: readonly TranscriptRow[], playheadSeconds: number): number {
  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];
    if (row === undefined) {
      continue;
    }
    if (cueContainsPlayhead(row, playheadSeconds)) {
      return i;
    }
  }
  return -1;
}

/**
 * Rightmost cue that has started, then the earliest cue in that prefix that still contains
 * the playhead. Later cues that start after the playhead are outside the prefix.
 */
function findActiveIndexBinary(rows: readonly TranscriptRow[], playheadSeconds: number): number {
  let low = 0;
  let high = rows.length - 1;
  let candidate = -1;

  while (low <= high) {
    const mid = (low + high) >> 1;
    const row = rows[mid];
    if (row === undefined) {
      break;
    }
    if (row.startTime <= playheadSeconds) {
      candidate = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  if (candidate < 0) {
    return -1;
  }

  for (let i = 0; i <= candidate; i += 1) {
    const row = rows[i];
    if (row !== undefined && cueContainsPlayhead(row, playheadSeconds)) {
      return i;
    }
  }
  return -1;
}
