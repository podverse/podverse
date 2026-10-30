import type { ObjectSchema, StringSchema } from 'joi';
import Joi from 'joi';

import type { IndexProviderId } from '@podverse/helpers';
import { isIndexProviderId } from '@podverse/helpers';

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;
const MAX_QUERY = 255;

/**
 * Podcast Index feed ids are 1–15 digits and do not start with 0.
 * Each index provider adds its own case.
 */
const PODCAST_INDEX_PROVIDER_FEED_ID = /^[1-9]\d{0,14}$/;

export const REMOTE_STUB_LIST_SORTS = [
  'title',
  'provider_feed_id',
  'item_stub_count',
  'resolved_at',
  'created_at',
] as const;

export type RemoteStubListSort = (typeof REMOTE_STUB_LIST_SORTS)[number];

const SORT_VALUES = new Set<string>(REMOTE_STUB_LIST_SORTS);

export const REMOTE_STUB_LIST_ORDERS = ['asc', 'desc'] as const;

export type RemoteStubListOrder = (typeof REMOTE_STUB_LIST_ORDERS)[number];

const ORDER_VALUES = new Set<string>(REMOTE_STUB_LIST_ORDERS);

export const remoteStubListQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(MAX_LIMIT).default(DEFAULT_LIMIT),
  q: Joi.string().trim().max(MAX_QUERY).empty('').optional(),
  sort: Joi.string()
    .valid(...REMOTE_STUB_LIST_SORTS)
    .default('created_at'),
  order: Joi.string()
    .valid(...REMOTE_STUB_LIST_ORDERS)
    .default('desc'),
}).unknown(false);

export type RemoteStubListQueryValidated = {
  page: number;
  limit: number;
  q?: string;
  sort: RemoteStubListSort;
  order: RemoteStubListOrder;
};

export type RemoteStubRepointBodyValidated = {
  provider_feed_id: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isSort(value: string): value is RemoteStubListSort {
  return SORT_VALUES.has(value);
}

function isOrder(value: string): value is RemoteStubListOrder {
  return ORDER_VALUES.has(value);
}

function providerFeedIdMatches(indexProvider: IndexProviderId, providerFeedId: string): boolean {
  switch (indexProvider) {
    case 'podcast_index':
      return PODCAST_INDEX_PROVIDER_FEED_ID.test(providerFeedId);
    default: {
      const unrecognized: never = indexProvider;
      return unrecognized;
    }
  }
}

function providerFeedIdSchema(indexProvider: IndexProviderId): StringSchema {
  switch (indexProvider) {
    case 'podcast_index':
      return Joi.string().pattern(PODCAST_INDEX_PROVIDER_FEED_ID).required();
    default: {
      const unrecognized: never = indexProvider;
      return unrecognized;
    }
  }
}

export function remoteStubRepointBodySchemaFor(indexProvider: string): ObjectSchema {
  if (!isIndexProviderId(indexProvider)) {
    return Joi.object({
      provider_feed_id: Joi.string()
        .required()
        .custom(() => {
          throw new Error('Unsupported index provider');
        }),
    }).unknown(false);
  }
  return Joi.object({
    provider_feed_id: providerFeedIdSchema(indexProvider),
  }).unknown(false);
}

export function parseRemoteStubListQuery(value: unknown): RemoteStubListQueryValidated | null {
  if (!isRecord(value)) {
    return null;
  }
  const page = value.page;
  const limit = value.limit;
  const sort = value.sort;
  const order = value.order;
  if (typeof page !== 'number' || !Number.isInteger(page) || page < 1) {
    return null;
  }
  if (typeof limit !== 'number' || !Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) {
    return null;
  }
  if (typeof sort !== 'string' || !isSort(sort)) {
    return null;
  }
  if (typeof order !== 'string' || !isOrder(order)) {
    return null;
  }
  const parsed: RemoteStubListQueryValidated = { page, limit, sort, order };
  if (!('q' in value) || value.q === undefined) {
    return parsed;
  }
  if (typeof value.q !== 'string') {
    return null;
  }
  const q = value.q.trim();
  if (q.length === 0) {
    return parsed;
  }
  if (q.length > MAX_QUERY) {
    return null;
  }
  return { ...parsed, q };
}

export function parseRemoteStubRepointBody(
  value: unknown,
  indexProvider: string
): RemoteStubRepointBodyValidated | null {
  if (!isIndexProviderId(indexProvider) || !isRecord(value)) {
    return null;
  }
  const providerFeedId = value.provider_feed_id;
  if (typeof providerFeedId !== 'string' || !providerFeedIdMatches(indexProvider, providerFeedId)) {
    return null;
  }
  return { provider_feed_id: providerFeedId };
}
