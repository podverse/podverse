/**
 * HTTP contract for feeds (management-api).
 * Source: `.llm/plans/active/feed-status-table-replacement/05b-management-api-contract-lock.md`
 *
 * Additional operational fields (not listed in 05b prose but required by workflows):
 * - `lifecycle_reason_key` — maps to admin takedown reason catalog when lifecycle is takedown.
 */

import Joi from 'joi';

import {
  FEED_LIFECYCLE_REASON_KEY_MAX_LENGTH,
  FeedConditionTypeKeyEnum,
  FeedLifecycleStateKeyEnum,
} from '@podverse/orm';

export const FEED_OPERATIONS_REASON_NOTE_MAX = 10000;

export const FEED_OPERATIONS_LIFECYCLE_STATE_KEYS = Object.freeze(
  Object.values(FeedLifecycleStateKeyEnum)
);

export const FEED_OPERATIONS_CONDITION_TYPE_KEYS = Object.freeze(
  Object.values(FeedConditionTypeKeyEnum)
);

export const feedOperationsPolicyOverridesSchema = Joi.object({
  parse_allowed_override: Joi.boolean().allow(null),
  public_visible_override: Joi.boolean().allow(null),
  add_allowed_override: Joi.boolean().allow(null),
}).optional();

/**
 * PATCH `/feeds/:id/policy-state` body. The feed id lives in the path; the body
 * carries only the mutation fields.
 */
export const feedOperationsUpdatePolicyStateBodySchema = Joi.object({
  lifecycle_state_key: Joi.string()
    .valid(...FEED_OPERATIONS_LIFECYCLE_STATE_KEYS)
    .optional(),
  active_condition_keys: Joi.array()
    .items(Joi.string().valid(...FEED_OPERATIONS_CONDITION_TYPE_KEYS))
    .optional(),
  /** When transitioning to takedown, optional predefined reason key from options. */
  lifecycle_reason_key: Joi.string()
    .max(FEED_LIFECYCLE_REASON_KEY_MAX_LENGTH)
    .allow(null, '')
    .optional(),
  condition_note: Joi.string().max(FEED_OPERATIONS_REASON_NOTE_MAX).allow(null, '').optional(),
  transition_note: Joi.string().max(FEED_OPERATIONS_REASON_NOTE_MAX).allow(null, '').optional(),
  spam_item_limit_override: Joi.number().integer().positive().allow(null).optional(),
  max_response_body_bytes_override: Joi.number().integer().positive().allow(null).optional(),
  policy_overrides: feedOperationsPolicyOverridesSchema.allow(null),
  /**
   * When true, takedown lifecycle may omit `takedown_active` (temporary transitional mode).
   * When omitted/false, takedown requires `takedown_active` after the operation.
   */
  takedown_transitional: Joi.boolean().optional(),
})
  .required()
  .messages({
    'object.missing': 'Request body is required',
  })
  .custom((value, helpers) => {
    const hasMutation =
      value.lifecycle_state_key !== undefined ||
      value.active_condition_keys !== undefined ||
      (value.lifecycle_reason_key !== undefined &&
        value.lifecycle_reason_key !== null &&
        String(value.lifecycle_reason_key).trim() !== '') ||
      (value.condition_note !== undefined &&
        value.condition_note !== null &&
        String(value.condition_note).trim() !== '') ||
      (value.transition_note !== undefined &&
        value.transition_note !== null &&
        String(value.transition_note).trim() !== '') ||
      value.spam_item_limit_override !== undefined ||
      value.max_response_body_bytes_override !== undefined ||
      value.policy_overrides !== undefined ||
      value.takedown_transitional !== undefined;

    if (!hasMutation) {
      return helpers.error('any.custom', {
        message: 'At least one mutation field is required',
      });
    }
    return value;
  });
