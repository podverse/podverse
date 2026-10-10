import type { BillingPurchaseOutcome } from './BillingClient';
import { billingPurchaseOutcome } from './BillingClient';
import { billingErrorCode } from './billingGuards';

/** `POST /billing/restore` accepts at most this many purchases per request. */
export const BILLING_RESTORE_BATCH_SIZE = 50;

export type RestoreStoreRecord = {
  externalId: string;
  externalProductId: string;
  signedTransaction?: string | null;
  finish: () => Promise<void>;
};

const worsePhase = (
  current: BillingPurchaseOutcome['phase'],
  next: BillingPurchaseOutcome['phase']
): BillingPurchaseOutcome['phase'] => {
  const rank: Record<BillingPurchaseOutcome['phase'], number> = {
    cancelled: 1,
    confirmed: 0,
    failed: 4,
    unconfirmed: 3,
    waiting: 2,
  };
  return rank[next] > rank[current] ? next : current;
};

/**
 * Posts purchases to the restore endpoint in batches. Finishes a batch only when that batch is
 * confirmed. Pending purchases stay unfinished and the outcome stays `waiting` when nothing
 * failed.
 */
export const restoreStorePurchases = async (params: {
  records: RestoreStoreRecord[];
  pendingCount: number;
  batchSize?: number;
  restore: (
    purchases: Array<{
      externalId: string;
      externalProductId: string;
      signedTransaction?: string | null;
    }>
  ) => Promise<{ confirmed: boolean }>;
}): Promise<BillingPurchaseOutcome> => {
  if (params.records.length === 0) {
    return billingPurchaseOutcome(params.pendingCount > 0 ? 'waiting' : 'confirmed');
  }

  const batchSize = params.batchSize ?? BILLING_RESTORE_BATCH_SIZE;
  let phase: BillingPurchaseOutcome['phase'] = 'confirmed';
  let errorCode: string | null = null;

  for (let index = 0; index < params.records.length; index += batchSize) {
    const batch = params.records.slice(index, index + batchSize);
    try {
      const result = await params.restore(
        batch.map((record) => ({
          externalId: record.externalId,
          externalProductId: record.externalProductId,
          ...(record.signedTransaction !== undefined
            ? { signedTransaction: record.signedTransaction }
            : {}),
        }))
      );
      if (result.confirmed !== true) {
        phase = worsePhase(phase, 'unconfirmed');
        continue;
      }
      for (const record of batch) {
        await record.finish();
      }
    } catch (error) {
      phase = worsePhase(phase, 'failed');
      errorCode = billingErrorCode(error);
    }
  }

  if (params.pendingCount > 0) {
    phase = worsePhase(phase, 'waiting');
  }

  return billingPurchaseOutcome(phase, null, null, errorCode);
};
