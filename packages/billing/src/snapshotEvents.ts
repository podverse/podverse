import type { NormalizedBillingEvent, NormalizedTransactionSnapshot } from '@podverse/helpers';

/**
 * The events a verified payment implies, for a signed-in client that posts its purchase before
 * the processor's webhook arrives. Event ids are derived from the transaction id, so posting the
 * same purchase twice is a duplicate, and the webhook for it records nothing new.
 */
export function transactionSnapshotToEvents(
  snapshot: NormalizedTransactionSnapshot,
  context: { accountId: number | null }
): NormalizedBillingEvent[] {
  const base = {
    processor: snapshot.processor,
    accountBillingCustomerRef: snapshot.accountBillingCustomerRef,
    accountId: context.accountId,
    isSandbox: snapshot.isSandbox,
  };

  const events: NormalizedBillingEvent[] = [
    {
      ...base,
      type: 'payment_settled',
      processorEventId: `transaction:${snapshot.externalTransactionId}:settled`,
      occurredAt: snapshot.settledAt,
      purchaseKind: snapshot.purchaseKind,
      externalTransactionId: snapshot.externalTransactionId,
      externalSubscriptionId: snapshot.externalSubscriptionId,
      externalProductId: snapshot.externalProductId,
      externalBasePlanId: snapshot.externalBasePlanId,
      periodStart: snapshot.periodStart,
      periodEnd: snapshot.periodEnd,
      amount: snapshot.amount,
    },
  ];

  if (snapshot.revokedAt !== null && snapshot.revocationReason !== null) {
    events.push({
      ...base,
      type: 'refund_or_revoke',
      processorEventId: `transaction:${snapshot.externalTransactionId}:revoked`,
      occurredAt: snapshot.revokedAt,
      externalTransactionId: snapshot.externalTransactionId,
      externalSubscriptionId: null,
      reason: snapshot.revocationReason,
      revokedAt: snapshot.revokedAt,
    });
  }

  return events;
}
