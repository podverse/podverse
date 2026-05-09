import Joi from 'joi';

export type ExtensionPutBodyRequest = {
  enabled: boolean;
  config: Record<string, unknown>;
};

export const extensionPutBodySchema = Joi.object<ExtensionPutBodyRequest>({
  enabled: Joi.boolean().required(),
  config: Joi.object().required(),
}).required();
