import Joi from 'joi';

import {
  CATEGORY_MAPPING_KEYS,
  PLAYBACK_EVENT_KINDS,
  PLAYBACK_REPLAY_BATCH_LIMIT,
  QUERY_PARAMS_MEDIUMS,
  QUERY_PARAMS_PODCAST_INDEX_SEARCH_MEDIUMS,
} from '@podverse/helpers';
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

export const queuePlaybackWriteFieldsSchema = {
  last_played_at: Joi.string().isoDate().optional(),
  playback_event_kind: Joi.string()
    .valid(...PLAYBACK_EVENT_KINDS)
    .optional(),
};

const queuePlaybackReplayEventSchema = Joi.object({
  item_id_text: Joi.string().optional(),
  clip_id_text: Joi.string().optional(),
  item_soundbite_id_text: Joi.string().optional(),
  add_by_rss_hash_id: Joi.string().optional(),
  add_by_rss_resource_data: Joi.object().optional(),
  playback_event_kind: Joi.string()
    .valid(...PLAYBACK_EVENT_KINDS)
    .required(),
  last_played_at: Joi.string().isoDate().optional(),
  playback_position: Joi.number().min(0).optional(),
  media_file_duration: Joi.number().min(0).optional(),
  completed: Joi.boolean().optional(),
})
  .xor(
    'item_id_text',
    'clip_id_text',
    'item_soundbite_id_text',
    'add_by_rss_hash_id',
    'add_by_rss_resource_data'
  )
  .required();

export type QueuePlaybackReplayBodyEvent = {
  add_by_rss_hash_id?: string;
  add_by_rss_resource_data?: object;
  clip_id_text?: string;
  completed?: boolean;
  item_id_text?: string;
  item_soundbite_id_text?: string;
  last_played_at?: string;
  media_file_duration?: number;
  playback_event_kind: (typeof PLAYBACK_EVENT_KINDS)[number];
  playback_position?: number;
};

export const queuePlaybackReplayBodySchema = Joi.object({
  events: Joi.array()
    .items(queuePlaybackReplayEventSchema)
    .min(1)
    .max(PLAYBACK_REPLAY_BATCH_LIMIT)
    .required(),
}).required();

export const queueRemovalTombstoneBodySchema = Joi.object({
  last_played_at: Joi.string().isoDate().optional(),
}).default({});

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

export const podcastIndexSearchQuerySchema = {
  q: Joi.string().trim().min(1).required(),
  medium: Joi.string()
    .valid(...QUERY_PARAMS_PODCAST_INDEX_SEARCH_MEDIUMS)
    .default('all'),
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
