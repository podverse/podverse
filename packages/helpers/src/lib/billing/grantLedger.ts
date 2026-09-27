import { shouldSuppressExpiryReminder } from '../accessTier.js';
import { MS_PER_SECOND, ONE_MINUTE_MS } from '../timeConstants.js';
import type { MembershipGrantSource } from './membershipGrantSource.js';
import type { PurchaseKind } from './purchaseKind.js';
import type { BillingSubscriptionStatus } from './subscriptionStatus.js';

export interface MembershipGrantInput {
  source: MembershipGrantSource;
  startsAt: Date;
  endsAt: Date;
  revokedAt?: Date | null;
}

export interface MembershipSubscriptionInput {
  status: BillingSubscriptionStatus;
  purchaseKind: PurchaseKind;
  /** Null reads as "started long ago", so only the period end limits access. */
  currentPeriodStart: Date | null;
  /**
   * End of the paid period. Null grants nothing. A subscription approved to start after the
   * current membership ends reads as `active` with start and end both at its first charge: the
   * renewal buffer then bridges the hand-off without granting a period nobody has paid for.
   */
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
}

export interface ComputeMembershipAccessInput {
  now: Date;
  grants: readonly MembershipGrantInput[];
  subscriptions: readonly MembershipSubscriptionInput[];
  /** `BILLING_RENEWAL_ENTITLEMENT_BUFFER_EXPIRATION`, in seconds. */
  renewalEntitlementBufferExpiration: number;
  /** `BILLING_PAYMENT_FAILURE_GRACE_EXPIRATION`, in seconds. */
  paymentFailureGraceExpiration: number;
}

export interface MembershipAccess {
  /**
   * When access ends, including any renewal buffer or grace — the value cached as
   * `membership_expires_at`. Past when access has lapsed; null when the account never had access.
   * Show a subscription's `current_period_end` as its renewal date, not this.
   */
  membershipExpiresAt: Date | null;
  isEntitled: boolean;
  /** A failed renewal is being retried and access is running on the grace window. */
  inGrace: boolean;
  suppressExpiryReminder: boolean;
  /** A subscription in good standing will charge again on its own. */
  activeAutoRenew: boolean;
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

function durationMs(seconds: number, name: string): number {
  if (!Number.isFinite(seconds) || seconds < 0) {
    throw new TypeError(`${name} must be a non-negative number of seconds`);
  }
  return seconds * MS_PER_SECOND;
}

/** An interval that ends before it starts becomes a point at its end, so it still dates a lapse. */
function toInterval(start: number, end: number): AccessInterval | null {
  if (Number.isNaN(start) || Number.isNaN(end)) {
    return null;
  }
  return { start: Math.min(start, end), end };
}

function isAutoRenewing(subscription: MembershipSubscriptionInput): boolean {
  return subscription.purchaseKind === 'auto_renew' && !subscription.cancelAtPeriodEnd;
}

/**
 * The span a subscription covers by itself, apart from the grant ledger. A subscription that will
 * charge again keeps access through the renewal buffer so a late renewal webhook does not lock the
 * member out, and through the grace window while a failed charge is retried. A subscription that
 * will not charge again ends with its paid period.
 */
function subscriptionAccessWindow(
  subscription: MembershipSubscriptionInput,
  bufferMs: number,
  graceMs: number
): AccessInterval | null {
  if (subscription.currentPeriodEnd === null) {
    return null;
  }

  const start =
    subscription.currentPeriodStart === null
      ? Number.NEGATIVE_INFINITY
      : subscription.currentPeriodStart.getTime();
  const end = subscription.currentPeriodEnd.getTime();
  const renews = isAutoRenewing(subscription);

  switch (subscription.status) {
    case 'active':
      return toInterval(start, renews ? end + bufferMs : end);
    case 'in_grace_period':
      return toInterval(start, renews ? end + Math.max(bufferMs, graceMs) : end);
    case 'cancelled_active':
      return toInterval(start, end);
    case 'pending':
    case 'past_due':
    case 'expired':
    case 'revoked':
      return null;
  }
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
 * Derives membership access from the grant ledger and the account's subscriptions. Every grant and
 * subscription window becomes an interval; the member is entitled while `now` falls inside a run of
 * contiguous intervals, and access expires at the end of that run. A later grant that starts where
 * the current one ends extends access; one after a gap does not.
 *
 * Pure and env-free: callers parse the buffer and grace durations from env and pass them in.
 */
export function computeMembershipAccess(input: ComputeMembershipAccessInput): MembershipAccess {
  const now = input.now.getTime();
  const bufferMs = durationMs(
    input.renewalEntitlementBufferExpiration,
    'renewalEntitlementBufferExpiration'
  );
  const graceMs = durationMs(input.paymentFailureGraceExpiration, 'paymentFailureGraceExpiration');

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

  let activeAutoRenew = false;
  let inGrace = false;

  for (const subscription of input.subscriptions) {
    const window = subscriptionAccessWindow(subscription, bufferMs, graceMs);
    if (window === null) {
      continue;
    }
    intervals.push(window);

    if (window.end < now || !isAutoRenewing(subscription)) {
      continue;
    }
    if (subscription.status === 'active') {
      activeAutoRenew = true;
    }
    if (subscription.status === 'in_grace_period') {
      activeAutoRenew = true;
      inGrace = true;
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
    inGrace,
    suppressExpiryReminder: shouldSuppressExpiryReminder({ isMember: isEntitled, activeAutoRenew }),
    activeAutoRenew,
  };
}
