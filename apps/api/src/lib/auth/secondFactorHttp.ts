import { config } from '@api/config/index.js';
import { loggerService } from '@api/factories/loggerService.js';
import type { NextFunction, Request, Response } from 'express';

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
import { AccountService } from '@podverse/orm';

import { sendSecondFactorCodeEmail } from '../mailer/sendSecondFactorCodeEmail.js';
import { buildRateLimit429Body } from '../rateLimitPayload.js';
import { endAccountSessions, startAccountSession } from './accountSessionStore.js';
import {
  clearAuthCookie,
  completeWebLogin,
  ensureAuthenticated,
  getAuthenticatedUser,
} from './index.js';
import { verifyPassword } from './password.js';
import { SecondFactorUnavailableError } from './secondFactorGate.js';
import {
  clearSettingsCodeFailures,
  mainSecondFactorDeps,
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

function clientIp(req: Request): string {
  return req.ip ?? 'unknown';
}

async function accountForFactor(ownerId: number): Promise<{
  idText: string;
  label: string;
  email: string | null;
  passwordHash: string | null;
} | null> {
  const account = await new AccountService().get(ownerId, {
    relations: { account_credentials: true },
  });
  if (account === null || account.id_text === '') {
    return null;
  }
  const email = account.account_credentials?.email ?? null;
  const username = account.account_credentials?.username ?? null;
  return {
    idText: account.id_text,
    label: email ?? username ?? account.id_text,
    email,
    passwordHash: account.account_credentials?.password ?? null,
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
  const account = await accountForFactor(ownerId);
  if (account === null) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }
  if (client === 'web') {
    await completeWebLogin(
      req,
      res,
      { id: ownerId, id_text: account.idText },
      backupCodes === undefined ? undefined : { backupCodes }
    );
    return;
  }
  const started = await startAccountSession({
    accountId: ownerId,
    clientType: 'mobile',
    deviceLabel,
    withRefreshToken: true,
  });
  if (started.refreshTokenId === null) {
    throw new Error('Mobile session started without a refresh token id');
  }
  res.json({
    ...signMobileTokenPair({
      accountId: ownerId,
      accountIdText: account.idText,
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
    const result = await submitLoginCode(mainSecondFactorDeps(), { challengeToken, code });
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
    if (config.mailer.disabled || config.mailer.host === '') {
      res.status(503).json({ message: 'Email codes are not available' });
      return;
    }
    const challengeToken = readBodyString(req.body, 'challengeToken');
    const issued = await issueEmailCode(mainSecondFactorDeps(), {
      challengeToken,
      ip: clientIp(req),
    });
    if (issued.status === 'invalid') {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }
    if (issued.status === 'rate_limited') {
      res.status(429).json(buildRateLimit429Body(issued.retryAfterMs));
      return;
    }
    const account = await accountForFactor(issued.ownerId);
    if (account?.email === null || account?.email === undefined || account.email === '') {
      res.status(400).json({ message: 'This account has no email address' });
      return;
    }
    const sent = await sendSecondFactorCodeEmail({ email: account.email, code: issued.code });
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
    const deps = mainSecondFactorDeps();
    const existing = await readSetupChallenge(deps, setupToken);
    if (existing === null) {
      res.status(401).json({ message: 'Unauthorized', challenge: 'expired' });
      return;
    }
    const account = await accountForFactor(existing.ownerId);
    if (account === null) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }
    const started = await beginEnrollment(deps, {
      ownerId: existing.ownerId,
      accountName: account.label,
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
    const deps = mainSecondFactorDeps();
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

function withAccount(
  req: Request,
  res: Response,
  _next: NextFunction,
  action: (accountId: number) => Promise<void>
): void {
  ensureAuthenticated(
    req,
    res,
    () => {
      void runSecondFactor(res, () => action(getAuthenticatedUser(req).id));
    },
    { skipMembershipStatus: true, skipTermsAcceptance: true }
  );
}

export function readSecondFactorSettings(req: Request, res: Response, next: NextFunction): void {
  withAccount(req, res, next, async (accountId) => {
    const status = await readSecondFactorStatus(mainSecondFactorDeps(), accountId);
    res.json({
      mode: config.secondFactor.mode(),
      enrolled: status.enrolled,
      backupCodesRemaining: status.backupCodesRemaining,
    });
  });
}

export function beginSecondFactorEnroll(req: Request, res: Response, next: NextFunction): void {
  withAccount(req, res, next, async (accountId) => {
    const account = await accountForFactor(accountId);
    if (account === null) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }
    const started = await beginEnrollment(mainSecondFactorDeps(), {
      ownerId: accountId,
      accountName: account.label,
    });
    res.json({ qrDataUrl: started.qrDataUrl, manualKey: started.manualKey });
  });
}

export function confirmSecondFactorEnroll(req: Request, res: Response, next: NextFunction): void {
  withAccount(req, res, next, async (accountId) => {
    if ((await settingsCodeAttempts(accountId)) >= SECOND_FACTOR_MAX_ATTEMPTS) {
      res.status(401).json({ message: 'Unauthorized', challenge: 'expired' });
      return;
    }
    const confirmed = await confirmEnrollment(mainSecondFactorDeps(), {
      ownerId: accountId,
      code: readBodyString(req.body, 'code'),
    });
    if (!confirmed.ok) {
      const burned = await noteSettingsCodeFailure(accountId);
      res
        .status(401)
        .json(
          burned ? { message: 'Unauthorized', challenge: 'expired' } : { message: 'Unauthorized' }
        );
      return;
    }
    await clearSettingsCodeFailures(accountId);
    res.json({ backupCodes: confirmed.backupCodes });
  });
}

export function disableAccountSecondFactor(req: Request, res: Response, next: NextFunction): void {
  withAccount(req, res, next, async (accountId) => {
    if (config.secondFactor.mode() === 'required') {
      res.status(403).json({ message: 'Forbidden' });
      return;
    }
    const account = await accountForFactor(accountId);
    if (account?.passwordHash === null || account?.passwordHash === undefined) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }
    const passwordMatches = await verifyPassword(
      readBodyString(req.body, 'password'),
      account.passwordHash
    );
    if (!passwordMatches) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }
    const codeMatches = await appCodeMatchesFactor(
      mainSecondFactorDeps(),
      accountId,
      readBodyString(req.body, 'code')
    );
    if (!codeMatches) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }
    await clearSecondFactor(mainSecondFactorDeps(), accountId);
    await endAccountSessions({
      accountId,
      reason: 'signed_out_elsewhere',
      exceptSessionIdText: null,
    });
    clearAuthCookie(res);
    res.json({ message: 'Second factor removed' });
  });
}

export function regenerateAccountBackupCodes(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  withAccount(req, res, next, async (accountId) => {
    const codes = await regenerateBackupCodes(mainSecondFactorDeps(), {
      ownerId: accountId,
      code: readBodyString(req.body, 'code'),
    });
    if (codes === null) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }
    res.json({ backupCodes: codes });
  });
}
