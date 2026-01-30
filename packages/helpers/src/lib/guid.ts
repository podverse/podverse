import { v4 as uuidv4, validate as uuidValidate, version as uuidVersion } from 'uuid';

export function generateGuidV4(): string {
  return uuidv4();
}

export function isValidUUID(value: string): boolean {
  return typeof value === 'string' && uuidValidate(value);
}

export function validateUUIDV5(id: string): boolean {
  return typeof id === 'string' && uuidValidate(id) && uuidVersion(id) === 5;
}
