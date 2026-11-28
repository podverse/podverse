import { config } from '@api/config/index.js';
import { AccountController } from '@api/controllers/account/account.js';
import { AccountApiKeyController } from '@api/controllers/account/accountApiKey.js';
import { AccountSessionController } from '@api/controllers/account/accountSession.js';
import {
  authenticate,
  issueMobileToken,
  logout,
  refreshMobileToken,
  revokeMobileToken,
} from '@api/lib/auth/index.js';
import {
  beginSecondFactorEnroll,
  beginSecondFactorSetup,
  confirmSecondFactorEnroll,
  confirmSecondFactorSetup,
  disableAccountSecondFactor,
  readSecondFactorSettings,
  regenerateAccountBackupCodes,
  sendSecondFactorEmail,
  submitSecondFactorCode,
} from '@api/lib/auth/secondFactorHttp.js';
import { rateLimitEndpoint } from '@api/lib/rateLimiter.js';
import { asyncHandler } from '@api/middleware/asyncHandler.js';
import { Router } from 'express';

const router = Router();

router.use(`${config.api.prefix}${config.api.version}/auth`, router);

router.post('/login', rateLimitEndpoint(config.rateLimits.authLogin), authenticate);
router.post(
  '/second-factor/code',
  rateLimitEndpoint(config.rateLimits.authLogin),
  asyncHandler(submitSecondFactorCode)
);
router.post(
  '/second-factor/email',
  rateLimitEndpoint(config.rateLimits.authLogin),
  asyncHandler(sendSecondFactorEmail)
);
router.post(
  '/second-factor/setup',
  rateLimitEndpoint(config.rateLimits.authLogin),
  asyncHandler(beginSecondFactorSetup)
);
router.post(
  '/second-factor/setup/confirm',
  rateLimitEndpoint(config.rateLimits.authLogin),
  asyncHandler(confirmSecondFactorSetup)
);
router.get('/second-factor', readSecondFactorSettings);
router.post('/second-factor/enroll', beginSecondFactorEnroll);
router.post('/second-factor/enroll/confirm', confirmSecondFactorEnroll);
router.post('/second-factor/disable', disableAccountSecondFactor);
router.post('/second-factor/backup-codes', regenerateAccountBackupCodes);
router.post('/logout', logout);
router.post('/mobile/token', asyncHandler(issueMobileToken));
router.post('/mobile/refresh', asyncHandler(refreshMobileToken));
router.post('/mobile/revoke', revokeMobileToken);

router.get('/me', asyncHandler(AccountController.getLoggedInAccount));
router.get('/check-session', asyncHandler(AccountController.checkIfValidAuthSession));
router.get('/sessions', asyncHandler(AccountSessionController.list));
router.post('/sessions/revoke-others', asyncHandler(AccountSessionController.revokeOthers));
router.delete('/sessions/:session_id_text', asyncHandler(AccountSessionController.revoke));

router.get('/api-keys', asyncHandler(AccountApiKeyController.list));
router.post('/api-keys', asyncHandler(AccountApiKeyController.create));
router.delete('/api-keys/:api_key_id_text', asyncHandler(AccountApiKeyController.revoke));

export const authRouter = router;
