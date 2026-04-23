/**
 * Metaboost Standard Endpoint uses `/v1/standard/*`. Legacy ingest URLs may still advertise
 * `/v1/s/*`; normalize so clients POST to the canonical path (see Metaboost
 * STANDARD-ENDPOINT docs).
 */
export const normalizeMetaboostMbrssV1IngestNodeUrl = (metaBoostNodeUrl: string): string => {
  const trimmed = metaBoostNodeUrl.trim();
  if (trimmed === '') {
    throw new Error('MetaBoost node URL is empty');
  }
  try {
    const u = new URL(trimmed);
    if (u.pathname.includes('/v1/s/')) {
      u.pathname = u.pathname.replace('/v1/s/', '/v1/standard/');
    }
    return u.toString();
  } catch {
    throw new Error('MetaBoost node URL is invalid');
  }
};
