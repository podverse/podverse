import { describe, expect, it } from 'vitest';

import type { GooglePlayVoidedPurchase } from './PlayDeveloperClient.js';
import { voidedPurchaseToRevokeEvent } from './voidedPurchases.js';

const NOW = '2026-09-27T12:00:00.000Z';

function voided(overrides: Partial<GooglePlayVoidedPurchase>): GooglePlayVoidedPurchase {
  return {
    orderId: 'GPA.1111-2222-3333-44444',
    purchaseToken: 'token-1',
    voidedAt: '2026-09-26T08:00:00.000Z',
    productType: 'one_time',
    reason: 'refund',
    rawPayload: {},
    ...overrides,
  };
}

describe('voidedPurchaseToRevokeEvent', () => {
  it('revokes a subscription charge by order id and purchase token', () => {
    const event = voidedPurchaseToRevokeEvent(
      voided({ productType: 'subscription', reason: 'chargeback' }),
      NOW
    );

    expect(event).toMatchObject({
      type: 'refund_or_revoke',
      processor: 'google_play',
      processorEventId: 'voided:GPA.1111-2222-3333-44444',
      externalTransactionId: 'GPA.1111-2222-3333-44444',
      externalSubscriptionId: 'token-1',
      reason: 'chargeback',
      revokedAt: '2026-09-26T08:00:00.000Z',
      occurredAt: '2026-09-26T08:00:00.000Z',
    });
  });

  it('falls back to the token for a one-time purchase without an order id', () => {
    const event = voidedPurchaseToRevokeEvent(voided({ orderId: null, voidedAt: null }), NOW);

    expect(event).toMatchObject({
      processorEventId: 'voided:token-1',
      externalTransactionId: 'token-1',
      externalSubscriptionId: null,
      revokedAt: NOW,
    });
  });

  it('returns null when the purchase names nothing to revoke', () => {
    expect(
      voidedPurchaseToRevokeEvent(voided({ orderId: null, productType: 'unknown' }), NOW)
    ).toBeNull();
  });
});
