/**
 * Sessions: JWT TTL/cookie max-age use AUTH_JWT_EXPIRATION (seconds). Login JSON includes `token`
 * only when AUTH_ALLOW_TOKEN_IN_RESPONSE_BODY=true and the client sends includeTokenInResponseBody.
 */
import type { AuthenticatedAdmin } from '@mgmt-api/@types/express.js';
import { config } from '@mgmt-api/config/index.js';
import type { AdminAccount } from '@mgmt-api/orm/entities/adminAccount.js';
import { AdminAccountService } from '@mgmt-api/orm/services/adminAccount.js';
import type { CookieOptions, NextFunction, Request, Response } from 'express';
import jwt, { type SignOptions } from 'jsonwebtoken';
import passport from 'passport';
import { ExtractJwt, Strategy as JwtStrategy } from 'passport-jwt';
import { Strategy as LocalStrategy } from 'passport-local';

import { isValidNanoIdV2IdText } from '@podverse/orm';

const isProduction = config.nodeEnv === 'production';
const ADMIN_AUTH_COOKIE_NAME = 'pv_mgmt_auth';

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

const adminAccountService = new AdminAccountService();

/** Prefer Bearer over cookie so programmatic clients/tests are not overridden by a stale browser cookie. */
function getAuthTokenFromRequest(req: Request): string | undefined {
  const authorization = req.headers.authorization;
  if (typeof authorization === 'string' && authorization.length > 0) {
    const bearerMatch = /^Bearer\s+(\S+)/i.exec(authorization);
    if (bearerMatch?.[1] !== undefined && bearerMatch[1].length > 0) {
      return bearerMatch[1];
    }
  }
  const cookieToken = req.cookies[ADMIN_AUTH_COOKIE_NAME];
  if (typeof cookieToken === 'string' && cookieToken.length > 0) {
    return cookieToken;
  }
  return undefined;
}

function mapAdminToAuthenticatedUser(admin: AdminAccount): AuthenticatedAdmin | null {
  if (!admin.admin_account_role) {
    return null;
  }
  return {
    id: admin.id,
    id_text: admin.id_text,
    email: admin.admin_account_credentials?.email ?? '',
    admin_account_role_id: admin.admin_account_role_id,
    role: admin.admin_account_role.role,
    permissions: admin.permissions
      ? {
          feeds_crud: admin.permissions.feedsCrud,
          feed_takedown_reasons_crud: admin.permissions.feedTakedownReasonsCrud,
          admins_crud: admin.permissions.adminsCrud,
          stats_crud: admin.permissions.statsCrud,
          billing_prices_crud: admin.permissions.billingPricesCrud,
        }
      : null,
  };
}

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

        const adminAccount = await adminAccountService.verifyPassword(email, password);
        if (!adminAccount) {
          return done(null, false, { message: 'Invalid credentials.' });
        }

        const withRelations = await adminAccountService.getWithRoleAndPermissions(adminAccount.id);
        if (!withRelations) {
          return done(null, false, { message: 'Invalid credentials.' });
        }
        const user = mapAdminToAuthenticatedUser(withRelations);
        if (!user) {
          return done(null, false, { message: 'Invalid credentials.' });
        }

        return done(null, user);
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
    async (jwtPayload: { id?: number; id_text?: string }, done) => {
      try {
        if (
          jwtPayload.id === undefined ||
          jwtPayload.id_text === undefined ||
          jwtPayload.id_text === ''
        ) {
          return done(null, false);
        }
        if (!isValidNanoIdV2IdText(jwtPayload.id_text)) {
          return done(null, false);
        }
        const adminAccount = await adminAccountService.getWithRoleAndPermissions(jwtPayload.id);
        if (adminAccount && adminAccount.id_text === jwtPayload.id_text) {
          const user = mapAdminToAuthenticatedUser(adminAccount);
          if (user) {
            return done(null, user);
          }
          return done(null, false);
        } else {
          return done(null, false);
        }
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
    const adminAccount = await adminAccountService.getWithRoleAndPermissions(id);
    if (!adminAccount) {
      done(null, null);
      return;
    }
    const user = mapAdminToAuthenticatedUser(adminAccount);
    done(null, user);
  } catch (error) {
    done(error);
  }
});

export const initializePassport = () => passport.initialize();

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  passport.authenticate(
    'local',
    { session: false },
    (err: Error, user: { id: number; id_text: string } | false, info: { message: string }) => {
      if (err) {
        return next(err);
      }
      if (!user) {
        return res.status(401).json({ message: info?.message || 'Unauthorized' });
      }

      const token = jwt.sign({ id: user.id, id_text: user.id_text }, config.auth.jwtSecret, {
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

const verifyToken = (req: Request, res: Response, next: NextFunction, token: string): void => {
  interface DecodedToken {
    id: number;
    id_text?: string;
    [key: string]: unknown;
  }
  jwt.verify(
    token,
    config.auth.jwtSecret,
    async (err: jwt.VerifyErrors | null, decoded: unknown) => {
      if (err) {
        if (!res.headersSent) {
          res.status(401).json({ message: 'Unauthorized' });
        }
        return;
      }
      if (!decoded) {
        if (!res.headersSent) {
          res.status(401).json({ message: 'Unauthorized' });
        }
        return;
      }
      const payload = decoded as DecodedToken;
      if (payload.id_text === undefined || payload.id_text === '') {
        if (!res.headersSent) {
          res.status(401).json({ message: 'Unauthorized' });
        }
        return;
      }
      if (!isValidNanoIdV2IdText(payload.id_text)) {
        if (!res.headersSent) {
          res.status(401).json({ message: 'Unauthorized' });
        }
        return;
      }
      if (
        typeof payload.id !== 'number' ||
        !Number.isInteger(payload.id) ||
        !Number.isFinite(payload.id) ||
        payload.id <= 0
      ) {
        console.error('[verifyToken] Decoded JWT missing user id');
        if (!res.headersSent) {
          res.status(401).json({ message: 'Unauthorized' });
        }
        return;
      }

      const adminAccount = await adminAccountService.getWithRoleAndPermissions(payload.id);
      if (!adminAccount) {
        console.error('[verifyToken] No admin account found for user id:', payload.id);
        if (!res.headersSent) {
          res.status(401).json({ message: 'Unauthorized' });
        }
        return;
      }
      if (adminAccount.id_text !== payload.id_text) {
        if (!res.headersSent) {
          res.status(401).json({ message: 'Unauthorized' });
        }
        return;
      }

      const user = mapAdminToAuthenticatedUser(adminAccount);
      if (!user) {
        console.error('[verifyToken] Admin account missing role relation');
        if (!res.headersSent) {
          res.status(401).json({ message: 'Unauthorized' });
        }
        return;
      }

      req.user = user;

      next();
    }
  );
};

export const ensureAuthenticated = (req: Request, res: Response, next: NextFunction): void => {
  const token = getAuthTokenFromRequest(req);
  if (!token) {
    if (!res.headersSent) {
      res.status(401).json({ message: 'Unauthorized' });
    }
    return;
  }
  verifyToken(req, res, next, token);
};

export const logout = (_req: Request, res: Response) => {
  res.clearCookie(ADMIN_AUTH_COOKIE_NAME, {
    path: '/',
  });

  if (isProduction) {
    res.clearCookie(ADMIN_AUTH_COOKIE_NAME, {
      path: '/',
      domain: config.api.cookie.domain,
    });
  }

  return res.json({ message: 'Logged out successfully' });
};
