import { config } from '@api/config/index.js';
import { loggerService } from '@api/factories/loggerService.js';
import type { CookieOptions, NextFunction, Request, Response } from 'express';
import passport from 'passport';

import type {
  AccountEntitlementCapability,
  ApiKeyPermissionRequirement,
  AuthSessionEndedNotice,
} from '@podverse/helpers';
import {
  AccountMembershipEnum,
  API_KEY_ERROR_CODES,
  apiKeyPermissionsAllow,
  APP_ROUTES,
  AUTH_SESSION_ENDED_CODE,
  AuthCookieName,
  BILLING_CLIENT_PLATFORM_HEADER,
  COOKIE_WRITE_INTENT_HEADER,
  cookieAuthenticatedWriteLacksIntent,
  ERROR_MESSAGES,
  hasValidMembership,
  membershipStoresListens,
  MS_PER_SECOND,
} from '@podverse/helpers';
import type { AccountSessionRow, FindOptionsRelations } from '@podverse/orm';
import {
  Account,
  AccountService,
  BillingPriceCatalogService,
  findOptionsRelationsFromPaths,
  mergeFindOptionsRelations,
} from '@podverse/orm';

import { accountHasCapability, getAccountEntitlements } from '../accountEntitlements.js';
import {
  checkAccountSession,
  endAccountSession,
  renewAccountSession,
  rotateMobileRefreshToken,
  startAccountSession,
} from './accountSessionStore.js';
import type { ApiKeyCheck } from './apiKeyStore.js';
import { checkApiKey, recordApiKeyUse } from './apiKeyStore.js';
import { deviceLabelForMobile, deviceLabelFromUserAgent } from './deviceLabel.js';
import { verifyPassword } from './password.js';
import { gatePasswordLogin, SecondFactorUnavailableError } from './secondFactorGate.js';
import type { RequestToken } from './sessionTokens.js';
import {
  classifyAccessJwt,
  classifyRefreshJwt,
  readRequestToken,
  signMobileTokenPair,
  signWebSessionToken,
  verifySessionJwt,
} from './sessionTokens.js';

/**
 * Every login starts an `account_session` row, and every token names that row in its `sid` claim.
 * Web gets one token in the `jwt` cookie. Token clients (the mobile app) get a short access token
 * for requests and a refresh token that rotates on every refresh. Each authenticated request
 * checks the row, so ending a session takes effect on that session's next request; rotating
 * AUTH_JWT_SECRET ends every session at once.
 *
 * Use renews a session at most once per ACCOUNT_SESSION_RENEW_INTERVAL_MS, moving its idle expiry
 * AUTH_SESSION_IDLE_EXPIRATION past that use. A web cookie is re-signed when its row renews; a
 * mobile refresh renews the row and issues a refresh token with a fresh expiry.
 *
 * Login responses omit `token` unless AUTH_ALLOW_TOKEN_IN_RESPONSE_BODY=true and the client sends
 * includeTokenInResponseBody.
 *
 * An API key (`Authorization: Bearer pvk_…`) is a third credential. It names no session: it is
 * checked against its own row, never renewed, and recorded as used at most once per
 * API_KEY_LAST_USED_INTERVAL_MS.
 */
const isProduction = config.nodeEnv === 'production';
const MEMBERSHIP_EXPIRED_I18N_KEY = 'membership.membership_expired';

export type AuthenticatedRequestOptions = {
  skipMembershipStatus: boolean;
  skipTermsAcceptance?: boolean;
  requiredCapability?: AccountEntitlementCapability;
  /**
   * A trial membership passes when `requiredCapability` is missing. Premium without that
   * capability still receives `feature_not_available_for_account_type`. Used by listen reports,
   * which a trial stores for the Taste Profile only.
   */
  allowTrialWithoutCapability?: boolean;
  /**
   * The permission a key needs on this route. Omitted: the route never accepts a key.
   *
   * A key authenticates as its owner and can never do more than the owner can signed in. It goes
   * through the same terms and `requiredCapability` checks as a session, and always through the
   * membership check, even where `skipMembershipStatus` lets a session through.
   */
  apiKeyAccess?: ApiKeyPermissionRequirement;
  /**
   * For routes a browser reaches through `EventSource`, which cannot read the 401 body. A
   * session-ended 401 keeps the cookie, so the next ordinary request reports why the session
   * ended. Every other 401 still clears it.
   */
  keepCookieOnSessionEnded?: boolean;
};

/** What a valid token naming an ended session gets: a 401, or (public routes) anonymous access. */
type EndedSessionHandling = 'reject' | 'anonymous';

type UnauthorizedBody =
  | { message: string }
  | { message: string; code: typeof AUTH_SESSION_ENDED_CODE; notice: AuthSessionEndedNotice };

/** The notice rides on the 401 only when the session was ended somewhere else. */
function unauthorizedBody(
  message: string,
  notice: AuthSessionEndedNotice | null
): UnauthorizedBody {
  if (notice === null) {
    return { message };
  }
  return { message, code: AUTH_SESSION_ENDED_CODE, notice };
}

/**
 * Repository accounts are entity instances and include the terms relation when this check runs.
 * A plain object that omits the relation is not a terms decision.
 */
function accountNeedsCurrentTerms(account: Account, configuredVersion: string): boolean {
  const isEntity = account instanceof Account;
  const includesAcceptance = Object.prototype.hasOwnProperty.call(
    account,
    'account_terms_acceptance'
  );
  if (!isEntity && !includesAcceptance) {
    return false;
  }
  return account.account_terms_acceptance?.terms_version !== configuredVersion;
}

type AccountCredentialAuthResult =
  | { id: number; id_text: string; kind: 'authenticated' }
  | { kind: 'not_verified' }
  | { kind: 'unauthorized' };

/**
 * Password is checked before `verified`. A rejection that names an unverified account before
 * the password matches would tell the caller the address exists.
 */
const authenticateAccountCredentials = async (
  identifier: string,
  password: string
): Promise<AccountCredentialAuthResult> => {
  if (!password) {
    return { kind: 'unauthorized' };
  }

  const account = identifier.includes('@')
    ? await getAccountService().getByEmail(identifier, {
        relations: { account_credentials: true },
      })
    : await getAccountService().getByUsername(identifier, {
        relations: { account_credentials: true },
      });

  const passwordHash = account?.account_credentials?.password;
  if (!account || passwordHash === undefined || passwordHash === '') {
    return { kind: 'unauthorized' };
  }

  const isMatch = await verifyPassword(password, passwordHash);
  if (!isMatch) {
    return { kind: 'unauthorized' };
  }

  if (!account.verified) {
    return { kind: 'not_verified' };
  }

  if (!account.id_text) {
    return { kind: 'unauthorized' };
  }

  return {
    id: account.id,
    id_text: account.id_text,
    kind: 'authenticated',
  };
};

// AccountService is constructed per lookup so Vitest per-file vi.mock('@podverse/orm')
// stays effective (no stale cached instance from another test file).
function getAccountService(): AccountService {
  return new AccountService();
}

/**
 * Load the account for JWT identity claims and accept it only when `id_text` still matches.
 * Access-token verification and mobile refresh share this so a deleted or replaced account cannot
 * keep minting tokens while protected routes reject them.
 */
async function getAccountMatchingJwtIdentity(
  claims: { id: number; id_text: string },
  options?: { relations?: FindOptionsRelations<Account> }
): Promise<Account | null> {
  const account = await getAccountService().get(claims.id, options);
  if (!account) {
    return null;
  }

  const accountIdText =
    typeof account.id_text === 'string' && account.id_text !== '' ? account.id_text : undefined;
  if (accountIdText === undefined || accountIdText !== claims.id_text) {
    return null;
  }

  return account;
}

let billingPriceCatalogServiceSingleton: BillingPriceCatalogService | undefined;
function getBillingPriceCatalogService(): BillingPriceCatalogService {
  if (billingPriceCatalogServiceSingleton === undefined) {
    billingPriceCatalogServiceSingleton = new BillingPriceCatalogService();
  }
  return billingPriceCatalogServiceSingleton;
}

/** The cookie's max-age is the idle limit; renewal re-sets it. */
export const setAuthCookie = (res: Response, token: string) => {
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

export const clearAuthCookie = (res: Response) => {
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
};

export const initializePassport = () => passport.initialize();

/**
 * One browser holds one session: a login made while the browser still carries a validly signed
 * session cookie ends that earlier session first.
 */
async function endSessionInPresentedCookie(req: Request): Promise<void> {
  const requestToken = readRequestToken(req);
  if (requestToken?.source !== 'cookie') {
    return;
  }
  const classified = classifyAccessJwt(verifySessionJwt(requestToken.token));
  if (classified.kind !== 'session') {
    return;
  }
  try {
    await endAccountSession({
      accountId: classified.claims.id,
      sessionIdText: classified.claims.sid,
      reason: 'signed_out',
    });
  } catch (error) {
    loggerService.logError('Failed to end the session replaced by a new web login', error);
  }
}

export async function completeWebLogin(
  req: Request,
  res: Response,
  account: { id: number; id_text: string },
  extras?: { backupCodes: string[] }
): Promise<void> {
  await endSessionInPresentedCookie(req);

  const { sessionIdText } = await startAccountSession({
    accountId: account.id,
    clientType: 'web',
    deviceLabel: deviceLabelFromUserAgent(req.get('user-agent')),
    withRefreshToken: false,
  });
  const token = signWebSessionToken({
    accountId: account.id,
    accountIdText: account.id_text,
    sessionIdText,
  });

  setAuthCookie(res, token);

  const response: { message: string; token?: string; backupCodes?: string[] } = {
    message: 'Authenticated successfully',
  };
  if (extras !== undefined) {
    response.backupCodes = extras.backupCodes;
  }
  const body = req.body as { includeTokenInResponseBody?: unknown } | undefined;
  if (config.auth.allowTokenInResponseBody && Boolean(body?.includeTokenInResponseBody)) {
    response.token = token;
  }

  res.json(response);
}

/** Web login: the same credential check as mobile, then a web session in the `jwt` cookie. */
export const authenticate = async (req: Request, res: Response): Promise<void> => {
  const body = req.body as { email?: unknown; password?: unknown } | undefined;
  const identifier = typeof body?.email === 'string' ? body.email : '';
  const password = typeof body?.password === 'string' ? body.password : '';
  if (identifier === '' || password === '') {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  const authResult = await authenticateAccountCredentials(identifier, password);
  if (authResult.kind === 'not_verified') {
    res.status(403).json({ message: ERROR_MESSAGES.ACCOUNT.NOT_VERIFIED });
    return;
  }
  if (authResult.kind !== 'authenticated') {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  try {
    const step = await gatePasswordLogin({
      ownerId: authResult.id,
      client: 'web',
      deviceLabel: deviceLabelFromUserAgent(req.get('user-agent')),
    });
    if (step !== null) {
      res.json(step);
      return;
    }
  } catch (error) {
    if (error instanceof SecondFactorUnavailableError) {
      res.status(503).json({ message: 'Second factor is unavailable' });
      return;
    }
    throw error;
  }

  await completeWebLogin(req, res, { id: authResult.id, id_text: authResult.id_text });
};

/**
 * Renewal never fails the request. A web session presented through its cookie gets a re-signed
 * cookie; a web token sent as a bearer renews only its row and ends at its own JWT expiry.
 */
async function renewSessionOnUse(
  res: Response,
  requestToken: RequestToken,
  session: AccountSessionRow,
  claims: { id: number; id_text: string; sid: string }
): Promise<void> {
  try {
    const renewed = await renewAccountSession(session);
    if (renewed && session.client_type === 'web' && requestToken.source === 'cookie') {
      setAuthCookie(
        res,
        signWebSessionToken({
          accountId: claims.id,
          accountIdText: claims.id_text,
          sessionIdText: claims.sid,
        })
      );
    }
  } catch (error) {
    loggerService.logError('Account session renewal failed', error);
  }
}

/** Epoch seconds from a verified JWT `exp` claim, when the payload carries one. */
function readJwtExpSeconds(decoded: unknown): number | undefined {
  if (decoded === null || typeof decoded !== 'object' || !('exp' in decoded)) {
    return undefined;
  }
  const exp = decoded.exp;
  if (typeof exp !== 'number' || !Number.isFinite(exp)) {
    return undefined;
  }
  return exp;
}

function sendTermsAcceptanceRequired(res: Response): void {
  res.status(403).json({
    message: 'Terms of service acceptance is required.',
    code: 'terms_acceptance_required',
  });
}

function sendMembershipExpired(res: Response): void {
  res.status(403).json({
    message: 'Your membership has expired. Renew to use this feature.',
    code: 'membership_expired',
    i18nKey: MEMBERSHIP_EXPIRED_I18N_KEY,
    renewPath: APP_ROUTES.MEMBERSHIP_RENEW,
  });
}

export function sendCapabilityMissing(res: Response): void {
  res.status(403).json({
    message: 'Your account does not currently have access to this feature.',
    code: 'feature_not_available_for_account_type',
    i18nKey: 'membership.feature_not_available_for_account_type',
    renewPath: APP_ROUTES.MEMBERSHIP_RENEW,
  });
}

/**
 * Terms, then membership, then capability, in that order and with the same bodies for sessions
 * and keys. Sets `user.entitlements` and `user.account_membership_id` when membership is checked.
 * False once a 403 has been sent.
 */
async function passesAccountGates(
  res: Response,
  account: Account,
  user: Express.User,
  gates: {
    enforceTerms: boolean;
    enforceMembership: boolean;
    requiredCapability: AccountEntitlementCapability | undefined;
    allowTrialWithoutCapability: boolean;
  }
): Promise<boolean> {
  if (gates.enforceTerms && accountNeedsCurrentTerms(account, config.terms.version)) {
    sendTermsAcceptanceRequired(res);
    return false;
  }

  if (!gates.enforceMembership) {
    return true;
  }

  const membershipStatus = account.account_membership_status;
  if (!hasValidMembership(membershipStatus)) {
    console.warn('[verifyTokenAndMembership] Membership expired or missing for user id:', user.id);
    sendMembershipExpired(res);
    return false;
  }

  const capDefaults = await getBillingPriceCatalogService().resolveProductMembershipCapDefaults();
  const entitlements = getAccountEntitlements(membershipStatus, capDefaults);
  user.entitlements = entitlements;
  const membershipId = knownMembershipId(membershipStatus.account_membership?.id);
  if (membershipId !== undefined) {
    user.account_membership_id = membershipId;
  }

  if (gates.requiredCapability && !accountHasCapability(entitlements, gates.requiredCapability)) {
    const trialMayContinue =
      gates.allowTrialWithoutCapability &&
      membershipId !== undefined &&
      membershipStoresListens(membershipId, entitlements.trackStats);
    if (!trialMayContinue) {
      sendCapabilityMissing(res);
      return false;
    }
  }

  return true;
}

function knownMembershipId(id: number | null | undefined): AccountMembershipEnum | undefined {
  if (id === AccountMembershipEnum.Trial) {
    return AccountMembershipEnum.Trial;
  }
  if (id === AccountMembershipEnum.Premium) {
    return AccountMembershipEnum.Premium;
  }
  return undefined;
}

function sendApiKeyRejected(
  res: Response,
  code: Extract<ApiKeyCheck, { kind: 'rejected' }>['code']
): void {
  res.status(401).json({
    message: code === API_KEY_ERROR_CODES.expired ? 'API key expired' : 'Invalid API key',
    code,
  });
}

/**
 * A key reaches a route only when the route declares `apiKeyAccess` and the key holds that bit.
 * Membership is checked on every route, whatever `skipMembershipStatus` says. A key never sets or
 * clears the session cookie.
 */
async function verifyApiKeyAndMembership(
  req: Request,
  res: Response,
  next: NextFunction,
  token: string,
  options: AuthenticatedRequestOptions
): Promise<void> {
  const check = await checkApiKey(token);
  if (check.kind === 'rejected') {
    sendApiKeyRejected(res, check.code);
    return;
  }
  const { apiKey } = check;

  const requirement = options.apiKeyAccess;
  if (requirement === undefined) {
    res.status(403).json({
      message: 'API keys cannot be used for this endpoint.',
      code: API_KEY_ERROR_CODES.notAllowed,
    });
    return;
  }
  if (!apiKeyPermissionsAllow(apiKey.permissions, requirement)) {
    res.status(403).json({
      message: `This API key needs the ${requirement.action} permission on ${requirement.resource}.`,
      code: API_KEY_ERROR_CODES.permissionDenied,
      required_permission: { resource: requirement.resource, action: requirement.action },
    });
    return;
  }

  let relations: FindOptionsRelations<Account> = findOptionsRelationsFromPaths<Account>([
    'account_membership_status',
    'account_membership_status.account_membership',
  ]);
  const enforceTerms = options.skipTermsAcceptance !== true && config.terms.version !== '';
  if (enforceTerms) {
    relations = mergeFindOptionsRelations<Account>(relations, ['account_terms_acceptance']);
  }
  const account = await getAccountService().get(apiKey.account_id, { relations });
  const accountIdText =
    account && typeof account.id_text === 'string' && account.id_text !== ''
      ? account.id_text
      : undefined;
  if (!account || accountIdText === undefined) {
    sendApiKeyRejected(res, API_KEY_ERROR_CODES.invalid);
    return;
  }

  req.user = {
    id: account.id,
    id_text: accountIdText,
    verified: typeof account.verified === 'boolean' ? account.verified : true,
    session_id_text: null,
    api_key: { id_text: apiKey.id_text, permissions: apiKey.permissions },
  };
  if (apiKey.expires_at !== null) {
    req.user.token_expires_at = Math.floor(apiKey.expires_at.getTime() / MS_PER_SECOND);
  }

  const passed = await passesAccountGates(res, account, req.user, {
    enforceTerms,
    enforceMembership: true,
    requiredCapability: options.requiredCapability,
    allowTrialWithoutCapability: options.allowTrialWithoutCapability === true,
  });
  if (!passed) {
    return;
  }

  if (check.lastUsedDue) {
    await recordApiKeyUse(apiKey);
  }

  next();
}

const verifyTokenAndMembership = async (
  req: Request,
  res: Response,
  next: NextFunction,
  requestToken: RequestToken,
  options: AuthenticatedRequestOptions,
  endedSessionHandling: EndedSessionHandling
): Promise<void> => {
  if (requestToken.source === 'api_key') {
    await verifyApiKeyAndMembership(req, res, next, requestToken.token, options);
    return;
  }

  const rejectUnauthorized = (notice: AuthSessionEndedNotice | null, clearCookie = true) => {
    if (clearCookie && requestToken.source === 'cookie') {
      clearAuthCookie(res);
    }
    res.status(401).json(unauthorizedBody('Unauthorized', notice));
  };

  const decoded = verifySessionJwt(requestToken.token);
  const classified = classifyAccessJwt(decoded);
  if (classified.kind === 'rejected') {
    rejectUnauthorized(null);
    return;
  }
  const { claims } = classified;

  let relations: FindOptionsRelations<Account> = findOptionsRelationsFromPaths<Account>([
    'account_credentials',
  ]);
  if (!options.skipMembershipStatus) {
    relations = mergeFindOptionsRelations<Account>(relations, [
      'account_membership_status',
      'account_membership_status.account_membership',
    ]);
  }
  const enforceTerms = options.skipTermsAcceptance !== true && config.terms.version !== '';
  if (enforceTerms) {
    relations = mergeFindOptionsRelations<Account>(relations, ['account_terms_acceptance']);
  }
  const [account, sessionCheck] = await Promise.all([
    getAccountMatchingJwtIdentity({ id: claims.id, id_text: claims.id_text }, { relations }),
    checkAccountSession({ accountId: claims.id, sessionIdText: claims.sid }),
  ]);
  if (!account) {
    rejectUnauthorized(null);
    return;
  }
  if (sessionCheck.kind === 'ended') {
    if (endedSessionHandling === 'anonymous') {
      next();
      return;
    }
    rejectUnauthorized(sessionCheck.notice, options.keepCookieOnSessionEnded !== true);
    return;
  }

  if (
    requestToken.source === 'cookie' &&
    cookieAuthenticatedWriteLacksIntent(req.method, req.get(COOKIE_WRITE_INTENT_HEADER))
  ) {
    res.status(403).json({ message: 'Forbidden' });
    return;
  }

  req.user = {
    id: account.id,
    id_text: typeof account.id_text === 'string' && account.id_text !== '' ? account.id_text : '',
    verified: typeof account.verified === 'boolean' ? account.verified : true,
    session_id_text: claims.sid,
    session_client_type: sessionCheck.session.client_type,
    session_device_label: sessionCheck.session.device_label,
    session_created_at: sessionCheck.session.created_at.toISOString(),
    api_key: null,
  };
  const tokenExpiresAt = readJwtExpSeconds(decoded);
  if (tokenExpiresAt !== undefined) {
    req.user.token_expires_at = tokenExpiresAt;
  }

  if (sessionCheck.renewDue) {
    await renewSessionOnUse(res, requestToken, sessionCheck.session, claims);
  }

  const passed = await passesAccountGates(res, account, req.user, {
    enforceTerms,
    enforceMembership: !options.skipMembershipStatus,
    requiredCapability: options.requiredCapability,
    allowTrialWithoutCapability: options.allowTrialWithoutCapability === true,
  });
  if (!passed) {
    return;
  }

  next();
};

/** A failed account or session lookup answers 500 rather than leaving the request open. */
function runAuthCheck(check: Promise<void>, res: Response): void {
  check.catch((error: unknown) => {
    loggerService.logError('Authentication check failed', error);
    if (!res.headersSent) {
      res.status(500).json({ message: 'Internal Server Error' });
    }
  });
}

export const ensureAuthenticated = (
  req: Request,
  res: Response,
  next: NextFunction,
  options: AuthenticatedRequestOptions
): void => {
  const requestToken = readRequestToken(req);
  if (!requestToken) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }
  runAuthCheck(verifyTokenAndMembership(req, res, next, requestToken, options, 'reject'), res);
};

/**
 * A valid token whose session has ended continues as anonymous and keeps its cookie, so the next
 * signed-in route can answer with the reason and clear the cookie in the same response. An API key
 * is checked exactly as in ensureAuthenticated: an invalid or expired key is a 401, never
 * anonymous access.
 */
export const optionalEnsureAuthenticated = (
  req: Request,
  res: Response,
  next: NextFunction,
  options: AuthenticatedRequestOptions
): void => {
  const requestToken = readRequestToken(req);
  if (!requestToken) {
    next();
    return;
  }
  runAuthCheck(verifyTokenAndMembership(req, res, next, requestToken, options, 'anonymous'), res);
};

/**
 * The account id of an active session on the request, or null. Reads only: no renewal and no
 * cookie writes, for handlers that vary a public response by viewer.
 */
export async function getActiveSessionAccountId(req: Request): Promise<number | null> {
  const requestToken = readRequestToken(req);
  if (!requestToken) {
    return null;
  }
  const classified = classifyAccessJwt(verifySessionJwt(requestToken.token));
  if (classified.kind !== 'session') {
    return null;
  }
  const sessionCheck = await checkAccountSession({
    accountId: classified.claims.id,
    sessionIdText: classified.claims.sid,
  });
  return sessionCheck.kind === 'active' ? classified.claims.id : null;
}

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

/**
 * The session id on a session-authenticated request. Throws on an API key request; routes that
 * call this never declare `apiKeyAccess`, so a key cannot reach code that treats a missing session
 * as "end every session".
 */
export const getAuthenticatedSessionIdText = (req: Request): string => {
  const sessionIdText = getAuthenticatedUser(req).session_id_text;
  if (sessionIdText === null) {
    throw new Error('Request is not authenticated by an account session');
  }
  return sessionIdText;
};

/**
 * Ends the calling session when the request names one. A session cookie on this POST needs
 * `X-Podverse-Request-Intent: same-origin`; without it the session stays and the response is 403.
 * Any other request clears the cookie and answers 200.
 */
export const logout = async (req: Request, res: Response): Promise<void> => {
  const requestToken = readRequestToken(req);
  if (requestToken) {
    const classified = classifyAccessJwt(verifySessionJwt(requestToken.token));
    if (classified.kind === 'session') {
      if (
        requestToken.source === 'cookie' &&
        cookieAuthenticatedWriteLacksIntent(req.method, req.get(COOKIE_WRITE_INTENT_HEADER))
      ) {
        res.status(403).json({ message: 'Forbidden' });
        return;
      }
      try {
        await endAccountSession({
          accountId: classified.claims.id,
          sessionIdText: classified.claims.sid,
          reason: 'signed_out',
        });
      } catch (error) {
        loggerService.logError('Failed to end the session on logout', error);
      }
    }
  }

  clearAuthCookie(res);
  res.json({ message: 'Logged out successfully' });
};

export const issueMobileToken = async (req: Request, res: Response): Promise<void> => {
  const body = req.body as
    { email?: string; password?: string; device_label?: unknown } | undefined;
  const identifier = body?.email?.trim() ?? '';
  const password = body?.password ?? '';
  if (identifier === '' || password === '') {
    res.status(400).json({ message: 'email and password are required' });
    return;
  }

  const authResult = await authenticateAccountCredentials(identifier, password);
  if (authResult.kind === 'not_verified') {
    res.status(403).json({ message: ERROR_MESSAGES.ACCOUNT.NOT_VERIFIED });
    return;
  }
  if (authResult.kind !== 'authenticated') {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  const deviceLabel = deviceLabelForMobile({
    bodyLabel: body?.device_label,
    platformHeader: req.get(BILLING_CLIENT_PLATFORM_HEADER),
  });
  try {
    const step = await gatePasswordLogin({
      ownerId: authResult.id,
      client: 'mobile',
      deviceLabel,
    });
    if (step !== null) {
      res.json(step);
      return;
    }
  } catch (error) {
    if (error instanceof SecondFactorUnavailableError) {
      res.status(503).json({ message: 'Second factor is unavailable' });
      return;
    }
    throw error;
  }

  const { sessionIdText, refreshTokenId } = await startAccountSession({
    accountId: authResult.id,
    clientType: 'mobile',
    deviceLabel,
    withRefreshToken: true,
  });
  if (refreshTokenId === null) {
    throw new Error('Mobile session started without a refresh token id');
  }

  res.json(
    signMobileTokenPair({
      accountId: authResult.id,
      accountIdText: authResult.id_text,
      sessionIdText,
      refreshTokenId,
    })
  );
};

export const refreshMobileToken = async (req: Request, res: Response): Promise<void> => {
  const body = req.body as { refresh_token?: string } | undefined;
  const refreshToken = body?.refresh_token ?? '';
  if (refreshToken === '') {
    res.status(400).json({ message: 'refresh_token is required' });
    return;
  }

  const classified = classifyRefreshJwt(verifySessionJwt(refreshToken));
  if (classified.kind === 'rejected') {
    res.status(401).json({ message: 'Invalid refresh token' });
    return;
  }
  const { claims } = classified;

  const account = await getAccountMatchingJwtIdentity({ id: claims.id, id_text: claims.id_text });
  if (!account || account.id_text === undefined || account.id_text === '') {
    res.status(401).json({ message: 'Invalid refresh token' });
    return;
  }

  const rotation = await rotateMobileRefreshToken({
    accountId: account.id,
    sessionIdText: claims.sid,
    presentedTokenId: claims.rid,
  });
  if (rotation.kind === 'ended') {
    res.status(401).json(unauthorizedBody('Invalid refresh token', rotation.notice));
    return;
  }

  res.json(
    signMobileTokenPair({
      accountId: account.id,
      accountIdText: account.id_text,
      sessionIdText: claims.sid,
      refreshTokenId: rotation.refreshTokenId,
    })
  );
};

/**
 * Ends the session named by a validly signed refresh token. Ending your own session needs no proof
 * beyond the signature, so the current-or-previous check does not apply. Always answers 200 so a
 * device's sign-out never fails on this call.
 */
export const revokeMobileToken = async (req: Request, res: Response): Promise<void> => {
  const body = req.body as { refresh_token?: unknown } | undefined;
  const refreshToken = typeof body?.refresh_token === 'string' ? body.refresh_token : '';
  if (refreshToken !== '') {
    const classified = classifyRefreshJwt(verifySessionJwt(refreshToken));
    if (classified.kind === 'session') {
      try {
        await endAccountSession({
          accountId: classified.claims.id,
          sessionIdText: classified.claims.sid,
          reason: 'signed_out',
        });
      } catch (error) {
        loggerService.logError('Failed to end the session on mobile revoke', error);
      }
    }
  }

  res.json({ message: 'Mobile session revoked' });
};
