/**
 * Keys / patterns that must not appear verbatim in debug logs (credentials, tokens, etc.).
 * Matching is case-insensitive; hyphenated keys are normalized to underscores for comparison.
 */

const SENSITIVE_KEYS_EXACT = new Set<string>([
  'authorization',
  'basic_auth_password',
  'passwd',
  'password',
  'pwd',
  'secret',
  'secretkey',
  'token',
  'apikey',
  'api_key',
  'access_token',
  'refresh_token',
  'id_token',
  'authkey',
  'client_secret',
  'clientsecret',
  'private_key',
  'privatekey',
  'cookie',
  'session',
  'sessionid',
  'session_id',
]);

function normalizeKeyName(key: string): string {
  return key.toLowerCase().replace(/-/g, '_');
}

/** Exported for unit tests — prefer `redactForLog` in application code. */
export function isSensitiveLogKey(key: string): boolean {
  const k = normalizeKeyName(key);
  if (SENSITIVE_KEYS_EXACT.has(k)) {
    return true;
  }
  if (
    k.endsWith('_password') ||
    k.endsWith('_token') ||
    k.endsWith('_secret') ||
    k.endsWith('_api_key')
  ) {
    return true;
  }
  return false;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object') {
    return false;
  }
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function redactValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => {
      if (isPlainObject(item)) {
        return redactPlainObject(item);
      }
      return item;
    });
  }
  if (isPlainObject(value)) {
    return redactPlainObject(value);
  }
  return value;
}

function redactPlainObject(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(obj)) {
    if (isSensitiveLogKey(key)) {
      out[key] = '[REDACTED]';
      continue;
    }
    const v = obj[key];
    out[key] = redactValue(v);
  }
  return out;
}

/**
 * Returns a deep-cloned plain object shape with sensitive keys replaced by `[REDACTED]`.
 * Use when logging records that may contain secrets at any depth.
 */
export function redactForLog<T extends Record<string, unknown>>(obj: T): T {
  return redactPlainObject(obj) as T;
}
