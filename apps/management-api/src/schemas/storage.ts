import Joi from 'joi';

const objectKeySchema = Joi.string().min(1).max(2048).required();

export const storageBulkDeleteBodySchema = Joi.object({
  keys: Joi.array().items(objectKeySchema).min(1).max(1000).required(),
}).required();
