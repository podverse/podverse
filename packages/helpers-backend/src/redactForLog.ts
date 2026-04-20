/**
 * Keys that must not appear in debug logs (e.g. credentials).
 * Extend this list when introducing new sensitive fields that may be logged.
 */
const SENSITIVE_KEYS = new Set<string>(['basic_auth_password']);

/**
 * Returns a shallow copy of the object with sensitive keys replaced by `[REDACTED]`.
 * Use when logging records that may contain secrets.
 */
export function redactForLog<T extends Record<string, unknown>>(obj: T): T {
  const out = { ...obj } as T;
  for (const key of Object.keys(out)) {
    if (SENSITIVE_KEYS.has(key)) {
      (out as Record<string, unknown>)[key] = '[REDACTED]';
    }
  }
  return out;
}
