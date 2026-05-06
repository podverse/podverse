/**
 * Monorepo convention: names ending in `_EXPIRATION` (env keys and exported JS constants) denote a
 * duration in **seconds**. Do not suffix symbols with `_SECONDS`; the `_EXPIRATION` suffix carries the unit.
 */

/**
 * Fallback when `MEMBERSHIP_FREE_TRIAL_EXPIRATION` is unset — **31 days** expressed as seconds (same numeric value as
 * main API `config.premium.freeTrialExpiration`).
 */
export const DEFAULT_FREE_TRIAL_EXPIRATION = 31 * 24 * 60 * 60;
export const DEFAULT_AUTH_JWT_EXPIRATION = 365 * 24 * 60 * 60;
export const DEFAULT_VERIFY_AND_EMAIL_CHANGE_TOKEN_EXPIRATION = 31_540_000;
export const DEFAULT_RESET_PASSWORD_TOKEN_EXPIRATION = 86_400;
export const DEFAULT_SET_PASSWORD_EXPIRATION = 168 * 60 * 60;

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
