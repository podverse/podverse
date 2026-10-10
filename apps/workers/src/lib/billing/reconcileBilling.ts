import type { BillingEventProcessor } from '@podverse/billing';
import type { GooglePlayClient } from '@podverse/external-services-google-play';
import {
  pollGooglePlayVoidedPurchases,
  voidedPurchaseToRevokeEvent,
} from '@podverse/external-services-google-play';

/** A failed inbox row is left this long before a retry, so a webhook redelivery gets there first. */
export const INBOX_RETRY_MIN_AGE_MS = 15 * 60 * 1000;
export const INBOX_RETRY_BATCH_SIZE = 100;
/** Each run re-reads this much of Google's voided-purchase history; overlap is deduplicated. */
export const GOOGLE_PLAY_VOIDED_LOOKBACK_MS = 48 * 60 * 60 * 1000;
const GOOGLE_PLAY_VOIDED_PAGE_SIZE = 1000;

export interface ReconcileInboxRow {
  id: string;
}

export interface RecordedPurchase {
  isSandbox: boolean;
}

export interface BillingReconcileLogger {
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
}

export interface BillingReconcileDeps {
  processor: Pick<BillingEventProcessor, 'retryInboxEvent' | 'ingestEvent'>;
  googlePlayClient: GooglePlayClient | null;
  listRetryableInboxEvents(params: {
    receivedBefore: Date;
    limit: number;
  }): Promise<ReconcileInboxRow[]>;
  /** The Google Play transaction this server recorded under that order id. */
  findRecordedGooglePlayPurchase(externalTransactionId: string): Promise<RecordedPurchase | null>;
  logger: BillingReconcileLogger;
  now: Date;
}

export interface BillingReconcileSummary {
  inbox: { recovered: number; stillFailing: number };
  googlePlayVoids: { ingested: number; unrecorded: number; failed: number };
  /** Steps that stopped early, such as a database or processor outage. */
  stepErrors: string[];
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Retries each failed inbox row at most once per run. A row that keeps failing stays `failed`
 * with its `process_error` for an operator to inspect.
 */
async function retryFailedInboxEvents(
  deps: BillingReconcileDeps,
  summary: BillingReconcileSummary
): Promise<void> {
  const rows = await deps.listRetryableInboxEvents({
    receivedBefore: new Date(deps.now.getTime() - INBOX_RETRY_MIN_AGE_MS),
    limit: INBOX_RETRY_BATCH_SIZE,
  });
  for (const row of rows) {
    try {
      const outcome = await deps.processor.retryInboxEvent(row.id);
      if (outcome.status === 'failed') {
        summary.inbox.stillFailing += 1;
      } else {
        summary.inbox.recovered += 1;
      }
    } catch (error) {
      summary.inbox.stillFailing += 1;
      deps.logger.error('Billing reconcile could not retry an inbox event', {
        inboxEventId: row.id,
        error: errorMessage(error),
      });
    }
  }
}

/**
 * Backstop for voided-purchase notifications that never arrived. Only purchases this server
 * recorded are revoked; a void for anything else has no grant to take back.
 */
async function applyGooglePlayVoids(
  deps: BillingReconcileDeps,
  googlePlayClient: GooglePlayClient,
  summary: BillingReconcileSummary
): Promise<void> {
  const nowIso = deps.now.toISOString();
  let pageToken: string | undefined;

  do {
    const page = await pollGooglePlayVoidedPurchases(googlePlayClient, {
      startTimeMillis: deps.now.getTime() - GOOGLE_PLAY_VOIDED_LOOKBACK_MS,
      endTimeMillis: deps.now.getTime(),
      maxResults: GOOGLE_PLAY_VOIDED_PAGE_SIZE,
      pageToken,
    });

    for (const purchase of page.purchases) {
      const event = voidedPurchaseToRevokeEvent(purchase, nowIso);
      if (event === null) {
        summary.googlePlayVoids.unrecorded += 1;
        continue;
      }
      const recorded = await deps.findRecordedGooglePlayPurchase(event.externalTransactionId);
      if (recorded === null) {
        summary.googlePlayVoids.unrecorded += 1;
        continue;
      }

      const outcome = await deps.processor.ingestEvent({ ...event, isSandbox: recorded.isSandbox });
      if (outcome.status === 'failed') {
        summary.googlePlayVoids.failed += 1;
        deps.logger.error('Billing reconcile could not apply a Google Play void', {
          inboxEventId: outcome.inboxEventId,
          error: outcome.message,
        });
      } else {
        summary.googlePlayVoids.ingested += 1;
      }
    }

    pageToken = page.nextPageToken ?? undefined;
  } while (pageToken !== undefined);
}

/**
 * Brings the ledger in line with the processors: failed inbox rows and Google Play voids.
 * Never charges a payment method. Each step runs even when an earlier one stops early; those
 * failures are listed in `stepErrors`.
 */
export async function reconcileBilling(
  deps: BillingReconcileDeps
): Promise<BillingReconcileSummary> {
  const summary: BillingReconcileSummary = {
    inbox: { recovered: 0, stillFailing: 0 },
    googlePlayVoids: { ingested: 0, unrecorded: 0, failed: 0 },
    stepErrors: [],
  };

  const steps: { name: string; run: () => Promise<void> }[] = [
    { name: 'inbox', run: () => retryFailedInboxEvents(deps, summary) },
  ];
  const googlePlayClient = deps.googlePlayClient;
  if (googlePlayClient !== null) {
    steps.push({
      name: 'google_play_voids',
      run: () => applyGooglePlayVoids(deps, googlePlayClient, summary),
    });
  }

  for (const step of steps) {
    try {
      await step.run();
    } catch (error) {
      const message = errorMessage(error);
      summary.stepErrors.push(`${step.name}: ${message}`);
      deps.logger.error('Billing reconcile step stopped early', {
        step: step.name,
        error: message,
      });
    }
  }

  return summary;
}
