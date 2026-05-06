/**
 * Read `process.env[name]` as a non-negative number or integer, falling back when unset/invalid.
 */

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
