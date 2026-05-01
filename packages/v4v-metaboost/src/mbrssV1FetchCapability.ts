import { getOwnPropertyValue, isObjectLike } from '@podverse/helpers';

import { normalizeMetaboostMbrssV1IngestNodeUrl } from './mbrssV1IngestUrl.js';
import { META_BOOST_SCHEMA_MBRSS_V1 } from './metaBoost.js';
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

/**
 * Raw JSON shape from Metaboost mbrss-v1 GET capability (snake_case).
 * @see Metaboost `docs/MBRSS-V1-SPEC-CONTRACT.md` capability endpoint
 */
export type MbrssV1BoostCapabilityApiResponse = {
  schema: string;
  message_char_limit: number;
  terms_of_service_url: string;
  public_messages_url?: string;
};

export const parseMbrssV1BoostCapabilityResponse = (
  data: unknown
): MetaBoostCapabilityFetchResult => {
  if (!isObjectLike(data)) {
    throw new Error('mbrss-v1 capability response is not an object');
  }
  const schema = getOwnPropertyValue(data, 'schema');
  const limitRaw = getOwnPropertyValue(data, 'message_char_limit');
  const termsRaw = getOwnPropertyValue(data, 'terms_of_service_url');
  const publicMessagesUrlRaw = getOwnPropertyValue(data, 'public_messages_url');
  if (schema !== META_BOOST_SCHEMA_MBRSS_V1) {
    throw new Error('mbrss-v1 capability schema is not mbrss-v1');
  }
  // Strict policy: required capability fields must be valid or the response is rejected.
  if (typeof limitRaw !== 'number' || !Number.isFinite(limitRaw) || limitRaw < 0) {
    throw new Error('mbrss-v1 capability message_char_limit is invalid');
  }
  if (
    typeof termsRaw !== 'string' ||
    termsRaw.trim() === '' ||
    !isValidTermsOfServiceHttpUrl(termsRaw.trim())
  ) {
    throw new Error('mbrss-v1 capability terms_of_service_url is invalid');
  }
  const blocked = parseSenderBlockedCapabilityFields(data);
  const thresholdContext = parseCapabilityThresholdContextFields(data);
  let publicMessagesUrl: string | null = null;
  if (publicMessagesUrlRaw !== undefined && publicMessagesUrlRaw !== null) {
    if (
      typeof publicMessagesUrlRaw !== 'string' ||
      publicMessagesUrlRaw.trim() === '' ||
      !isValidTermsOfServiceHttpUrl(publicMessagesUrlRaw.trim())
    ) {
      throw new Error('mbrss-v1 capability public_messages_url is invalid');
    }
    publicMessagesUrl = publicMessagesUrlRaw.trim();
  }
  return {
    messageCharLimit: Math.floor(limitRaw),
    termsOfServiceUrl: termsRaw.trim(),
    publicMessagesUrl,
    senderBlocked: blocked.senderBlocked,
    senderBlockMessage: blocked.senderBlockMessage,
    preferredCurrency: thresholdContext.preferredCurrency,
    conversionEndpointUrl: thresholdContext.conversionEndpointUrl,
  };
};

export type FetchMbrssV1BoostCapabilityOptions = {
  senderGuid?: string | null;
};

/**
 * GET the mbrss-v1 capability document from the MetaBoost ingest base URL (same URL as POST).
 */
export const fetchMbrssV1BoostCapability = async (
  metaBoostNodeUrl: string,
  options?: FetchMbrssV1BoostCapabilityOptions
): Promise<MetaBoostCapabilityFetchResult> => {
  const normalizedBase = normalizeMetaboostMbrssV1IngestNodeUrl(
    normalizeCapabilityBaseUrl(metaBoostNodeUrl)
  );
  const urlString = appendSenderGuidToUrl(normalizedBase, options?.senderGuid);
  const res = await fetch(urlString, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
  if (res.status < 200 || res.status >= 300) {
    throw new Error(`mbrss-v1 capability request failed with status ${res.status}`);
  }
  let data: unknown;
  try {
    data = await res.json();
  } catch {
    throw new Error('mbrss-v1 capability response is not valid JSON');
  }
  return parseMbrssV1BoostCapabilityResponse(data);
};
