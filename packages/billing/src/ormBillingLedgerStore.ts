import type { PaymentProcessorId } from '@podverse/helpers';
import { AccountMembershipEnum } from '@podverse/helpers';
import type {
  BillingMembershipGrant,
  BillingProcessorProduct,
  BillingSubscription,
  BillingTransaction,
  BillingWebhookEvent,
  EntityManager,
} from '@podverse/orm';
import {
  AccountService,
  BillingEntitlementService,
  BillingMembershipGrantService,
  BillingProcessorProductService,
  BillingSubscriptionService,
  BillingTransactionService,
  BillingWebhookEventService,
} from '@podverse/orm';

import { BillingEventError } from './errors.js';
import type {
  BillingInboxEventRecord,
  BillingLedgerStore,
  BillingLedgerUnitOfWork,
  LedgerGrant,
  LedgerProcessorProduct,
  LedgerSubscription,
  LedgerTransaction,
} from './ledgerStore.js';

function toInboxEventRecord(row: BillingWebhookEvent): BillingInboxEventRecord {
  return {
    id: row.id,
    processorId: row.processor_id,
    schemaVersion: row.schema_version,
    payload: row.payload,
    status: row.status,
  };
}

function toLedgerSubscription(row: BillingSubscription): LedgerSubscription {
  return {
    id: row.id,
    accountId: row.account_id,
    externalSubscriptionId: row.external_subscription_id,
    processorProductId: row.billing_processor_product_id,
    status: row.status,
    purchaseKind: row.purchase_kind,
    currentPeriodStart: row.current_period_start,
    currentPeriodEnd: row.current_period_end,
    gracePeriodEndsAt: row.grace_period_ends_at,
    cancelAtPeriodEnd: row.cancel_at_period_end,
    bankedSeconds: row.banked_seconds,
    isSandbox: row.is_sandbox,
    rawStatusSnapshot: row.raw_status_snapshot,
  };
}

function toLedgerTransaction(row: BillingTransaction): LedgerTransaction {
  return {
    id: row.id,
    accountId: row.account_id,
    externalTransactionId: row.external_transaction_id,
    subscriptionId: row.billing_subscription_id,
    purchaseKind: row.purchase_kind,
    settledAt: row.settled_at,
    amount:
      row.amount === null || row.currency_code === null
        ? null
        : { value: row.amount, currencyCode: row.currency_code },
    revokedAt: row.revoked_at,
    revocationReason: row.revocation_reason,
    isSandbox: row.is_sandbox,
  };
}

function toLedgerGrant(row: BillingMembershipGrant): LedgerGrant {
  return {
    id: row.id,
    source: row.source,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    revokedAt: row.revoked_at,
    subscriptionId: row.billing_subscription_id,
    transactionId: row.billing_transaction_id,
  };
}

function toLedgerProcessorProduct(row: BillingProcessorProduct): LedgerProcessorProduct | null {
  if (!row.is_active) {
    return null;
  }
  return { id: row.id, cadence: row.billing_cadence, purchaseKind: row.purchase_kind };
}

function assertOwnedBy(row: { account_id: number } | null, accountId: number, label: string): void {
  if (row !== null && row.account_id !== accountId) {
    throw new BillingEventError('account_conflict', `${label} belongs to another account`);
  }
}

/** The production ledger store. Build it after the ORM context is set. */
export function createOrmBillingLedgerStore(): BillingLedgerStore {
  const accountService = new AccountService();
  const entitlementService = new BillingEntitlementService();
  const grantService = new BillingMembershipGrantService({
    billingEntitlementService: entitlementService,
  });
  const processorProductService = new BillingProcessorProductService();
  const subscriptionService = new BillingSubscriptionService();
  const transactionService = new BillingTransactionService();
  const webhookEventService = new BillingWebhookEventService();

  function createUnitOfWork(
    manager: EntityManager,
    processorId: PaymentProcessorId,
    accountId: number
  ): BillingLedgerUnitOfWork {
    return {
      accountId,
      processorId,
      paymentFailureGraceSeconds: entitlementService.getPaymentFailureGraceExpiration(),

      async getSubscription(externalSubscriptionId) {
        const row = await subscriptionService.getByExternalIdWithManager(
          manager,
          processorId,
          externalSubscriptionId
        );
        assertOwnedBy(row, accountId, `Subscription ${externalSubscriptionId}`);
        return row === null ? null : toLedgerSubscription(row);
      },

      async saveSubscription(write) {
        const existing = await subscriptionService.getByExternalIdWithManager(
          manager,
          processorId,
          write.externalSubscriptionId
        );
        assertOwnedBy(existing, accountId, `Subscription ${write.externalSubscriptionId}`);
        const row = await subscriptionService.upsertByExternalIdWithManager(manager, {
          accountId,
          processorId,
          externalSubscriptionId: write.externalSubscriptionId,
          status: write.status,
          purchaseKind: write.purchaseKind,
          billingProcessorProductId: write.processorProductId,
          currentPeriodStart: write.currentPeriodStart,
          currentPeriodEnd: write.currentPeriodEnd,
          gracePeriodEndsAt: write.gracePeriodEndsAt,
          cancelAtPeriodEnd: write.cancelAtPeriodEnd,
          bankedSeconds: write.bankedSeconds,
          isSandbox: write.isSandbox,
          rawStatusSnapshot: write.rawStatusSnapshot,
        });
        return toLedgerSubscription(row);
      },

      async getTransaction(externalTransactionId) {
        const row = await transactionService.getByExternalIdWithManager(
          manager,
          processorId,
          externalTransactionId
        );
        assertOwnedBy(row, accountId, `Transaction ${externalTransactionId}`);
        return row === null ? null : toLedgerTransaction(row);
      },

      async saveTransaction(write) {
        const existing = await transactionService.getByExternalIdWithManager(
          manager,
          processorId,
          write.externalTransactionId
        );
        assertOwnedBy(existing, accountId, `Transaction ${write.externalTransactionId}`);
        const row = await transactionService.upsertByExternalIdWithManager(manager, {
          accountId,
          processorId,
          externalTransactionId: write.externalTransactionId,
          purchaseKind: write.purchaseKind,
          settledAt: write.settledAt,
          billingSubscriptionId: write.subscriptionId,
          amount: write.amount?.value ?? null,
          currencyCode: write.amount?.currencyCode ?? null,
          revokedAt: write.revokedAt,
          revocationReason: write.revocationReason,
          isSandbox: write.isSandbox,
        });
        return toLedgerTransaction(row);
      },

      async listSubscriptionTransactions(subscriptionId) {
        const rows = await transactionService.listBySubscriptionIdWithManager(
          manager,
          subscriptionId
        );
        return rows.map(toLedgerTransaction);
      },

      async listGrants() {
        const rows = await grantService.listByAccountWithManager(manager, accountId);
        return rows.map(toLedgerGrant);
      },

      async insertGrant(grant) {
        const row = await grantService.insertWithManager(manager, {
          accountId,
          source: grant.source,
          startsAt: grant.startsAt,
          endsAt: grant.endsAt,
          billingSubscriptionId: grant.subscriptionId,
          billingTransactionId: grant.transactionId,
        });
        return toLedgerGrant(row);
      },

      async setGrantEndsAt(grantId, endsAt) {
        await grantService.updateEndsAtWithManager(manager, grantId, endsAt);
      },

      async revokeGrants(grantIds, revokedAt) {
        await grantService.revokeWithManager(manager, grantIds, revokedAt);
      },

      async findProcessorProduct(externalProductId, externalBasePlanId) {
        const row = await processorProductService.getByExternalIdsWithManager(
          manager,
          processorId,
          externalProductId,
          externalBasePlanId
        );
        return row === null ? null : toLedgerProcessorProduct(row);
      },

      async grantPremiumMembership() {
        await entitlementService.setAccountMembershipWithManager(
          manager,
          accountId,
          AccountMembershipEnum.Premium
        );
      },
    };
  }

  return {
    async insertInboxEvent(params) {
      const { event, inserted } = await webhookEventService.insertIfNew({
        processorId: params.processorId,
        externalEventId: params.externalEventId,
        schemaVersion: params.schemaVersion,
        payload: params.payload,
      });
      return { event: toInboxEventRecord(event), inserted };
    },

    async getInboxEvent(id) {
      const row = await webhookEventService.getById(id);
      return row === null ? null : toInboxEventRecord(row);
    },

    async markInboxProcessed(id) {
      await webhookEventService.markProcessed(id);
    },

    async markInboxFailed(id, processError) {
      await webhookEventService.markFailed(id, processError);
    },

    async findSubscriptionAccountId(processorId, externalSubscriptionId) {
      const row = await subscriptionService.getByExternalId(processorId, externalSubscriptionId);
      return row?.account_id ?? null;
    },

    async findTransactionAccountId(processorId, externalTransactionId) {
      const row = await transactionService.getByExternalId(processorId, externalTransactionId);
      return row?.account_id ?? null;
    },

    async getAccountByBillingCustomerRef(billingCustomerRef) {
      const account = await accountService.getBillingIdentityByCustomerRef(billingCustomerRef);
      return account === null ? null : { id: account.id, idText: account.id_text };
    },

    async getAccountById(accountId) {
      const account = await accountService.getBillingIdentityById(accountId);
      return account === null ? null : { id: account.id, idText: account.id_text };
    },

    async withAccountLedger(processorId, accountId, now, work) {
      const { result, entitlement } = await entitlementService.withAccountLock(
        accountId,
        (manager) => work(createUnitOfWork(manager, processorId, accountId)),
        now
      );
      return { result, membershipExpiresAt: entitlement.membershipExpiresAt };
    },
  };
}
