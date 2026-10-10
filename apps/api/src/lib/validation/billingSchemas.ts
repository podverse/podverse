import Joi from 'joi';

import { BILLING_PLATFORMS, BILLING_REVOCATION_REASONS } from '@podverse/helpers';

const EXTERNAL_ID_MAX_LENGTH = 1024;

const externalId = Joi.string().trim().min(1).max(EXTERNAL_ID_MAX_LENGTH);
const httpUrl = Joi.string()
  .uri({ scheme: ['http', 'https'] })
  .max(2048);
const isoTimestamp = Joi.string().isoDate();
const nullableIsoTimestamp = isoTimestamp.allow(null);
const nullableExternalId = externalId.allow(null);
/** A StoreKit JWS runs a few kilobytes; only `APPLE_IAP_ENVIRONMENT=xcode` reads it. */
const SIGNED_TRANSACTION_MAX_LENGTH = 16384;
const signedTransaction = Joi.string()
  .trim()
  .max(SIGNED_TRANSACTION_MAX_LENGTH)
  .pattern(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*$/);

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

export const billingAppleTransactionBodySchema = Joi.object({
  transaction_id: externalId.required(),
  product_id: externalId.optional(),
  signed_transaction: signedTransaction.optional(),
});

export const billingGooglePurchaseBodySchema = Joi.object({
  purchase_token: externalId.required(),
  product_id: externalId.required(),
  /** Play order id. The purchase token stays in `purchase_token`. */
  order_id: externalId.required(),
});

export const BILLING_RESTORE_MAX_PURCHASES = 50;

export const billingRestoreBodySchema = Joi.object({
  processor: Joi.string().valid('apple', 'google_play').required(),
  purchases: Joi.array()
    .items(
      Joi.object({
        external_id: externalId.required(),
        external_product_id: nullableExternalId.optional(),
        /** Google Play order id when the client already has it. Apple ignores it. */
        external_transaction_id: nullableExternalId.optional(),
        signed_transaction: signedTransaction.allow(null).optional(),
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
    externalTransactionId: externalId.required(),
    periodStart: nullableIsoTimestamp.required(),
    periodEnd: nullableIsoTimestamp.required(),
    amount: billingAmountSchema.required(),
  }),
  Joi.object({
    ...simulationEnvelope,
    type: Joi.string().valid('refund_or_revoke').required(),
    externalTransactionId: externalId.required(),
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
