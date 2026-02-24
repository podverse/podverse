export const META_BOOST_TYPE_POST = 'post' as const;
export const META_BOOST_SCHEMA_BOOSTBOX = 'boostbox' as const;

export type MetaBoostType = typeof META_BOOST_TYPE_POST;
export type MetaBoostSchema = typeof META_BOOST_SCHEMA_BOOSTBOX;

export type MetaBoost = {
  type: MetaBoostType;
  schema: MetaBoostSchema;
  license?: string | null;
  node: string;
};

export const isMetaBoostType = (value: unknown): value is MetaBoostType =>
  value === META_BOOST_TYPE_POST;

export const isMetaBoostSchema = (value: unknown): value is MetaBoostSchema =>
  value === META_BOOST_SCHEMA_BOOSTBOX;

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
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const type = Object.getOwnPropertyDescriptor(value, 'type')?.value;
  const schema = Object.getOwnPropertyDescriptor(value, 'schema')?.value;
  const license = Object.getOwnPropertyDescriptor(value, 'license')?.value;
  const node = Object.getOwnPropertyDescriptor(value, 'node')?.value;

  if (!isMetaBoostType(type) || !isMetaBoostSchema(schema)) {
    return false;
  }

  if (typeof node !== 'string' || node.trim().length === 0) {
    return false;
  }

  const normalizedNode = normalizeMetaBoostUrl(node);
  if (!normalizedNode) {
    return false;
  }

  if (license !== undefined && license !== null) {
    if (typeof license !== 'string') {
      return false;
    }
    if (license.trim().length > 0 && !normalizeMetaBoostUrl(license)) {
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
