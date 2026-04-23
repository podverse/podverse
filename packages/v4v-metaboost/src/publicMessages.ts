import { getOwnPropertyValue, isObjectLike } from '@podverse/helpers';

import { normalizeMetaboostMbrssV1IngestNodeUrl } from './mbrssV1IngestUrl.js';
import { normalizeMetaboostMbV1IngestNodeUrl } from './mbV1IngestUrl.js';

export type PublicSourceBucketSummary = {
  id: string;
  shortId: string;
  name: string;
  type: string;
};

export type PublicSourceBucketContext = {
  bucket: PublicSourceBucketSummary;
  parentBucket: PublicSourceBucketSummary | null;
};

export type PublicBreadcrumbContext = {
  level: 'channel' | 'item';
  podcastGuid: string | null;
  podcastLabel: string | null;
  itemGuid: string | null;
  itemLabel: string | null;
  isSubBucket: boolean;
};

export type PublicBoostMessage = {
  id: string;
  messageGuid: string;
  currency: string;
  amount: string;
  amountUnit: string | null;
  appName: string;
  senderName: string | null;
  body: string | null;
  createdAt: string;
  sourceBucketContext: PublicSourceBucketContext | null;
  breadcrumbContext: PublicBreadcrumbContext | null;
};

export type PublicBoostMessagesPage = {
  messages: PublicBoostMessage[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type PublicMessagesPageQuery = {
  page?: number;
  limit?: number;
};

export type MbrssV1PublicMessagesScope =
  | { type: 'bucket' }
  | { type: 'channel'; podcastGuid: string }
  | { type: 'item'; itemGuid: string };

const assertString = (value: unknown, fieldName: string): string => {
  if (typeof value !== 'string') {
    throw new Error(`${fieldName} must be a string`);
  }
  return value;
};

const assertNullableString = (value: unknown, fieldName: string): string | null => {
  if (value === null) {
    return null;
  }
  if (typeof value !== 'string') {
    throw new Error(`${fieldName} must be a string or null`);
  }
  return value;
};

const assertNumber = (value: unknown, fieldName: string): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`${fieldName} must be a finite number`);
  }
  return value;
};

const parseSourceBucketSummary = (
  data: unknown,
  fieldName: string
): PublicSourceBucketSummary | null => {
  if (data === null || data === undefined) {
    return null;
  }
  if (!isObjectLike(data)) {
    throw new Error(`${fieldName} must be an object`);
  }
  return {
    id: assertString(getOwnPropertyValue(data, 'id'), `${fieldName}.id`),
    shortId: assertString(getOwnPropertyValue(data, 'shortId'), `${fieldName}.shortId`),
    name: assertString(getOwnPropertyValue(data, 'name'), `${fieldName}.name`),
    type: assertString(getOwnPropertyValue(data, 'type'), `${fieldName}.type`),
  };
};

const parseSourceBucketContext = (data: unknown): PublicSourceBucketContext | null => {
  if (data === null || data === undefined) {
    return null;
  }
  if (!isObjectLike(data)) {
    throw new Error('sourceBucketContext must be an object');
  }
  const bucket = parseSourceBucketSummary(
    getOwnPropertyValue(data, 'bucket'),
    'sourceBucketContext.bucket'
  );
  if (bucket === null) {
    throw new Error('sourceBucketContext.bucket is required');
  }
  const parentBucket = parseSourceBucketSummary(
    getOwnPropertyValue(data, 'parentBucket'),
    'sourceBucketContext.parentBucket'
  );
  return {
    bucket,
    parentBucket,
  };
};

const parseBreadcrumbContext = (data: unknown): PublicBreadcrumbContext | null => {
  if (data === null || data === undefined) {
    return null;
  }
  if (!isObjectLike(data)) {
    throw new Error('breadcrumbContext must be an object');
  }
  const level = getOwnPropertyValue(data, 'level');
  if (level !== 'channel' && level !== 'item') {
    throw new Error('breadcrumbContext.level must be channel or item');
  }
  const isSubBucket = getOwnPropertyValue(data, 'isSubBucket');
  if (typeof isSubBucket !== 'boolean') {
    throw new Error('breadcrumbContext.isSubBucket must be a boolean');
  }

  return {
    level,
    podcastGuid: assertNullableString(getOwnPropertyValue(data, 'podcastGuid'), 'podcastGuid'),
    podcastLabel: assertNullableString(getOwnPropertyValue(data, 'podcastLabel'), 'podcastLabel'),
    itemGuid: assertNullableString(getOwnPropertyValue(data, 'itemGuid'), 'itemGuid'),
    itemLabel: assertNullableString(getOwnPropertyValue(data, 'itemLabel'), 'itemLabel'),
    isSubBucket,
  };
};

const parsePublicBoostMessage = (data: unknown): PublicBoostMessage => {
  if (!isObjectLike(data)) {
    throw new Error('message must be an object');
  }
  return {
    id: assertString(getOwnPropertyValue(data, 'id'), 'id'),
    messageGuid: assertString(getOwnPropertyValue(data, 'messageGuid'), 'messageGuid'),
    currency: assertString(getOwnPropertyValue(data, 'currency'), 'currency'),
    amount: assertString(getOwnPropertyValue(data, 'amount'), 'amount'),
    amountUnit: assertNullableString(getOwnPropertyValue(data, 'amountUnit'), 'amountUnit'),
    appName: assertString(getOwnPropertyValue(data, 'appName'), 'appName'),
    senderName: assertNullableString(getOwnPropertyValue(data, 'senderName'), 'senderName'),
    body: assertNullableString(getOwnPropertyValue(data, 'body'), 'body'),
    createdAt: assertString(getOwnPropertyValue(data, 'createdAt'), 'createdAt'),
    sourceBucketContext: parseSourceBucketContext(getOwnPropertyValue(data, 'sourceBucketContext')),
    breadcrumbContext: parseBreadcrumbContext(getOwnPropertyValue(data, 'breadcrumbContext')),
  };
};

const parsePublicBoostMessagesPage = (data: unknown): PublicBoostMessagesPage => {
  if (!isObjectLike(data)) {
    throw new Error('public messages response must be an object');
  }
  const rawMessages = getOwnPropertyValue(data, 'messages');
  if (!Array.isArray(rawMessages)) {
    throw new Error('messages must be an array');
  }
  return {
    messages: rawMessages.map((message) => parsePublicBoostMessage(message)),
    page: assertNumber(getOwnPropertyValue(data, 'page'), 'page'),
    limit: assertNumber(getOwnPropertyValue(data, 'limit'), 'limit'),
    total: assertNumber(getOwnPropertyValue(data, 'total'), 'total'),
    totalPages: assertNumber(getOwnPropertyValue(data, 'totalPages'), 'totalPages'),
  };
};

const appendPaginationQuery = (url: URL, query?: PublicMessagesPageQuery): URL => {
  if (query?.page !== undefined) {
    url.searchParams.set('page', String(query.page));
  }
  if (query?.limit !== undefined) {
    url.searchParams.set('limit', String(query.limit));
  }
  return url;
};

const extractBucketShortIdFromBoostPath = (pathname: string, expectedPrefix: string): string => {
  const normalizedPath = pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
  const prefixWithSlash = `${expectedPrefix}/`;
  if (!normalizedPath.includes(prefixWithSlash)) {
    throw new Error(`MetaBoost node URL must include ${prefixWithSlash}`);
  }
  const [, suffix = ''] = normalizedPath.split(prefixWithSlash);
  const bucketShortId = suffix.split('/')[0];
  if (bucketShortId === undefined || bucketShortId === '') {
    throw new Error('MetaBoost node URL is missing bucket short id');
  }
  return bucketShortId;
};

const fetchPublicMessages = async (url: URL): Promise<PublicBoostMessagesPage> => {
  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
  if (res.status < 200 || res.status >= 300) {
    throw new Error(`public messages request failed with status ${res.status}`);
  }
  let data: unknown;
  try {
    data = await res.json();
  } catch {
    throw new Error('public messages response is not valid JSON');
  }
  return parsePublicBoostMessagesPage(data);
};

export const fetchMbV1PublicMessages = async (
  metaBoostNodeUrl: string,
  query?: PublicMessagesPageQuery
): Promise<PublicBoostMessagesPage> => {
  const normalizedNode = normalizeMetaboostMbV1IngestNodeUrl(metaBoostNodeUrl);
  const parsedNode = new URL(normalizedNode);
  const bucketShortId = extractBucketShortIdFromBoostPath(
    parsedNode.pathname,
    '/v1/standard/mb-v1/boost'
  );
  parsedNode.pathname = `/v1/standard/mb-v1/messages/public/${encodeURIComponent(bucketShortId)}`;
  const requestUrl = appendPaginationQuery(parsedNode, query);
  return fetchPublicMessages(requestUrl);
};

export const fetchMbrssV1PublicMessages = async (
  metaBoostNodeUrl: string,
  scope: MbrssV1PublicMessagesScope,
  query?: PublicMessagesPageQuery
): Promise<PublicBoostMessagesPage> => {
  const normalizedNode = normalizeMetaboostMbrssV1IngestNodeUrl(metaBoostNodeUrl);
  const parsedNode = new URL(normalizedNode);
  const bucketShortId = extractBucketShortIdFromBoostPath(
    parsedNode.pathname,
    '/v1/standard/mbrss-v1/boost'
  );
  let publicPath = `/v1/standard/mbrss-v1/messages/public/${encodeURIComponent(bucketShortId)}`;

  if (scope.type === 'channel') {
    publicPath = `${publicPath}/channel/${encodeURIComponent(scope.podcastGuid)}`;
  } else if (scope.type === 'item') {
    publicPath = `${publicPath}/item/${encodeURIComponent(scope.itemGuid)}`;
  }

  parsedNode.pathname = publicPath;
  const requestUrl = appendPaginationQuery(parsedNode, query);
  return fetchPublicMessages(requestUrl);
};
