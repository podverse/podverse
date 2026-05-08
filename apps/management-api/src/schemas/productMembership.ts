import Joi from 'joi';

export const MIN_FREE_TRIAL_EXPIRATION_SECONDS = 60;
export const MAX_FREE_TRIAL_EXPIRATION_SECONDS = 31536000;

export const updateProductMembershipSettingsBodySchema = Joi.object({
  freeTrialExpirationSeconds: Joi.number()
    .integer()
    .min(MIN_FREE_TRIAL_EXPIRATION_SECONDS)
    .max(MAX_FREE_TRIAL_EXPIRATION_SECONDS)
    .optional(),
  trialMaxAddByRSSFeeds: Joi.number().integer().min(0).optional(),
  trialMaxManualRefreshesPerHour: Joi.number().integer().min(0).optional(),
  premiumMaxAddByRSSFeeds: Joi.number().integer().min(0).optional(),
  premiumMaxManualRefreshesPerHour: Joi.number().integer().min(0).optional(),
})
  .or(
    'freeTrialExpirationSeconds',
    'trialMaxAddByRSSFeeds',
    'trialMaxManualRefreshesPerHour',
    'premiumMaxAddByRSSFeeds',
    'premiumMaxManualRefreshesPerHour'
  )
  .required();
