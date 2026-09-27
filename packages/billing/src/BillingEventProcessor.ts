import type {
  BillingWebhookParseResult,
  NormalizedBillingEvent,
  NormalizedSubscriptionSnapshot,
  PaymentProcessorId,
} from '@podverse/helpers';

import { applyBillingEvent, applySubscriptionSnapshot } from './applyBillingEvent.js';
import type { BillingEventErrorCode } from './errors.js';
import { BillingEventError } from './errors.js';
import { isNormalizedBillingEvent } from './isNormalizedBillingEvent.js';
import type { BillingAccountIdentity, BillingLedgerStore } from './ledgerStore.js';
import type { BillingSandboxPolicy } from './sandboxPolicy.js';
import { isSandboxPurchaseAllowed } from './sandboxPolicy.js';

/** Schema version of inbox rows written from an event with no vendor payload behind it. */
export const NORMALIZED_BILLING_EVENT_SCHEMA_VERSION = 'normalized-v1';

export type BillingEventOutcome =
  | {
      status: 'processed';
      inboxEventId: string;
      accountId: number;
      membershipExpiresAt: Date | null;
    }
  /** The inbox already processed this processor event id. */
  | { status: 'duplicate'; inboxEventId: string }
  /** A sandbox purchase for an account outside the production allowlist. Recorded, not applied. */
  | { status: 'ignored_sandbox'; inboxEventId: string; accountId: number }
  /** The inbox row is marked failed and stays retryable. */
  | {
      status: 'failed';
      inboxEventId: string;
      errorCode: BillingEventErrorCode | 'unexpected';
      message: string;
    };

export type BillingSnapshotOutcome =
  | { status: 'applied'; accountId: number; membershipExpiresAt: Date | null }
  | { status: 'ignored_sandbox'; accountId: number };

export interface BillingEventSource {
  schemaVersion: string;
  rawPayload: Record<string, unknown> | null;
}

export interface BillingEventProcessorOptions {
  store: BillingLedgerStore;
  sandboxPolicy: BillingSandboxPolicy;
  now?: () => Date;
}

interface AccountLookup {
  processor: PaymentProcessorId;
  externalSubscriptionIds: string[];
  externalTransactionIds: string[];
  accountBillingCustomerRef: string | null;
  accountId: number | null;
}

function nonNull(values: (string | null)[]): string[] {
  return values.filter((value): value is string => value !== null);
}

function eventAccountLookup(event: NormalizedBillingEvent): AccountLookup {
  const base = {
    processor: event.processor,
    accountBillingCustomerRef: event.accountBillingCustomerRef,
    accountId: event.accountId,
  };
  switch (event.type) {
    case 'payment_settled':
      return {
        ...base,
        externalSubscriptionIds: nonNull([event.externalSubscriptionId]),
        externalTransactionIds: [event.externalTransactionId],
      };
    case 'subscription_renewed':
      return {
        ...base,
        externalSubscriptionIds: [event.externalSubscriptionId],
        externalTransactionIds: [event.externalTransactionId],
      };
    case 'refund_or_revoke':
      return {
        ...base,
        externalSubscriptionIds: nonNull([event.externalSubscriptionId]),
        externalTransactionIds: nonNull([event.externalTransactionId]),
      };
    case 'subscription_activated':
    case 'subscription_renewal_failed':
    case 'grace_entered':
    case 'grace_exited':
    case 'subscription_cancelled':
    case 'subscription_expired':
      return {
        ...base,
        externalSubscriptionIds: [event.externalSubscriptionId],
        externalTransactionIds: [],
      };
  }
}

function describeError(error: unknown): {
  errorCode: BillingEventErrorCode | 'unexpected';
  message: string;
} {
  if (error instanceof BillingEventError) {
    return { errorCode: error.code, message: error.message };
  }
  return {
    errorCode: 'unexpected',
    message: error instanceof Error ? error.message : String(error),
  };
}

/**
 * Turns normalized processor events into ledger writes. Every event lands in the webhook inbox
 * first, keyed by the processor's event id, so a redelivered notification is a no-op. Applying an
 * event locks the account, writes subscriptions, transactions, and grants, and recomputes the
 * entitlement cache in one transaction; a failure rolls that back, records `process_error` on
 * the inbox row, and leaves the row for a retry.
 */
export class BillingEventProcessor {
  private readonly store: BillingLedgerStore;
  private readonly sandboxPolicy: BillingSandboxPolicy;
  private readonly now: () => Date;

  constructor(options: BillingEventProcessorOptions) {
    this.store = options.store;
    this.sandboxPolicy = options.sandboxPolicy;
    this.now = options.now ?? (() => new Date());
  }

  /** Throws only when the inbox write itself fails; processing failures come back as outcomes. */
  async ingestEvent(
    event: NormalizedBillingEvent,
    source: BillingEventSource = {
      schemaVersion: NORMALIZED_BILLING_EVENT_SCHEMA_VERSION,
      rawPayload: null,
    }
  ): Promise<BillingEventOutcome> {
    const { event: inboxEvent, inserted } = await this.store.insertInboxEvent({
      processorId: event.processor,
      externalEventId: event.processorEventId,
      schemaVersion: source.schemaVersion,
      payload: { event, raw: source.rawPayload },
    });

    if (!inserted && inboxEvent.status === 'processed') {
      return { status: 'duplicate', inboxEventId: inboxEvent.id };
    }
    return this.processInboxEvent(inboxEvent.id, event);
  }

  /** Events from one notification are applied in order. */
  async ingestWebhook(parsed: BillingWebhookParseResult): Promise<BillingEventOutcome[]> {
    const outcomes: BillingEventOutcome[] = [];
    for (const event of parsed.events) {
      outcomes.push(
        await this.ingestEvent(event, {
          schemaVersion: parsed.schemaVersion,
          rawPayload: parsed.rawPayload,
        })
      );
    }
    return outcomes;
  }

  /** Re-applies a stored inbox event, as the reconciliation worker does for failed rows. */
  async retryInboxEvent(inboxEventId: string): Promise<BillingEventOutcome> {
    const inboxEvent = await this.store.getInboxEvent(inboxEventId);
    if (inboxEvent === null) {
      throw new Error(`Billing inbox event ${inboxEventId} not found`);
    }
    if (inboxEvent.status === 'processed') {
      return { status: 'duplicate', inboxEventId };
    }

    const event = inboxEvent.payload['event'];
    if (!isNormalizedBillingEvent(event)) {
      const message = 'Inbox payload does not hold a normalized billing event';
      await this.store.markInboxFailed(inboxEventId, message);
      return { status: 'failed', inboxEventId, errorCode: 'invalid_payload', message };
    }
    return this.processInboxEvent(inboxEventId, event);
  }

  /**
   * Applies the processor's current view of a subscription. Throws `BillingEventError` when the
   * subscription cannot be tied to an account; there is no inbox row to record that on.
   */
  async applySubscriptionSnapshot(
    snapshot: NormalizedSubscriptionSnapshot,
    options?: { accountId?: number }
  ): Promise<BillingSnapshotOutcome> {
    const account = await this.resolveAccount({
      processor: snapshot.processor,
      externalSubscriptionIds: [snapshot.externalSubscriptionId],
      externalTransactionIds: [],
      accountBillingCustomerRef: snapshot.accountBillingCustomerRef,
      accountId: options?.accountId ?? null,
    });
    if (snapshot.isSandbox && !isSandboxPurchaseAllowed(this.sandboxPolicy, account)) {
      return { status: 'ignored_sandbox', accountId: account.id };
    }

    const { membershipExpiresAt } = await this.store.withAccountLedger(
      snapshot.processor,
      account.id,
      this.now(),
      (unitOfWork) => applySubscriptionSnapshot(unitOfWork, snapshot)
    );
    return { status: 'applied', accountId: account.id, membershipExpiresAt };
  }

  private async processInboxEvent(
    inboxEventId: string,
    event: NormalizedBillingEvent
  ): Promise<BillingEventOutcome> {
    try {
      const account = await this.resolveAccount(eventAccountLookup(event));
      if (event.isSandbox && !isSandboxPurchaseAllowed(this.sandboxPolicy, account)) {
        await this.store.markInboxProcessed(inboxEventId);
        return { status: 'ignored_sandbox', inboxEventId, accountId: account.id };
      }

      const { membershipExpiresAt } = await this.store.withAccountLedger(
        event.processor,
        account.id,
        this.now(),
        (unitOfWork) => applyBillingEvent(unitOfWork, event)
      );
      await this.store.markInboxProcessed(inboxEventId);
      return { status: 'processed', inboxEventId, accountId: account.id, membershipExpiresAt };
    } catch (error) {
      const { errorCode, message } = describeError(error);
      await this.store.markInboxFailed(inboxEventId, message);
      return { status: 'failed', inboxEventId, errorCode, message };
    }
  }

  /**
   * A purchase already on record keeps its account. Otherwise the account the processor echoed
   * back (`billing_customer_ref`) wins over one the caller supplies, so a client cannot claim
   * another account's purchase by posting it.
   */
  private async resolveAccount(lookup: AccountLookup): Promise<BillingAccountIdentity> {
    for (const externalSubscriptionId of lookup.externalSubscriptionIds) {
      const ownerId = await this.store.findSubscriptionAccountId(
        lookup.processor,
        externalSubscriptionId
      );
      if (ownerId !== null) {
        return this.requireAccountById(ownerId);
      }
    }
    for (const externalTransactionId of lookup.externalTransactionIds) {
      const ownerId = await this.store.findTransactionAccountId(
        lookup.processor,
        externalTransactionId
      );
      if (ownerId !== null) {
        return this.requireAccountById(ownerId);
      }
    }

    if (lookup.accountBillingCustomerRef !== null) {
      const account = await this.store.getAccountByBillingCustomerRef(
        lookup.accountBillingCustomerRef
      );
      if (account !== null) {
        return account;
      }
    }
    if (lookup.accountId !== null) {
      return this.requireAccountById(lookup.accountId);
    }

    throw new BillingEventError(
      'account_unresolved',
      `No account matches this ${lookup.processor} purchase`
    );
  }

  private async requireAccountById(accountId: number): Promise<BillingAccountIdentity> {
    const account = await this.store.getAccountById(accountId);
    if (account === null) {
      throw new BillingEventError('account_unresolved', `Account ${accountId} not found`);
    }
    return account;
  }
}
