import Joi from 'joi';

import { BILLING_PLATFORMS, BILLING_REVOCATION_REASONS, PURCHASE_KINDS } from '@podverse/helpers';

const EXTERNAL_ID_MAX_LENGTH = 1024;

const externalId = Joi.string().trim().min(1).max(EXTERNAL_ID_MAX_LENGTH);
const httpUrl = Joi.string()
  .uri({ scheme: ['http', 'https'] })
  .max(2048);
const isoTimestamp = Joi.string().isoDate();
const nullableIsoTimestamp = isoTimestamp.allow(null);
const nullableExternalId = externalId.allow(null);

export const billingCheckoutOptionsQuerySchema = Joi.object({
  platform: Joi.string()
    .valid(...BILLING_PLATFORMS)
    .default('web'),
  storefront: Joi.string()
    .trim()
    .pattern(/^[A-Za-z]{2}$/)
    .optional(),
});

export const billingPayPalCheckoutBodySchema = Joi.object({
  processor_product_id: Joi.number().integer().positive().required(),
  return_url: httpUrl.optional(),
  cancel_url: httpUrl.optional(),
});

export const billingPayPalOrderParamsSchema = Joi.object({
  id: externalId.required(),
});

export const billingSubscriptionParamsSchema = Joi.object({
  id: Joi.number().integer().positive().required(),
});

export const billingAppleTransactionBodySchema = Joi.object({
  transaction_id: externalId.required(),
  product_id: externalId.optional(),
});

export const billingGooglePurchaseBodySchema = Joi.object({
  purchase_token: externalId.required(),
  product_id: externalId.required(),
  purchase_kind: Joi.string()
    .valid(...PURCHASE_KINDS)
    .required(),
});

export const BILLING_RESTORE_MAX_PURCHASES = 50;

export const billingRestoreBodySchema = Joi.object({
  processor: Joi.string().valid('apple', 'google_play').required(),
  purchases: Joi.array()
    .items(
      Joi.object({
        external_id: externalId.required(),
        external_product_id: nullableExternalId.optional(),
        purchase_kind: Joi.string()
          .valid(...PURCHASE_KINDS)
          .required(),
      })
    )
    .min(1)
    .max(BILLING_RESTORE_MAX_PURCHASES)
    .required(),
});

const billingAmountSchema = Joi.object({
  value: Joi.string()
    .pattern(/^\d+(\.\d+)?$/)
    .required(),
  currencyCode: Joi.string()
    .pattern(/^[A-Z]{3}$/)
    .required(),
}).allow(null);

/**
 * Fields the test processor or the route fills in are optional: the route always sets the
 * account to the signed-in one, and the adapter defaults the event id, time, and sandbox flag.
 */
const simulationEnvelope = {
  processorEventId: externalId.optional(),
  occurredAt: isoTimestamp.optional(),
  isSandbox: Joi.boolean().optional(),
  accountBillingCustomerRef: Joi.any().strip(),
  accountId: Joi.any().strip(),
};

const productRefs = {
  externalProductId: nullableExternalId.required(),
  externalBasePlanId: nullableExternalId.required(),
};

const simulationSchemas = [
  Joi.object({
    ...simulationEnvelope,
    ...productRefs,
    type: Joi.string().valid('payment_settled').required(),
    purchaseKind: Joi.string()
      .valid(...PURCHASE_KINDS)
      .required(),
    externalTransactionId: externalId.required(),
    externalSubscriptionId: nullableExternalId.required(),
    periodStart: nullableIsoTimestamp.required(),
    periodEnd: nullableIsoTimestamp.required(),
    amount: billingAmountSchema.required(),
  }),
  Joi.object({
    ...simulationEnvelope,
    ...productRefs,
    type: Joi.string().valid('subscription_activated').required(),
    externalSubscriptionId: externalId.required(),
    periodStart: nullableIsoTimestamp.required(),
    periodEnd: nullableIsoTimestamp.required(),
  }),
  Joi.object({
    ...simulationEnvelope,
    ...productRefs,
    type: Joi.string().valid('subscription_renewed').required(),
    externalSubscriptionId: externalId.required(),
    externalTransactionId: externalId.required(),
    periodStart: isoTimestamp.required(),
    periodEnd: isoTimestamp.required(),
    amount: billingAmountSchema.required(),
  }),
  Joi.object({
    ...simulationEnvelope,
    type: Joi.string().valid('subscription_renewal_failed', 'subscription_cancelled').required(),
    externalSubscriptionId: externalId.required(),
    periodEnd: nullableIsoTimestamp.required(),
  }),
  Joi.object({
    ...simulationEnvelope,
    type: Joi.string().valid('grace_entered').required(),
    externalSubscriptionId: externalId.required(),
    periodEnd: nullableIsoTimestamp.required(),
    processorGracePeriodEndsAt: nullableIsoTimestamp.required(),
  }),
  Joi.object({
    ...simulationEnvelope,
    type: Joi.string().valid('grace_exited').required(),
    externalSubscriptionId: externalId.required(),
    outcome: Joi.string().valid('recovered', 'lapsed').required(),
  }),
  Joi.object({
    ...simulationEnvelope,
    type: Joi.string().valid('subscription_expired').required(),
    externalSubscriptionId: externalId.required(),
    expiredAt: nullableIsoTimestamp.required(),
  }),
  Joi.object({
    ...simulationEnvelope,
    type: Joi.string().valid('refund_or_revoke').required(),
    externalTransactionId: nullableExternalId.required(),
    externalSubscriptionId: Joi.when('externalTransactionId', {
      is: null,
      then: externalId.required(),
      otherwise: nullableExternalId.required(),
    }),
    reason: Joi.string()
      .valid(...BILLING_REVOCATION_REASONS)
      .required(),
    revokedAt: isoTimestamp.required(),
  }),
];

export const billingSimulateBodySchema = Joi.object({
  event: Joi.alternatives()
    .try(...simulationSchemas)
    .required(),
});
