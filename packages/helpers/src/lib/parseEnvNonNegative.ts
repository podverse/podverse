/**
 * Read `process.env[name]` as a non-negative number or integer, falling back when unset/invalid.
 */

/**
 * Parse a raw env value as a non-negative integer. Returns `undefined` when unset, empty, or invalid.
 */
export function parseOptionalNonNegativeInt(raw: string | undefined | null): number | undefined {
  if (raw === undefined || raw === null) {
    return undefined;
  }
  const trimmed = String(raw).trim();
  if (trimmed === '') {
    return undefined;
  }
  const parsed = Number(trimmed);
  if (!Number.isInteger(parsed) || parsed < 0) {
    return undefined;
  }
  return parsed;
}

export function parseNonNegativeNumberEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === '') {
    return fallback;
  }
  const n = Number(String(raw).trim());
  if (!Number.isFinite(n) || n < 0) {
    return fallback;
  }
  return n;
}

export function parseNonNegativeIntEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === '') {
    return fallback;
  }
  const parsed = Number(String(raw).trim());
  if (!Number.isInteger(parsed) || parsed < 0) {
    return fallback;
  }
  return parsed;
}
