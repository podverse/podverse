import { config } from '@api/config/index.js';
import type { CookieOptions, NextFunction, Request, Response } from 'express';
import jwt, { type SignOptions } from 'jsonwebtoken';
import passport from 'passport';
import type { VerifiedCallback } from 'passport-jwt';
import { ExtractJwt, Strategy as JwtStrategy } from 'passport-jwt';
import { Strategy as LocalStrategy } from 'passport-local';

import { AccountMembershipEnum, AuthCookieName, ERROR_MESSAGES } from '@podverse/helpers';
import { AccountService, isValidNanoIdV2IdText } from '@podverse/orm';

import { verifyPassword } from './password.js';

/**
 * Sessions: JWT TTL and cookie max-age come from AUTH_JWT_EXPIRES_IN (default `365d`). Login responses omit
 * `token` unless AUTH_ALLOW_TOKEN_IN_RESPONSE_BODY=true and the client sends includeTokenInResponseBody.
 */
const isProduction = config.nodeEnv === 'production';

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
    async (email, password, done) => {
      try {
        if (!password) {
          return done(null, false, { message: 'Password missing.' });
        }

        const account = await accountService.getByEmail(email, {
          relations: ['account_credentials'],
        });
        if (!account) {
          return done(null, false, { message: 'Incorrect email.' });
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

      const rawEmail =
        user.account_credentials?.email !== undefined && user.account_credentials?.email !== ''
          ? user.account_credentials.email
          : undefined;
      if (!rawEmail) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      const idText =
        typeof user.id_text === 'string' && user.id_text !== '' ? user.id_text : undefined;
      if (!idText) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const token = jwt.sign({ id: user.id, id_text: idText }, config.auth.jwtSecret, {
        expiresIn: config.auth.jwtExpiresIn,
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
  options: { skipMembershipStatus: boolean; noFreeTrial?: boolean }
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
        console.error('[verifyTokenAndMembership] JWT verification error:', err);
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }
      if (!decoded) {
        console.error('[verifyTokenAndMembership] No decoded JWT payload');
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
        relations.push(
          ...(options.noFreeTrial
            ? ['account_membership_status', 'account_membership_status.account_membership']
            : ['account_membership_status'])
        );
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

        if (
          !membershipStatus ||
          !membershipStatus.membership_expires_at ||
          new Date(membershipStatus.membership_expires_at) < new Date()
        ) {
          console.warn(
            '[verifyTokenAndMembership] Membership expired or missing for user id:',
            req.user.id
          );
          res.status(403).json({ message: 'Membership expired' });
          return;
        }

        if (options.noFreeTrial && config.serverEnv === 'prod') {
          const accountMembership = membershipStatus.account_membership;
          if (accountMembership && accountMembership.id === AccountMembershipEnum.Trial) {
            res.status(403).json({
              message:
                'This feature is only available to premium accounts and is not available to free trials',
              i18nKey: 'membership.free_trial_not_allowed',
            });
            return;
          }
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
  options: { skipMembershipStatus: boolean; noFreeTrial?: boolean }
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
  options: { skipMembershipStatus: boolean; noFreeTrial?: boolean }
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
