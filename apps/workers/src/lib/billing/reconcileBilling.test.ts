import { describe, expect, it, vi } from 'vitest';

import type { BillingEventOutcome } from '@podverse/billing';
import type {
  GooglePlayClient,
  GooglePlayVoidedPurchasesPage,
} from '@podverse/external-services-google-play';
import type { NormalizedBillingEvent } from '@podverse/helpers';

import type { BillingReconcileDeps, ReconcileInboxRow } from './reconcileBilling.js';
import { INBOX_RETRY_MIN_AGE_MS, reconcileBilling } from './reconcileBilling.js';

const NOW = new Date('2026-09-27T12:00:00.000Z');

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
  inbox?: ReconcileInboxRow[];
  googlePlayClient?: GooglePlayClient | null;
  listRetryableInboxEvents?: BillingReconcileDeps['listRetryableInboxEvents'];
}) {
  const processor = {
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
  const listRetryableInboxEvents =
    overrides.listRetryableInboxEvents ?? vi.fn(async () => overrides.inbox ?? []);
  const findRecordedGooglePlayPurchase = vi.fn(async (externalTransactionId: string) =>
    externalTransactionId === 'GPA.RECORDED' ? { isSandbox: true } : null
  );

  const deps: BillingReconcileDeps = {
    processor,
    googlePlayClient: overrides.googlePlayClient ?? null,
    listRetryableInboxEvents,
    findRecordedGooglePlayPurchase,
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    now: NOW,
  };
  return { deps, processor, listRetryableInboxEvents };
}

describe('reconcileBilling', () => {
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
    expect(summary.stepErrors).toEqual([]);
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
    const listRetryableInboxEvents = vi.fn(async () => {
      throw new Error('connection refused');
    });
    const listVoidedPurchases = vi.fn(async () => voidedPage());
    const googlePlayClient: GooglePlayClient = {
      getIdTokenVerifier: vi.fn(),
      getSubscriptionPurchase: vi.fn(),
      acknowledgeSubscriptionPurchase: vi.fn(),
      getProductPurchase: vi.fn(),
      acknowledgeProductPurchase: vi.fn(),
      listVoidedPurchases,
    };
    const { deps, processor } = buildDeps({
      googlePlayClient,
      listRetryableInboxEvents,
    });

    const summary = await reconcileBilling(deps);

    expect(summary.stepErrors).toEqual(['inbox: connection refused']);
    expect(processor.ingestEvent).toHaveBeenCalledTimes(1);
  });
});
