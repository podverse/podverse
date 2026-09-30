import { describe, expect, it } from 'vitest';

import type {
  NormalizedBillingEvent,
  PaymentProcessorId,
  PaymentSettledEvent,
} from '@podverse/helpers';
import { computeMembershipAccess } from '@podverse/helpers';

import { BillingEventProcessor } from './BillingEventProcessor.js';
import type {
  BillingAccountIdentity,
  BillingInboxEventRecord,
  BillingLedgerStore,
  BillingLedgerUnitOfWork,
  LedgerGrant,
  LedgerProcessorProduct,
  LedgerSubscription,
  LedgerTransaction,
} from './ledgerStore.js';

const GRACE_SECONDS = 604800;

interface LedgerState {
  nextId: number;
  subscriptions: (LedgerSubscription & { processorId: PaymentProcessorId })[];
  transactions: (LedgerTransaction & { processorId: PaymentProcessorId })[];
  grants: (LedgerGrant & { accountId: number })[];
  premiumAccountIds: number[];
}

interface ProductMapping {
  processorId: PaymentProcessorId;
  externalProductId: string;
  externalBasePlanId: string | null;
  product: LedgerProcessorProduct;
}

/** Commits a unit of work only when it succeeds, like the account-locked transaction. */
class InMemoryLedgerStore implements BillingLedgerStore {
  inbox = new Map<string, BillingInboxEventRecord & { externalEventId: string }>();
  state: LedgerState = {
    nextId: 1,
    subscriptions: [],
    transactions: [],
    grants: [],
    premiumAccountIds: [],
  };

  constructor(
    private readonly accounts: (BillingAccountIdentity & { billingCustomerRef: string })[],
    private readonly products: ProductMapping[]
  ) {}

  grantsFor(accountId: number): LedgerGrant[] {
    return this.state.grants.filter((grant) => grant.accountId === accountId);
  }

  async insertInboxEvent(params: {
    processorId: PaymentProcessorId;
    externalEventId: string;
    schemaVersion: string;
    payload: Record<string, unknown>;
  }) {
    for (const event of this.inbox.values()) {
      if (
        event.processorId === params.processorId &&
        event.externalEventId === params.externalEventId
      ) {
        return { event, inserted: false };
      }
    }
    const event = {
      id: String(this.inbox.size + 1),
      processorId: params.processorId,
      externalEventId: params.externalEventId,
      schemaVersion: params.schemaVersion,
      payload: params.payload,
      status: 'pending' as const,
    };
    this.inbox.set(event.id, event);
    return { event, inserted: true };
  }

  async getInboxEvent(id: string) {
    return this.inbox.get(id) ?? null;
  }

  async markInboxProcessed(id: string) {
    const event = this.inbox.get(id);
    if (event !== undefined) {
      this.inbox.set(id, { ...event, status: 'processed' });
    }
  }

  async markInboxFailed(id: string) {
    const event = this.inbox.get(id);
    if (event !== undefined) {
      this.inbox.set(id, { ...event, status: 'failed' });
    }
  }

  async findSubscriptionAccountId(processorId: PaymentProcessorId, externalSubscriptionId: string) {
    const row = this.state.subscriptions.find(
      (subscription) =>
        subscription.processorId === processorId &&
        subscription.externalSubscriptionId === externalSubscriptionId
    );
    return row?.accountId ?? null;
  }

  async findTransactionAccountId(processorId: PaymentProcessorId, externalTransactionId: string) {
    const row = this.state.transactions.find(
      (transaction) =>
        transaction.processorId === processorId &&
        transaction.externalTransactionId === externalTransactionId
    );
    return row?.accountId ?? null;
  }

  async getAccountByBillingCustomerRef(billingCustomerRef: string) {
    const account = this.accounts.find((entry) => entry.billingCustomerRef === billingCustomerRef);
    return account === undefined ? null : { id: account.id, idText: account.idText };
  }

  async getAccountById(accountId: number) {
    const account = this.accounts.find((entry) => entry.id === accountId);
    return account === undefined ? null : { id: account.id, idText: account.idText };
  }

  async withAccountLedger<T>(
    processorId: PaymentProcessorId,
    accountId: number,
    now: Date,
    work: (unitOfWork: BillingLedgerUnitOfWork) => Promise<T>
  ) {
    const draft = structuredClone(this.state);
    const result = await work(this.createUnitOfWork(draft, processorId, accountId));
    this.state = draft;

    const access = computeMembershipAccess({
      now,
      grants: draft.grants.filter((grant) => grant.accountId === accountId),
      subscriptions: draft.subscriptions.filter((row) => row.accountId === accountId),
      renewalEntitlementBufferExpiration: 172800,
      paymentFailureGraceExpiration: GRACE_SECONDS,
    });
    return { result, membershipExpiresAt: access.membershipExpiresAt };
  }

  private createUnitOfWork(
    draft: LedgerState,
    processorId: PaymentProcessorId,
    accountId: number
  ): BillingLedgerUnitOfWork {
    const products = this.products;
    const takeId = () => draft.nextId++;

    return {
      accountId,
      processorId,
      paymentFailureGraceSeconds: GRACE_SECONDS,
      async getSubscription(externalSubscriptionId) {
        return (
          draft.subscriptions.find(
            (row) =>
              row.processorId === processorId &&
              row.externalSubscriptionId === externalSubscriptionId
          ) ?? null
        );
      },
      async saveSubscription(write) {
        const index = draft.subscriptions.findIndex(
          (row) =>
            row.processorId === processorId &&
            row.externalSubscriptionId === write.externalSubscriptionId
        );
        const existing = draft.subscriptions[index];
        const row = { ...write, processorId, accountId, id: existing?.id ?? takeId() };
        if (existing === undefined) {
          draft.subscriptions.push(row);
        } else {
          draft.subscriptions[index] = row;
        }
        return row;
      },
      async getTransaction(externalTransactionId) {
        return (
          draft.transactions.find(
            (row) =>
              row.processorId === processorId && row.externalTransactionId === externalTransactionId
          ) ?? null
        );
      },
      async saveTransaction(write) {
        const index = draft.transactions.findIndex(
          (row) =>
            row.processorId === processorId &&
            row.externalTransactionId === write.externalTransactionId
        );
        const existing = draft.transactions[index];
        const row = { ...write, processorId, accountId, id: existing?.id ?? takeId() };
        if (existing === undefined) {
          draft.transactions.push(row);
        } else {
          draft.transactions[index] = row;
        }
        return row;
      },
      async listSubscriptionTransactions(subscriptionId) {
        return draft.transactions.filter((row) => row.subscriptionId === subscriptionId);
      },
      async listGrants() {
        return draft.grants.filter((grant) => grant.accountId === accountId);
      },
      async insertGrant(grant) {
        const row = { ...grant, id: takeId(), revokedAt: null, accountId };
        draft.grants.push(row);
        return row;
      },
      async setGrantEndsAt(grantId, endsAt) {
        draft.grants = draft.grants.map((grant) =>
          grant.id === grantId ? { ...grant, endsAt } : grant
        );
      },
      async revokeGrants(grantIds, revokedAt) {
        draft.grants = draft.grants.map((grant) =>
          grantIds.includes(grant.id) && grant.revokedAt === null ? { ...grant, revokedAt } : grant
        );
      },
      async findProcessorProduct(externalProductId, externalBasePlanId) {
        const mapping = products.find(
          (entry) =>
            entry.processorId === processorId &&
            entry.externalProductId === externalProductId &&
            entry.externalBasePlanId === externalBasePlanId
        );
        return mapping?.product ?? null;
      },
      async grantPremiumMembership() {
        if (!draft.premiumAccountIds.includes(accountId)) {
          draft.premiumAccountIds.push(accountId);
        }
      },
    };
  }
}

const ALICE = { id: 1, idText: 'alice-id-text', billingCustomerRef: 'ref-alice' };
const BOB = { id: 2, idText: 'bob-id-text', billingCustomerRef: 'ref-bob' };

const PRODUCTS: ProductMapping[] = [
  {
    processorId: 'test',
    externalProductId: 'monthly-one-time',
    externalBasePlanId: null,
    product: { id: 101, cadence: 'monthly', purchaseKind: 'one_time' },
  },
  {
    processorId: 'apple',
    externalProductId: 'apple-monthly',
    externalBasePlanId: null,
    product: { id: 201, cadence: 'monthly', purchaseKind: 'auto_renew' },
  },
];

function createHarness(options?: { isProduction?: boolean; allowedAccountIds?: string[] }) {
  const store = new InMemoryLedgerStore([ALICE, BOB], PRODUCTS);
  const processor = new BillingEventProcessor({
    store,
    sandboxPolicy: {
      isProduction: options?.isProduction ?? false,
      allowedAccountIds: new Set(options?.allowedAccountIds ?? []),
    },
    now: () => new Date('2026-01-15T00:00:00.000Z'),
  });
  return { store, processor };
}

function oneTimePayment(overrides: Partial<PaymentSettledEvent> = {}): PaymentSettledEvent {
  return {
    type: 'payment_settled',
    processor: 'test',
    processorEventId: 'evt-1',
    accountBillingCustomerRef: ALICE.billingCustomerRef,
    accountId: null,
    occurredAt: '2026-01-01T00:00:00.000Z',
    isSandbox: false,
    purchaseKind: 'one_time',
    externalTransactionId: 'txn-1',
    externalSubscriptionId: null,
    externalProductId: 'monthly-one-time',
    externalBasePlanId: null,
    periodStart: null,
    periodEnd: null,
    amount: { value: '3.00', currencyCode: 'USD' },
    ...overrides,
  };
}

describe('BillingEventProcessor', () => {
  it('applies a redelivered event once', async () => {
    const { store, processor } = createHarness();

    const first = await processor.ingestEvent(oneTimePayment());
    const second = await processor.ingestEvent(oneTimePayment());

    expect(first.status).toBe('processed');
    expect(second.status).toBe('duplicate');
    expect(store.grantsFor(ALICE.id)).toHaveLength(1);
    expect(store.state.premiumAccountIds).toEqual([ALICE.id]);
  });

  it('counts one payment once when it arrives under two event ids', async () => {
    const { store, processor } = createHarness();

    await processor.ingestEvent(oneTimePayment({ processorEventId: 'client-post' }));
    const webhook = await processor.ingestEvent(oneTimePayment({ processorEventId: 'webhook' }));

    expect(webhook.status).toBe('processed');
    expect(store.grantsFor(ALICE.id)).toHaveLength(1);
  });

  it('stacks a one-time purchase after the paid time the account already holds', async () => {
    const { store, processor } = createHarness();

    await processor.ingestEvent(oneTimePayment());
    const outcome = await processor.ingestEvent(
      oneTimePayment({
        processorEventId: 'evt-2',
        externalTransactionId: 'txn-2',
        occurredAt: '2026-01-10T00:00:00.000Z',
      })
    );

    const [first, second] = store.grantsFor(ALICE.id);
    expect(first?.endsAt.toISOString()).toBe('2026-02-01T00:00:00.000Z');
    expect(second?.startsAt.toISOString()).toBe('2026-02-01T00:00:00.000Z');
    expect(second?.endsAt.toISOString()).toBe('2026-03-01T00:00:00.000Z');
    expect(outcome.status === 'processed' && outcome.membershipExpiresAt?.toISOString()).toBe(
      '2026-03-01T00:00:00.000Z'
    );
  });

  it('stacks a one-time purchase after a free trial that is still running', async () => {
    const { store, processor } = createHarness();
    store.state.grants.push({
      id: store.state.nextId++,
      accountId: ALICE.id,
      source: 'trial',
      startsAt: new Date('2025-12-01T00:00:00.000Z'),
      endsAt: new Date('2026-02-01T00:00:00.000Z'),
      revokedAt: null,
      subscriptionId: null,
      transactionId: null,
    });

    const outcome = await processor.ingestEvent(
      oneTimePayment({ occurredAt: '2026-01-15T00:00:00.000Z' })
    );

    const purchase = store
      .grantsFor(ALICE.id)
      .find((grant) => grant.source === 'one_time_purchase');
    expect(purchase?.startsAt.toISOString()).toBe('2026-02-01T00:00:00.000Z');
    expect(purchase?.endsAt.toISOString()).toBe('2026-03-01T00:00:00.000Z');
    expect(outcome.status === 'processed' && outcome.membershipExpiresAt?.toISOString()).toBe(
      '2026-03-01T00:00:00.000Z'
    );
  });

  it('starts a one-time purchase at settlement when the account has already lapsed', async () => {
    const { store, processor } = createHarness();
    store.state.grants.push({
      id: store.state.nextId++,
      accountId: ALICE.id,
      source: 'trial',
      startsAt: new Date('2025-01-01T00:00:00.000Z'),
      endsAt: new Date('2025-02-01T00:00:00.000Z'),
      revokedAt: null,
      subscriptionId: null,
      transactionId: null,
    });

    const outcome = await processor.ingestEvent(oneTimePayment());

    const purchase = store
      .grantsFor(ALICE.id)
      .find((grant) => grant.source === 'one_time_purchase');
    expect(purchase?.startsAt.toISOString()).toBe('2026-01-01T00:00:00.000Z');
    expect(purchase?.endsAt.toISOString()).toBe('2026-02-01T00:00:00.000Z');
    expect(outcome.status === 'processed' && outcome.membershipExpiresAt?.toISOString()).toBe(
      '2026-02-01T00:00:00.000Z'
    );
  });

  it('prefers the account the processor echoed over one the caller supplies', async () => {
    const { store, processor } = createHarness();

    const outcome = await processor.ingestEvent(oneTimePayment({ accountId: BOB.id }));

    expect(outcome.status === 'processed' && outcome.accountId).toBe(ALICE.id);
    expect(store.grantsFor(BOB.id)).toHaveLength(0);
  });

  it('revokes the grant of a refunded payment', async () => {
    const { store, processor } = createHarness();

    await processor.ingestEvent(oneTimePayment());
    await processor.ingestEvent({
      type: 'refund_or_revoke',
      processor: 'test',
      processorEventId: 'evt-refund',
      accountBillingCustomerRef: null,
      accountId: null,
      occurredAt: '2026-01-05T00:00:00.000Z',
      isSandbox: false,
      externalTransactionId: 'txn-1',
      externalSubscriptionId: null,
      reason: 'refund',
      revokedAt: '2026-01-05T00:00:00.000Z',
    });

    expect(store.grantsFor(ALICE.id)[0]?.revokedAt?.toISOString()).toBe('2026-01-05T00:00:00.000Z');
    expect(store.state.transactions[0]?.revocationReason).toBe('refund');
  });

  it('ignores a status change older than the one already recorded', async () => {
    const { store, processor } = createHarness();
    const subscriptionBase = {
      processor: 'apple' as const,
      accountBillingCustomerRef: ALICE.billingCustomerRef,
      accountId: null,
      isSandbox: false,
      externalSubscriptionId: 'orig-1',
    };

    await processor.ingestEvent({
      ...subscriptionBase,
      type: 'subscription_renewed',
      processorEventId: 'renewed',
      occurredAt: '2026-01-10T00:00:00.000Z',
      externalTransactionId: 'apple-txn-2',
      externalProductId: 'apple-monthly',
      externalBasePlanId: null,
      periodStart: '2026-01-10T00:00:00.000Z',
      periodEnd: '2026-02-10T00:00:00.000Z',
      amount: null,
    });
    await processor.ingestEvent({
      ...subscriptionBase,
      type: 'subscription_renewal_failed',
      processorEventId: 'failed-late',
      occurredAt: '2026-01-09T00:00:00.000Z',
      periodEnd: '2026-01-10T00:00:00.000Z',
    });

    expect(store.state.subscriptions[0]?.status).toBe('active');
    expect(store.state.subscriptions[0]?.gracePeriodEndsAt).toBeNull();
  });

  it('banks paid time when a store subscription starts and returns it when it expires', async () => {
    const { store, processor } = createHarness();

    await processor.ingestEvent(oneTimePayment());
    await processor.ingestEvent({
      type: 'payment_settled',
      processor: 'apple',
      processorEventId: 'apple-start',
      accountBillingCustomerRef: ALICE.billingCustomerRef,
      accountId: null,
      occurredAt: '2026-01-11T00:00:00.000Z',
      isSandbox: false,
      purchaseKind: 'auto_renew',
      externalTransactionId: 'apple-txn-1',
      externalSubscriptionId: 'orig-1',
      externalProductId: 'apple-monthly',
      externalBasePlanId: null,
      periodStart: '2026-01-11T00:00:00.000Z',
      periodEnd: '2026-02-11T00:00:00.000Z',
      amount: null,
    });

    const oneTimeGrant = store.grantsFor(ALICE.id)[0];
    expect(oneTimeGrant?.endsAt.toISOString()).toBe('2026-01-11T00:00:00.000Z');
    expect(store.state.subscriptions[0]?.bankedSeconds).toBe(21 * 24 * 60 * 60);

    await processor.ingestEvent({
      type: 'subscription_expired',
      processor: 'apple',
      processorEventId: 'apple-expired',
      accountBillingCustomerRef: ALICE.billingCustomerRef,
      accountId: null,
      occurredAt: '2026-02-11T00:00:00.000Z',
      isSandbox: false,
      externalSubscriptionId: 'orig-1',
      expiredAt: '2026-02-11T00:00:00.000Z',
    });

    const released = store
      .grantsFor(ALICE.id)
      .find((grant) => grant.subscriptionId !== null && grant.transactionId === null);
    expect(released?.startsAt.toISOString()).toBe('2026-02-11T00:00:00.000Z');
    expect(released?.endsAt.toISOString()).toBe('2026-03-04T00:00:00.000Z');
    expect(store.state.subscriptions[0]?.bankedSeconds).toBe(0);
  });

  it('banks remaining free-trial time when a store subscription starts', async () => {
    const { store, processor } = createHarness();
    store.state.grants.push({
      id: store.state.nextId++,
      accountId: ALICE.id,
      source: 'trial',
      startsAt: new Date('2025-12-01T00:00:00.000Z'),
      endsAt: new Date('2026-02-01T00:00:00.000Z'),
      revokedAt: null,
      subscriptionId: null,
      transactionId: null,
    });

    await processor.ingestEvent({
      type: 'payment_settled',
      processor: 'apple',
      processorEventId: 'apple-start-during-trial',
      accountBillingCustomerRef: ALICE.billingCustomerRef,
      accountId: null,
      occurredAt: '2026-01-11T00:00:00.000Z',
      isSandbox: false,
      purchaseKind: 'auto_renew',
      externalTransactionId: 'apple-txn-trial',
      externalSubscriptionId: 'orig-trial',
      externalProductId: 'apple-monthly',
      externalBasePlanId: null,
      periodStart: '2026-01-11T00:00:00.000Z',
      periodEnd: '2026-02-11T00:00:00.000Z',
      amount: null,
    });

    const trialGrant = store.grantsFor(ALICE.id).find((grant) => grant.source === 'trial');
    expect(trialGrant?.endsAt.toISOString()).toBe('2026-01-11T00:00:00.000Z');
    expect(store.state.subscriptions[0]?.bankedSeconds).toBe(21 * 24 * 60 * 60);

    await processor.ingestEvent({
      type: 'subscription_expired',
      processor: 'apple',
      processorEventId: 'apple-trial-expired',
      accountBillingCustomerRef: ALICE.billingCustomerRef,
      accountId: null,
      occurredAt: '2026-02-11T00:00:00.000Z',
      isSandbox: false,
      externalSubscriptionId: 'orig-trial',
      expiredAt: '2026-02-11T00:00:00.000Z',
    });

    const released = store
      .grantsFor(ALICE.id)
      .find((grant) => grant.subscriptionId !== null && grant.transactionId === null);
    expect(released?.startsAt.toISOString()).toBe('2026-02-11T00:00:00.000Z');
    expect(released?.endsAt.toISOString()).toBe('2026-03-04T00:00:00.000Z');
  });

  it('keeps an event for a subscription it has not seen retryable', async () => {
    const { store, processor } = createHarness();
    const cancelled: NormalizedBillingEvent = {
      type: 'subscription_cancelled',
      processor: 'apple',
      processorEventId: 'cancel-early',
      accountBillingCustomerRef: ALICE.billingCustomerRef,
      accountId: null,
      occurredAt: '2026-01-12T00:00:00.000Z',
      isSandbox: false,
      externalSubscriptionId: 'orig-1',
      periodEnd: null,
    };

    const first = await processor.ingestEvent(cancelled);
    expect(first.status === 'failed' && first.errorCode).toBe('subscription_not_found');

    await processor.ingestEvent({
      type: 'subscription_activated',
      processor: 'apple',
      processorEventId: 'activated',
      accountBillingCustomerRef: ALICE.billingCustomerRef,
      accountId: null,
      occurredAt: '2026-01-11T00:00:00.000Z',
      isSandbox: false,
      externalSubscriptionId: 'orig-1',
      externalProductId: 'apple-monthly',
      externalBasePlanId: null,
      periodStart: '2026-01-11T00:00:00.000Z',
      periodEnd: '2026-02-11T00:00:00.000Z',
    });
    const retried = await processor.retryInboxEvent(first.inboxEventId);

    expect(retried.status).toBe('processed');
    expect(store.state.subscriptions[0]?.status).toBe('cancelled_active');
  });

  it('applies production sandbox purchases only for allowlisted accounts', async () => {
    const blocked = createHarness({ isProduction: true });
    const allowed = createHarness({ isProduction: true, allowedAccountIds: [ALICE.idText] });

    const blockedOutcome = await blocked.processor.ingestEvent(oneTimePayment({ isSandbox: true }));
    const allowedOutcome = await allowed.processor.ingestEvent(oneTimePayment({ isSandbox: true }));

    expect(blockedOutcome.status).toBe('ignored_sandbox');
    expect(blocked.store.grantsFor(ALICE.id)).toHaveLength(0);
    expect(allowedOutcome.status).toBe('processed');
    expect(allowed.store.grantsFor(ALICE.id)).toHaveLength(1);
  });
});
