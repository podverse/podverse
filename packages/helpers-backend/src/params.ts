/**
 * Generic route/request parameter helpers for Express-style param bags.
 */

export function getParam(params: Record<string, unknown>, key: string): string | null {
  const value = params[key];

  if (value === undefined || value === null) {
    return null;
  }

  if (Array.isArray(value)) {
    const first = value[0];
    return typeof first === 'string' ? first : null;
  }

  return typeof value === 'string' ? value : null;
}

export function getParamRequired(params: Record<string, unknown>, key: string): string {
  const value = getParam(params, key);

  if (value === null) {
    throw new Error(`Required parameter '${key}' is missing`);
  }

  return value;
}
