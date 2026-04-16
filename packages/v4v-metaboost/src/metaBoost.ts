import {
  getOwnPropertyValue,
  isObjectLike,
  toNonEmptyTrimmedString,
  toNullableTrimmedString,
} from '@podverse/helpers';

export const META_BOOST_TYPE_POST = 'post' as const;
export const META_BOOST_SCHEMA_MB1 = 'mb1' as const;

export type MetaBoostType = typeof META_BOOST_TYPE_POST;
export type MetaBoostSchema = typeof META_BOOST_SCHEMA_MB1;

export type MetaBoost = {
  type: MetaBoostType;
  schema: MetaBoostSchema;
  license?: string | null;
  node: string;
};

export const isMetaBoostType = (value: unknown): value is MetaBoostType =>
  value === META_BOOST_TYPE_POST;

export const isMetaBoostSchema = (value: unknown): value is MetaBoostSchema =>
  value === META_BOOST_SCHEMA_MB1;

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

export const isMetaBoost = (value: unknown): value is MetaBoost => {
  if (!isObjectLike(value)) {
    return false;
  }

  const type = getOwnPropertyValue(value, 'type');
  const schema = getOwnPropertyValue(value, 'schema');
  const license = getOwnPropertyValue(value, 'license');
  const node = getOwnPropertyValue(value, 'node');

  if (!isMetaBoostType(type) || !isMetaBoostSchema(schema)) {
    return false;
  }

  const nodeString = toNonEmptyTrimmedString(node);
  if (nodeString === null) {
    return false;
  }

  const normalizedNode = normalizeMetaBoostUrl(nodeString);
  if (!normalizedNode) {
    return false;
  }

  if (license !== undefined && license !== null) {
    const licenseString = toNullableTrimmedString(license);
    if (licenseString === null) {
      return false;
    }
    if (licenseString.length > 0 && !normalizeMetaBoostUrl(licenseString)) {
      return false;
    }
  }

  return true;
};

export const toMetaBoost = (
  type: string | null | undefined,
  schema: string | null | undefined,
  license: string | null | undefined,
  node: string | null | undefined
): MetaBoost | null => {
  if (!type || !schema || !node) {
    return null;
  }

  if (!isMetaBoostType(type) || !isMetaBoostSchema(schema)) {
    return null;
  }

  const normalizedNode = normalizeMetaBoostUrl(node);
  if (!normalizedNode) {
    return null;
  }

  const normalizedLicense =
    license && license.trim().length > 0 ? normalizeMetaBoostUrl(license) : null;
  if (license && !normalizedLicense) {
    return null;
  }

  return {
    type,
    schema,
    license: normalizedLicense,
    node: normalizedNode,
  };
};
