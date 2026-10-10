import { ONE_MINUTE_MS } from '../timeConstants.js';
import type { MembershipGrantSource } from './membershipGrantSource.js';

export interface MembershipGrantInput {
  source: MembershipGrantSource;
  startsAt: Date;
  endsAt: Date;
  revokedAt?: Date | null;
}

export interface ComputeMembershipAccessInput {
  now: Date;
  grants: readonly MembershipGrantInput[];
}

export interface MembershipAccess {
  /**
   * When access ends — the value cached as `membership_expires_at`. Past when access has lapsed;
   * null when the account never had access.
   */
  membershipExpiresAt: Date | null;
  isEntitled: boolean;
}

interface AccessInterval {
  start: number;
  end: number;
}

/**
 * Processors round period boundaries, so a grant that starts moments after the previous one ends
 * still continues it.
 */
const CONTIGUITY_TOLERANCE_MS = ONE_MINUTE_MS;

/** An interval that ends before it starts becomes a point at its end, so it still dates a lapse. */
function toInterval(start: number, end: number): AccessInterval | null {
  if (Number.isNaN(start) || Number.isNaN(end)) {
    return null;
  }
  return { start: Math.min(start, end), end };
}

/** Sorts by start and joins intervals that overlap or touch, returning disjoint blocks in order. */
function mergeIntervals(intervals: readonly AccessInterval[]): AccessInterval[] {
  const sorted = [...intervals].sort((a, b) => a.start - b.start);
  const merged: AccessInterval[] = [];

  for (const interval of sorted) {
    const last = merged[merged.length - 1];
    if (last !== undefined && interval.start <= last.end + CONTIGUITY_TOLERANCE_MS) {
      last.end = Math.max(last.end, interval.end);
    } else {
      merged.push({ ...interval });
    }
  }

  return merged;
}

/**
 * Derives membership access from the grant ledger. Every grant becomes an interval; the member is
 * entitled while `now` falls inside a run of contiguous intervals, and access expires at the end of
 * that run. A later grant that starts where the current one ends extends access; one after a gap
 * does not.
 */
export function computeMembershipAccess(input: ComputeMembershipAccessInput): MembershipAccess {
  const now = input.now.getTime();
  const intervals: AccessInterval[] = [];

  for (const grant of input.grants) {
    if (grant.revokedAt !== null && grant.revokedAt !== undefined) {
      continue;
    }
    const interval = toInterval(grant.startsAt.getTime(), grant.endsAt.getTime());
    if (interval !== null) {
      intervals.push(interval);
    }
  }

  const blocks = mergeIntervals(intervals);
  const current = blocks.find((block) => block.start <= now && now <= block.end);
  const isEntitled = current !== undefined;

  let expiresAtMs: number | null = current?.end ?? null;
  if (current === undefined) {
    for (const block of blocks) {
      if (block.end < now) {
        expiresAtMs = block.end;
      }
    }
  }

  return {
    membershipExpiresAt: expiresAtMs === null ? null : new Date(expiresAtMs),
    isEntitled,
  };
}
