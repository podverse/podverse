import { normalizeMetaboostMbrssV1IngestNodeUrl } from './mbrssV1IngestUrl.js';

const MB_V1_STANDARD_PATH_SEGMENT = '/v1/standard/mb-v1/boost/';

export const isMetaboostMbV1IngestNodeUrl = (metaBoostNodeUrl: string): boolean => {
  try {
    const normalized = normalizeMetaboostMbrssV1IngestNodeUrl(metaBoostNodeUrl);
    const parsed = new URL(normalized);
    return parsed.pathname.includes(MB_V1_STANDARD_PATH_SEGMENT);
  } catch {
    return false;
  }
};

/**
 * Same path normalization as mbrss-v1 (`/v1/s/` → `/v1/standard/`) for MetaBoost Standard Endpoints.
 * Additionally validates that the resulting URL targets the mb-v1 boost path.
 */
export const normalizeMetaboostMbV1IngestNodeUrl = (metaBoostNodeUrl: string): string => {
  const normalized = normalizeMetaboostMbrssV1IngestNodeUrl(metaBoostNodeUrl);
  if (!isMetaboostMbV1IngestNodeUrl(normalized)) {
    throw new Error('MetaBoost mb-v1 node URL must include /v1/standard/mb-v1/boost/');
  }
  return normalized;
};
