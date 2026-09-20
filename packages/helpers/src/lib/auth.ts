import { ONE_YEAR_SECONDS, SECONDS_PER_MINUTE } from './timeConstants.js';

export const AuthCookieName = 'jwt';

/**
 * Fallback when `AUTH_MOBILE_ACCESS_TOKEN_EXPIRATION` is unset — 15 minutes.
 *
 * Short because a mobile access token travels in a header rather than a cookie the browser will
 * scope for us, so the window in which a leaked one is useful is the only bound available.
 *
 * Shared by both APIs deliberately: an admin signing in from a phone and a listener signing in from
 * a phone are the same session policy, and letting the two drift would mean a security decision
 * changed in one place and not the other.
 */
export const DEFAULT_AUTH_MOBILE_ACCESS_TOKEN_EXPIRATION = 15 * SECONDS_PER_MINUTE;

/**
 * Fallback when `AUTH_MOBILE_REFRESH_TOKEN_EXPIRATION` is unset — 1 year.
 *
 * Long enough that an unused install stays signed in across ordinary gaps. Rotating
 * `AUTH_JWT_SECRET` is the operator action that ends every mobile session at once.
 */
export const DEFAULT_AUTH_MOBILE_REFRESH_TOKEN_EXPIRATION = ONE_YEAR_SECONDS;

export type MobileRefreshJwtPayload = {
  id: number;
  id_text: string;
  token_use: 'refresh';
};

export function isMobileRefreshJwtPayload(value: unknown): value is MobileRefreshJwtPayload {
  if (value === null || typeof value !== 'object') {
    return false;
  }

  if (!('token_use' in value) || value.token_use !== 'refresh') {
    return false;
  }

  if (
    !('id' in value) ||
    typeof value.id !== 'number' ||
    !Number.isInteger(value.id) ||
    !Number.isFinite(value.id) ||
    value.id <= 0
  ) {
    return false;
  }

  if (!('id_text' in value) || typeof value.id_text !== 'string' || value.id_text === '') {
    return false;
  }

  return true;
}
