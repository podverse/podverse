import { config } from '@management-api/config/index.js';
import jwt from 'jsonwebtoken';

import type { SessionAccessJwtPayload, SessionRefreshJwtPayload } from '@podverse/helpers';
import { isSessionAccessJwtPayload, isSessionRefreshJwtPayload } from '@podverse/helpers';
import { isValidNanoIdV2IdText } from '@podverse/orm';

export const ADMIN_AUTH_COOKIE_NAME = 'pv_mgmt_auth';

/** Mobile access and refresh tokens carry this scope; web tokens carry none. */
const MOBILE_TOKEN_SCOPE = 'podverse_management_mobile';
const BEARER_HEADER_PATTERN = /^Bearer\s+(\S+)/i;

/** Session tokens are HMAC-SHA256. Sign and verify both name this method. */
const SESSION_JWT_ALGORITHM = 'HS256' as const;

export type RequestToken = { token: string; source: 'cookie' | 'bearer' };

export type MobileTokenPair = {
  token_type: 'Bearer';
  access_token: string;
  access_token_expires_in: number;
  refresh_token: string;
  refresh_token_expires_in: number;
};

export type AccessJwtClassification =
  { kind: 'session'; claims: SessionAccessJwtPayload } | { kind: 'rejected' };

export type RefreshJwtClassification =
  { kind: 'session'; claims: SessionRefreshJwtPayload } | { kind: 'rejected' };

type SessionTokenIdentity = {
  adminId: number;
  adminIdText: string;
  sessionIdText: string;
};

type RequestWithToken = {
  cookies?: unknown;
  headers: { authorization?: string };
};

/** The web token lives as long as the idle limit; renewal re-signs it. */
export function signWebSessionToken(identity: SessionTokenIdentity): string {
  return jwt.sign(
    {
      id: identity.adminId,
      id_text: identity.adminIdText,
      sid: identity.sessionIdText,
      token_use: 'web',
    },
    config.auth.jwtSecret,
    { algorithm: SESSION_JWT_ALGORITHM, expiresIn: config.auth.sessionIdleExpiration }
  );
}

/**
 * A short access token for every request and a refresh token that lives as long as the idle
 * limit. Each refresh issues a new pair, so the refresh token's expiry moves with use.
 */
export function signMobileTokenPair(
  identity: SessionTokenIdentity & { refreshTokenId: string }
): MobileTokenPair {
  const accessExpiresIn = config.auth.accessTokenExpiration;
  const refreshExpiresIn = config.auth.sessionIdleExpiration;

  const accessToken = jwt.sign(
    {
      id: identity.adminId,
      id_text: identity.adminIdText,
      sid: identity.sessionIdText,
      scope: MOBILE_TOKEN_SCOPE,
      token_use: 'access',
    },
    config.auth.jwtSecret,
    { algorithm: SESSION_JWT_ALGORITHM, expiresIn: accessExpiresIn }
  );

  const refreshToken = jwt.sign(
    {
      id: identity.adminId,
      id_text: identity.adminIdText,
      sid: identity.sessionIdText,
      rid: identity.refreshTokenId,
      scope: MOBILE_TOKEN_SCOPE,
      token_use: 'refresh',
    },
    config.auth.jwtSecret,
    { algorithm: SESSION_JWT_ALGORITHM, expiresIn: refreshExpiresIn }
  );

  return {
    token_type: 'Bearer',
    access_token: accessToken,
    access_token_expires_in: accessExpiresIn,
    refresh_token: refreshToken,
    refresh_token_expires_in: refreshExpiresIn,
  };
}

/** The `pv_mgmt_auth` cookie value, or null when the request has none. */
export function readAuthCookie(req: RequestWithToken): string | null {
  const cookies = req.cookies;
  if (typeof cookies !== 'object' || cookies === null) {
    return null;
  }
  const cookieToken: unknown = Reflect.get(cookies, ADMIN_AUTH_COOKIE_NAME);
  return typeof cookieToken === 'string' && cookieToken !== '' ? cookieToken : null;
}

/**
 * An `Authorization: Bearer` header wins over the auth cookie, so programmatic clients are not
 * overridden by a stale browser cookie.
 */
export function readRequestToken(req: RequestWithToken): RequestToken | null {
  const header = req.headers.authorization;
  if (typeof header === 'string' && header !== '') {
    const bearerToken = BEARER_HEADER_PATTERN.exec(header)?.[1];
    if (bearerToken !== undefined && bearerToken !== '') {
      return { token: bearerToken, source: 'bearer' };
    }
  }
  const cookieToken = readAuthCookie(req);
  return cookieToken === null ? null : { token: cookieToken, source: 'cookie' };
}

/** The decoded payload when the HMAC-SHA256 signature and expiry check out; null otherwise. */
export function verifySessionJwt(token: string): unknown {
  try {
    return jwt.verify(token, config.auth.jwtSecret, { algorithms: [SESSION_JWT_ALGORITHM] });
  } catch {
    return null;
  }
}

function hasValidSessionIdentity(claims: { id_text: string; sid: string }): boolean {
  return isValidNanoIdV2IdText(claims.id_text) && isValidNanoIdV2IdText(claims.sid);
}

function hasMobileScope(payload: object): boolean {
  return 'scope' in payload && payload.scope === MOBILE_TOKEN_SCOPE;
}

/**
 * A web token (no scope claim) or a mobile access token (the management mobile scope) that names
 * a session. Anything else is rejected.
 */
export function classifyAccessJwt(decoded: unknown): AccessJwtClassification {
  if (!isSessionAccessJwtPayload(decoded) || !hasValidSessionIdentity(decoded)) {
    return { kind: 'rejected' };
  }
  const scopeMatchesUse =
    decoded.token_use === 'access' ? hasMobileScope(decoded) : !('scope' in decoded);
  if (!scopeMatchesUse) {
    return { kind: 'rejected' };
  }
  return { kind: 'session', claims: decoded };
}

/** A mobile refresh token that names a session and a refresh token id. Anything else is rejected. */
export function classifyRefreshJwt(decoded: unknown): RefreshJwtClassification {
  if (
    !isSessionRefreshJwtPayload(decoded) ||
    !hasValidSessionIdentity(decoded) ||
    !hasMobileScope(decoded)
  ) {
    return { kind: 'rejected' };
  }
  return { kind: 'session', claims: decoded };
}
