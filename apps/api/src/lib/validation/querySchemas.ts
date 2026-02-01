import Joi from 'joi';

import { CATEGORY_MAPPING_KEYS, QUERY_PARAMS_MEDIUMS } from '@podverse/helpers';
import { QUERY_PARAMS_STATS_RANGE_VALUES } from '@podverse/helpers-requests';

export const idOrIdTextParamSchema = {
  idOrIdText: Joi.string().required(),
};

export const playlistIdTextParamSchema = {
  playlist_id_text: Joi.string().required(),
};

export const queueIdTextParamSchema = {
  queue_id_text: Joi.string().required(),
};

export const channelIdTextParamSchema = {
  channel_id_text: Joi.string().required(),
};

export const itemIdTextParamSchema = {
  item_id_text: Joi.string().required(),
};

export const clipIdTextParamSchema = {
  clip_id_text: Joi.string().required(),
};

export const itemSoundbiteIdTextParamSchema = {
  item_soundbite_id_text: Joi.string().required(),
};

export const accountIdTextParamSchema = {
  account_id_text: Joi.string().required(),
};

export const pageQuerySchema = {
  page: Joi.number().integer().min(1).required(),
};

export const pageDefaultQuerySchema = {
  page: Joi.number().integer().min(1).default(1),
};

export const pageRangeQuerySchema = {
  page: Joi.number().integer().min(1).required(),
  range: Joi.string()
    .valid(...QUERY_PARAMS_STATS_RANGE_VALUES)
    .required(),
};

export const mediumPageQuerySchema = {
  medium: Joi.string()
    .valid(...QUERY_PARAMS_MEDIUMS)
    .required(),
  page: Joi.number().integer().min(1).required(),
};

export const mediumPageRangeQuerySchema = {
  medium: Joi.string()
    .valid(...QUERY_PARAMS_MEDIUMS)
    .required(),
  page: Joi.number().integer().min(1).required(),
  range: Joi.string()
    .valid(...QUERY_PARAMS_STATS_RANGE_VALUES)
    .required(),
};

export const mediumCategoryPageQuerySchema = {
  medium: Joi.string()
    .valid(...QUERY_PARAMS_MEDIUMS)
    .required(),
  category: Joi.string()
    .valid(...CATEGORY_MAPPING_KEYS)
    .required(),
  page: Joi.number().integer().min(1).required(),
};

export const mediumCategoryPageRangeQuerySchema = {
  medium: Joi.string()
    .valid(...QUERY_PARAMS_MEDIUMS)
    .required(),
  category: Joi.string()
    .valid(...CATEGORY_MAPPING_KEYS)
    .required(),
  page: Joi.number().integer().min(1).required(),
  range: Joi.string()
    .valid(...QUERY_PARAMS_STATS_RANGE_VALUES)
    .required(),
};

export const positionBetweenBodySchema = {
  position1: Joi.number().min(0).required(),
  position2: Joi.number().min(Joi.ref('position1')).required(),
};

export const localeBodySchema = {
  locale: Joi.string().required(),
};

export const tokenBodySchema = {
  token: Joi.string().required(),
};

export const emailBodySchema = {
  email: Joi.string().email().required(),
};
