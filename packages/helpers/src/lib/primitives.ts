/**
 * Generic parsing and normalization primitives (isomorphic, no env coupling).
 */

export function parseNonEmptyString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

export function parseFiniteNumber(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return null;
  }
  return value;
}

/**
 * Trims and uppercases a token (e.g. currency codes, locale tags used as normalized keys).
 */
export function normalizeUpperCaseToken(value: string): string {
  return value.trim().toUpperCase();
}
