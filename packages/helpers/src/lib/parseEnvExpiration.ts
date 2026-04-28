/**
 * Monorepo convention: env vars that end with `_EXPIRATION` are non-negative integer values.
 */

/**
 * Parse a single env value. Returns `null` if undefined, null, or empty/whitespace after trim.
 * @throws if set but not a non-negative integer
 */
export function parseExpirationEnvValue(raw: string | undefined | null): number | null {
  if (raw === undefined || raw === null) {
    return null;
  }
  const s = String(raw).trim();
  if (s === '') {
    return null;
  }
  const n = Number(s);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0) {
    throw new TypeError(
      `Invalid expiration: expected non-negative integer, got ${JSON.stringify(raw)}`
    );
  }
  return n;
}

/**
 * Read `process.env[name]` as required expiration. Must be present and > 0.
 */
export function readRequiredPositiveExpirationEnv(name: string): number {
  const p = parseExpirationEnvValue(process.env[name]);
  if (p === null) {
    throw new TypeError(`Missing or empty required env: ${name}`);
  }
  if (p === 0) {
    throw new TypeError(`Invalid expiration: ${name} must be > 0`);
  }
  return p;
}

/**
 * Read optional expiration: if unset/empty, return `defaultExpiration`. If set, must be a positive integer.
 */
export function readOptionalPositiveExpirationEnv(name: string, defaultExpiration: number): number {
  const p = parseExpirationEnvValue(process.env[name]);
  if (p === null) {
    return defaultExpiration;
  }
  if (p === 0) {
    throw new TypeError(`Invalid expiration: ${name} must be > 0 when set`);
  }
  return p;
}

/**
 * Read optional expiration that may be omitted for "use default" (e.g. free trial). If unset/empty, returns `null`. If set, must be > 0.
 */
export function readOptionalExpirationEnvOrNull(name: string): number | null {
  const p = parseExpirationEnvValue(process.env[name]);
  if (p === null) {
    return null;
  }
  if (p === 0) {
    throw new TypeError(`Invalid expiration: ${name} must be > 0 when set`);
  }
  return p;
}
