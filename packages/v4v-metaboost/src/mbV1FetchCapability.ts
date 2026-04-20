import { getOwnPropertyValue, isObjectLike } from '@podverse/helpers';

import { normalizeMetaboostMbV1IngestNodeUrl } from './mbV1IngestUrl.js';
import { META_BOOST_SCHEMA_MB_V1 } from './metaBoost.js';
import type { MetaBoostCapabilityFetchResult } from './metaBoostCapabilityFetchResult.js';
import {
  appendSenderGuidToUrl,
  parseSenderBlockedCapabilityFields,
} from './metaBoostCapabilityParseSenderBlocked.js';
import { parseCapabilityThresholdContextFields } from './metaBoostCapabilityParseThresholdContext.js';
import {
  isValidTermsOfServiceHttpUrl,
  normalizeCapabilityBaseUrl,
} from './metaBoostCapabilityUrlHelpers.js';

export type MbV1BoostCapabilityApiResponse = {
  schema: string;
  message_char_limit: number;
  terms_of_service_url: string;
};

export const parseMbV1BoostCapabilityResponse = (data: unknown): MetaBoostCapabilityFetchResult => {
  if (!isObjectLike(data)) {
    throw new Error('mb-v1 capability response is not an object');
  }
  const schema = getOwnPropertyValue(data, 'schema');
  const limitRaw = getOwnPropertyValue(data, 'message_char_limit');
  const termsRaw = getOwnPropertyValue(data, 'terms_of_service_url');
  if (schema !== META_BOOST_SCHEMA_MB_V1) {
    throw new Error('mb-v1 capability schema is not mb-v1');
  }
  if (typeof limitRaw !== 'number' || !Number.isFinite(limitRaw) || limitRaw < 0) {
    throw new Error('mb-v1 capability message_char_limit is invalid');
  }
  if (
    typeof termsRaw !== 'string' ||
    termsRaw.trim() === '' ||
    !isValidTermsOfServiceHttpUrl(termsRaw.trim())
  ) {
    throw new Error('mb-v1 capability terms_of_service_url is invalid');
  }
  const blocked = parseSenderBlockedCapabilityFields(data);
  const thresholdContext = parseCapabilityThresholdContextFields(data);
  return {
    messageCharLimit: Math.floor(limitRaw),
    termsOfServiceUrl: termsRaw.trim(),
    senderBlocked: blocked.senderBlocked,
    senderBlockMessage: blocked.senderBlockMessage,
    preferredCurrency: thresholdContext.preferredCurrency,
    minimumMessageAmountMinor: thresholdContext.minimumMessageAmountMinor,
    conversionEndpointUrl: thresholdContext.conversionEndpointUrl,
  };
};

export type FetchMbV1BoostCapabilityOptions = {
  senderGuid?: string | null;
};

export const fetchMbV1BoostCapability = async (
  metaBoostNodeUrl: string,
  options?: FetchMbV1BoostCapabilityOptions
): Promise<MetaBoostCapabilityFetchResult> => {
  const normalizedBase = normalizeMetaboostMbV1IngestNodeUrl(
    normalizeCapabilityBaseUrl(metaBoostNodeUrl)
  );
  const urlString = appendSenderGuidToUrl(normalizedBase, options?.senderGuid);
  const res = await fetch(urlString, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
  if (res.status < 200 || res.status >= 300) {
    throw new Error(`mb-v1 capability request failed with status ${res.status}`);
  }
  let data: unknown;
  try {
    data = await res.json();
  } catch {
    throw new Error('mb-v1 capability response is not valid JSON');
  }
  return parseMbV1BoostCapabilityResponse(data);
};
