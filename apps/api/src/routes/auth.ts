import { config } from '@api/config/index.js';
import { AccountController } from '@api/controllers/account/account.js';
import {
  authenticate,
  issueMobileToken,
  logout,
  refreshMobileToken,
  revokeMobileToken,
} from '@api/lib/auth/index.js';
import { rateLimitEndpoint } from '@api/lib/rateLimiter.js';
import { asyncHandler } from '@api/middleware/asyncHandler.js';
import { Router } from 'express';

const router = Router();

router.use(`${config.api.prefix}${config.api.version}/auth`, router);

router.post('/login', rateLimitEndpoint(config.rateLimits.authLogin), authenticate);
router.post('/logout', logout);
router.post('/mobile/token', asyncHandler(issueMobileToken));
router.post('/mobile/refresh', asyncHandler(refreshMobileToken));
router.post('/mobile/revoke', revokeMobileToken);

router.get('/me', asyncHandler(AccountController.getLoggedInAccount));
router.get('/check-session', asyncHandler(AccountController.checkIfValidAuthSession));

export const authRouter = router;
