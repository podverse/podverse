/**
 * Keys / patterns that must not appear verbatim in debug logs (credentials, tokens, etc.).
 * Matching is case-insensitive; hyphenated and camelCase keys are also compared in snake_case
 * (`credentialsEnvelope` → `credentials_envelope`).
 *
 * Only object keys are matched. Credentials embedded inside a string value (for example
 * `user:pass@` userinfo in a URL) are not scrubbed.
 */

const SENSITIVE_KEYS_EXACT = new Set<string>([
  'authorization',
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
  'basic_auth_username',
  'basic_auth_password',
  'credentials',
  'credentials_by_url',
  'credentials_envelope',
]);

/** Lowercased forms of `key` to compare: as written, and with camelCase split into snake_case. */
function normalizedKeyForms(key: string): string[] {
  const flat = key.toLowerCase().replace(/-/g, '_');
  const snake = key
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .toLowerCase()
    .replace(/-/g, '_');
  return flat === snake ? [flat] : [flat, snake];
}

function isSensitiveNormalizedKey(k: string): boolean {
  if (SENSITIVE_KEYS_EXACT.has(k)) {
    return true;
  }
  return (
    k.endsWith('_password') ||
    k.endsWith('_token') ||
    k.endsWith('_secret') ||
    k.endsWith('_api_key')
  );
}

/** Exported for unit tests — prefer `redactForLog` in application code. */
export function isSensitiveLogKey(key: string): boolean {
  return normalizedKeyForms(key).some(isSensitiveNormalizedKey);
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
