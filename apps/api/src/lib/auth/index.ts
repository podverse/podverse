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
import { AccountService, isValidNanoIdV2IdText } from '@podverse/orm';

import { accountHasCapability, getAccountEntitlements } from '../accountEntitlements.js';
import { verifyPassword } from './password.js';

/**
 * Sessions: JWT TTL and cookie max-age come from AUTH_JWT_EXPIRATION (seconds). Login responses omit
 * `token` unless AUTH_ALLOW_TOKEN_IN_RESPONSE_BODY=true and the client sends includeTokenInResponseBody.
 */
const isProduction = config.nodeEnv === 'production';
const MEMBERSHIP_EXPIRED_I18N_KEY = 'membership.membership_expired';

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

const accountService = new AccountService();

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
          account = await accountService.getByEmail(identifier, {
            relations: ['account_credentials'],
          });
        } else {
          account = await accountService.getByUsername(identifier, {
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
        const account = await accountService.get(jwtPayload.id, {
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
    const account = await accountService.get(id);
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
      }
      const account = await accountService.get(payload.id, { relations });
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

        const entitlements = getAccountEntitlements(membershipStatus);
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
