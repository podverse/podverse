/**
 * Every admin login starts an `admin_session` row, and every token names that row in its `sid`
 * claim. Web gets one token in the `pv_mgmt_auth` cookie. Mobile gets a short access token for
 * requests and a refresh token that rotates on every refresh; both carry the
 * `podverse_management_mobile` scope. Each authenticated request checks the row, so ending a
 * session takes effect on that session's next request; rotating AUTH_JWT_SECRET ends every admin
 * session at once.
 *
 * Use renews a session at most once a day, moving its idle expiry AUTH_SESSION_IDLE_EXPIRATION
 * past that use. A web cookie is re-signed when its row renews; a mobile refresh renews the row and
 * issues a refresh token with a fresh expiry.
 *
 * A bearer header wins over the cookie. Login responses omit `token` unless
 * AUTH_ALLOW_TOKEN_IN_RESPONSE_BODY=true and the client sends includeTokenInResponseBody.
 */
import type { AuthenticatedAdmin } from '@management-api/@types/express.js';
import { config } from '@management-api/config/index.js';
import { loggerService } from '@management-api/factories/loggerService.js';
import type { AdminAccount } from '@management-api/orm/entities/adminAccount.js';
import { AdminAccountService } from '@management-api/orm/services/adminAccount.js';
import type { AdminSessionRow } from '@management-api/orm/services/adminSession.js';
import type { CookieOptions, NextFunction, Request, Response } from 'express';
import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';

import type { AuthSessionEndedNotice } from '@podverse/helpers';
import {
  AUTH_SESSION_ENDED_CODE,
  BILLING_CLIENT_PLATFORM_HEADER,
  COOKIE_WRITE_INTENT_HEADER,
  cookieAuthenticatedWriteLacksIntent,
} from '@podverse/helpers';
import { isValidNanoIdV2IdText } from '@podverse/orm';

import {
  checkAdminSession,
  endAdminSession,
  renewAdminSession,
  rotateAdminRefreshToken,
  startAdminSession,
} from './adminSessionStore.js';
import { deviceLabelForMobile, deviceLabelFromUserAgent } from './deviceLabel.js';
import { gatePasswordLogin, SecondFactorUnavailableError } from './secondFactorGate.js';
import type { RequestToken } from './sessionTokens.js';
import {
  ADMIN_AUTH_COOKIE_NAME,
  classifyAccessJwt,
  classifyRefreshJwt,
  readAuthCookie,
  readRequestToken,
  signMobileTokenPair,
  signWebSessionToken,
  verifySessionJwt,
} from './sessionTokens.js';

const isProduction = config.nodeEnv === 'production';

type AdminIdentity = Omit<AuthenticatedAdmin, 'session_id_text'>;

type UnauthorizedBody =
  | { message: string }
  | { message: string; code: typeof AUTH_SESSION_ENDED_CODE; notice: AuthSessionEndedNotice };

/** The notice rides on the 401 only when the session was ended somewhere else. */
function unauthorizedBody(
  message: string,
  notice: AuthSessionEndedNotice | null
): UnauthorizedBody {
  if (notice === null) {
    return { message };
  }
  return { message, code: AUTH_SESSION_ENDED_CODE, notice };
}

/** The cookie's max-age is the idle limit; renewal re-sets it. */
export const setAuthCookie = (res: Response, token: string) => {
  const maxAge = config.auth.sessionCookieMaxAgeMs;
  if (isProduction) {
    const prodCookieOptions: CookieOptions = {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      domain: config.api.cookie.domain,
      path: '/',
      maxAge,
    };
    res.cookie(ADMIN_AUTH_COOKIE_NAME, token, prodCookieOptions);
  } else {
    res.cookie(ADMIN_AUTH_COOKIE_NAME, token, {
      httpOnly: true,
      secure: false,
      sameSite: 'strict',
      path: '/',
      maxAge,
    });
  }
};

/** Clears the host-only cookie and, in production, the one scoped to COOKIE_DOMAIN. */
export const clearAuthCookie = (res: Response) => {
  res.clearCookie(ADMIN_AUTH_COOKIE_NAME, {
    path: '/',
  });

  if (isProduction) {
    res.clearCookie(ADMIN_AUTH_COOKIE_NAME, {
      path: '/',
      domain: config.api.cookie.domain,
    });
  }
};

const adminAccountService = new AdminAccountService();

function mapAdminToIdentity(admin: AdminAccount): AdminIdentity | null {
  if (!admin.admin_account_role) {
    return null;
  }
  return {
    id: admin.id,
    id_text: admin.id_text,
    email: admin.admin_account_credentials?.email ?? null,
    username: admin.admin_account_credentials?.username ?? null,
    admin_account_role_id: admin.admin_account_role_id,
    role: admin.admin_account_role.role,
    permissions: admin.permissions
      ? {
          feeds_crud: admin.permissions.feedsCrud,
          feed_takedown_reasons_crud: admin.permissions.feedTakedownReasonsCrud,
          admins_crud: admin.permissions.adminsCrud,
          stats_crud: admin.permissions.statsCrud,
          billing_prices_crud: admin.permissions.billingPricesCrud,
          bucket_crud: admin.permissions.bucketCrud,
          embed_demo_crud: admin.permissions.embedDemoCrud,
          notifications_crud: admin.permissions.notificationsCrud,
          billing_channels_crud: admin.permissions.billingChannelsCrud,
          billing_processor_products_crud: admin.permissions.billingProcessorProductsCrud,
          billing_account_crud: admin.permissions.billingAccountCrud,
          billing_webhook_events_crud: admin.permissions.billingWebhookEventsCrud,
        }
      : null,
  };
}

/** The admin named by a token's identity claims, only while its `id_text` still matches. */
async function getAdminMatchingJwtIdentity(claims: {
  id: number;
  id_text: string;
}): Promise<AdminAccount | null> {
  const admin = await adminAccountService.getWithRoleAndPermissions(claims.id);
  if (!admin || admin.id_text !== claims.id_text) {
    return null;
  }
  return admin;
}

/**
 * One browser holds one session: a login made while the browser still carries a validly signed
 * session cookie ends that earlier session first.
 */
export async function endSessionInPresentedCookie(req: Request): Promise<void> {
  const cookieToken = readAuthCookie(req);
  if (cookieToken === null) {
    return;
  }
  const classified = classifyAccessJwt(verifySessionJwt(cookieToken));
  if (classified.kind !== 'session') {
    return;
  }
  try {
    await endAdminSession({
      adminAccountId: classified.claims.id,
      sessionIdText: classified.claims.sid,
      reason: 'signed_out',
    });
  } catch (error) {
    loggerService.logError('Failed to end the admin session replaced by a new web login', error);
  }
}

passport.use(
  new LocalStrategy(
    {
      usernameField: 'email',
      passwordField: 'password',
      passReqToCallback: true,
    },
    async (_req, email, password, done) => {
      try {
        if (!password) {
          return done(null, false, { message: 'Password missing.' });
        }

        const adminAccount = await adminAccountService.verifyPassword(email, password);
        if (!adminAccount) {
          return done(null, false, { message: 'Invalid credentials.' });
        }

        const withRelations = await adminAccountService.getWithRoleAndPermissions(adminAccount.id);
        if (!withRelations || !isValidNanoIdV2IdText(withRelations.id_text)) {
          return done(null, false, { message: 'Invalid credentials.' });
        }
        const identity = mapAdminToIdentity(withRelations);
        if (!identity) {
          return done(null, false, { message: 'Invalid credentials.' });
        }

        return done(null, { ...identity, session_id_text: '' });
      } catch (error) {
        return done(error);
      }
    }
  )
);

export const initializePassport = () => passport.initialize();

export async function completeManagementWebLogin(
  req: Request,
  res: Response,
  admin: { id: number; id_text: string },
  extras?: { backupCodes: string[] }
): Promise<void> {
  await endSessionInPresentedCookie(req);
  const { sessionIdText } = await startAdminSession({
    adminAccountId: admin.id,
    clientType: 'web',
    deviceLabel: deviceLabelFromUserAgent(req.get('user-agent')),
    withRefreshToken: false,
  });
  const token = signWebSessionToken({
    adminId: admin.id,
    adminIdText: admin.id_text,
    sessionIdText,
  });
  setAuthCookie(res, token);
  const response: { message: string; token?: string; backupCodes?: string[] } = {
    message: 'Authenticated successfully',
  };
  if (extras !== undefined) {
    response.backupCodes = extras.backupCodes;
  }
  const body: unknown = req.body;
  const includeToken =
    typeof body === 'object' &&
    body !== null &&
    Reflect.get(body, 'includeTokenInResponseBody') === true;
  if (config.auth.allowTokenInResponseBody && includeToken) {
    response.token = token;
  }
  res.json(response);
}

/** Web login: a correct password starts a session only when no second-factor step remains. */
export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  passport.authenticate(
    'local',
    { session: false },
    (err: Error | null, user: Express.User | false, info: { message: string } | undefined) => {
      if (err) {
        next(err);
        return;
      }
      if (!user) {
        res.status(401).json({ message: info?.message || 'Unauthorized' });
        return;
      }

      void (async () => {
        try {
          const step = await gatePasswordLogin({
            ownerId: user.id,
            client: 'web',
            deviceLabel: deviceLabelFromUserAgent(req.get('user-agent')),
          });
          if (step !== null) {
            res.json(step);
            return;
          }
          await completeManagementWebLogin(req, res, { id: user.id, id_text: user.id_text });
        } catch (error) {
          if (error instanceof SecondFactorUnavailableError) {
            res.status(503).json({ message: 'Second factor is unavailable' });
            return;
          }
          next(error);
        }
      })();
    }
  )(req, res, next);
};

/**
 * Renewal never fails the request. A web session presented through its cookie gets a re-signed
 * cookie; a web token sent as a bearer renews only its row and ends at its own JWT expiry.
 */
async function renewSessionOnUse(
  res: Response,
  requestToken: RequestToken,
  session: AdminSessionRow,
  claims: { id: number; id_text: string; sid: string }
): Promise<void> {
  try {
    const renewed = await renewAdminSession(session);
    if (renewed && session.client_type === 'web' && requestToken.source === 'cookie') {
      setAuthCookie(
        res,
        signWebSessionToken({
          adminId: claims.id,
          adminIdText: claims.id_text,
          sessionIdText: claims.sid,
        })
      );
    }
  } catch (error) {
    loggerService.logError('Admin session renewal failed', error);
  }
}

const verifyToken = async (
  req: Request,
  res: Response,
  next: NextFunction,
  requestToken: RequestToken
): Promise<void> => {
  const rejectUnauthorized = (notice: AuthSessionEndedNotice | null) => {
    if (requestToken.source === 'cookie') {
      clearAuthCookie(res);
    }
    res.status(401).json(unauthorizedBody('Unauthorized', notice));
  };

  const classified = classifyAccessJwt(verifySessionJwt(requestToken.token));
  if (classified.kind === 'rejected') {
    rejectUnauthorized(null);
    return;
  }
  const { claims } = classified;

  const [adminAccount, sessionCheck] = await Promise.all([
    getAdminMatchingJwtIdentity(claims),
    checkAdminSession({ adminAccountId: claims.id, sessionIdText: claims.sid }),
  ]);
  if (!adminAccount) {
    rejectUnauthorized(null);
    return;
  }
  if (sessionCheck.kind === 'ended') {
    rejectUnauthorized(sessionCheck.notice);
    return;
  }

  if (
    requestToken.source === 'cookie' &&
    cookieAuthenticatedWriteLacksIntent(req.method, req.get(COOKIE_WRITE_INTENT_HEADER))
  ) {
    res.status(403).json({ message: 'Forbidden' });
    return;
  }

  const identity = mapAdminToIdentity(adminAccount);
  if (!identity) {
    loggerService.warn('Admin account has no role relation', { adminAccountId: adminAccount.id });
    rejectUnauthorized(null);
    return;
  }

  req.user = { ...identity, session_id_text: claims.sid };

  if (sessionCheck.renewDue) {
    await renewSessionOnUse(res, requestToken, sessionCheck.session, claims);
  }

  next();
};

/** A failed admin or session lookup answers 500 rather than leaving the request open. */
function runAuthCheck(check: Promise<void>, res: Response): void {
  check.catch((error: unknown) => {
    loggerService.logError('Admin authentication check failed', error);
    if (!res.headersSent) {
      res.status(500).json({ message: 'Internal Server Error' });
    }
  });
}

export const ensureAuthenticated = (req: Request, res: Response, next: NextFunction): void => {
  const requestToken = readRequestToken(req);
  if (!requestToken) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }
  runAuthCheck(verifyToken(req, res, next, requestToken), res);
};

/**
 * Ends the calling session when the request names one. A session cookie on this POST needs
 * `X-Podverse-Request-Intent: same-origin`; without it the session stays and the response is 403.
 * Any other request clears the cookie and answers 200.
 */
export const logout = async (req: Request, res: Response): Promise<void> => {
  const requestToken = readRequestToken(req);
  if (requestToken) {
    const classified = classifyAccessJwt(verifySessionJwt(requestToken.token));
    if (classified.kind === 'session') {
      if (
        requestToken.source === 'cookie' &&
        cookieAuthenticatedWriteLacksIntent(req.method, req.get(COOKIE_WRITE_INTENT_HEADER))
      ) {
        res.status(403).json({ message: 'Forbidden' });
        return;
      }
      try {
        await endAdminSession({
          adminAccountId: classified.claims.id,
          sessionIdText: classified.claims.sid,
          reason: 'signed_out',
        });
      } catch (error) {
        loggerService.logError('Failed to end the admin session on logout', error);
      }
    }
  }

  clearAuthCookie(res);
  res.json({ message: 'Logged out successfully' });
};

export const issueMobileToken = async (req: Request, res: Response): Promise<void> => {
  const body = req.body as
    { email?: unknown; password?: unknown; device_label?: unknown } | undefined;
  const email = typeof body?.email === 'string' ? body.email.trim() : '';
  const password = typeof body?.password === 'string' ? body.password : '';
  if (email === '' || password === '') {
    res.status(400).json({ message: 'email and password are required' });
    return;
  }

  const admin = await adminAccountService.verifyPassword(email, password);
  if (!admin || !admin.id_text || !isValidNanoIdV2IdText(admin.id_text)) {
    res.status(401).json({ message: 'Invalid credentials.' });
    return;
  }

  const deviceLabel = deviceLabelForMobile({
    bodyLabel: body?.device_label,
    platformHeader: req.get(BILLING_CLIENT_PLATFORM_HEADER),
  });
  try {
    const step = await gatePasswordLogin({
      ownerId: admin.id,
      client: 'mobile',
      deviceLabel,
    });
    if (step !== null) {
      res.json(step);
      return;
    }
  } catch (error) {
    if (error instanceof SecondFactorUnavailableError) {
      res.status(503).json({ message: 'Second factor is unavailable' });
      return;
    }
    throw error;
  }

  const { sessionIdText, refreshTokenId } = await startAdminSession({
    adminAccountId: admin.id,
    clientType: 'mobile',
    deviceLabel,
    withRefreshToken: true,
  });
  if (refreshTokenId === null) {
    throw new Error('Mobile admin session started without a refresh token id');
  }

  res.json(
    signMobileTokenPair({
      adminId: admin.id,
      adminIdText: admin.id_text,
      sessionIdText,
      refreshTokenId,
    })
  );
};

export const refreshMobileToken = async (req: Request, res: Response): Promise<void> => {
  const body = req.body as { refresh_token?: unknown } | undefined;
  const refreshToken = typeof body?.refresh_token === 'string' ? body.refresh_token : '';
  if (refreshToken === '') {
    res.status(400).json({ message: 'refresh_token is required' });
    return;
  }

  const classified = classifyRefreshJwt(verifySessionJwt(refreshToken));
  if (classified.kind === 'rejected') {
    res.status(401).json({ message: 'Invalid refresh token' });
    return;
  }
  const { claims } = classified;

  const admin = await getAdminMatchingJwtIdentity(claims);
  if (!admin) {
    res.status(401).json({ message: 'Invalid refresh token' });
    return;
  }

  const rotation = await rotateAdminRefreshToken({
    adminAccountId: admin.id,
    sessionIdText: claims.sid,
    presentedTokenId: claims.rid,
  });
  if (rotation.kind === 'ended') {
    res.status(401).json(unauthorizedBody('Invalid refresh token', rotation.notice));
    return;
  }

  res.json(
    signMobileTokenPair({
      adminId: admin.id,
      adminIdText: admin.id_text,
      sessionIdText: claims.sid,
      refreshTokenId: rotation.refreshTokenId,
    })
  );
};

/**
 * Ends the session named by a validly signed refresh token. Ending your own session needs no proof
 * beyond the signature, so the current-or-previous check does not apply. Always answers 200 so a
 * device's sign-out never fails on this call.
 */
export const revokeMobileToken = async (req: Request, res: Response): Promise<void> => {
  const body = req.body as { refresh_token?: unknown } | undefined;
  const refreshToken = typeof body?.refresh_token === 'string' ? body.refresh_token : '';
  if (refreshToken !== '') {
    const classified = classifyRefreshJwt(verifySessionJwt(refreshToken));
    if (classified.kind === 'session') {
      try {
        await endAdminSession({
          adminAccountId: classified.claims.id,
          sessionIdText: classified.claims.sid,
          reason: 'signed_out',
        });
      } catch (error) {
        loggerService.logError('Failed to end the admin session on mobile revoke', error);
      }
    }
  }

  res.json({ message: 'Mobile token family revoked' });
};
