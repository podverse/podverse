import Joi from 'joi';

import { MAX_FREE_TRIAL_EXPIRATION, MIN_FREE_TRIAL_EXPIRATION } from '@podverse/helpers';

export const updateProductMembershipSettingsBodySchema = Joi.object({
  freeTrialExpirationSeconds: Joi.number()
    .integer()
    .min(MIN_FREE_TRIAL_EXPIRATION)
    .max(MAX_FREE_TRIAL_EXPIRATION)
    .optional(),
  maxAddByRSSFeeds: Joi.number().integer().min(0).optional(),
  trialMaxManualRefreshesPerHour: Joi.number().integer().min(0).optional(),
  premiumMaxManualRefreshesPerHour: Joi.number().integer().min(0).optional(),
})
  .or(
    'freeTrialExpirationSeconds',
    'maxAddByRSSFeeds',
    'trialMaxManualRefreshesPerHour',
    'premiumMaxManualRefreshesPerHour'
  )
  .required();
