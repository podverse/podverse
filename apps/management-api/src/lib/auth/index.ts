import { Request, Response, NextFunction, CookieOptions } from 'express';
import jwt from 'jsonwebtoken';
import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt';
import { config } from '@mgmt-api/config';
import { AdminAccountService } from '@mgmt-api/orm/services/adminAccount';

const isProduction = config.nodeEnv === 'production';
const ADMIN_AUTH_COOKIE_NAME = 'pv_mgmt_auth';

const setAuthCookie = (res: Response, token: string) => {
  if (isProduction) {
    const prodCookieOptions: CookieOptions = {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      domain: config.api.cookie.domain,
      path: '/',
      maxAge: 365 * 24 * 60 * 60 * 1000,
    };
    res.cookie(ADMIN_AUTH_COOKIE_NAME, token, prodCookieOptions);
  } else {
    res.cookie(ADMIN_AUTH_COOKIE_NAME, token, {
      httpOnly: true,
      secure: false,
      sameSite: 'strict',
      path: '/',
      maxAge: 365 * 24 * 60 * 60 * 1000,
    });
  }
};

const adminAccountService = new AdminAccountService();

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

        return done(null, adminAccount);
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
    async (jwtPayload, done) => {
      try {
        const adminAccount = await adminAccountService.get(jwtPayload.id);
        if (adminAccount) {
          return done(null, adminAccount);
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
    const adminAccount = await adminAccountService.get(id);
    done(null, adminAccount);
  } catch (error) {
    done(error);
  }
});

export const initializePassport = () => passport.initialize();

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  passport.authenticate(
    'local',
    { session: false },
    (err: Error, user: Express.User, info: { message: string }) => {
      if (err) {
        return next(err);
      }
      if (!user) {
        return res.status(401).json({ message: info?.message || 'Unauthorized' });
      }

      const token = jwt.sign({ id: user.id }, config.auth.jwtSecret, { expiresIn: '365d' });

      setAuthCookie(res, token);

      const response: { message: string; token?: string } = {
        message: 'Authenticated successfully',
      };
      if (req.body.includeTokenInResponseBody) {
        response['token'] = token;
      }

      return res.json(response);
    }
  )(req, res, next);
};

const verifyToken = (req: Request, res: Response, next: NextFunction, token: string): void => {
  interface DecodedToken {
    id: number;
    [key: string]: unknown;
  }
  jwt.verify(
    token,
    config.auth.jwtSecret,
    async (err: jwt.VerifyErrors | null, decoded: unknown) => {
      if (err) {
        console.error('[verifyToken] JWT verification error:', err);
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }
      if (!decoded) {
        console.error('[verifyToken] No decoded JWT payload');
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }
      const payload = decoded as DecodedToken;
      req.user = { id: payload.id } as Express.User;

      if (!req?.user?.id) {
        console.error('[verifyToken] Decoded JWT missing user id');
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }

      const adminAccount = await adminAccountService.get(req.user.id);
      if (!adminAccount) {
        console.error('[verifyToken] No admin account found for user id:', req.user.id);
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }

      next();
    }
  );
};

export const ensureAuthenticated = (req: Request, res: Response, next: NextFunction): void => {
  const token = req.cookies[ADMIN_AUTH_COOKIE_NAME] || req.headers.authorization?.split(' ')[1];
  if (!token) {
    res.status(401).json({ message: 'Unauthorized' });
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
