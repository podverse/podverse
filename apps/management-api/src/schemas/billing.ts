import Joi from 'joi';

import type { BillingCadence } from '@podverse/helpers';
import { PAYMENT_PROCESSOR_IDS } from '@podverse/helpers';

const processorId = Joi.string().valid(...PAYMENT_PROCESSOR_IDS);
const clientVersion = Joi.string()
  .trim()
  .pattern(/^\d+(\.\d+)*$/)
  .max(32);

const storefrontCode = Joi.string()
  .trim()
  .uppercase()
  .pattern(/^[A-Z]{2}$/);

export const updateBillingCheckoutChannelSchema = Joi.object({
  enabled: Joi.boolean(),
  min_client_version: clientVersion.allow(null),
  storefront_allowlist: Joi.array().items(storefrontCode).unique(),
})
  .min(1)
  .required();

export const createBillingProcessorProductSchema = Joi.object({
  processor_id: processorId.required(),
  external_product_id: Joi.string().trim().min(1).max(255).required(),
  external_base_plan_id: Joi.string().trim().min(1).max(255).allow(null),
  billing_cadence: Joi.string().valid('monthly', 'annual').required(),
}).required();

export const updateBillingProcessorProductSchema = Joi.object({
  is_active: Joi.boolean(),
  external_product_id: Joi.string().trim().min(1).max(255),
  external_base_plan_id: Joi.string().trim().min(1).max(255).allow(null),
})
  .min(1)
  .required();

export const listBillingWebhookEventsQuerySchema = Joi.object({
  status: Joi.string().valid('pending', 'processed', 'failed'),
  processor_id: processorId,
  account_id: Joi.number().integer().positive(),
  limit: Joi.number().integer().min(1).max(200),
});

export const BILLING_MEMBERSHIP_NOTE_MAX_LENGTH = 500;
export const BILLING_MEMBERSHIP_EXTEND_DAYS_MAX = 3660;

const membershipNote = Joi.string().trim().max(BILLING_MEMBERSHIP_NOTE_MAX_LENGTH).allow('');

export type GrantBillingMembershipBody = {
  cadence?: BillingCadence;
  days?: number;
  ends_at?: Date;
  note?: string;
};

/** Exactly one length: a plan cadence, a number of days, or an end date. */
export const grantBillingMembershipSchema = Joi.object<GrantBillingMembershipBody>({
  cadence: Joi.string().valid('monthly', 'annual'),
  days: Joi.number().integer().min(1).max(BILLING_MEMBERSHIP_EXTEND_DAYS_MAX),
  ends_at: Joi.date().iso(),
  note: membershipNote,
})
  .xor('cadence', 'days', 'ends_at')
  .required();

export type EndBillingMembershipBody = {
  ends_at: Date;
  note?: string;
};

export const endBillingMembershipSchema = Joi.object<EndBillingMembershipBody>({
  ends_at: Joi.date().iso().required(),
  note: membershipNote,
}).required();

export type RevokeBillingMembershipGrantBody = {
  note?: string;
};

export const revokeBillingMembershipGrantSchema = Joi.object<RevokeBillingMembershipGrantBody>({
  note: membershipNote,
});
