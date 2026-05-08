/**
 * Parse a JSON object stored in a cookie value (server-safe, pure).
 */
export function parseCookieJsonObject(raw: string | undefined): Record<string, unknown> {
  if (raw === undefined || raw === '') {
    return {};
  }
  try {
    const decoded = raw.indexOf('%') !== -1 ? decodeURIComponent(raw) : raw;
    const value: unknown = JSON.parse(decoded);
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      return {};
    }
    return value as Record<string, unknown>;
  } catch {
    return {};
  }
}

export function serializeCookieJsonObject(map: Record<string, unknown>): string {
  return JSON.stringify(map);
}
