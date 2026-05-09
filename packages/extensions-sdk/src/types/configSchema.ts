import type Joi from 'joi';

export type ExtensionConfigFieldMeta = {
  secret: boolean;
  userEditable: boolean;
  /** next-intl message key; human strings live in apps/management-web/i18n only. */
  labelKey: string;
  helpKey?: string;
};

export type ExtensionConfigSchema = {
  joi: Joi.ObjectSchema;
  fields: Record<string, ExtensionConfigFieldMeta>;
};
