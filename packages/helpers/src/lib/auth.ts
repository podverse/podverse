import { SECONDS_PER_DAY, SECONDS_PER_MINUTE } from './timeConstants.js';

export const AuthCookieName = 'jwt';

/**
 * How long a mobile bearer token is honoured before the client must refresh, in seconds.
 *
 * Short because a mobile access token travels in a header rather than a cookie the browser will
 * scope for us, so the window in which a leaked one is useful is the only bound available.
 *
 * Shared by both APIs deliberately: an admin signing in from a phone and a listener signing in from
 * a phone are the same session policy, and letting the two drift would mean a security decision
 * changed in one place and not the other.
 */
export const MOBILE_ACCESS_TOKEN_TTL_SECONDS = 15 * SECONDS_PER_MINUTE;

/**
 * How long a mobile refresh token stays valid, in seconds.
 *
 * Long enough that ordinary use never forces a re-login, which is what keeps the access token above
 * short enough to be worth having. Rotation on use is what limits the damage of a stolen one.
 */
export const MOBILE_REFRESH_TOKEN_TTL_SECONDS = 30 * SECONDS_PER_DAY;
