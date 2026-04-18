import { getOwnPropertyValue, isObjectLike, toNonEmptyTrimmedString } from '@podverse/helpers';

/** mbrss-v1 schema slug (RSS `standard="mbrss-v1"`, capability JSON `schema`). */
export const META_BOOST_SCHEMA_MBRSS_V1 = 'mbrss-v1' as const;

/** mb-v1 schema slug (non-RSS MetaBoost standard). */
export const META_BOOST_SCHEMA_MB_V1 = 'mb-v1' as const;

export type MetaBoostSchema = typeof META_BOOST_SCHEMA_MBRSS_V1 | typeof META_BOOST_SCHEMA_MB_V1;

export type MetaBoost = {
  /** Normalized boost base URL (GET/POST capability + ingest). */
  node: string;
  /** When resolved from `channel_meta_boost.standard` or inferred from the node URL path. */
  standard?: 'mbrss-v1' | 'mb-v1';
};

export const isMetaBoostSchema = (value: unknown): value is MetaBoostSchema =>
  value === META_BOOST_SCHEMA_MBRSS_V1 || value === META_BOOST_SCHEMA_MB_V1;

const normalizeMetaBoostUrl = (value: string): string | null => {
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
};

/**
 * Build runtime MetaBoost from a node URL string (e.g. RSS `<podcast:metaBoost>` text).
 */
export const createMetaBoostFromNode = (node: string | null | undefined): MetaBoost | null => {
  if (node === null || node === undefined) {
    return null;
  }
  const trimmed = toNonEmptyTrimmedString(node);
  if (trimmed === null) {
    return null;
  }
  const normalizedNode = normalizeMetaBoostUrl(trimmed);
  if (normalizedNode === null) {
    return null;
  }
  return { node: normalizedNode };
};

export const isMetaBoost = (value: unknown): value is MetaBoost => {
  if (!isObjectLike(value)) {
    return false;
  }
  const node = getOwnPropertyValue(value, 'node');
  const nodeString = toNonEmptyTrimmedString(node);
  if (nodeString === null) {
    return false;
  }
  const normalizedNode = normalizeMetaBoostUrl(nodeString);
  return normalizedNode !== null;
};
