import Joi from 'joi';

const crudSchema = Joi.number().integer().min(0).max(15);

export const createManagementAdminRoleSchema = Joi.object({
  name: Joi.string().trim().min(1).max(50).required(),
  feeds_crud: crudSchema.required(),
  feed_takedown_reasons_crud: crudSchema.required(),
  admins_crud: crudSchema.required(),
  stats_crud: crudSchema.required(),
  billing_prices_crud: crudSchema.required(),
  bucket_crud: crudSchema.required(),
  embed_demo_crud: crudSchema.required(),
}).required();

export const updateManagementAdminRoleSchema = Joi.object({
  name: Joi.string().trim().min(1).max(50),
  feeds_crud: crudSchema,
  feed_takedown_reasons_crud: crudSchema,
  admins_crud: crudSchema,
  stats_crud: crudSchema,
  billing_prices_crud: crudSchema,
  bucket_crud: crudSchema,
  embed_demo_crud: crudSchema,
})
  .min(1)
  .required();
