/** Header a browser does not attach on a cross-site form post. */
export const COOKIE_WRITE_INTENT_HEADER = 'X-Podverse-Request-Intent';

/** The only accepted value of {@link COOKIE_WRITE_INTENT_HEADER}. */
export const COOKIE_WRITE_INTENT_VALUE = 'same-origin';

const UNSAFE_HTTP_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export function isUnsafeHttpMethod(method: string): boolean {
  return UNSAFE_HTTP_METHODS.has(method.toUpperCase());
}

/**
 * True when an unsafe method authenticated by the session cookie is missing
 * `X-Podverse-Request-Intent: same-origin`.
 */
export function cookieAuthenticatedWriteLacksIntent(
  method: string,
  headerValue: string | undefined
): boolean {
  if (!isUnsafeHttpMethod(method)) {
    return false;
  }
  return headerValue !== COOKIE_WRITE_INTENT_VALUE;
}
