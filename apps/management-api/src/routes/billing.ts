import { randomUUID } from 'node:crypto';

import { config } from '@management-api/config/index.js';
import { ensureAuthenticated } from '@management-api/lib/auth/index.js';
import { requireCrud } from '@management-api/lib/authz/requireCrud.js';
import { getManagementBillingContext } from '@management-api/lib/billing/billingContext.js';
import { AuditLogService } from '@management-api/lib/database/auditLog.js';
import { getAuditRequestId } from '@management-api/lib/getAuditRequestId.js';
import { getParam } from '@management-api/lib/params.js';
import { AppDbDataSourceRead, AppDbDataSourceReadWrite } from '@management-api/orm/db/appDb.js';
import {
  createBillingProcessorProductSchema,
  endBillingMembershipSchema,
  grantBillingMembershipSchema,
  listBillingWebhookEventsQuerySchema,
  revokeBillingMembershipGrantSchema,
  updateBillingCheckoutChannelSchema,
  updateBillingProcessorProductSchema,
} from '@management-api/schemas/billing.js';
import type { Request, Response } from 'express';
import express from 'express';

import type { BillingEventOutcome, BillingSnapshotOutcome } from '@podverse/billing';
import type { PaymentProcessorId } from '@podverse/helpers';
import {
  AccountMembershipEnum,
  BillingProcessorRecordNotFoundError,
  isAdminEditableGrant,
  isPaymentProcessorId,
  PAYMENT_PROCESSOR_IDS,
} from '@podverse/helpers';
import type {
  BillingCheckoutChannel,
  BillingMembershipGrant,
  BillingProcessorProduct,
  BillingSubscription,
  BillingTransaction,
  BillingWebhookEvent,
} from '@podverse/orm';
import {
  AccountService,
  BillingCheckoutChannelService,
  BillingMembershipExtensionService,
  BillingMembershipGrantService,
  BillingProcessorProductService,
  BillingSubscriptionService,
  BillingTransactionService,
  BillingWebhookEventService,
  MembershipGrantNotFoundError,
  ProtectedMembershipAccessError,
} from '@podverse/orm';

const ACCOUNT_LIST_LIMIT = 100;
const WEBHOOK_EVENT_DEFAULT_LIMIT = 100;

function isDeploymentProcessorId(
  processorId: PaymentProcessorId
): processorId is 'paypal' | 'apple' | 'google_play' {
  return processorId !== 'test';
}

const DEPLOYMENT_PROCESSOR_IDS = PAYMENT_PROCESSOR_IDS.filter(isDeploymentProcessorId);

type BillingProcessorStatusRow = {
  processor_id: 'paypal' | 'apple' | 'google_play';
  enabled: boolean;
};

const router = express.Router();
const auditLog = new AuditLogService();

const appDb = {
  dataSourceRead: AppDbDataSourceRead,
  dataSourceReadWrite: AppDbDataSourceReadWrite,
};

const checkoutChannelService = new BillingCheckoutChannelService(appDb);
const processorProductService = new BillingProcessorProductService(appDb);
const subscriptionService = new BillingSubscriptionService(appDb);
const transactionService = new BillingTransactionService(appDb);
const grantService = new BillingMembershipGrantService(appDb);
const webhookEventService = new BillingWebhookEventService(appDb);
const membershipExtensionService = new BillingMembershipExtensionService(appDb);

let accountService: AccountService | undefined;

function getAccountService(): AccountService {
  accountService ??= new AccountService();
  return accountService;
}

function parsePositiveInt(raw: string | undefined): number | null {
  if (raw === undefined || !/^\d+$/.test(raw)) {
    return null;
  }
  const parsed = Number(raw);
  return parsed > 0 ? parsed : null;
}

function checkoutChannelToJson(channel: BillingCheckoutChannel) {
  return {
    id: channel.id,
    processor_id: channel.processor_id,
    platform: channel.platform,
    storefront_allowlist: channel.storefront_allowlist,
    enabled: channel.enabled,
    min_client_version: channel.min_client_version,
    updated_at: channel.updated_at.toISOString(),
  };
}

function processorProductToJson(product: BillingProcessorProduct) {
  return {
    id: product.id,
    processor_id: product.processor_id,
    external_product_id: product.external_product_id,
    external_base_plan_id: product.external_base_plan_id,
    billing_product_id: product.billing_product_id,
    billing_cadence: product.billing_cadence,
    purchase_kind: product.purchase_kind,
    is_active: product.is_active,
    updated_at: product.updated_at.toISOString(),
  };
}

function subscriptionToJson(subscription: BillingSubscription) {
  return {
    id: subscription.id,
    processor_id: subscription.processor_id,
    external_subscription_id: subscription.external_subscription_id,
    external_product_id: subscription.billing_processor_product?.external_product_id ?? null,
    status: subscription.status,
    purchase_kind: subscription.purchase_kind,
    current_period_start: subscription.current_period_start?.toISOString() ?? null,
    current_period_end: subscription.current_period_end?.toISOString() ?? null,
    grace_period_ends_at: subscription.grace_period_ends_at?.toISOString() ?? null,
    cancel_at_period_end: subscription.cancel_at_period_end,
    banked_seconds: subscription.banked_seconds,
    is_sandbox: subscription.is_sandbox,
  };
}

function transactionToJson(transaction: BillingTransaction) {
  return {
    id: transaction.id,
    processor_id: transaction.processor_id,
    external_transaction_id: transaction.external_transaction_id,
    billing_subscription_id: transaction.billing_subscription_id,
    purchase_kind: transaction.purchase_kind,
    amount: transaction.amount,
    currency_code: transaction.currency_code,
    settled_at: transaction.settled_at.toISOString(),
    revoked_at: transaction.revoked_at?.toISOString() ?? null,
    revocation_reason: transaction.revocation_reason,
    is_sandbox: transaction.is_sandbox,
  };
}

function grantToJson(grant: BillingMembershipGrant) {
  return {
    id: grant.id,
    source: grant.source,
    starts_at: grant.starts_at.toISOString(),
    ends_at: grant.ends_at.toISOString(),
    revoked_at: grant.revoked_at?.toISOString() ?? null,
    billing_subscription_id: grant.billing_subscription_id,
    billing_transaction_id: grant.billing_transaction_id,
    admin_editable: isAdminEditableGrant(grant),
  };
}

function webhookEventToJson(event: BillingWebhookEvent) {
  return {
    id: event.id,
    processor_id: event.processor_id,
    external_event_id: event.external_event_id,
    schema_version: event.schema_version,
    status: event.status,
    attempts: event.attempts,
    received_at: event.received_at.toISOString(),
    processed_at: event.processed_at?.toISOString() ?? null,
    process_error: event.process_error,
  };
}

function snapshotOutcomeToJson(outcome: BillingSnapshotOutcome) {
  return outcome.status === 'applied'
    ? {
        status: outcome.status,
        account_id: outcome.accountId,
        membership_expires_at: outcome.membershipExpiresAt?.toISOString() ?? null,
      }
    : { status: outcome.status, account_id: outcome.accountId };
}

function eventOutcomeToJson(outcome: BillingEventOutcome) {
  switch (outcome.status) {
    case 'processed':
      return {
        status: outcome.status,
        inbox_event_id: outcome.inboxEventId,
        account_id: outcome.accountId,
        membership_expires_at: outcome.membershipExpiresAt?.toISOString() ?? null,
      };
    case 'duplicate':
      return { status: outcome.status, inbox_event_id: outcome.inboxEventId };
    case 'ignored_sandbox':
      return {
        status: outcome.status,
        inbox_event_id: outcome.inboxEventId,
        account_id: outcome.accountId,
      };
    case 'failed':
      return {
        status: outcome.status,
        inbox_event_id: outcome.inboxEventId,
        error_code: outcome.errorCode,
        message: outcome.message,
      };
  }
}

router.get(
  '/checkout-channels',
  ensureAuthenticated,
  requireCrud('billing_channels', 'read'),
  async (_req, res, next) => {
    try {
      const channels = await checkoutChannelService.listAll();
      res.json({ data: channels.map(checkoutChannelToJson) });
    } catch (error) {
      next(error);
    }
  }
);

router.patch(
  '/checkout-channels/:id',
  ensureAuthenticated,
  requireCrud('billing_channels', 'update'),
  async (req, res, next) => {
    try {
      const id = parsePositiveInt(getParam(req, 'id'));
      if (id === null) {
        res.status(400).json({ message: 'Invalid channel id' });
        return;
      }
      const { error, value } = updateBillingCheckoutChannelSchema.validate(req.body);
      if (error) {
        res.status(400).json({ message: error.message });
        return;
      }

      const updated = await checkoutChannelService.updateById(id, {
        ...(value.enabled !== undefined ? { enabled: value.enabled } : {}),
        ...(value.min_client_version !== undefined
          ? { minClientVersion: value.min_client_version }
          : {}),
        ...(value.storefront_allowlist !== undefined
          ? { storefrontAllowlist: value.storefront_allowlist }
          : {}),
      });
      if (updated === null) {
        res.status(404).json({ message: 'Checkout channel not found' });
        return;
      }
      await recordAudit(req, 'update', 'billing_checkout_channel', id, value);
      res.json({ data: checkoutChannelToJson(updated) });
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/processors',
  ensureAuthenticated,
  requireCrud('billing_channels', 'read'),
  async (_req, res, next) => {
    try {
      const { registry } = getManagementBillingContext();
      const data: BillingProcessorStatusRow[] = DEPLOYMENT_PROCESSOR_IDS.map((processorId) => ({
        processor_id: processorId,
        enabled: registry.has(processorId),
      }));
      res.json({ data });
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/processor-products',
  ensureAuthenticated,
  requireCrud('billing_processor_products', 'read'),
  async (_req, res, next) => {
    try {
      const products = await processorProductService.listAll();
      res.json({ data: products.map(processorProductToJson) });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/processor-products',
  ensureAuthenticated,
  requireCrud('billing_processor_products', 'create'),
  async (req, res, next) => {
    try {
      const { error, value } = createBillingProcessorProductSchema.validate(req.body);
      if (error) {
        res.status(400).json({ message: error.message });
        return;
      }
      const existing = await processorProductService.getByExternalIds(
        value.processor_id,
        value.external_product_id,
        value.external_base_plan_id ?? null
      );
      if (existing !== null) {
        res.status(409).json({ message: 'A processor product with these ids already exists' });
        return;
      }
      const { processorProduct } = await processorProductService.upsertPremiumProcessorProduct({
        processorId: value.processor_id,
        externalProductId: value.external_product_id,
        externalBasePlanId: value.external_base_plan_id ?? null,
        cadence: value.billing_cadence,
        purchaseKind: value.purchase_kind,
      });
      await recordAudit(req, 'create', 'billing_processor_product', processorProduct.id, value);
      res.status(201).json({ data: processorProductToJson(processorProduct) });
    } catch (error) {
      next(error);
    }
  }
);

router.patch(
  '/processor-products/:id',
  ensureAuthenticated,
  requireCrud('billing_processor_products', 'update'),
  async (req, res, next) => {
    try {
      const id = parsePositiveInt(getParam(req, 'id'));
      if (id === null) {
        res.status(400).json({ message: 'Invalid processor product id' });
        return;
      }
      const { error, value } = updateBillingProcessorProductSchema.validate(req.body);
      if (error) {
        res.status(400).json({ message: error.message });
        return;
      }
      const updated = await processorProductService.updateById(id, {
        ...(value.is_active !== undefined ? { isActive: value.is_active } : {}),
        ...(value.external_product_id !== undefined
          ? { externalProductId: value.external_product_id }
          : {}),
        ...(value.external_base_plan_id !== undefined
          ? { externalBasePlanId: value.external_base_plan_id }
          : {}),
      });
      if (updated === null) {
        res.status(404).json({ message: 'Processor product not found' });
        return;
      }
      await recordAudit(req, 'update', 'billing_processor_product', id, value);
      res.json({ data: processorProductToJson(updated) });
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/accounts/:accountId',
  ensureAuthenticated,
  requireCrud('billing_account', 'read'),
  async (req, res, next) => {
    try {
      const accountId = parsePositiveInt(getParam(req, 'accountId'));
      if (accountId === null) {
        res.status(400).json({ message: 'Invalid account id' });
        return;
      }
      const account = await getAccountService().getBillingIdentityById(accountId);
      if (account === null) {
        res.status(404).json({ message: 'Account not found' });
        return;
      }
      const [subscriptions, transactions, grants, webhookEvents, accountWithStatus] =
        await Promise.all([
          subscriptionService.listForAccount(accountId),
          transactionService.listForAccount(accountId, ACCOUNT_LIST_LIMIT),
          grantService.listForAccount(accountId),
          webhookEventService.listForAdmin({ accountId, limit: ACCOUNT_LIST_LIMIT }),
          getAccountService().getWithMembershipStatusFromPrimary(accountId),
        ]);
      res.json({
        data: {
          account_id: account.id,
          membership_expires_at:
            accountWithStatus?.account_membership_status?.membership_expires_at?.toISOString() ??
            null,
          subscriptions: subscriptions.map(subscriptionToJson),
          transactions: transactions.map(transactionToJson),
          grants: grants.map(grantToJson),
          webhook_events: webhookEvents.map(webhookEventToJson),
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/accounts/:accountId/resync',
  ensureAuthenticated,
  requireCrud('billing_account', 'update'),
  async (req, res, next) => {
    try {
      const accountId = parsePositiveInt(getParam(req, 'accountId'));
      if (accountId === null) {
        res.status(400).json({ message: 'Invalid account id' });
        return;
      }
      const account = await getAccountService().getBillingIdentityById(accountId);
      if (account === null) {
        res.status(404).json({ message: 'Account not found' });
        return;
      }

      const { registry, processor } = getManagementBillingContext();
      const subscriptions = await subscriptionService.listForAccount(accountId);
      const subscriptionResults = [];
      for (const subscription of subscriptions) {
        if (!isPaymentProcessorId(subscription.processor_id)) {
          subscriptionResults.push({
            subscription_id: subscription.id,
            processor_id: subscription.processor_id,
            status: 'skipped' as const,
            reason: 'unknown_processor' as const,
          });
          continue;
        }
        const adapter = registry.get(subscription.processor_id);
        if (adapter === null) {
          subscriptionResults.push({
            subscription_id: subscription.id,
            processor_id: subscription.processor_id,
            status: 'skipped' as const,
            reason: 'processor_not_configured' as const,
          });
          continue;
        }
        try {
          const snapshot = await adapter.fetchSubscription({
            externalId: subscription.external_subscription_id,
            externalProductId: subscription.billing_processor_product?.external_product_id ?? null,
          });
          const outcome = await processor.applySubscriptionSnapshot(snapshot, { accountId });
          subscriptionResults.push({
            subscription_id: subscription.id,
            processor_id: subscription.processor_id,
            ...snapshotOutcomeToJson(outcome),
          });
        } catch (error) {
          subscriptionResults.push({
            subscription_id: subscription.id,
            processor_id: subscription.processor_id,
            status: 'failed' as const,
            reason:
              error instanceof BillingProcessorRecordNotFoundError
                ? ('not_found' as const)
                : ('processor_error' as const),
          });
        }
      }

      const failedEvents = await webhookEventService.listForAdmin({
        accountId,
        status: 'failed',
        limit: ACCOUNT_LIST_LIMIT,
      });
      const inboxResults = [];
      for (const event of failedEvents) {
        inboxResults.push(eventOutcomeToJson(await processor.retryInboxEvent(event.id)));
      }

      const accountWithStatus =
        await getAccountService().getWithMembershipStatusFromPrimary(accountId);
      await recordAudit(req, 'update', 'billing_account_resync', accountId, {
        subscriptions: subscriptionResults.length,
        inbox_events: inboxResults.length,
      });
      res.json({
        data: {
          account_id: accountId,
          membership_expires_at:
            accountWithStatus?.account_membership_status?.membership_expires_at?.toISOString() ??
            null,
          subscriptions: subscriptionResults,
          inbox_events: inboxResults,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/accounts/:accountId/grants',
  ensureAuthenticated,
  requireCrud('billing_account', 'create'),
  async (req, res, next) => {
    try {
      const accountId = parsePositiveInt(getParam(req, 'accountId'));
      if (accountId === null) {
        res.status(400).json({ message: 'Invalid account id' });
        return;
      }
      const { error, value } = grantBillingMembershipSchema.validate(req.body);
      if (error) {
        res.status(400).json({ message: error.message });
        return;
      }
      const account = await getAccountService().getBillingIdentityById(accountId);
      if (account === null) {
        res.status(404).json({ message: 'Account not found' });
        return;
      }

      const now = new Date();
      const membershipExpiresAtBefore = await getCachedMembershipExpiresAt(accountId);
      const endsAt = value.ends_at;
      if (endsAt !== undefined && !isLaterThanCurrentAccess(endsAt, membershipExpiresAtBefore, now)) {
        res.status(422).json({ message: 'Use End Access to shorten a membership.' });
        return;
      }

      const extensionParams = {
        accountId,
        idempotencyKey: `management_grant:${accountId}:${randomUUID()}`,
        source: 'admin' as const,
        accountMembershipId: AccountMembershipEnum.Premium,
        now,
      };
      let mode: 'cadence' | 'days' | 'ends_at';
      let modeValue: string | number;
      let result: { applied: boolean; membershipExpiresAt: Date | null };
      if (value.cadence !== undefined) {
        mode = 'cadence';
        modeValue = value.cadence;
        result = await membershipExtensionService.extendByCadence({
          ...extensionParams,
          cadence: value.cadence,
        });
      } else if (value.days !== undefined) {
        mode = 'days';
        modeValue = value.days;
        result = await membershipExtensionService.extendByDays({
          ...extensionParams,
          days: value.days,
        });
      } else if (endsAt !== undefined) {
        mode = 'ends_at';
        modeValue = endsAt.toISOString();
        result = await membershipExtensionService.extendToDate({
          ...extensionParams,
          expiresAt: endsAt,
        });
        if (!result.applied) {
          res.status(422).json({ message: 'Use End Access to shorten a membership.' });
          return;
        }
      } else {
        res.status(400).json({ message: 'One of cadence, days, or ends_at is required' });
        return;
      }

      await recordAudit(req, 'create', 'billing_membership_grant', accountId, {
        mode,
        value: modeValue,
        note: normalizeNote(value.note),
        applied: result.applied,
        membership_expires_at_before: membershipExpiresAtBefore?.toISOString() ?? null,
        membership_expires_at_after: result.membershipExpiresAt?.toISOString() ?? null,
      });
      res.status(201).json({
        data: {
          account_id: accountId,
          applied: result.applied,
          membership_expires_at: result.membershipExpiresAt?.toISOString() ?? null,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/accounts/:accountId/membership-end',
  ensureAuthenticated,
  requireCrud('billing_account', 'delete'),
  async (req, res, next) => {
    try {
      const accountId = parsePositiveInt(getParam(req, 'accountId'));
      if (accountId === null) {
        res.status(400).json({ message: 'Invalid account id' });
        return;
      }
      const { error, value } = endBillingMembershipSchema.validate(req.body);
      if (error) {
        res.status(400).json({ message: error.message });
        return;
      }
      const account = await getAccountService().getBillingIdentityById(accountId);
      if (account === null) {
        res.status(404).json({ message: 'Account not found' });
        return;
      }

      const membershipExpiresAtBefore = await getCachedMembershipExpiresAt(accountId);
      if (isLaterThanCurrentAccess(value.ends_at, membershipExpiresAtBefore, new Date())) {
        res.status(422).json({ message: 'Use Extend to lengthen a membership.' });
        return;
      }

      let membershipExpiresAtAfter: Date | null;
      try {
        const result = await membershipExtensionService.endAccess({
          accountId,
          endsAt: value.ends_at,
        });
        membershipExpiresAtAfter = result.membershipExpiresAt;
      } catch (endError) {
        if (endError instanceof ProtectedMembershipAccessError) {
          sendProtectedMembershipAccess(res, endError);
          return;
        }
        throw endError;
      }

      await recordAudit(req, 'update', 'billing_membership_end', accountId, {
        ends_at: value.ends_at.toISOString(),
        note: normalizeNote(value.note),
        membership_expires_at_before: membershipExpiresAtBefore?.toISOString() ?? null,
        membership_expires_at_after: membershipExpiresAtAfter?.toISOString() ?? null,
      });
      res.json({
        data: {
          account_id: accountId,
          membership_expires_at: membershipExpiresAtAfter?.toISOString() ?? null,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/accounts/:accountId/grants/:grantId/revoke',
  ensureAuthenticated,
  requireCrud('billing_account', 'delete'),
  async (req, res, next) => {
    try {
      const accountId = parsePositiveInt(getParam(req, 'accountId'));
      if (accountId === null) {
        res.status(400).json({ message: 'Invalid account id' });
        return;
      }
      const grantId = parsePositiveInt(getParam(req, 'grantId'));
      if (grantId === null) {
        res.status(400).json({ message: 'Invalid grant id' });
        return;
      }
      const { error, value } = revokeBillingMembershipGrantSchema.validate(req.body);
      if (error) {
        res.status(400).json({ message: error.message });
        return;
      }
      const account = await getAccountService().getBillingIdentityById(accountId);
      if (account === null) {
        res.status(404).json({ message: 'Account not found' });
        return;
      }

      const membershipExpiresAtBefore = await getCachedMembershipExpiresAt(accountId);
      let membershipExpiresAtAfter: Date | null;
      try {
        const result = await membershipExtensionService.revokeGrant({ accountId, grantId });
        membershipExpiresAtAfter = result.membershipExpiresAt;
      } catch (revokeError) {
        if (revokeError instanceof MembershipGrantNotFoundError) {
          res.status(404).json({ message: 'Membership grant not found' });
          return;
        }
        if (revokeError instanceof ProtectedMembershipAccessError) {
          sendProtectedMembershipAccess(res, revokeError);
          return;
        }
        throw revokeError;
      }

      await recordAudit(req, 'delete', 'billing_membership_grant', grantId, {
        account_id: accountId,
        note: normalizeNote(value?.note),
        membership_expires_at_before: membershipExpiresAtBefore?.toISOString() ?? null,
        membership_expires_at_after: membershipExpiresAtAfter?.toISOString() ?? null,
      });
      res.json({
        data: {
          account_id: accountId,
          membership_expires_at: membershipExpiresAtAfter?.toISOString() ?? null,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/webhook-events',
  ensureAuthenticated,
  requireCrud('billing_webhook_events', 'read'),
  async (req, res, next) => {
    try {
      const { error, value } = listBillingWebhookEventsQuerySchema.validate(req.query);
      if (error) {
        res.status(400).json({ message: error.message });
        return;
      }
      const events = await webhookEventService.listForAdmin({
        ...(value.status !== undefined ? { status: value.status } : {}),
        ...(value.processor_id !== undefined ? { processorId: value.processor_id } : {}),
        ...(value.account_id !== undefined ? { accountId: value.account_id } : {}),
        limit: value.limit ?? WEBHOOK_EVENT_DEFAULT_LIMIT,
      });
      res.json({ data: events.map(webhookEventToJson) });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/webhook-events/:id/replay',
  ensureAuthenticated,
  requireCrud('billing_webhook_events', 'update'),
  async (req, res, next) => {
    try {
      const id = getParam(req, 'id');
      if (id === undefined || !/^\d+$/.test(id)) {
        res.status(400).json({ message: 'Invalid webhook event id' });
        return;
      }
      const event = await webhookEventService.getById(id);
      if (event === null) {
        res.status(404).json({ message: 'Webhook event not found' });
        return;
      }
      const { processor } = getManagementBillingContext();
      const outcome = await processor.retryInboxEvent(id);
      await recordAudit(req, 'update', 'billing_webhook_event', 0, {
        webhook_event_id: id,
        status: outcome.status,
      });
      res.json({ data: eventOutcomeToJson(outcome) });
    } catch (error) {
      next(error);
    }
  }
);

async function getCachedMembershipExpiresAt(accountId: number): Promise<Date | null> {
  const accountWithStatus = await getAccountService().getWithMembershipStatusFromPrimary(accountId);
  return accountWithStatus?.account_membership_status?.membership_expires_at ?? null;
}

/**
 * Current access ends at the later of now and the cached expiry. Extending has to reach past it;
 * ending access has to land on or before it.
 */
function isLaterThanCurrentAccess(
  endsAt: Date,
  membershipExpiresAt: Date | null,
  now: Date
): boolean {
  const currentAccessEnd =
    membershipExpiresAt !== null && membershipExpiresAt > now ? membershipExpiresAt : now;
  return endsAt > currentAccessEnd;
}

function normalizeNote(note: string | undefined): string | null {
  return note === undefined || note === '' ? null : note;
}

function sendProtectedMembershipAccess(res: Response, error: ProtectedMembershipAccessError): void {
  res.status(409).json({
    message: error.message,
    access_ends_at: error.accessEndsAt?.toISOString() ?? null,
  });
}

async function recordAudit(
  req: Request,
  operation: 'create' | 'update' | 'delete',
  tableName: string,
  rowId: number,
  afterSnapshot: Record<string, unknown>
): Promise<void> {
  const adminId = req.user?.id;
  if (adminId === undefined) {
    return;
  }
  await auditLog.record({
    adminAccountId: adminId,
    operation,
    tableName,
    rowId,
    requestId: getAuditRequestId(req),
    afterSnapshot,
  });
}

const billingRoot = express.Router();
billingRoot.use(`${config.api.prefix}${config.api.version}/billing`, router);
export const billingRouter = billingRoot;
