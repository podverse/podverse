import type { BillingAdapterRegistry, BillingEventProcessor } from '@podverse/billing';
import type { GooglePlayClient } from '@podverse/external-services-google-play';
import {
  pollGooglePlayVoidedPurchases,
  voidedPurchaseToRevokeEvent,
} from '@podverse/external-services-google-play';
import type { PaymentProcessorId } from '@podverse/helpers';
import { BillingProcessorRecordNotFoundError, isPaymentProcessorId } from '@podverse/helpers';

const HOUR_MS = 60 * 60 * 1000;

/** Subscriptions whose period end or grace end is this close to now, either side, are re-read. */
export const RECONCILE_WINDOW_MS = 48 * HOUR_MS;
export const RECONCILE_SUBSCRIPTION_BATCH_SIZE = 200;
/** A failed inbox row is left this long before a retry, so a webhook redelivery gets there first. */
export const INBOX_RETRY_MIN_AGE_MS = 15 * 60 * 1000;
export const INBOX_RETRY_BATCH_SIZE = 100;
/** Each run re-reads this much of Google's voided-purchase history; overlap is deduplicated. */
export const GOOGLE_PLAY_VOIDED_LOOKBACK_MS = 48 * HOUR_MS;
const GOOGLE_PLAY_VOIDED_PAGE_SIZE = 1000;

export interface ReconcileSubscriptionRow {
  id: number;
  processor_id: string;
  external_subscription_id: string;
  billing_processor_product: { external_product_id: string } | null;
}

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
  registry: Pick<BillingAdapterRegistry, 'get'>;
  processor: Pick<
    BillingEventProcessor,
    'applySubscriptionSnapshot' | 'retryInboxEvent' | 'ingestEvent'
  >;
  googlePlayClient: GooglePlayClient | null;
  listDueSubscriptions(params: {
    windowStart: Date;
    windowEnd: Date;
    afterId: number;
    limit: number;
  }): Promise<ReconcileSubscriptionRow[]>;
  listRetryableInboxEvents(params: {
    receivedBefore: Date;
    limit: number;
  }): Promise<ReconcileInboxRow[]>;
  /** The Google Play transaction or subscription this server recorded under that id. */
  findRecordedGooglePlayPurchase(
    kind: 'transaction' | 'subscription',
    externalId: string
  ): Promise<RecordedPurchase | null>;
  logger: BillingReconcileLogger;
  now: Date;
}

export interface BillingReconcileSummary {
  subscriptions: {
    applied: number;
    ignoredSandbox: number;
    notFound: number;
    skipped: number;
    failed: number;
  };
  inbox: { recovered: number; stillFailing: number };
  googlePlayVoids: { ingested: number; unrecorded: number; failed: number };
  /** Steps that stopped early, such as a database or processor outage. */
  stepErrors: string[];
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Re-reads subscriptions near a period or grace boundary from their processor and applies what
 * the ledger missed. The processor runs every renewal; this only reads.
 */
async function reconcileSubscriptions(
  deps: BillingReconcileDeps,
  summary: BillingReconcileSummary
): Promise<void> {
  const windowStart = new Date(deps.now.getTime() - RECONCILE_WINDOW_MS);
  const windowEnd = new Date(deps.now.getTime() + RECONCILE_WINDOW_MS);
  const unregistered = new Set<string>();
  let afterId = 0;

  for (;;) {
    const batch = await deps.listDueSubscriptions({
      windowStart,
      windowEnd,
      afterId,
      limit: RECONCILE_SUBSCRIPTION_BATCH_SIZE,
    });
    for (const row of batch) {
      await reconcileSubscription(deps, row, summary, unregistered);
    }
    const last = batch.at(-1);
    if (last === undefined || batch.length < RECONCILE_SUBSCRIPTION_BATCH_SIZE) {
      return;
    }
    afterId = last.id;
  }
}

async function reconcileSubscription(
  deps: BillingReconcileDeps,
  row: ReconcileSubscriptionRow,
  summary: BillingReconcileSummary,
  unregistered: Set<string>
): Promise<void> {
  // The test processor keeps its records in the memory of the process that created them, so a
  // worker has nothing to fetch for them.
  const processorId: PaymentProcessorId | null =
    isPaymentProcessorId(row.processor_id) && row.processor_id !== 'test' ? row.processor_id : null;
  const adapter = processorId === null ? null : deps.registry.get(processorId);
  if (adapter === null) {
    summary.subscriptions.skipped += 1;
    if (!unregistered.has(row.processor_id)) {
      unregistered.add(row.processor_id);
      deps.logger.info('Billing reconcile skips a processor with no adapter here', {
        processor: row.processor_id,
      });
    }
    return;
  }

  try {
    const snapshot = await adapter.fetchSubscription({
      externalId: row.external_subscription_id,
      externalProductId: row.billing_processor_product?.external_product_id ?? null,
    });
    const outcome = await deps.processor.applySubscriptionSnapshot(snapshot);
    if (outcome.status === 'applied') {
      summary.subscriptions.applied += 1;
    } else {
      summary.subscriptions.ignoredSandbox += 1;
    }
  } catch (error) {
    if (error instanceof BillingProcessorRecordNotFoundError) {
      summary.subscriptions.notFound += 1;
      deps.logger.warn('Billing reconcile found no processor record for a subscription', {
        subscriptionId: row.id,
        processor: row.processor_id,
      });
      return;
    }
    summary.subscriptions.failed += 1;
    deps.logger.error('Billing reconcile could not apply a subscription', {
      subscriptionId: row.id,
      processor: row.processor_id,
      error: errorMessage(error),
    });
  }
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
      const recorded =
        event.externalTransactionId !== null
          ? await deps.findRecordedGooglePlayPurchase('transaction', event.externalTransactionId)
          : await deps.findRecordedGooglePlayPurchase('subscription', event.externalSubscriptionId);
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
 * Brings the ledger in line with the processors: subscriptions near a boundary, failed inbox
 * rows, and Google Play voids. Never charges a payment method. Each step runs even when an
 * earlier one stops early; those failures are listed in `stepErrors`.
 */
export async function reconcileBilling(
  deps: BillingReconcileDeps
): Promise<BillingReconcileSummary> {
  const summary: BillingReconcileSummary = {
    subscriptions: { applied: 0, ignoredSandbox: 0, notFound: 0, skipped: 0, failed: 0 },
    inbox: { recovered: 0, stillFailing: 0 },
    googlePlayVoids: { ingested: 0, unrecorded: 0, failed: 0 },
    stepErrors: [],
  };

  const steps: { name: string; run: () => Promise<void> }[] = [
    { name: 'subscriptions', run: () => reconcileSubscriptions(deps, summary) },
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
