import { describe, expect, it } from 'vitest';

import { BillingWebhookVerificationError } from '@podverse/helpers';

import { BillingTestAdapterRefusedError } from '../errors.js';
import { createTestAdapter } from './testAdapter.js';

describe('createTestAdapter', () => {
  it('is refused in production unless explicitly allowed', () => {
    expect(() => createTestAdapter({ nodeEnv: 'production', allowTestAdapter: false })).toThrow(
      BillingTestAdapterRefusedError
    );
    expect(createTestAdapter({ nodeEnv: 'production', allowTestAdapter: true }).id).toBe('test');
  });

  it('fills in the processor, event id, time, and sandbox flag of a simulated event', () => {
    const adapter = createTestAdapter({
      nodeEnv: 'development',
      allowTestAdapter: false,
      now: () => new Date('2026-01-01T00:00:00.000Z'),
    });

    const event = adapter.simulateEvent({
      type: 'payment_settled',
      accountBillingCustomerRef: null,
      accountId: 7,
      externalTransactionId: 'txn-1',
      externalProductId: 'monthly',
      externalBasePlanId: null,
      periodStart: null,
      periodEnd: null,
      amount: null,
    });

    expect(event).toMatchObject({
      type: 'payment_settled',
      processor: 'test',
      occurredAt: '2026-01-01T00:00:00.000Z',
      isSandbox: true,
      accountId: 7,
      externalTransactionId: 'txn-1',
    });
    expect(event.processorEventId).not.toBe('');
  });

  it('has no webhook to verify', async () => {
    const adapter = createTestAdapter({ nodeEnv: 'test', allowTestAdapter: false });

    await expect(adapter.verifyAndParseWebhook({ rawBody: '{}', headers: {} })).rejects.toThrow(
      BillingWebhookVerificationError
    );
  });
});
