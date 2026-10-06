import type {
  BillingAmount,
  GraceEnteredEvent,
  GraceExitedEvent,
  MembershipGrantSource,
  NormalizedBillingEvent,
  NormalizedSubscriptionSnapshot,
  PaymentProcessorId,
  PaymentSettledEvent,
  PurchaseKind,
  RefundOrRevokeEvent,
  SubscriptionActivatedEvent,
  SubscriptionCancelledEvent,
  SubscriptionExpiredEvent,
  SubscriptionRenewalFailedEvent,
  SubscriptionRenewedEvent,
} from '@podverse/helpers';
import {
  computeMembershipAccess,
  extendMembershipPeriodByCadence,
  MS_PER_SECOND,
} from '@podverse/helpers';

import { BillingEventError } from './errors.js';
import type {
  BillingLedgerUnitOfWork,
  LedgerGrant,
  LedgerProcessorProduct,
  LedgerSubscription,
  LedgerSubscriptionWrite,
} from './ledgerStore.js';
import { readStatusChangedAt, stampStatusChange } from './statusStamp.js';

/**
 * Store subscriptions cannot start on a future date, so paid time an account already holds is
 * moved into the subscription's bank when it starts and handed back as a grant when it ends.
 * PayPal subscriptions start at the current expiry instead and never bank.
 */
const BANKING_PROCESSORS: ReadonlySet<PaymentProcessorId> = new Set(['apple', 'google_play']);

/**
 * Grant sources whose remaining time moves into a store subscription's bank. Subscription-period
 * grants stay on the subscription; only time after the subscription starts is banked.
 */
const BANKABLE_GRANT_SOURCES: ReadonlySet<MembershipGrantSource> = new Set([
  'one_time_purchase',
  'claim_token',
  'admin',
  'legacy_import',
  'migration_baseline',
  'trial',
]);

function parseTimestamp(value: string, field: string): Date {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new BillingEventError('invalid_timestamp', `${field} is not a valid timestamp: ${value}`);
  }
  return parsed;
}

function parseOptionalTimestamp(value: string | null, field: string): Date | null {
  return value === null ? null : parseTimestamp(value, field);
}

function latestOf(...dates: (Date | null)[]): Date | null {
  let latest: Date | null = null;
  for (const date of dates) {
    if (date !== null && (latest === null || date > latest)) {
      latest = date;
    }
  }
  return latest;
}

function addSeconds(date: Date, seconds: number): Date {
  return new Date(date.getTime() + seconds * MS_PER_SECOND);
}

function toSubscriptionWrite(subscription: LedgerSubscription): LedgerSubscriptionWrite {
  return {
    externalSubscriptionId: subscription.externalSubscriptionId,
    processorProductId: subscription.processorProductId,
    status: subscription.status,
    purchaseKind: subscription.purchaseKind,
    currentPeriodStart: subscription.currentPeriodStart,
    currentPeriodEnd: subscription.currentPeriodEnd,
    gracePeriodEndsAt: subscription.gracePeriodEndsAt,
    cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
    bankedSeconds: subscription.bankedSeconds,
    isSandbox: subscription.isSandbox,
    rawStatusSnapshot: subscription.rawStatusSnapshot,
  };
}

/** `revoked` is terminal, and a status change older than the current one is ignored. */
function canChangeStatus(subscription: LedgerSubscription, occurredAt: Date): boolean {
  if (subscription.status === 'revoked') {
    return false;
  }
  const changedAt = readStatusChangedAt(subscription.rawStatusSnapshot);
  return changedAt === null || occurredAt >= changedAt;
}

/** Periods only move forward, so a late notification cannot shorten a renewed subscription. */
function advancePeriod(
  write: LedgerSubscriptionWrite,
  periodStart: Date | null,
  periodEnd: Date | null
): LedgerSubscriptionWrite {
  if (periodEnd === null) {
    return write;
  }
  if (write.currentPeriodEnd !== null && periodEnd <= write.currentPeriodEnd) {
    return write;
  }
  return {
    ...write,
    currentPeriodStart: periodStart ?? write.currentPeriodStart,
    currentPeriodEnd: periodEnd,
  };
}

/** When the account's contiguous access from `at` ends, counting grants only; null if none. */
function paidThrough(grants: readonly LedgerGrant[], at: Date): Date | null {
  const access = computeMembershipAccess({
    now: at,
    grants,
    subscriptions: [],
    renewalEntitlementBufferExpiration: 0,
    paymentFailureGraceExpiration: 0,
  });
  return access.isEntitled ? access.membershipExpiresAt : null;
}

/** Total seconds the grants cover after `from`, counting overlaps once. */
function coveredSecondsAfter(grants: readonly LedgerGrant[], from: Date): number {
  const intervals = grants
    .map((grant) => ({
      start: Math.max(grant.startsAt.getTime(), from.getTime()),
      end: grant.endsAt.getTime(),
    }))
    .filter((interval) => interval.end > interval.start)
    .sort((a, b) => a.start - b.start);

  let totalMs = 0;
  let runStart: number | null = null;
  let runEnd = 0;
  for (const interval of intervals) {
    if (runStart === null || interval.start > runEnd) {
      if (runStart !== null) {
        totalMs += runEnd - runStart;
      }
      runStart = interval.start;
      runEnd = interval.end;
    } else {
      runEnd = Math.max(runEnd, interval.end);
    }
  }
  if (runStart !== null) {
    totalMs += runEnd - runStart;
  }
  return Math.floor(totalMs / MS_PER_SECOND);
}

/**
 * Moves the account's bankable time after `subscriptionStart` into a bank: the grants are cut
 * off at the start, and the seconds they covered are returned for the subscription to hold.
 */
async function moveBankableTimeIntoBank(
  unitOfWork: BillingLedgerUnitOfWork,
  subscriptionStart: Date
): Promise<number> {
  const grants = await unitOfWork.listGrants();
  const bankable = grants.filter(
    (grant) =>
      grant.revokedAt === null &&
      BANKABLE_GRANT_SOURCES.has(grant.source) &&
      grant.endsAt > subscriptionStart
  );
  const bankedSeconds = coveredSecondsAfter(bankable, subscriptionStart);
  for (const grant of bankable) {
    const cutOff = grant.startsAt > subscriptionStart ? grant.startsAt : subscriptionStart;
    await unitOfWork.setGrantEndsAt(grant.id, cutOff);
  }
  return bankedSeconds;
}

/** Hands a subscription's bank back as a grant starting at `startsAt`, and empties the bank. */
async function releaseBank(
  unitOfWork: BillingLedgerUnitOfWork,
  subscription: LedgerSubscription,
  startsAt: Date
): Promise<LedgerSubscription> {
  if (subscription.bankedSeconds <= 0) {
    return subscription;
  }
  await unitOfWork.insertGrant({
    source: 'subscription_period',
    startsAt,
    endsAt: addSeconds(startsAt, subscription.bankedSeconds),
    subscriptionId: subscription.id,
    transactionId: null,
  });
  return unitOfWork.saveSubscription({
    ...toSubscriptionWrite(subscription),
    bankedSeconds: 0,
  });
}

/**
 * Moves banked seconds onto the subscription that replaced this one. If that row is not recorded
 * yet, the time is handed back as a grant so it is not dropped.
 */
async function transferBankToReplacement(
  unitOfWork: BillingLedgerUnitOfWork,
  from: LedgerSubscription,
  replacedByExternalSubscriptionId: string,
  fallbackStartsAt: Date
): Promise<void> {
  if (from.bankedSeconds <= 0) {
    return;
  }
  const target = await unitOfWork.getSubscription(replacedByExternalSubscriptionId);
  if (target === null || target.id === from.id) {
    await releaseBank(unitOfWork, from, fallbackStartsAt);
    return;
  }
  await unitOfWork.saveSubscription({
    ...toSubscriptionWrite(from),
    bankedSeconds: 0,
  });
  await unitOfWork.saveSubscription({
    ...toSubscriptionWrite(target),
    bankedSeconds: target.bankedSeconds + from.bankedSeconds,
  });
}

async function resolveProduct(
  unitOfWork: BillingLedgerUnitOfWork,
  externalProductId: string | null,
  externalBasePlanId: string | null
): Promise<LedgerProcessorProduct | null> {
  if (externalProductId === null) {
    return null;
  }
  return unitOfWork.findProcessorProduct(externalProductId, externalBasePlanId);
}

async function requireSubscription(
  unitOfWork: BillingLedgerUnitOfWork,
  externalSubscriptionId: string
): Promise<LedgerSubscription> {
  const subscription = await unitOfWork.getSubscription(externalSubscriptionId);
  if (subscription === null) {
    throw new BillingEventError(
      'subscription_not_found',
      `${unitOfWork.processorId} subscription ${externalSubscriptionId} is not recorded yet`
    );
  }
  return subscription;
}

async function createSubscription(
  unitOfWork: BillingLedgerUnitOfWork,
  params: {
    externalSubscriptionId: string;
    product: LedgerProcessorProduct | null;
    status: LedgerSubscriptionWrite['status'];
    purchaseKind: PurchaseKind;
    periodStart: Date | null;
    periodEnd: Date | null;
    cancelAtPeriodEnd: boolean;
    isSandbox: boolean;
    changedAt: Date;
    processorSnapshot?: Record<string, unknown>;
  }
): Promise<LedgerSubscription> {
  const banks =
    params.purchaseKind === 'auto_renew' &&
    BANKING_PROCESSORS.has(unitOfWork.processorId) &&
    (params.status === 'active' || params.status === 'cancelled_active');
  const bankedSeconds = banks
    ? await moveBankableTimeIntoBank(unitOfWork, params.periodStart ?? params.changedAt)
    : 0;

  return unitOfWork.saveSubscription({
    externalSubscriptionId: params.externalSubscriptionId,
    processorProductId: params.product?.id ?? null,
    status: params.status,
    purchaseKind: params.purchaseKind,
    currentPeriodStart: params.periodStart,
    currentPeriodEnd: params.periodEnd,
    gracePeriodEndsAt: null,
    cancelAtPeriodEnd: params.cancelAtPeriodEnd,
    bankedSeconds,
    isSandbox: params.isSandbox,
    rawStatusSnapshot: stampStatusChange(null, params.changedAt, params.processorSnapshot),
  });
}

/**
 * A charge went through: the subscription is in good standing again (a resubscribe reuses the
 * store's id, so this also revives an expired subscription) and the period moves forward.
 */
async function recordSubscriptionCharge(
  unitOfWork: BillingLedgerUnitOfWork,
  params: {
    externalSubscriptionId: string;
    product: LedgerProcessorProduct | null;
    purchaseKind: PurchaseKind;
    periodStart: Date | null;
    periodEnd: Date | null;
    isSandbox: boolean;
    occurredAt: Date;
  }
): Promise<LedgerSubscription> {
  const existing = await unitOfWork.getSubscription(params.externalSubscriptionId);
  if (existing === null) {
    return createSubscription(unitOfWork, {
      externalSubscriptionId: params.externalSubscriptionId,
      product: params.product,
      status: 'active',
      purchaseKind: params.purchaseKind,
      periodStart: params.periodStart,
      periodEnd: params.periodEnd,
      cancelAtPeriodEnd: false,
      isSandbox: params.isSandbox,
      changedAt: params.occurredAt,
    });
  }

  let write = advancePeriod(toSubscriptionWrite(existing), params.periodStart, params.periodEnd);
  if (params.product !== null) {
    write = { ...write, processorProductId: params.product.id };
  }
  if (canChangeStatus(existing, params.occurredAt)) {
    write = {
      ...write,
      status: 'active',
      gracePeriodEndsAt: null,
      cancelAtPeriodEnd: false,
      rawStatusSnapshot: stampStatusChange(write.rawStatusSnapshot, params.occurredAt),
    };
  }
  return unitOfWork.saveSubscription(write);
}

function cadencePeriodEnd(product: LedgerProcessorProduct | null, startsAt: Date): Date {
  if (product === null) {
    throw new BillingEventError(
      'product_unmapped',
      'The payment reports no period and its product is not mapped to a cadence'
    );
  }
  return extendMembershipPeriodByCadence({
    membershipExpiresAt: startsAt,
    cadence: product.cadence,
    now: startsAt,
  });
}

/**
 * Records a payment and its grant once; a payment already recorded is left alone, so the same
 * payment reported by a webhook and by a client post is counted once.
 *
 * Subscription charges cover their own period. One-time purchases stack: the time starts where
 * the account's paid time runs out, or at settlement when it has none.
 */
async function recordPayment(
  unitOfWork: BillingLedgerUnitOfWork,
  params: {
    externalTransactionId: string;
    subscription: LedgerSubscription | null;
    product: LedgerProcessorProduct | null;
    purchaseKind: PurchaseKind;
    settledAt: Date;
    periodStart: Date | null;
    periodEnd: Date | null;
    amount: BillingAmount | null;
    isSandbox: boolean;
  }
): Promise<void> {
  const existing = await unitOfWork.getTransaction(params.externalTransactionId);
  if (existing !== null) {
    return;
  }

  let startsAt: Date;
  let endsAt: Date;
  let source: MembershipGrantSource;

  if (params.purchaseKind === 'auto_renew') {
    if (params.subscription === null) {
      throw new BillingEventError(
        'invalid_payload',
        `Auto-renew payment ${params.externalTransactionId} names no subscription`
      );
    }
    startsAt = params.periodStart ?? params.settledAt;
    endsAt = params.periodEnd ?? cadencePeriodEnd(params.product, startsAt);
    source = 'subscription_period';
  } else {
    const grants = await unitOfWork.listGrants();
    startsAt = paidThrough(grants, params.settledAt) ?? params.settledAt;
    endsAt =
      params.periodStart !== null && params.periodEnd !== null
        ? new Date(startsAt.getTime() + (params.periodEnd.getTime() - params.periodStart.getTime()))
        : cadencePeriodEnd(params.product, startsAt);
    source = 'one_time_purchase';
  }

  const transaction = await unitOfWork.saveTransaction({
    externalTransactionId: params.externalTransactionId,
    subscriptionId: params.subscription?.id ?? null,
    purchaseKind: params.purchaseKind,
    settledAt: params.settledAt,
    amount: params.amount,
    revokedAt: null,
    revocationReason: null,
    isSandbox: params.isSandbox,
  });

  await unitOfWork.insertGrant({
    source,
    startsAt,
    endsAt,
    subscriptionId: params.subscription?.id ?? null,
    transactionId: transaction.id,
  });
  await unitOfWork.grantPremiumMembership();
}

async function applyPaymentSettled(
  unitOfWork: BillingLedgerUnitOfWork,
  event: PaymentSettledEvent,
  occurredAt: Date
): Promise<void> {
  const periodStart = parseOptionalTimestamp(event.periodStart, 'periodStart');
  const periodEnd = parseOptionalTimestamp(event.periodEnd, 'periodEnd');
  const product = await resolveProduct(
    unitOfWork,
    event.externalProductId,
    event.externalBasePlanId
  );

  const subscription =
    event.externalSubscriptionId === null
      ? null
      : await recordSubscriptionCharge(unitOfWork, {
          externalSubscriptionId: event.externalSubscriptionId,
          product,
          purchaseKind: event.purchaseKind,
          periodStart,
          periodEnd,
          isSandbox: event.isSandbox,
          occurredAt,
        });

  await recordPayment(unitOfWork, {
    externalTransactionId: event.externalTransactionId,
    subscription,
    product,
    purchaseKind: event.purchaseKind,
    settledAt: occurredAt,
    periodStart,
    periodEnd,
    amount: event.amount,
    isSandbox: event.isSandbox,
  });
}

async function applySubscriptionRenewed(
  unitOfWork: BillingLedgerUnitOfWork,
  event: SubscriptionRenewedEvent,
  occurredAt: Date
): Promise<void> {
  const periodStart = parseTimestamp(event.periodStart, 'periodStart');
  const periodEnd = parseTimestamp(event.periodEnd, 'periodEnd');
  const product = await resolveProduct(
    unitOfWork,
    event.externalProductId,
    event.externalBasePlanId
  );

  const subscription = await recordSubscriptionCharge(unitOfWork, {
    externalSubscriptionId: event.externalSubscriptionId,
    product,
    purchaseKind: 'auto_renew',
    periodStart,
    periodEnd,
    isSandbox: event.isSandbox,
    occurredAt,
  });

  await recordPayment(unitOfWork, {
    externalTransactionId: event.externalTransactionId,
    subscription,
    product,
    purchaseKind: 'auto_renew',
    settledAt: occurredAt,
    periodStart,
    periodEnd,
    amount: event.amount,
    isSandbox: event.isSandbox,
  });
}

async function applySubscriptionActivated(
  unitOfWork: BillingLedgerUnitOfWork,
  event: SubscriptionActivatedEvent,
  occurredAt: Date
): Promise<void> {
  const periodStart = parseOptionalTimestamp(event.periodStart, 'periodStart');
  const periodEnd = parseOptionalTimestamp(event.periodEnd, 'periodEnd');
  const product = await resolveProduct(
    unitOfWork,
    event.externalProductId,
    event.externalBasePlanId
  );

  const existing = await unitOfWork.getSubscription(event.externalSubscriptionId);
  if (existing === null) {
    await createSubscription(unitOfWork, {
      externalSubscriptionId: event.externalSubscriptionId,
      product,
      status: 'active',
      purchaseKind: product?.purchaseKind ?? 'auto_renew',
      periodStart,
      periodEnd,
      cancelAtPeriodEnd: false,
      isSandbox: event.isSandbox,
      changedAt: occurredAt,
    });
    return;
  }

  let write = advancePeriod(toSubscriptionWrite(existing), periodStart, periodEnd);
  if (product !== null) {
    write = { ...write, processorProductId: product.id };
  }
  if (canChangeStatus(existing, occurredAt)) {
    write = {
      ...write,
      status: 'active',
      gracePeriodEndsAt: null,
      cancelAtPeriodEnd: false,
      rawStatusSnapshot: stampStatusChange(write.rawStatusSnapshot, occurredAt),
    };
  }
  await unitOfWork.saveSubscription(write);
}

async function applyGraceStarted(
  unitOfWork: BillingLedgerUnitOfWork,
  event: SubscriptionRenewalFailedEvent | GraceEnteredEvent,
  occurredAt: Date
): Promise<void> {
  const subscription = await requireSubscription(unitOfWork, event.externalSubscriptionId);
  if (!canChangeStatus(subscription, occurredAt)) {
    return;
  }

  const failedPeriodEnd = parseOptionalTimestamp(event.periodEnd, 'periodEnd');
  if (
    failedPeriodEnd !== null &&
    subscription.currentPeriodEnd !== null &&
    failedPeriodEnd < subscription.currentPeriodEnd
  ) {
    return;
  }

  const graceStart = failedPeriodEnd ?? subscription.currentPeriodEnd ?? occurredAt;
  await unitOfWork.saveSubscription({
    ...toSubscriptionWrite(subscription),
    status: 'in_grace_period',
    gracePeriodEndsAt: addSeconds(graceStart, unitOfWork.paymentFailureGraceSeconds),
    rawStatusSnapshot: stampStatusChange(subscription.rawStatusSnapshot, occurredAt),
  });
}

async function applyGraceExited(
  unitOfWork: BillingLedgerUnitOfWork,
  event: GraceExitedEvent,
  occurredAt: Date
): Promise<void> {
  const subscription = await requireSubscription(unitOfWork, event.externalSubscriptionId);
  if (!canChangeStatus(subscription, occurredAt)) {
    return;
  }
  await unitOfWork.saveSubscription({
    ...toSubscriptionWrite(subscription),
    status: event.outcome === 'recovered' ? 'active' : 'past_due',
    gracePeriodEndsAt: null,
    rawStatusSnapshot: stampStatusChange(subscription.rawStatusSnapshot, occurredAt),
  });
}

async function applySubscriptionCancelled(
  unitOfWork: BillingLedgerUnitOfWork,
  event: SubscriptionCancelledEvent,
  occurredAt: Date
): Promise<void> {
  const subscription = await requireSubscription(unitOfWork, event.externalSubscriptionId);
  if (!canChangeStatus(subscription, occurredAt)) {
    return;
  }

  const write = advancePeriod(
    toSubscriptionWrite(subscription),
    null,
    parseOptionalTimestamp(event.periodEnd, 'periodEnd')
  );
  const keepsStatus = subscription.status === 'expired' || subscription.status === 'past_due';
  await unitOfWork.saveSubscription({
    ...write,
    status: keepsStatus ? subscription.status : 'cancelled_active',
    gracePeriodEndsAt: null,
    cancelAtPeriodEnd: true,
    rawStatusSnapshot: stampStatusChange(write.rawStatusSnapshot, occurredAt),
  });
}

async function applySubscriptionExpired(
  unitOfWork: BillingLedgerUnitOfWork,
  event: SubscriptionExpiredEvent,
  occurredAt: Date
): Promise<void> {
  const subscription = await requireSubscription(unitOfWork, event.externalSubscriptionId);
  if (!canChangeStatus(subscription, occurredAt)) {
    return;
  }

  const expiredAt = parseOptionalTimestamp(event.expiredAt, 'expiredAt');
  const expired = await unitOfWork.saveSubscription({
    ...toSubscriptionWrite(subscription),
    status: 'expired',
    gracePeriodEndsAt: null,
    rawStatusSnapshot: stampStatusChange(subscription.rawStatusSnapshot, occurredAt),
  });
  const fallbackStartsAt = latestOf(subscription.currentPeriodEnd, expiredAt) ?? occurredAt;
  const replacedBy = event.replacedByExternalSubscriptionId;
  if (replacedBy !== undefined && replacedBy !== null && replacedBy !== '') {
    await transferBankToReplacement(unitOfWork, expired, replacedBy, fallbackStartsAt);
    return;
  }
  await releaseBank(unitOfWork, expired, fallbackStartsAt);
}

/**
 * Revokes the named payment's grant, or every paid grant of the named subscription. The time a
 * subscription banked was paid for separately, so it is handed back rather than forfeited.
 */
async function applyRefundOrRevoke(
  unitOfWork: BillingLedgerUnitOfWork,
  event: RefundOrRevokeEvent,
  occurredAt: Date
): Promise<void> {
  const revokedAt = parseTimestamp(event.revokedAt, 'revokedAt');
  const grants = await unitOfWork.listGrants();

  if (event.externalTransactionId !== null) {
    const transaction = await unitOfWork.getTransaction(event.externalTransactionId);
    if (transaction === null) {
      throw new BillingEventError(
        'transaction_not_found',
        `${unitOfWork.processorId} transaction ${event.externalTransactionId} is not recorded yet`
      );
    }
    if (transaction.revokedAt === null) {
      await unitOfWork.saveTransaction({
        externalTransactionId: transaction.externalTransactionId,
        subscriptionId: transaction.subscriptionId,
        purchaseKind: transaction.purchaseKind,
        settledAt: transaction.settledAt,
        amount: transaction.amount,
        revokedAt,
        revocationReason: event.reason,
        isSandbox: transaction.isSandbox,
      });
    }
    await unitOfWork.revokeGrants(
      grants.filter((grant) => grant.transactionId === transaction.id).map((grant) => grant.id),
      revokedAt
    );
  }

  if (event.externalSubscriptionId === null) {
    return;
  }

  const subscription = await unitOfWork.getSubscription(event.externalSubscriptionId);
  if (subscription === null) {
    if (event.externalTransactionId === null) {
      throw new BillingEventError(
        'subscription_not_found',
        `${unitOfWork.processorId} subscription ${event.externalSubscriptionId} is not recorded yet`
      );
    }
    return;
  }

  if (event.externalTransactionId === null) {
    const transactions = await unitOfWork.listSubscriptionTransactions(subscription.id);
    for (const transaction of transactions) {
      if (transaction.revokedAt !== null) {
        continue;
      }
      await unitOfWork.saveTransaction({
        externalTransactionId: transaction.externalTransactionId,
        subscriptionId: transaction.subscriptionId,
        purchaseKind: transaction.purchaseKind,
        settledAt: transaction.settledAt,
        amount: transaction.amount,
        revokedAt,
        revocationReason: event.reason,
        isSandbox: transaction.isSandbox,
      });
    }
    await unitOfWork.revokeGrants(
      grants
        .filter((grant) => grant.subscriptionId === subscription.id && grant.transactionId !== null)
        .map((grant) => grant.id),
      revokedAt
    );
  }

  if (subscription.status === 'revoked') {
    return;
  }
  const revoked = await unitOfWork.saveSubscription({
    ...toSubscriptionWrite(subscription),
    status: 'revoked',
    gracePeriodEndsAt: null,
    rawStatusSnapshot: stampStatusChange(subscription.rawStatusSnapshot, occurredAt),
  });
  await releaseBank(unitOfWork, revoked, revokedAt);
}

/** Applies one normalized event to the ledger of the account the unit of work is locked on. */
export async function applyBillingEvent(
  unitOfWork: BillingLedgerUnitOfWork,
  event: NormalizedBillingEvent
): Promise<void> {
  const occurredAt = parseTimestamp(event.occurredAt, 'occurredAt');

  switch (event.type) {
    case 'payment_settled':
      await applyPaymentSettled(unitOfWork, event, occurredAt);
      break;
    case 'subscription_activated':
      await applySubscriptionActivated(unitOfWork, event, occurredAt);
      break;
    case 'subscription_renewed':
      await applySubscriptionRenewed(unitOfWork, event, occurredAt);
      break;
    case 'subscription_renewal_failed':
    case 'grace_entered':
      await applyGraceStarted(unitOfWork, event, occurredAt);
      break;
    case 'grace_exited':
      await applyGraceExited(unitOfWork, event, occurredAt);
      break;
    case 'subscription_cancelled':
      await applySubscriptionCancelled(unitOfWork, event, occurredAt);
      break;
    case 'subscription_expired':
      await applySubscriptionExpired(unitOfWork, event, occurredAt);
      break;
    case 'refund_or_revoke':
      await applyRefundOrRevoke(unitOfWork, event, occurredAt);
      break;
  }
}

/**
 * Brings a subscription in line with the processor's current view of it. Reconciliation and
 * restore use this; the snapshot overrides any status change that happened before it was
 * fetched. Payments are not in a snapshot, so no grants are written here beyond a released bank.
 */
export async function applySubscriptionSnapshot(
  unitOfWork: BillingLedgerUnitOfWork,
  snapshot: NormalizedSubscriptionSnapshot
): Promise<void> {
  const fetchedAt = parseTimestamp(snapshot.fetchedAt, 'fetchedAt');
  const periodStart = parseOptionalTimestamp(snapshot.currentPeriodStart, 'currentPeriodStart');
  const periodEnd = parseOptionalTimestamp(snapshot.currentPeriodEnd, 'currentPeriodEnd');
  const product = await resolveProduct(
    unitOfWork,
    snapshot.externalProductId,
    snapshot.externalBasePlanId
  );

  const existing = await unitOfWork.getSubscription(snapshot.externalSubscriptionId);
  if (existing === null) {
    await createSubscription(unitOfWork, {
      externalSubscriptionId: snapshot.externalSubscriptionId,
      product,
      status: snapshot.status,
      purchaseKind: snapshot.purchaseKind,
      periodStart,
      periodEnd,
      cancelAtPeriodEnd: snapshot.cancelAtPeriodEnd,
      isSandbox: snapshot.isSandbox,
      changedAt: fetchedAt,
      processorSnapshot: snapshot.rawPayload,
    });
    return;
  }

  let write = advancePeriod(toSubscriptionWrite(existing), periodStart, periodEnd);
  if (product !== null) {
    write = { ...write, processorProductId: product.id };
  }
  if (canChangeStatus(existing, fetchedAt)) {
    const graceStart = write.currentPeriodEnd ?? fetchedAt;
    write = {
      ...write,
      status: snapshot.status,
      cancelAtPeriodEnd: snapshot.cancelAtPeriodEnd,
      gracePeriodEndsAt:
        snapshot.status !== 'in_grace_period'
          ? null
          : (write.gracePeriodEndsAt ??
            addSeconds(graceStart, unitOfWork.paymentFailureGraceSeconds)),
      rawStatusSnapshot: stampStatusChange(write.rawStatusSnapshot, fetchedAt, snapshot.rawPayload),
    };
  }

  const saved = await unitOfWork.saveSubscription(write);
  if (saved.status === 'expired' || saved.status === 'revoked') {
    await releaseBank(unitOfWork, saved, latestOf(saved.currentPeriodEnd, fetchedAt) ?? fetchedAt);
  }
}
