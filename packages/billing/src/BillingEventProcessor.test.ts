import { describe, expect, it } from 'vitest';

import type {
  PaymentProcessorId,
  PaymentSettledEvent,
  RefundOrRevokeEvent,
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
  LedgerTransaction,
} from './ledgerStore.js';

interface LedgerState {
  nextId: number;
  transactions: (LedgerTransaction & { processorId: PaymentProcessorId })[];
  grants: (LedgerGrant & { accountId: number })[];
  premiumAccountIds: number[];
  cadenceByAccountId: { accountId: number; cadence: LedgerProcessorProduct['cadence'] }[];
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
    transactions: [],
    grants: [],
    premiumAccountIds: [],
    cadenceByAccountId: [],
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
      processError: null,
    };
    this.inbox.set(event.id, event);
    return { event, inserted: true };
  }

  async getInboxEvent(id: string) {
    return this.inbox.get(id) ?? null;
  }

  async markInboxProcessed(id: string, note?: string | null) {
    const event = this.inbox.get(id);
    if (event !== undefined) {
      this.inbox.set(id, { ...event, status: 'processed', processError: note ?? null });
    }
  }

  async markInboxFailed(id: string, processError: string) {
    const event = this.inbox.get(id);
    if (event !== undefined) {
      this.inbox.set(id, { ...event, status: 'failed', processError });
    }
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
      async listGrants() {
        return draft.grants.filter((grant) => grant.accountId === accountId);
      },
      async insertGrant(grant) {
        const row = { ...grant, id: takeId(), revokedAt: null, accountId };
        draft.grants.push(row);
        return row;
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
      async setBillingCadence(cadence) {
        const index = draft.cadenceByAccountId.findIndex((row) => row.accountId === accountId);
        if (index === -1) {
          draft.cadenceByAccountId.push({ accountId, cadence });
        } else {
          draft.cadenceByAccountId[index] = { accountId, cadence };
        }
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
    product: { id: 101, cadence: 'monthly' },
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
    externalTransactionId: 'txn-1',
    externalProductId: 'monthly-one-time',
    externalBasePlanId: null,
    periodStart: null,
    periodEnd: null,
    amount: { value: '3.00', currencyCode: 'USD' },
    ...overrides,
  };
}

function refund(overrides: Partial<RefundOrRevokeEvent> = {}): RefundOrRevokeEvent {
  return {
    type: 'refund_or_revoke',
    processor: 'test',
    processorEventId: 'evt-refund',
    accountBillingCustomerRef: ALICE.billingCustomerRef,
    accountId: null,
    occurredAt: '2026-01-15T00:00:00.000Z',
    isSandbox: false,
    externalTransactionId: 'txn-1',
    reason: 'refund',
    revokedAt: '2026-01-15T00:00:00.000Z',
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

  it('replaying the same payment under another event id adds no time', async () => {
    const { store, processor } = createHarness();

    await processor.ingestEvent(oneTimePayment({ processorEventId: 'client-post' }));
    const webhook = await processor.ingestEvent(oneTimePayment({ processorEventId: 'webhook' }));

    expect(webhook.status).toBe('processed');
    expect(store.grantsFor(ALICE.id)).toHaveLength(1);
    expect(store.grantsFor(ALICE.id)[0]?.endsAt.toISOString()).toBe('2026-02-01T00:00:00.000Z');
  });

  it('stacks a second purchase so its grant starts where the first ends', async () => {
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

  it('starts a purchase after an active trial or admin grant', async () => {
    const { store, processor } = createHarness();
    store.state.grants.push({
      id: store.state.nextId++,
      accountId: ALICE.id,
      source: 'admin',
      startsAt: new Date('2025-12-01T00:00:00.000Z'),
      endsAt: new Date('2026-02-01T00:00:00.000Z'),
      revokedAt: null,
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

  it('starts a lapsed purchase at settlement time', async () => {
    const { store, processor } = createHarness();
    store.state.grants.push({
      id: store.state.nextId++,
      accountId: ALICE.id,
      source: 'trial',
      startsAt: new Date('2025-01-01T00:00:00.000Z'),
      endsAt: new Date('2025-02-01T00:00:00.000Z'),
      revokedAt: null,
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

  it('refunding the first of two stacked purchases revokes only that grant', async () => {
    const { store, processor } = createHarness();

    await processor.ingestEvent(oneTimePayment());
    const stacked = await processor.ingestEvent(
      oneTimePayment({
        processorEventId: 'evt-2',
        externalTransactionId: 'txn-2',
        occurredAt: '2026-01-10T00:00:00.000Z',
      })
    );
    const outcome = await processor.ingestEvent(refund());

    const [first, second] = store.grantsFor(ALICE.id);
    expect(stacked.status === 'processed' && stacked.membershipExpiresAt?.toISOString()).toBe(
      '2026-03-01T00:00:00.000Z'
    );
    expect(first?.revokedAt?.toISOString()).toBe('2026-01-15T00:00:00.000Z');
    expect(second?.revokedAt).toBeNull();
    expect(second?.startsAt.toISOString()).toBe('2026-02-01T00:00:00.000Z');
    expect(second?.endsAt.toISOString()).toBe('2026-03-01T00:00:00.000Z');
    // The clock is 15 Jan: inside the revoked grant and before the next grant starts.
    expect(outcome.status === 'processed' && outcome.membershipExpiresAt).toBeNull();
  });

  it('records a refund for an unknown payment as processed', async () => {
    const { store, processor } = createHarness();

    const outcome = await processor.ingestEvent(
      refund({ externalTransactionId: 'missing', processorEventId: 'evt-missing' })
    );

    expect(outcome.status).toBe('processed');
    const inbox = [...store.inbox.values()][0];
    expect(inbox?.status).toBe('processed');
    expect(inbox?.processError).toContain('missing');
    expect(store.grantsFor(ALICE.id)).toHaveLength(0);
  });

  it('prefers the account the processor echoed over one the caller supplies', async () => {
    const { store, processor } = createHarness();

    const outcome = await processor.ingestEvent(oneTimePayment({ accountId: BOB.id }));

    expect(outcome.status === 'processed' && outcome.accountId).toBe(ALICE.id);
    expect(store.grantsFor(BOB.id)).toHaveLength(0);
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
