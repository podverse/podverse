import { describe, expect, it, vi } from 'vitest';

import type { BillingEventOutcome, BillingSnapshotOutcome } from '@podverse/billing';
import type {
  GooglePlayClient,
  GooglePlayVoidedPurchasesPage,
} from '@podverse/external-services-google-play';
import type {
  NormalizedBillingEvent,
  NormalizedSubscriptionSnapshot,
  PaymentProcessorAdapter,
  PaymentProcessorId,
} from '@podverse/helpers';
import { BillingProcessorRecordNotFoundError } from '@podverse/helpers';

import type {
  BillingReconcileDeps,
  ReconcileInboxRow,
  ReconcileSubscriptionRow,
} from './reconcileBilling.js';
import { INBOX_RETRY_MIN_AGE_MS, reconcileBilling } from './reconcileBilling.js';

const NOW = new Date('2026-09-27T12:00:00.000Z');
const STALE_PERIOD_END = '2026-09-27T00:00:00.000Z';
const RENEWED_PERIOD_END = '2026-10-27T00:00:00.000Z';

function snapshot(externalSubscriptionId: string): NormalizedSubscriptionSnapshot {
  return {
    processor: 'paypal',
    externalSubscriptionId,
    accountBillingCustomerRef: 'ref-1',
    externalProductId: 'P-MONTHLY',
    externalBasePlanId: null,
    status: 'active',
    purchaseKind: 'auto_renew',
    currentPeriodStart: STALE_PERIOD_END,
    currentPeriodEnd: RENEWED_PERIOD_END,
    cancelAtPeriodEnd: false,
    isSandbox: false,
    fetchedAt: NOW.toISOString(),
    schemaVersion: 'paypal-subscription-v1',
    rawPayload: {},
  };
}

function subscriptionRow(id: number, processorId: string, externalId: string) {
  const row: ReconcileSubscriptionRow = {
    id,
    processor_id: processorId,
    external_subscription_id: externalId,
    billing_processor_product: { external_product_id: 'P-MONTHLY' },
  };
  return row;
}

/** Every adapter method is a spy, so a test can prove only reads were made. */
function mockAdapter(id: PaymentProcessorId) {
  const spies = {
    verifyAndParseWebhook: vi.fn(),
    fetchSubscription: vi.fn(async (ref: { externalId: string }) => {
      if (ref.externalId === 'I-GONE') {
        throw new BillingProcessorRecordNotFoundError(id, ref.externalId);
      }
      return snapshot(ref.externalId);
    }),
    fetchTransaction: vi.fn(),
    acknowledgePurchase: vi.fn(),
    cancelAutoRenew: vi.fn(),
  };
  const adapter: PaymentProcessorAdapter = { id, ...spies };
  return { adapter, spies };
}

function voidedPage(): GooglePlayVoidedPurchasesPage {
  return {
    purchases: [
      {
        orderId: 'GPA.RECORDED',
        purchaseToken: 'token-recorded',
        voidedAt: '2026-09-26T08:00:00.000Z',
        productType: 'one_time',
        reason: 'refund',
        rawPayload: {},
      },
      {
        orderId: 'GPA.UNKNOWN',
        purchaseToken: 'token-unknown',
        voidedAt: '2026-09-26T09:00:00.000Z',
        productType: 'one_time',
        reason: 'chargeback',
        rawPayload: {},
      },
    ],
    nextPageToken: null,
  };
}

function buildDeps(overrides: {
  subscriptions?: ReconcileSubscriptionRow[];
  inbox?: ReconcileInboxRow[];
  googlePlayClient?: GooglePlayClient | null;
}) {
  const paypal = mockAdapter('paypal');
  const applied: BillingSnapshotOutcome = {
    status: 'applied',
    accountId: 1,
    membershipExpiresAt: new Date(RENEWED_PERIOD_END),
  };
  const processor = {
    applySubscriptionSnapshot: vi.fn(async (_snapshot: NormalizedSubscriptionSnapshot) => applied),
    retryInboxEvent: vi.fn(async (inboxEventId: string): Promise<BillingEventOutcome> => {
      if (inboxEventId === 'still-broken') {
        return {
          status: 'failed',
          inboxEventId,
          errorCode: 'account_unresolved',
          message: 'No account matches this paypal purchase',
        };
      }
      return { status: 'processed', inboxEventId, accountId: 1, membershipExpiresAt: null };
    }),
    ingestEvent: vi.fn(async (event: NormalizedBillingEvent): Promise<BillingEventOutcome> => ({
      status: 'processed',
      inboxEventId: event.processorEventId,
      accountId: 1,
      membershipExpiresAt: null,
    })),
  };
  const listDueSubscriptions = vi.fn(async () => overrides.subscriptions ?? []);
  const listRetryableInboxEvents = vi.fn(async () => overrides.inbox ?? []);
  const findRecordedGooglePlayPurchase = vi.fn(
    async (_kind: 'transaction' | 'subscription', externalId: string) =>
      externalId === 'GPA.RECORDED' ? { isSandbox: true } : null
  );

  const deps: BillingReconcileDeps = {
    registry: { get: (processorId) => (processorId === 'paypal' ? paypal.adapter : null) },
    processor,
    googlePlayClient: overrides.googlePlayClient ?? null,
    listDueSubscriptions,
    listRetryableInboxEvents,
    findRecordedGooglePlayPurchase,
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    now: NOW,
  };
  return { deps, paypal, processor, listDueSubscriptions, listRetryableInboxEvents };
}

describe('reconcileBilling', () => {
  it('applies the processor view of a subscription whose stored period end is stale', async () => {
    const { deps, paypal, processor, listDueSubscriptions } = buildDeps({
      subscriptions: [subscriptionRow(10, 'paypal', 'I-STALE')],
    });

    const summary = await reconcileBilling(deps);

    expect(listDueSubscriptions).toHaveBeenCalledWith({
      windowStart: new Date('2026-09-25T12:00:00.000Z'),
      windowEnd: new Date('2026-09-29T12:00:00.000Z'),
      afterId: 0,
      limit: 200,
    });
    expect(paypal.spies.fetchSubscription).toHaveBeenCalledWith({
      externalId: 'I-STALE',
      externalProductId: 'P-MONTHLY',
    });
    expect(processor.applySubscriptionSnapshot).toHaveBeenCalledWith(
      expect.objectContaining({
        externalSubscriptionId: 'I-STALE',
        currentPeriodEnd: RENEWED_PERIOD_END,
      })
    );
    expect(summary.subscriptions.applied).toBe(1);
    expect(summary.stepErrors).toEqual([]);
  });

  it('never calls a method that could move money', async () => {
    const { deps, paypal } = buildDeps({
      subscriptions: [subscriptionRow(10, 'paypal', 'I-STALE')],
      inbox: [{ id: '7' }],
    });

    await reconcileBilling(deps);

    expect(paypal.spies.fetchSubscription).toHaveBeenCalled();
    expect(paypal.spies.acknowledgePurchase).not.toHaveBeenCalled();
    expect(paypal.spies.cancelAutoRenew).not.toHaveBeenCalled();
    expect(paypal.spies.fetchTransaction).not.toHaveBeenCalled();
    expect(paypal.spies.verifyAndParseWebhook).not.toHaveBeenCalled();
  });

  it('continues past a missing record and skips processors it cannot read', async () => {
    const { deps, processor } = buildDeps({
      subscriptions: [
        subscriptionRow(10, 'paypal', 'I-GONE'),
        subscriptionRow(11, 'test', 'sim-sub'),
        subscriptionRow(12, 'apple', '2000000000000001'),
        subscriptionRow(13, 'paypal', 'I-STALE'),
      ],
    });

    const summary = await reconcileBilling(deps);

    expect(summary.subscriptions).toEqual({
      applied: 1,
      ignoredSandbox: 0,
      notFound: 1,
      skipped: 2,
      failed: 0,
    });
    expect(processor.applySubscriptionSnapshot).toHaveBeenCalledTimes(1);
  });

  it('retries failed inbox rows older than the retry delay, once each', async () => {
    const { deps, processor, listRetryableInboxEvents } = buildDeps({
      inbox: [{ id: '7' }, { id: 'still-broken' }],
    });

    const summary = await reconcileBilling(deps);

    expect(listRetryableInboxEvents).toHaveBeenCalledWith({
      receivedBefore: new Date(NOW.getTime() - INBOX_RETRY_MIN_AGE_MS),
      limit: 100,
    });
    expect(processor.retryInboxEvent.mock.calls).toEqual([['7'], ['still-broken']]);
    expect(summary.inbox).toEqual({ recovered: 1, stillFailing: 1 });
  });

  it('revokes Google Play voids only for purchases this server recorded', async () => {
    const listVoidedPurchases = vi.fn(async () => voidedPage());
    const googlePlayClient: GooglePlayClient = {
      getIdTokenVerifier: vi.fn(),
      getSubscriptionPurchase: vi.fn(),
      acknowledgeSubscriptionPurchase: vi.fn(),
      getProductPurchase: vi.fn(),
      acknowledgeProductPurchase: vi.fn(),
      listVoidedPurchases,
    };
    const { deps, processor } = buildDeps({ googlePlayClient });

    const summary = await reconcileBilling(deps);

    expect(listVoidedPurchases).toHaveBeenCalledWith(
      expect.objectContaining({
        startTimeMillis: new Date('2026-09-25T12:00:00.000Z').getTime(),
        endTimeMillis: NOW.getTime(),
      })
    );
    expect(processor.ingestEvent).toHaveBeenCalledTimes(1);
    expect(processor.ingestEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'refund_or_revoke',
        processorEventId: 'voided:GPA.RECORDED',
        externalTransactionId: 'GPA.RECORDED',
        isSandbox: true,
      })
    );
    expect(googlePlayClient.acknowledgeProductPurchase).not.toHaveBeenCalled();
    expect(googlePlayClient.acknowledgeSubscriptionPurchase).not.toHaveBeenCalled();
    expect(summary.googlePlayVoids).toEqual({ ingested: 1, unrecorded: 1, failed: 0 });
  });

  it('runs every step when one stops early', async () => {
    const { deps, processor, listDueSubscriptions } = buildDeps({ inbox: [{ id: '7' }] });
    listDueSubscriptions.mockRejectedValueOnce(new Error('connection refused'));

    const summary = await reconcileBilling(deps);

    expect(summary.stepErrors).toEqual(['subscriptions: connection refused']);
    expect(processor.retryInboxEvent).toHaveBeenCalledWith('7');
  });
});
