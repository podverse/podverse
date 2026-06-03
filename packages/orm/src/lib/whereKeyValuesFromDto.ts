import { IsNull } from 'typeorm';

/**
 * Maps explicit `null` DTO fields to TypeORM `IsNull()` for find/update/delete `where` clauses.
 * Omits `undefined` values so TypeORM v1 does not throw on invalid where entries.
 */
export function whereKeyValuesFromDto<T extends object>(
  whereKeys: (keyof T)[],
  dto: Partial<T>
): Record<string, unknown> {
  const whereObject: Record<string, unknown> = {};
  for (const key of whereKeys) {
    if (key in dto) {
      const value = dto[key];
      if (value === undefined) {
        continue;
      }
      whereObject[key as string] = value === null ? IsNull() : value;
    }
  }
  return whereObject;
}

/** Normalizes a plain where map (e.g. from `_delete`) for TypeORM find options. */
export function normalizeWhereKeyValues(
  whereKeyValues: Record<string, unknown>
): Record<string, unknown> {
  const normalized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(whereKeyValues)) {
    if (value === undefined) {
      continue;
    }
    normalized[key] = value === null ? IsNull() : value;
  }
  return normalized;
}
