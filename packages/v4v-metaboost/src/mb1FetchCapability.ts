import { getOwnPropertyValue, isObjectLike } from '@podverse/helpers';

import { META_BOOST_SCHEMA_MB1 } from './metaBoost.js';

/**
 * Raw JSON shape from Metaboost MB1 GET capability (snake_case).
 * @see Metaboost MB1-SPEC-CONTRACT capability endpoint
 */
export type Mb1BoostCapabilityApiResponse = {
  schema: string;
  message_char_limit: number;
  terms_of_service_url: string;
};

const isValidHttpUrlString = (value: string): boolean => {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

export const parseMb1BoostCapabilityResponse = (
  data: unknown
): { messageCharLimit: number; termsOfServiceUrl: string } => {
  if (!isObjectLike(data)) {
    throw new Error('MB1 capability response is not an object');
  }
  const schema = getOwnPropertyValue(data, 'schema');
  const limitRaw = getOwnPropertyValue(data, 'message_char_limit');
  const termsRaw = getOwnPropertyValue(data, 'terms_of_service_url');
  if (schema !== META_BOOST_SCHEMA_MB1) {
    throw new Error('MB1 capability schema is not mb1');
  }
  if (typeof limitRaw !== 'number' || !Number.isFinite(limitRaw) || limitRaw < 0) {
    throw new Error('MB1 capability message_char_limit is invalid');
  }
  if (
    typeof termsRaw !== 'string' ||
    termsRaw.trim() === '' ||
    !isValidHttpUrlString(termsRaw.trim())
  ) {
    throw new Error('MB1 capability terms_of_service_url is invalid');
  }
  return {
    messageCharLimit: Math.floor(limitRaw),
    termsOfServiceUrl: termsRaw.trim(),
  };
};

const normalizeCapabilityUrl = (metaBoostNodeUrl: string): string => {
  const trimmed = metaBoostNodeUrl.trim();
  if (trimmed === '') {
    throw new Error('MetaBoost node URL is empty');
  }
  try {
    return new URL(trimmed).toString();
  } catch {
    throw new Error('MetaBoost node URL is invalid');
  }
};

/**
 * GET the MB1 capability document from the MetaBoost ingest base URL (same URL as POST).
 */
export const fetchMb1BoostCapability = async (
  metaBoostNodeUrl: string
): Promise<{ messageCharLimit: number; termsOfServiceUrl: string }> => {
  const urlString = normalizeCapabilityUrl(metaBoostNodeUrl);
  const res = await fetch(urlString, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
  if (res.status < 200 || res.status >= 300) {
    throw new Error(`MB1 capability request failed with status ${res.status}`);
  }
  let data: unknown;
  try {
    data = await res.json();
  } catch {
    throw new Error('MB1 capability response is not valid JSON');
  }
  return parseMb1BoostCapabilityResponse(data);
};
