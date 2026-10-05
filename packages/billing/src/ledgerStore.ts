import type {
  BillingAmount,
  BillingCadence,
  BillingRevocationReason,
  BillingSubscriptionStatus,
  MembershipGrantSource,
  PaymentProcessorId,
  PurchaseKind,
} from '@podverse/helpers';

/**
 * The storage the event processor needs, kept apart from TypeORM so the ledger rules can be
 * exercised against an in-memory store. `createOrmBillingLedgerStore` is the production store.
 */

export type BillingInboxStatus = 'pending' | 'processed' | 'failed';

export interface BillingInboxEventRecord {
  id: string;
  processorId: string;
  schemaVersion: string;
  payload: Record<string, unknown>;
  status: BillingInboxStatus;
}

export interface InsertBillingInboxEventParams {
  processorId: PaymentProcessorId;
  externalEventId: string;
  schemaVersion: string;
  payload: Record<string, unknown>;
}

export interface BillingAccountIdentity {
  id: number;
  idText: string;
}

export interface LedgerSubscription {
  id: number;
  accountId: number;
  externalSubscriptionId: string;
  processorProductId: number | null;
  status: BillingSubscriptionStatus;
  purchaseKind: PurchaseKind;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  gracePeriodEndsAt: Date | null;
  cancelAtPeriodEnd: boolean;
  bankedSeconds: number;
  isSandbox: boolean;
  rawStatusSnapshot: Record<string, unknown> | null;
}

/** The full row state. Saving replaces every field, so start from the stored row when updating. */
export type LedgerSubscriptionWrite = Omit<LedgerSubscription, 'id' | 'accountId'>;

export interface LedgerTransaction {
  id: number;
  accountId: number;
  externalTransactionId: string;
  subscriptionId: number | null;
  purchaseKind: PurchaseKind;
  settledAt: Date;
  amount: BillingAmount | null;
  revokedAt: Date | null;
  revocationReason: BillingRevocationReason | null;
  isSandbox: boolean;
}

export type LedgerTransactionWrite = Omit<LedgerTransaction, 'id' | 'accountId'>;

export interface LedgerGrant {
  id: number;
  source: MembershipGrantSource;
  startsAt: Date;
  endsAt: Date;
  revokedAt: Date | null;
  subscriptionId: number | null;
  transactionId: number | null;
}

export type LedgerGrantInsert = Omit<LedgerGrant, 'id' | 'revokedAt'>;

export interface LedgerProcessorProduct {
  id: number;
  cadence: BillingCadence;
  purchaseKind: PurchaseKind;
}

/**
 * Reads and writes for one account and one processor, inside a transaction that holds the
 * account's lock. Subscriptions and transactions are addressed by the processor's external id.
 */
export interface BillingLedgerUnitOfWork {
  readonly accountId: number;
  readonly processorId: PaymentProcessorId;
  /** `BILLING_PAYMENT_FAILURE_GRACE_EXPIRATION`, in seconds. */
  readonly paymentFailureGraceSeconds: number;
  getSubscription(externalSubscriptionId: string): Promise<LedgerSubscription | null>;
  /** Creates or replaces the row with this external subscription id. */
  saveSubscription(write: LedgerSubscriptionWrite): Promise<LedgerSubscription>;
  getTransaction(externalTransactionId: string): Promise<LedgerTransaction | null>;
  /** Creates or replaces the row with this external transaction id. */
  saveTransaction(write: LedgerTransactionWrite): Promise<LedgerTransaction>;
  listSubscriptionTransactions(subscriptionId: number): Promise<LedgerTransaction[]>;
  /** Every grant on the account, whichever processor created it. */
  listGrants(): Promise<LedgerGrant[]>;
  insertGrant(grant: LedgerGrantInsert): Promise<LedgerGrant>;
  setGrantEndsAt(grantId: number, endsAt: Date): Promise<void>;
  revokeGrants(grantIds: number[], revokedAt: Date): Promise<void>;
  findProcessorProduct(
    externalProductId: string,
    externalBasePlanId: string | null
  ): Promise<LedgerProcessorProduct | null>;
  /** Moves the account to Premium; a no-op when it already is. */
  grantPremiumMembership(): Promise<void>;
}

export interface BillingLedgerStore {
  insertInboxEvent(
    params: InsertBillingInboxEventParams
  ): Promise<{ event: BillingInboxEventRecord; inserted: boolean }>;
  getInboxEvent(id: string): Promise<BillingInboxEventRecord | null>;
  markInboxProcessed(id: string): Promise<void>;
  markInboxFailed(id: string, processError: string): Promise<void>;
  findSubscriptionAccountId(
    processorId: PaymentProcessorId,
    externalSubscriptionId: string
  ): Promise<number | null>;
  findTransactionAccountId(
    processorId: PaymentProcessorId,
    externalTransactionId: string
  ): Promise<number | null>;
  getAccountByBillingCustomerRef(
    billingCustomerRef: string
  ): Promise<BillingAccountIdentity | null>;
  getAccountById(accountId: number): Promise<BillingAccountIdentity | null>;
  /**
   * Runs `work` under the account lock and recomputes the entitlement cache before committing. A
   * throw rolls back every write `work` made.
   */
  withAccountLedger<T>(
    processorId: PaymentProcessorId,
    accountId: number,
    now: Date,
    work: (unitOfWork: BillingLedgerUnitOfWork) => Promise<T>
  ): Promise<{ result: T; membershipExpiresAt: Date | null }>;
}
