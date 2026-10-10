import type {
  BillingAmount,
  BillingCadence,
  BillingRevocationReason,
  MembershipGrantSource,
  PaymentProcessorId,
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
  /** Set on a failed row, and on a processed row that changed nothing. */
  processError: string | null;
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

export interface LedgerTransaction {
  id: number;
  accountId: number;
  externalTransactionId: string;
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
  transactionId: number | null;
}

export type LedgerGrantInsert = Omit<LedgerGrant, 'id' | 'revokedAt'>;

export interface LedgerProcessorProduct {
  id: number;
  cadence: BillingCadence;
}

/**
 * Reads and writes for one account and one processor, inside a transaction that holds the
 * account's lock. Transactions are addressed by the processor's external id.
 */
export interface BillingLedgerUnitOfWork {
  readonly accountId: number;
  readonly processorId: PaymentProcessorId;
  getTransaction(externalTransactionId: string): Promise<LedgerTransaction | null>;
  /** Creates or replaces the row with this external transaction id. */
  saveTransaction(write: LedgerTransactionWrite): Promise<LedgerTransaction>;
  /** Every grant on the account, whichever processor created it. */
  listGrants(): Promise<LedgerGrant[]>;
  insertGrant(grant: LedgerGrantInsert): Promise<LedgerGrant>;
  revokeGrants(grantIds: number[], revokedAt: Date): Promise<void>;
  findProcessorProduct(
    externalProductId: string,
    externalBasePlanId: string | null
  ): Promise<LedgerProcessorProduct | null>;
  /** Records the cadence of the purchase on the account's membership status. */
  setBillingCadence(cadence: BillingCadence): Promise<void>;
  /** Moves the account to Premium; a no-op when it already is. */
  grantPremiumMembership(): Promise<void>;
}

export interface BillingLedgerStore {
  insertInboxEvent(
    params: InsertBillingInboxEventParams
  ): Promise<{ event: BillingInboxEventRecord; inserted: boolean }>;
  getInboxEvent(id: string): Promise<BillingInboxEventRecord | null>;
  markInboxProcessed(id: string, note?: string | null): Promise<void>;
  markInboxFailed(id: string, processError: string): Promise<void>;
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
