import Joi from 'joi';

export const MIN_FREE_TRIAL_EXPIRATION_SECONDS = 60;
export const MAX_FREE_TRIAL_EXPIRATION_SECONDS = 31536000;

export const updateProductMembershipTrialBodySchema = Joi.object({
  freeTrialExpirationSeconds: Joi.number()
    .integer()
    .min(MIN_FREE_TRIAL_EXPIRATION_SECONDS)
    .max(MAX_FREE_TRIAL_EXPIRATION_SECONDS)
    .required(),
}).required();
