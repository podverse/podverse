import { randomUUID } from 'node:crypto';

import type {
  BillingCancelAutoRenewResult,
  BillingProcessorRecordRef,
  BillingWebhookParseResult,
  NormalizedBillingEvent,
  NormalizedSubscriptionSnapshot,
  NormalizedTransactionSnapshot,
  PaymentProcessorAdapter,
} from '@podverse/helpers';
import {
  BillingProcessorRecordNotFoundError,
  BillingWebhookVerificationError,
} from '@podverse/helpers';

import { BillingTestAdapterRefusedError } from '../errors.js';

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

/**
 * A normalized event without the fields the test processor fills in. `processorEventId` defaults
 * to a fresh id, `occurredAt` to now, and `isSandbox` to true.
 */
export type TestBillingEventSimulation = DistributiveOmit<
  NormalizedBillingEvent,
  'processor' | 'processorEventId' | 'occurredAt' | 'isSandbox'
> & {
  processorEventId?: string;
  occurredAt?: string;
  isSandbox?: boolean;
};

export interface TestPaymentProcessorAdapter extends PaymentProcessorAdapter {
  readonly id: 'test';
  simulateEvent(simulation: TestBillingEventSimulation): NormalizedBillingEvent;
  /** What `fetchSubscription` returns for this subscription until it is replaced. */
  putSubscriptionSnapshot(
    snapshot: Omit<NormalizedSubscriptionSnapshot, 'processor' | 'fetchedAt'>
  ): void;
  /** What `fetchTransaction` returns for this payment until it is replaced. */
  putTransactionSnapshot(
    snapshot: Omit<NormalizedTransactionSnapshot, 'processor' | 'fetchedAt'>
  ): void;
}

export interface TestAdapterConfig {
  nodeEnv: string | undefined;
  /** `BILLING_ALLOW_TEST_ADAPTER=true`, for staging deployments that run with production settings. */
  allowTestAdapter: boolean;
  now?: () => Date;
}

export function isTestAdapterAllowed(
  config: Pick<TestAdapterConfig, 'nodeEnv' | 'allowTestAdapter'>
): boolean {
  return config.nodeEnv !== 'production' || config.allowTestAdapter;
}

/**
 * The `test` processor: events are simulated through the API instead of arriving from a vendor,
 * so it never takes money and has no webhook. Refused in production unless explicitly allowed.
 */
export function createTestAdapter(config: TestAdapterConfig): TestPaymentProcessorAdapter {
  if (!isTestAdapterAllowed(config)) {
    throw new BillingTestAdapterRefusedError();
  }
  const now = config.now ?? (() => new Date());
  const subscriptions = new Map<
    string,
    Omit<NormalizedSubscriptionSnapshot, 'processor' | 'fetchedAt'>
  >();
  const transactions = new Map<
    string,
    Omit<NormalizedTransactionSnapshot, 'processor' | 'fetchedAt'>
  >();

  return {
    id: 'test',

    simulateEvent(simulation) {
      return {
        ...simulation,
        processor: 'test',
        processorEventId: simulation.processorEventId ?? randomUUID(),
        occurredAt: simulation.occurredAt ?? now().toISOString(),
        isSandbox: simulation.isSandbox ?? true,
      };
    },

    putSubscriptionSnapshot(snapshot) {
      subscriptions.set(snapshot.externalSubscriptionId, snapshot);
    },

    putTransactionSnapshot(snapshot) {
      transactions.set(snapshot.externalTransactionId, snapshot);
    },

    async verifyAndParseWebhook(): Promise<BillingWebhookParseResult> {
      throw new BillingWebhookVerificationError(
        'test',
        'The test processor has no webhook; simulate events instead'
      );
    },

    async fetchSubscription(
      ref: BillingProcessorRecordRef
    ): Promise<NormalizedSubscriptionSnapshot> {
      const snapshot = subscriptions.get(ref.externalId);
      if (snapshot === undefined) {
        throw new BillingProcessorRecordNotFoundError('test', ref.externalId);
      }
      return { ...snapshot, processor: 'test', fetchedAt: now().toISOString() };
    },

    async fetchTransaction(ref: BillingProcessorRecordRef): Promise<NormalizedTransactionSnapshot> {
      const snapshot = transactions.get(ref.externalId);
      if (snapshot === undefined) {
        throw new BillingProcessorRecordNotFoundError('test', ref.externalId);
      }
      return { ...snapshot, processor: 'test', fetchedAt: now().toISOString() };
    },

    async cancelAutoRenew(): Promise<BillingCancelAutoRenewResult> {
      return { outcome: 'cancelled' };
    },
  };
}
