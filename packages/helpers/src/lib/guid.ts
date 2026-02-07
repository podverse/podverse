import {
  v1 as uuidv1,
  v3 as uuidv3,
  v4 as uuidv4,
  v5 as uuidv5,
  validate as uuidValidate,
  version as uuidVersion,
} from 'uuid';

const UUID_V5_NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8'; // DNS namespace for v3/v5 name-based UUIDs

export function generateGuidV4(): string {
  return uuidv4();
}

/** RFC 4122 UUID versions that provide a reasonable amount of randomness (excludes nil/unknown). */
export const UUID_VERSIONS_WITH_SUFFICIENT_RANDOMNESS = [1, 3, 4, 5] as const;

/** Returns a new UUID of a randomly chosen version (1, 3, 4, or 5). */
export function generateGuidWithRandomVersion(): string {
  const versions = [...UUID_VERSIONS_WITH_SUFFICIENT_RANDOMNESS];
  const idx = Math.floor(Math.random() * versions.length);
  const version = versions[idx];
  if (version === undefined) return uuidv4();
  const name = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  switch (version) {
    case 1:
      return uuidv1();
    case 3:
      return uuidv3(name, UUID_V5_NAMESPACE);
    case 4:
      return uuidv4();
    case 5:
      return uuidv5(name, UUID_V5_NAMESPACE);
    default:
      return uuidv4();
  }
}

export function isValidUUID(value: string): boolean {
  return typeof value === 'string' && uuidValidate(value);
}

export function validateUUIDV5(id: string): boolean {
  return typeof id === 'string' && uuidValidate(id) && uuidVersion(id) === 5;
}

/** True if value is a valid UUID of a type that ensures reasonable randomness (v1, v3, v4, or v5). */
export function isValidReliableUUID(value: string): boolean {
  if (typeof value !== 'string' || !uuidValidate(value)) return false;
  const v = uuidVersion(value);
  return (UUID_VERSIONS_WITH_SUFFICIENT_RANDOMNESS as readonly number[]).includes(v);
}
