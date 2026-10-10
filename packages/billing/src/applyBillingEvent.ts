import type {
  NormalizedBillingEvent,
  PaymentSettledEvent,
  RefundOrRevokeEvent,
} from '@podverse/helpers';
import { computeMembershipAccess, extendMembershipPeriodByCadence } from '@podverse/helpers';

import { BillingEventError } from './errors.js';
import type {
  BillingLedgerUnitOfWork,
  LedgerGrant,
  LedgerProcessorProduct,
} from './ledgerStore.js';

/** A processed event that changed nothing carries `note`; every other apply leaves it null. */
export interface ApplyBillingEventResult {
  note: string | null;
}

function parseTimestamp(value: string, label: string): Date {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new BillingEventError('invalid_timestamp', `${label} is not a valid timestamp`);
  }
  return parsed;
}

/** When paid access already covers `at`, the instant it runs out. Otherwise null. */
function paidThrough(grants: readonly LedgerGrant[], at: Date): Date | null {
  const access = computeMembershipAccess({
    now: at,
    grants: grants.map((grant) => ({
      source: grant.source,
      startsAt: grant.startsAt,
      endsAt: grant.endsAt,
      revokedAt: grant.revokedAt,
    })),
  });
  return access.isEntitled ? access.membershipExpiresAt : null;
}

function cadencePeriodEnd(product: LedgerProcessorProduct | null, startsAt: Date): Date {
  if (product === null) {
    throw new BillingEventError(
      'product_unmapped',
      'A purchase needs a mapped product when the processor does not report a period'
    );
  }
  return extendMembershipPeriodByCadence({
    membershipExpiresAt: startsAt,
    cadence: product.cadence,
    now: startsAt,
  });
}

function grantEndsAt(
  product: LedgerProcessorProduct | null,
  startsAt: Date,
  periodStart: Date | null,
  periodEnd: Date | null
): Date {
  if (periodStart !== null && periodEnd !== null) {
    return new Date(startsAt.getTime() + (periodEnd.getTime() - periodStart.getTime()));
  }
  return cadencePeriodEnd(product, startsAt);
}

async function recordPayment(
  unitOfWork: BillingLedgerUnitOfWork,
  event: PaymentSettledEvent
): Promise<void> {
  const existing = await unitOfWork.getTransaction(event.externalTransactionId);
  if (existing !== null) {
    return;
  }

  const settledAt = parseTimestamp(event.occurredAt, 'occurredAt');
  const periodStart =
    event.periodStart === null ? null : parseTimestamp(event.periodStart, 'periodStart');
  const periodEnd = event.periodEnd === null ? null : parseTimestamp(event.periodEnd, 'periodEnd');
  const product =
    event.externalProductId === null
      ? null
      : await unitOfWork.findProcessorProduct(event.externalProductId, event.externalBasePlanId);
  const grants = await unitOfWork.listGrants();
  const startsAt = paidThrough(grants, settledAt) ?? settledAt;
  const endsAt = grantEndsAt(product, startsAt, periodStart, periodEnd);

  const transaction = await unitOfWork.saveTransaction({
    externalTransactionId: event.externalTransactionId,
    settledAt,
    amount: event.amount,
    revokedAt: null,
    revocationReason: null,
    isSandbox: event.isSandbox,
  });
  await unitOfWork.insertGrant({
    source: 'one_time_purchase',
    startsAt,
    endsAt,
    transactionId: transaction.id,
  });
  if (product !== null) {
    await unitOfWork.setBillingCadence(product.cadence);
  }
  await unitOfWork.grantPremiumMembership();
}

/**
 * Revokes the grants created by this payment. An unknown payment is recorded and skipped: the
 * processor may notify a refund for a purchase this ledger never saw.
 */
async function applyRefundOrRevoke(
  unitOfWork: BillingLedgerUnitOfWork,
  event: RefundOrRevokeEvent
): Promise<string | null> {
  const transaction = await unitOfWork.getTransaction(event.externalTransactionId);
  if (transaction === null) {
    return `No ${event.processor} transaction ${event.externalTransactionId} is recorded`;
  }

  const revokedAt = parseTimestamp(event.revokedAt, 'revokedAt');
  if (transaction.revokedAt === null) {
    await unitOfWork.saveTransaction({
      externalTransactionId: transaction.externalTransactionId,
      settledAt: transaction.settledAt,
      amount: transaction.amount,
      revokedAt,
      revocationReason: event.reason,
      isSandbox: transaction.isSandbox,
    });
  }

  const grants = await unitOfWork.listGrants();
  const grantIds = grants
    .filter((grant) => grant.transactionId === transaction.id && grant.revokedAt === null)
    .map((grant) => grant.id);
  if (grantIds.length > 0) {
    await unitOfWork.revokeGrants(grantIds, revokedAt);
  }
  return null;
}

/** Applies one normalized event. A repeat of a payment already on the ledger changes nothing. */
export async function applyBillingEvent(
  unitOfWork: BillingLedgerUnitOfWork,
  event: NormalizedBillingEvent
): Promise<ApplyBillingEventResult> {
  switch (event.type) {
    case 'payment_settled':
      await recordPayment(unitOfWork, event);
      return { note: null };
    case 'refund_or_revoke':
      return { note: await applyRefundOrRevoke(unitOfWork, event) };
  }
}
