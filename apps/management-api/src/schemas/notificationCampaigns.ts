import Joi from 'joi';

import {
  ADMIN_NOTIFICATION_AUDIENCE_TYPE_ALL_VALID_MEMBERSHIP,
  ADMIN_NOTIFICATION_CAMPAIGN_STATUS_VALUES,
  NOTIFICATION_CATEGORY_VALUES,
} from '@podverse/helpers';

export const listNotificationCampaignsQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(25),
  status: Joi.string()
    .valid(...ADMIN_NOTIFICATION_CAMPAIGN_STATUS_VALUES)
    .optional(),
  category: Joi.string()
    .valid(...NOTIFICATION_CATEGORY_VALUES)
    .optional(),
});

export const createNotificationCampaignSchema = Joi.object({
  title: Joi.string().trim().min(1).max(255).required(),
  body: Joi.string().trim().allow('', null).optional(),
  link_path: Joi.string().trim().allow('', null).optional(),
  category: Joi.string()
    .valid(...NOTIFICATION_CATEGORY_VALUES)
    .required(),
  audience: Joi.object({
    type: Joi.string().valid(ADMIN_NOTIFICATION_AUDIENCE_TYPE_ALL_VALID_MEMBERSHIP).required(),
  }).required(),
  send_push: Joi.boolean().default(false),
  send_at: Joi.string().isoDate().allow(null).optional(),
}).required();
