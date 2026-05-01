/**
 * Trims whitespace and validates `metaBoostNodeUrl` as an absolute URL.
 * Does not rewrite path segments; callers supply the API path they intend to use.
 */
export const normalizeMetaboostMbrssV1IngestNodeUrl = (metaBoostNodeUrl: string): string => {
  const trimmed = metaBoostNodeUrl.trim();
  if (trimmed === '') {
    throw new Error('MetaBoost node URL is empty');
  }
  try {
    const u = new URL(trimmed);
    return u.toString();
  } catch {
    throw new Error('MetaBoost node URL is invalid');
  }
};
