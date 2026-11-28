import { config } from '@management-api/config/index.js';
import { loggerService } from '@management-api/factories/loggerService.js';
import { AdminAccountService } from '@management-api/orm/services/adminAccount.js';
import bcrypt from 'bcrypt';
import type { Request, Response } from 'express';

import {
  appCodeMatchesFactor,
  beginEnrollment,
  clearSecondFactor,
  confirmEnrollment,
  failSetupChallenge,
  finishSetupChallenge,
  issueEmailCode,
  readSecondFactorStatus,
  readSetupChallenge,
  regenerateBackupCodes,
  SECOND_FACTOR_MAX_ATTEMPTS,
  submitLoginCode,
} from '@podverse/helpers-backend';

import { sendSecondFactorCodeEmail } from '../mailer/sendSecondFactorCodeEmail.js';
import { endAdminSessions, startAdminSession } from './adminSessionStore.js';
import { clearAuthCookie, completeManagementWebLogin } from './index.js';
import { SecondFactorUnavailableError } from './secondFactorGate.js';
import {
  clearSettingsCodeFailures,
  managementSecondFactorDeps,
  noteSettingsCodeFailure,
  settingsCodeAttempts,
} from './secondFactorRuntime.js';
import { signMobileTokenPair } from './sessionTokens.js';

function readBodyString(body: unknown, key: string): string {
  if (typeof body !== 'object' || body === null) {
    return '';
  }
  const value: unknown = Reflect.get(body, key);
  return typeof value === 'string' ? value.trim() : '';
}

function rateLimitBody(retryAfterMs: number): {
  tooManyRequests: true;
  timeUntilResetMs: number;
  minutesRemaining: number;
} {
  const minutesRemainingRaw = Math.ceil(retryAfterMs / 60000);
  return {
    tooManyRequests: true,
    timeUntilResetMs: retryAfterMs,
    minutesRemaining: minutesRemainingRaw < 1 ? 1 : minutesRemainingRaw,
  };
}

async function adminForFactor(ownerId: number): Promise<{
  idText: string;
  label: string;
  email: string | null;
  passwordHash: string | null;
} | null> {
  const admin = await new AdminAccountService().get(ownerId, {
    relations: { admin_account_credentials: true },
  });
  if (admin === null || !admin.id_text) {
    return null;
  }
  const email = admin.admin_account_credentials?.email ?? null;
  const username = admin.admin_account_credentials?.username ?? null;
  return {
    idText: admin.id_text,
    label: email ?? username ?? admin.id_text,
    email,
    passwordHash: admin.admin_account_credentials?.password ?? null,
  };
}

async function runSecondFactor(res: Response, action: () => Promise<void>): Promise<void> {
  try {
    await action();
  } catch (error) {
    loggerService.logError('Second factor request failed', error);
    if (res.headersSent) {
      return;
    }
    const unavailable = error instanceof SecondFactorUnavailableError;
    res.status(unavailable ? 503 : 500).json({
      message: unavailable ? 'Second factor is unavailable' : 'Internal server error',
    });
  }
}

async function finishLogin(
  req: Request,
  res: Response,
  ownerId: number,
  client: 'web' | 'mobile',
  deviceLabel: string | null,
  backupCodes?: string[]
): Promise<void> {
  const admin = await adminForFactor(ownerId);
  if (admin === null) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }
  if (client === 'web') {
    await completeManagementWebLogin(
      req,
      res,
      { id: ownerId, id_text: admin.idText },
      backupCodes === undefined ? undefined : { backupCodes }
    );
    return;
  }
  const started = await startAdminSession({
    adminAccountId: ownerId,
    clientType: 'mobile',
    deviceLabel,
    withRefreshToken: true,
  });
  if (started.refreshTokenId === null) {
    throw new Error('Mobile admin session started without a refresh token id');
  }
  res.json({
    ...signMobileTokenPair({
      adminId: ownerId,
      adminIdText: admin.idText,
      sessionIdText: started.sessionIdText,
      refreshTokenId: started.refreshTokenId,
    }),
    ...(backupCodes === undefined ? {} : { backupCodes }),
  });
}

export async function submitSecondFactorCode(req: Request, res: Response): Promise<void> {
  await runSecondFactor(res, async () => {
    const challengeToken = readBodyString(req.body, 'challengeToken');
    const code = readBodyString(req.body, 'code');
    if (challengeToken === '' || code === '') {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }
    const result = await submitLoginCode(managementSecondFactorDeps(), { challengeToken, code });
    if (!result.ok) {
      res
        .status(401)
        .json(
          result.burned
            ? { message: 'Unauthorized', challenge: 'expired' }
            : { message: 'Unauthorized' }
        );
      return;
    }
    await finishLogin(req, res, result.ownerId, result.client, result.deviceLabel);
  });
}

export async function sendSecondFactorEmail(req: Request, res: Response): Promise<void> {
  await runSecondFactor(res, async () => {
    if (config.mailer.host === '') {
      res.status(503).json({ message: 'Email codes are not available' });
      return;
    }
    const challengeToken = readBodyString(req.body, 'challengeToken');
    const issued = await issueEmailCode(managementSecondFactorDeps(), {
      challengeToken,
      ip: req.ip ?? 'unknown',
    });
    if (issued.status === 'invalid') {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }
    if (issued.status === 'rate_limited') {
      res.status(429).json(rateLimitBody(issued.retryAfterMs));
      return;
    }
    const admin = await adminForFactor(issued.ownerId);
    if (admin === null || admin.email === null || admin.email === '') {
      res.status(400).json({ message: 'This account has no email address' });
      return;
    }
    const sent = await sendSecondFactorCodeEmail({ email: admin.email, code: issued.code });
    if (sent !== 'sent') {
      res.status(503).json({ message: 'Email codes are not available' });
      return;
    }
    res.json({ message: 'Code sent' });
  });
}

export async function beginSecondFactorSetup(req: Request, res: Response): Promise<void> {
  await runSecondFactor(res, async () => {
    const setupToken = readBodyString(req.body, 'setupToken');
    const deps = managementSecondFactorDeps();
    const existing = await readSetupChallenge(deps, setupToken);
    if (existing === null) {
      res.status(401).json({ message: 'Unauthorized', challenge: 'expired' });
      return;
    }
    const admin = await adminForFactor(existing.ownerId);
    if (admin === null) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }
    const started = await beginEnrollment(deps, {
      ownerId: existing.ownerId,
      accountName: admin.label,
    });
    res.json({
      setupToken,
      qrDataUrl: started.qrDataUrl,
      manualKey: started.manualKey,
    });
  });
}

export async function confirmSecondFactorSetup(req: Request, res: Response): Promise<void> {
  await runSecondFactor(res, async () => {
    const setupToken = readBodyString(req.body, 'setupToken');
    const code = readBodyString(req.body, 'code');
    const deps = managementSecondFactorDeps();
    const existing = await readSetupChallenge(deps, setupToken);
    if (existing === null) {
      res.status(401).json({ message: 'Unauthorized', challenge: 'expired' });
      return;
    }
    const confirmed = await confirmEnrollment(deps, { ownerId: existing.ownerId, code });
    if (!confirmed.ok) {
      const failure = await failSetupChallenge(deps, setupToken);
      res
        .status(401)
        .json(
          failure === 'again'
            ? { message: 'Unauthorized' }
            : { message: 'Unauthorized', challenge: 'expired' }
        );
      return;
    }
    await finishSetupChallenge(deps, setupToken);
    await finishLogin(
      req,
      res,
      existing.ownerId,
      existing.client,
      existing.deviceLabel,
      confirmed.backupCodes
    );
  });
}

export async function readSecondFactorSettings(req: Request, res: Response): Promise<void> {
  const admin = req.user;
  if (!admin) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }
  await runSecondFactor(res, async () => {
    const status = await readSecondFactorStatus(managementSecondFactorDeps(), admin.id);
    res.json({
      mode: config.secondFactor.mode(),
      enrolled: status.enrolled,
      backupCodesRemaining: status.backupCodesRemaining,
    });
  });
}

export async function beginSecondFactorEnroll(req: Request, res: Response): Promise<void> {
  const admin = req.user;
  if (!admin) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }
  await runSecondFactor(res, async () => {
    const account = await adminForFactor(admin.id);
    if (account === null) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }
    const started = await beginEnrollment(managementSecondFactorDeps(), {
      ownerId: admin.id,
      accountName: account.label,
    });
    res.json({ qrDataUrl: started.qrDataUrl, manualKey: started.manualKey });
  });
}

export async function confirmSecondFactorEnroll(req: Request, res: Response): Promise<void> {
  const admin = req.user;
  if (!admin) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }
  await runSecondFactor(res, async () => {
    if ((await settingsCodeAttempts(admin.id)) >= SECOND_FACTOR_MAX_ATTEMPTS) {
      res.status(401).json({ message: 'Unauthorized', challenge: 'expired' });
      return;
    }
    const confirmed = await confirmEnrollment(managementSecondFactorDeps(), {
      ownerId: admin.id,
      code: readBodyString(req.body, 'code'),
    });
    if (!confirmed.ok) {
      const burned = await noteSettingsCodeFailure(admin.id);
      res
        .status(401)
        .json(
          burned ? { message: 'Unauthorized', challenge: 'expired' } : { message: 'Unauthorized' }
        );
      return;
    }
    await clearSettingsCodeFailures(admin.id);
    res.json({ backupCodes: confirmed.backupCodes });
  });
}

export async function disableAdminSecondFactor(req: Request, res: Response): Promise<void> {
  const admin = req.user;
  if (!admin) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }
  await runSecondFactor(res, async () => {
    if (config.secondFactor.mode() === 'required') {
      res.status(403).json({ message: 'Forbidden' });
      return;
    }
    const account = await adminForFactor(admin.id);
    if (account?.passwordHash === null || account?.passwordHash === undefined) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }
    const passwordMatches = await bcrypt.compare(
      readBodyString(req.body, 'password'),
      account.passwordHash
    );
    if (!passwordMatches) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }
    const codeMatches = await appCodeMatchesFactor(
      managementSecondFactorDeps(),
      admin.id,
      readBodyString(req.body, 'code')
    );
    if (!codeMatches) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }
    await clearSecondFactor(managementSecondFactorDeps(), admin.id);
    await endAdminSessions({
      adminAccountId: admin.id,
      reason: 'signed_out_elsewhere',
      exceptSessionIdText: null,
    });
    clearAuthCookie(res);
    res.json({ message: 'Second factor removed' });
  });
}

export async function regenerateAdminBackupCodes(req: Request, res: Response): Promise<void> {
  const admin = req.user;
  if (!admin) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }
  await runSecondFactor(res, async () => {
    const codes = await regenerateBackupCodes(managementSecondFactorDeps(), {
      ownerId: admin.id,
      code: readBodyString(req.body, 'code'),
    });
    if (codes === null) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }
    res.json({ backupCodes: codes });
  });
}

export async function clearOtherAdminSecondFactor(adminAccountId: number): Promise<void> {
  await clearSecondFactor(managementSecondFactorDeps(), adminAccountId);
  await endAdminSessions({
    adminAccountId,
    reason: 'signed_out_elsewhere',
    exceptSessionIdText: null,
  });
}
