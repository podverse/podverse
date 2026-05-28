import { createHash, randomUUID } from 'node:crypto';

import { config } from '@api/config/index.js';
import type { CookieOptions, NextFunction, Request, Response } from 'express';
import jwt, { type SignOptions } from 'jsonwebtoken';
import passport from 'passport';
import type { VerifiedCallback } from 'passport-jwt';
import { ExtractJwt, Strategy as JwtStrategy } from 'passport-jwt';
import { Strategy as LocalStrategy } from 'passport-local';

import {
  type AccountEntitlementCapability,
  AuthCookieName,
  ERROR_MESSAGES,
  hasValidMembership,
} from '@podverse/helpers';
import { AccountService, BillingPriceCatalogService, isValidNanoIdV2IdText } from '@podverse/orm';

import { accountHasCapability, getAccountEntitlements } from '../accountEntitlements.js';
import { verifyPassword } from './password.js';

/**
 * Sessions: JWT TTL and cookie max-age come from AUTH_JWT_EXPIRATION (seconds). Login responses omit
 * `token` unless AUTH_ALLOW_TOKEN_IN_RESPONSE_BODY=true and the client sends includeTokenInResponseBody.
 */
const isProduction = config.nodeEnv === 'production';
const MEMBERSHIP_EXPIRED_I18N_KEY = 'membership.membership_expired';
const MOBILE_ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
const MOBILE_REFRESH_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60;

type MobileRefreshRecord = {
  accountId: number;
  accountIdText: string;
  familyId: string;
  used: boolean;
  revoked: boolean;
  expiresAtMs: number;
};

const mobileRefreshStore = new Map<string, MobileRefreshRecord>();

type RefreshPayload = {
  id: number;
  id_text: string;
  token_use: 'refresh';
  family_id: string;
  jti: string;
};

const hashRefreshToken = (token: string): string =>
  createHash('sha256').update(token).digest('hex');

const revokeRefreshFamily = (familyId: string): void => {
  for (const [tokenHash, record] of mobileRefreshStore.entries()) {
    if (record.familyId === familyId) {
      mobileRefreshStore.set(tokenHash, { ...record, revoked: true });
    }
  }
};

const issueMobileTokenPair = (params: {
  accountId: number;
  accountIdText: string;
  familyId?: string;
}): {
  token_type: 'Bearer';
  access_token: string;
  access_token_expires_in: number;
  refresh_token: string;
  refresh_token_expires_in: number;
} => {
  const familyId = params.familyId ?? randomUUID();
  const refreshJti = randomUUID();

  const accessToken = jwt.sign(
    {
      id: params.accountId,
      id_text: params.accountIdText,
      scope: 'podverse_app_mobile',
      token_use: 'access',
    },
    config.auth.jwtSecret,
    {
      expiresIn: MOBILE_ACCESS_TOKEN_TTL_SECONDS,
    } as SignOptions
  );

  const refreshToken = jwt.sign(
    {
      id: params.accountId,
      id_text: params.accountIdText,
      scope: 'podverse_app_mobile',
      token_use: 'refresh',
      family_id: familyId,
      jti: refreshJti,
    },
    config.auth.jwtSecret,
    {
      expiresIn: MOBILE_REFRESH_TOKEN_TTL_SECONDS,
    } as SignOptions
  );

  mobileRefreshStore.set(hashRefreshToken(refreshToken), {
    accountId: params.accountId,
    accountIdText: params.accountIdText,
    familyId,
    used: false,
    revoked: false,
    expiresAtMs: Date.now() + MOBILE_REFRESH_TOKEN_TTL_SECONDS * 1000,
  });

  return {
    token_type: 'Bearer',
    access_token: accessToken,
    access_token_expires_in: MOBILE_ACCESS_TOKEN_TTL_SECONDS,
    refresh_token: refreshToken,
    refresh_token_expires_in: MOBILE_REFRESH_TOKEN_TTL_SECONDS,
  };
};

const authenticateAccountCredentials = async (
  identifier: string,
  password: string
): Promise<{ id: number; id_text: string } | null> => {
  if (!password) {
    return null;
  }

  const account = identifier.includes('@')
    ? await getAccountService().getByEmail(identifier, {
        relations: ['account_credentials'],
      })
    : await getAccountService().getByUsername(identifier, {
        relations: ['account_credentials'],
      });

  if (!account || !account.account_credentials?.password || !account.verified) {
    return null;
  }

  if (!account.id_text) {
    return null;
  }

  const isMatch = await verifyPassword(password, account.account_credentials.password);
  if (!isMatch) {
    return null;
  }

  return {
    id: account.id,
    id_text: account.id_text,
  };
};

// AccountService is constructed per lookup so Vitest per-file vi.mock('@podverse/orm')
// stays effective (no stale cached instance from another test file).
function getAccountService(): AccountService {
  return new AccountService();
}

let billingPriceCatalogServiceSingleton: BillingPriceCatalogService | undefined;
function getBillingPriceCatalogService(): BillingPriceCatalogService {
  if (billingPriceCatalogServiceSingleton === undefined) {
    billingPriceCatalogServiceSingleton = new BillingPriceCatalogService();
  }
  return billingPriceCatalogServiceSingleton;
}

const setAuthCookie = (res: Response, token: string) => {
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
    res.cookie(AuthCookieName, token, prodCookieOptions);
  } else {
    res.cookie(AuthCookieName, token, {
      httpOnly: true,
      secure: false, // dev only
      sameSite: 'strict',
      path: '/',
      maxAge,
    });
  }
};

passport.use(
  new LocalStrategy(
    {
      usernameField: 'email',
      passwordField: 'password',
    },
    async (identifier, password, done) => {
      try {
        if (!password) {
          return done(null, false, { message: 'Password missing.' });
        }

        let account;
        if (identifier.includes('@')) {
          account = await getAccountService().getByEmail(identifier, {
            relations: ['account_credentials'],
          });
        } else {
          account = await getAccountService().getByUsername(identifier, {
            relations: ['account_credentials'],
          });
        }
        if (!account) {
          return done(null, false, { message: 'Incorrect email or username.' });
        }

        const accountCredentials = account.account_credentials;
        if (!accountCredentials) {
          return done(null, false, { message: 'Credentials missing.' });
        }

        const isMatch = await verifyPassword(password, accountCredentials.password);
        if (!isMatch) {
          return done(null, false, { message: 'Incorrect password.' });
        }

        const isVerified = account.verified;
        if (!isVerified) {
          return done(null, false, { message: ERROR_MESSAGES.ACCOUNT.NOT_VERIFIED });
        }

        return done(null, account);
      } catch (error) {
        return done(error);
      }
    }
  )
);

passport.use(
  new JwtStrategy(
    {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.auth.jwtSecret,
    },
    async (jwtPayload: { id: number; id_text?: string }, done: VerifiedCallback) => {
      try {
        if (jwtPayload.id_text === undefined || jwtPayload.id_text === '') {
          return done(null, false);
        }
        if (!isValidNanoIdV2IdText(jwtPayload.id_text)) {
          return done(null, false);
        }
        const account = await getAccountService().get(jwtPayload.id, {
          relations: ['account_credentials'],
        });
        if (!account) {
          return done(null, false);
        }
        const accountIdText =
          typeof account.id_text === 'string' && account.id_text !== ''
            ? account.id_text
            : undefined;
        if (accountIdText === undefined || accountIdText !== jwtPayload.id_text) {
          return done(null, false);
        }
        return done(null, account);
      } catch (error) {
        return done(error, false);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id: number, done) => {
  try {
    const account = await getAccountService().get(id);
    done(null, account);
  } catch (error) {
    done(error);
  }
});

export const initializePassport = () => passport.initialize();

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  passport.authenticate(
    'local',
    { session: false },
    (
      err: Error,
      user:
        | {
            id: number;
            id_text?: string;
            account_credentials?: { email?: string };
          }
        | false,
      info: { message: string }
    ) => {
      if (err) {
        return next(err);
      }
      if (!user) {
        if (info.message === ERROR_MESSAGES.ACCOUNT.NOT_VERIFIED) {
          return res.status(403).json({ message: info.message });
        } else {
          return res.status(401).json({ message: 'Unauthorized' });
        }
      }

      const idText =
        typeof user.id_text === 'string' && user.id_text !== '' ? user.id_text : undefined;
      if (!idText) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const token = jwt.sign({ id: user.id, id_text: idText }, config.auth.jwtSecret, {
        expiresIn: config.auth.jwtExpiration,
      } as SignOptions);

      setAuthCookie(res, token);

      const response: { message: string; token?: string } = {
        message: 'Authenticated successfully',
      };
      const body = req.body as { includeTokenInResponseBody?: unknown } | undefined;
      if (config.auth.allowTokenInResponseBody && Boolean(body?.includeTokenInResponseBody)) {
        response.token = token;
      }

      return res.json(response);
    }
  )(req, res, next);
};

// export type RequestWithUser = Request & { user: { id: number } };

const verifyTokenAndMembership = (
  req: Request,
  res: Response,
  next: NextFunction,
  token: string,
  options: { skipMembershipStatus: boolean; requiredCapability?: AccountEntitlementCapability }
): void => {
  interface DecodedToken {
    id: number;
    id_text?: string;
    [key: string]: unknown;
  }
  jwt.verify(
    token,
    config.auth.jwtSecret,
    async (err: jwt.VerifyErrors | null, decoded: unknown): Promise<void> => {
      if (err) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }
      if (!decoded) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }
      const payload = decoded as DecodedToken;
      if (payload.id_text === undefined || payload.id_text === '') {
        res.status(401).json({ message: 'Re-authentication required' });
        return;
      }
      if (!isValidNanoIdV2IdText(payload.id_text)) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }
      if (
        typeof payload.id !== 'number' ||
        !Number.isInteger(payload.id) ||
        !Number.isFinite(payload.id) ||
        payload.id <= 0
      ) {
        console.error('[verifyTokenAndMembership] Decoded JWT missing user id');
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }

      const relations = ['account_credentials'];
      if (!options.skipMembershipStatus) {
        relations.push('account_membership_status');
        relations.push('account_membership_status.account_membership');
      }
      const account = await getAccountService().get(payload.id, { relations });
      if (!account) {
        console.error('[verifyTokenAndMembership] No account found for user id:', payload.id);
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }

      const accountIdText =
        typeof account.id_text === 'string' && account.id_text !== '' ? account.id_text : undefined;
      if (accountIdText === undefined || accountIdText !== payload.id_text) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }

      req.user = {
        id: account.id,
        id_text:
          typeof account.id_text === 'string' && account.id_text !== '' ? account.id_text : '',
        verified: typeof account.verified === 'boolean' ? account.verified : true,
      };

      if (!options.skipMembershipStatus) {
        const membershipStatus = account.account_membership_status;

        if (!hasValidMembership(membershipStatus)) {
          console.warn(
            '[verifyTokenAndMembership] Membership expired or missing for user id:',
            req.user.id
          );
          res.status(403).json({
            message: 'Your membership has expired. Renew to use this feature.',
            code: 'membership_expired',
            i18nKey: MEMBERSHIP_EXPIRED_I18N_KEY,
            renewPath: '/membership/renew',
          });
          return;
        }

        const capDefaults =
          await getBillingPriceCatalogService().resolveProductMembershipCapDefaults();
        const entitlements = getAccountEntitlements(membershipStatus, capDefaults);
        req.user.entitlements = entitlements;

        if (
          options.requiredCapability &&
          !accountHasCapability(entitlements, options.requiredCapability)
        ) {
          res.status(403).json({
            message: 'Your account does not currently have access to this feature.',
            code: 'feature_not_available_for_account_type',
            i18nKey: 'membership.feature_not_available_for_account_type',
            renewPath: '/membership/renew',
          });
          return;
        }
      }

      next();
    }
  );
};

export const ensureAuthenticated = (
  req: Request,
  res: Response,
  next: NextFunction,
  options: { skipMembershipStatus: boolean; requiredCapability?: AccountEntitlementCapability }
): void => {
  const token = req.cookies[AuthCookieName] || req.headers.authorization?.split(' ')[1];
  if (!token) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }
  verifyTokenAndMembership(req, res, next, token, options);
};

export const optionalEnsureAuthenticated = (
  req: Request,
  res: Response,
  next: NextFunction,
  options: { skipMembershipStatus: boolean; requiredCapability?: AccountEntitlementCapability }
): void => {
  const token = req.cookies[AuthCookieName] || req.headers.authorization?.split(' ')[1];

  if (!token) {
    next();
    return;
  }

  verifyTokenAndMembership(req, res, next, token, options);
};

/**
 * Extracts the authenticated user from the request.
 * Call this only inside ensureAuthenticated callbacks where user is guaranteed.
 * @throws Error if user is not present (should never happen in auth context)
 */
export const getAuthenticatedUser = (req: Request): Express.User => {
  if (!req.user) {
    throw new Error('User not authenticated');
  }
  return req.user;
};

export const logout = (_req: Request, res: Response) => {
  // Clear cookie without Domain (covers host-only cookies without a trailing dot domain).
  res.clearCookie(AuthCookieName, {
    path: '/',
  });

  // In production also clear the cookie scoped to COOKIE_DOMAIN (cross-subdomain auth).
  if (isProduction) {
    res.clearCookie(AuthCookieName, {
      path: '/',
      domain: config.api.cookie.domain, // e.g. '.podverse.fm'
    });
  }

  return res.json({ message: 'Logged out successfully' });
};

export const issueMobileToken = async (req: Request, res: Response): Promise<void> => {
  const body = req.body as { email?: string; password?: string } | undefined;
  const identifier = body?.email?.trim() ?? '';
  const password = body?.password ?? '';
  if (identifier === '' || password === '') {
    res.status(400).json({ message: 'email and password are required' });
    return;
  }

  const account = await authenticateAccountCredentials(identifier, password);
  if (!account) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  res.json(issueMobileTokenPair({ accountId: account.id, accountIdText: account.id_text }));
};

export const refreshMobileToken = async (req: Request, res: Response): Promise<void> => {
  const body = req.body as { refresh_token?: string } | undefined;
  const refreshToken = body?.refresh_token ?? '';
  if (refreshToken === '') {
    res.status(400).json({ message: 'refresh_token is required' });
    return;
  }

  let payload: RefreshPayload;
  try {
    payload = jwt.verify(refreshToken, config.auth.jwtSecret) as RefreshPayload;
  } catch {
    res.status(401).json({ message: 'Invalid refresh token' });
    return;
  }

  if (
    payload.token_use !== 'refresh' ||
    typeof payload.family_id !== 'string' ||
    typeof payload.jti !== 'string' ||
    typeof payload.id !== 'number' ||
    typeof payload.id_text !== 'string'
  ) {
    res.status(401).json({ message: 'Invalid refresh token' });
    return;
  }

  const hashed = hashRefreshToken(refreshToken);
  const record = mobileRefreshStore.get(hashed);
  if (!record || record.revoked || record.expiresAtMs < Date.now()) {
    res.status(401).json({ message: 'Refresh token is invalid or expired' });
    return;
  }

  if (record.used) {
    revokeRefreshFamily(record.familyId);
    res.status(401).json({
      message: 'Refresh token reuse detected',
      code: 'refresh_token_reuse_detected',
    });
    return;
  }

  mobileRefreshStore.set(hashed, { ...record, used: true });
  res.json(
    issueMobileTokenPair({
      accountId: record.accountId,
      accountIdText: record.accountIdText,
      familyId: record.familyId,
    })
  );
};

export const revokeMobileToken = (req: Request, res: Response): void => {
  const body = req.body as { refresh_token?: string } | undefined;
  const refreshToken = body?.refresh_token ?? '';
  if (refreshToken !== '') {
    try {
      const payload = jwt.verify(refreshToken, config.auth.jwtSecret) as Partial<RefreshPayload>;
      if (typeof payload.family_id === 'string' && payload.family_id !== '') {
        revokeRefreshFamily(payload.family_id);
      }
    } catch {
      // Return success for idempotent revocation requests.
    }
  }

  res.json({ message: 'Mobile token family revoked' });
};
