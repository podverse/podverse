export const isObjectLike = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

export const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  isObjectLike(value) && !Array.isArray(value);

export const getOwnPropertyValue = (value: unknown, key: string): unknown => {
  if (!isObjectLike(value)) {
    return undefined;
  }
  return Object.getOwnPropertyDescriptor(value, key)?.value;
};

export const toNullableTrimmedString = (value: unknown): string | null => {
  if (value === null || value === undefined) {
    return null;
  }
  return typeof value === 'string' ? value.trim() : null;
};

export const toNonEmptyTrimmedString = (value: unknown): string | null => {
  const trimmed = toNullableTrimmedString(value);
  return trimmed !== null && trimmed.length > 0 ? trimmed : null;
};

export const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

export const toPositiveFiniteNumber = (value: unknown): number | null =>
  isFiniteNumber(value) && value > 0 ? value : null;
