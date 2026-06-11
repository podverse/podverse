import Joi from 'joi';

export const upsertEmbedDemoShowcaseBodySchema = Joi.object({
  resourceIdText: Joi.string().trim().min(1).max(15).required(),
}).required();
