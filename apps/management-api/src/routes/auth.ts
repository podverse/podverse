import { config } from '@management-api/config/index.js';
import {
  listAdminSessionsHttp,
  revokeAdminSessionHttp,
  revokeOtherAdminSessionsHttp,
} from '@management-api/lib/auth/adminSessionHttp.js';
import {
  authenticate,
  ensureAuthenticated,
  issueMobileToken,
  logout,
  refreshMobileToken,
  revokeMobileToken,
} from '@management-api/lib/auth/index.js';
import {
  beginSecondFactorEnroll,
  beginSecondFactorSetup,
  confirmSecondFactorEnroll,
  confirmSecondFactorSetup,
  disableAdminSecondFactor,
  readSecondFactorSettings,
  regenerateAdminBackupCodes,
  sendSecondFactorEmail,
  submitSecondFactorCode,
} from '@management-api/lib/auth/secondFactorHttp.js';
import express from 'express';

const router = express.Router();

router.post('/login', authenticate);
router.post('/second-factor/code', submitSecondFactorCode);
router.post('/second-factor/email', sendSecondFactorEmail);
router.post('/second-factor/setup', beginSecondFactorSetup);
router.post('/second-factor/setup/confirm', confirmSecondFactorSetup);
router.get('/second-factor', ensureAuthenticated, readSecondFactorSettings);
router.post('/second-factor/enroll', ensureAuthenticated, beginSecondFactorEnroll);
router.post('/second-factor/enroll/confirm', ensureAuthenticated, confirmSecondFactorEnroll);
router.post('/second-factor/disable', ensureAuthenticated, disableAdminSecondFactor);
router.post('/second-factor/backup-codes', ensureAuthenticated, regenerateAdminBackupCodes);

router.post('/logout', logout);
router.post('/mobile/token', issueMobileToken);
router.post('/mobile/refresh', refreshMobileToken);
router.post('/mobile/revoke', revokeMobileToken);

router.get('/me', ensureAuthenticated, (req, res) => {
  const admin = req.user;
  if (!admin) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  res.json({
    id: admin.id,
    id_text: admin.id_text,
    email: admin.email,
    username: admin.username,
    role: admin.role,
    permissions: admin.permissions,
  });
});

router.get('/sessions', ensureAuthenticated, (req, res, next) => {
  void listAdminSessionsHttp(req, res).catch(next);
});
// Literal path, registered before `:session_id_text` so that param does not capture it.
router.post('/sessions/revoke-others', ensureAuthenticated, (req, res, next) => {
  void revokeOtherAdminSessionsHttp(req, res).catch(next);
});
router.delete('/sessions/:session_id_text', ensureAuthenticated, (req, res, next) => {
  void revokeAdminSessionHttp(req, res).catch(next);
});

const authRoot = express.Router();
authRoot.use(`${config.api.prefix}${config.api.version}/auth`, router);
export const authRouter = authRoot;
