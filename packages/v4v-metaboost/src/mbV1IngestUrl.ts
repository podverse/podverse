import { normalizeMetaboostMbrssV1IngestNodeUrl } from './mbrssV1IngestUrl.js';

const MB_V1_BOOST_SEGMENT = '/mb-v1/boost/';

export const isMetaboostMbV1IngestNodeUrl = (metaBoostNodeUrl: string): boolean => {
  try {
    const normalized = normalizeMetaboostMbrssV1IngestNodeUrl(metaBoostNodeUrl);
    const parsed = new URL(normalized);
    return parsed.pathname.includes(MB_V1_BOOST_SEGMENT);
  } catch {
    return false;
  }
};

/**
 * Trims and validates the MetaBoost node URL; ensures it targets the mb-v1 boost ingest path.
 */
export const normalizeMetaboostMbV1IngestNodeUrl = (metaBoostNodeUrl: string): string => {
  const normalized = normalizeMetaboostMbrssV1IngestNodeUrl(metaBoostNodeUrl);
  if (!isMetaboostMbV1IngestNodeUrl(normalized)) {
    throw new Error('MetaBoost mb-v1 node URL must include /mb-v1/boost/');
  }
  return normalized;
};
