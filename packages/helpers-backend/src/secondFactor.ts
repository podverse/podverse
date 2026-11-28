import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
  randomInt,
  timingSafeEqual,
} from 'node:crypto';

import type { SecondFactorMode } from '@podverse/helpers';
import { secondFactorLoginGate, sha256Hex } from '@podverse/helpers';

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const BACKUP_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const KEY_HEX_PATTERN = /^[0-9a-fA-F]{64}$/;
const CIPHER_PREFIX = 's1:';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const TOTP_DIGITS = 6;
const TOTP_STEP_SECONDS = 30;
const SECRET_BYTES = 20;

export const SECOND_FACTOR_CHALLENGE_TTL_SECONDS = 10 * 60;
export const SECOND_FACTOR_MAX_ATTEMPTS = 5;
export const SECOND_FACTOR_BACKUP_CODE_COUNT = 10;
export const SECOND_FACTOR_EMAIL_CODE_TTL_MS = 10 * 60 * 1000;
export const SECOND_FACTOR_EMAIL_MAX_PER_ACCOUNT_HOUR = 3;
export const SECOND_FACTOR_EMAIL_MAX_PER_ACCOUNT_DAY = 5;
export const SECOND_FACTOR_EMAIL_MAX_PER_IP_HOUR = 5;

export type SecondFactorClient = 'web' | 'mobile';

export type SecondFactorRecord = {
  secretCiphertext: string;
  pendingSecretCiphertext: string | null;
  confirmedAt: Date | null;
};

export type SecondFactorRepository = {
  find(ownerId: number): Promise<SecondFactorRecord | null>;
  /** Writes the first secret. Replaces an unconfirmed secret. */
  saveInitial(ownerId: number, ciphertext: string): Promise<void>;
  savePending(ownerId: number, ciphertext: string): Promise<void>;
  markConfirmed(ownerId: number, now: Date): Promise<void>;
  promotePending(ownerId: number, now: Date): Promise<void>;
  replaceBackupCodes(ownerId: number, codeHashes: string[]): Promise<void>;
  unusedBackupHashes(ownerId: number): Promise<Array<{ id: number; codeHash: string }>>;
  markBackupUsed(id: number, now: Date): Promise<boolean>;
  clear(ownerId: number): Promise<void>;
};

export type SecondFactorChallenge = {
  ownerId: number;
  purpose: 'login' | 'setup';
  client: SecondFactorClient;
  deviceLabel: string | null;
  attempts: number;
  emailCodeHash: string | null;
  emailCodeExpiresAtMs: number | null;
};

export type SecondFactorChallengeRepository = {
  save(tokenHash: string, challenge: SecondFactorChallenge, ttlSeconds: number): Promise<void>;
  read(tokenHash: string): Promise<SecondFactorChallenge | null>;
  remove(tokenHash: string): Promise<void>;
};

export type SecondFactorEmailAllowance =
  { allowed: true } | { allowed: false; retryAfterMs: number };

export type SecondFactorEmailRateLimiter = {
  consume(ownerId: number, ip: string): Promise<SecondFactorEmailAllowance>;
};

export type SecondFactorDeps = {
  mode: () => SecondFactorMode;
  keyHex: () => string;
  issuer: () => string;
  repository: SecondFactorRepository;
  challenges: SecondFactorChallengeRepository;
  emailRateLimit: SecondFactorEmailRateLimiter;
  nowMs?: () => number;
  qrDataUrl?: (otpauthUri: string) => Promise<string>;
};

export function isSecondFactorKeyHexValid(keyHex: string | null | undefined): keyHex is string {
  return typeof keyHex === 'string' && KEY_HEX_PATTERN.test(keyHex);
}

function keyBuffer(keyHex: string): Buffer {
  if (!isSecondFactorKeyHexValid(keyHex)) {
    throw new Error('Second factor key must be 64 hex characters');
  }
  return Buffer.from(keyHex, 'hex');
}

function encodeBase32(bytes: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = '';
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      output += BASE32_ALPHABET[(value >>> bits) & 31];
    }
  }
  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }
  return output;
}

function decodeBase32(input: string): Buffer {
  const cleaned = input
    .replace(/=+$/u, '')
    .toUpperCase()
    .replace(/[^A-Z2-7]/gu, '');
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const char of cleaned) {
    const index = BASE32_ALPHABET.indexOf(char);
    if (index < 0) {
      continue;
    }
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      out.push((value >>> bits) & 0xff);
    }
  }
  return Buffer.from(out);
}

export function generateTotpSecret(): string {
  return encodeBase32(randomBytes(SECRET_BYTES));
}

export function buildOtpauthUri(input: {
  issuer: string;
  accountName: string;
  secret: string;
}): string {
  const label = encodeURIComponent(`${input.issuer}:${input.accountName}`);
  const issuer = encodeURIComponent(input.issuer);
  return `otpauth://totp/${label}?secret=${input.secret}&issuer=${issuer}&algorithm=SHA1&digits=${String(TOTP_DIGITS)}&period=${String(TOTP_STEP_SECONDS)}`;
}

function hotp(secret: Buffer, counter: number): string {
  const counterBytes = Buffer.alloc(8);
  counterBytes.writeBigUInt64BE(BigInt(counter));
  const hmac = createHmac('sha1', secret).update(counterBytes).digest();
  const offset = hmac.readUInt8(hmac.length - 1) & 0x0f;
  const binary = hmac.readUInt32BE(offset) & 0x7fffffff;
  return (binary % 1_000_000).toString().padStart(TOTP_DIGITS, '0');
}

export function totpCodeAt(secret: string, nowMs: number): string {
  const counter = Math.floor(nowMs / 1000 / TOTP_STEP_SECONDS);
  return hotp(decodeBase32(secret), counter);
}

export function verifyTotpCode(secret: string, code: string, nowMs: number): boolean {
  if (!/^\d{6}$/u.test(code)) {
    return false;
  }
  const counter = Math.floor(nowMs / 1000 / TOTP_STEP_SECONDS);
  const secretBytes = decodeBase32(secret);
  for (const step of [counter - 1, counter, counter + 1]) {
    if (step < 0) {
      continue;
    }
    const expected = hotp(secretBytes, step);
    if (timingSafeEqual(Buffer.from(code), Buffer.from(expected))) {
      return true;
    }
  }
  return false;
}

function aad(ownerId: number): Buffer {
  return Buffer.from(`second-factor|${String(ownerId)}`, 'utf8');
}

export function sealSecondFactorSecret(secret: string, keyHex: string, ownerId: number): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv('aes-256-gcm', keyBuffer(keyHex), iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });
  cipher.setAAD(aad(ownerId));
  const encrypted = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return CIPHER_PREFIX + Buffer.concat([iv, encrypted, tag]).toString('base64');
}

export function openSecondFactorSecret(
  ciphertext: string,
  keyHex: string,
  ownerId: number
): string | null {
  if (!ciphertext.startsWith(CIPHER_PREFIX)) {
    return null;
  }
  let key: Buffer;
  try {
    key = keyBuffer(keyHex);
  } catch {
    return null;
  }
  const combined = Buffer.from(ciphertext.slice(CIPHER_PREFIX.length), 'base64');
  if (combined.length <= IV_LENGTH + AUTH_TAG_LENGTH) {
    return null;
  }
  try {
    const iv = combined.subarray(0, IV_LENGTH);
    const tag = combined.subarray(combined.length - AUTH_TAG_LENGTH);
    const encrypted = combined.subarray(IV_LENGTH, combined.length - AUTH_TAG_LENGTH);
    const decipher = createDecipheriv('aes-256-gcm', key, iv, { authTagLength: AUTH_TAG_LENGTH });
    decipher.setAAD(aad(ownerId));
    decipher.setAuthTag(tag);
    return decipher.update(encrypted, undefined, 'utf8') + decipher.final('utf8');
  } catch {
    return null;
  }
}

function randomBackupGroup(): string {
  let group = '';
  for (let index = 0; index < 4; index += 1) {
    group += BACKUP_ALPHABET[randomInt(BACKUP_ALPHABET.length)] ?? 'A';
  }
  return group;
}

export function generateBackupCodes(): string[] {
  return Array.from({ length: SECOND_FACTOR_BACKUP_CODE_COUNT }, () => {
    return `${randomBackupGroup()}-${randomBackupGroup()}`;
  });
}

export function normalizeBackupCode(code: string): string {
  return code.replace(/[^A-Za-z0-9]/gu, '').toUpperCase();
}

export function hashBackupCode(code: string): string {
  return sha256Hex(normalizeBackupCode(code));
}

function hashesMatch(left: string, right: string): boolean {
  if (left.length !== right.length) {
    return false;
  }
  return timingSafeEqual(Buffer.from(left), Buffer.from(right));
}

export function generateEmailCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, '0');
}

export function hashEmailCode(code: string): string {
  return sha256Hex(code);
}

export function generateSecondFactorToken(): string {
  return randomBytes(32).toString('hex');
}

export function hashSecondFactorToken(token: string): string {
  return sha256Hex(token);
}

function nowOf(deps: SecondFactorDeps): number {
  return deps.nowMs?.() ?? Date.now();
}

function enrolled(record: SecondFactorRecord | null): boolean {
  return record?.confirmedAt !== null && record?.confirmedAt !== undefined;
}

export async function continueAfterPassword(
  deps: SecondFactorDeps,
  input: { ownerId: number; client: SecondFactorClient; deviceLabel: string | null }
): Promise<
  | { kind: 'session' }
  | { kind: 'setup'; setupToken: string }
  | { kind: 'code'; challengeToken: string }
> {
  const record = await deps.repository.find(input.ownerId);
  const gate = secondFactorLoginGate(deps.mode(), enrolled(record));
  if (gate === 'session') {
    return { kind: 'session' };
  }
  const token = generateSecondFactorToken();
  await deps.challenges.save(
    hashSecondFactorToken(token),
    {
      ownerId: input.ownerId,
      purpose: gate === 'setup' ? 'setup' : 'login',
      client: input.client,
      deviceLabel: input.deviceLabel,
      attempts: 0,
      emailCodeHash: null,
      emailCodeExpiresAtMs: null,
    },
    SECOND_FACTOR_CHALLENGE_TTL_SECONDS
  );
  if (gate === 'setup') {
    return { kind: 'setup', setupToken: token };
  }
  return { kind: 'code', challengeToken: token };
}

async function qrFor(deps: SecondFactorDeps, otpauthUri: string): Promise<string> {
  if (deps.qrDataUrl) {
    return deps.qrDataUrl(otpauthUri);
  }
  const qrcode = await import('qrcode');
  return qrcode.toDataURL(otpauthUri, { margin: 1, width: 240 });
}

export async function beginEnrollment(
  deps: SecondFactorDeps,
  input: { ownerId: number; accountName: string }
): Promise<{ otpauthUri: string; manualKey: string; qrDataUrl: string }> {
  const secret = generateTotpSecret();
  const ciphertext = sealSecondFactorSecret(secret, deps.keyHex(), input.ownerId);
  const record = await deps.repository.find(input.ownerId);
  if (enrolled(record)) {
    await deps.repository.savePending(input.ownerId, ciphertext);
  } else {
    await deps.repository.saveInitial(input.ownerId, ciphertext);
  }
  const otpauthUri = buildOtpauthUri({
    issuer: deps.issuer(),
    accountName: input.accountName,
    secret,
  });
  return {
    otpauthUri,
    manualKey: secret,
    qrDataUrl: await qrFor(deps, otpauthUri),
  };
}

async function storeBackupCodes(deps: SecondFactorDeps, ownerId: number): Promise<string[]> {
  const codes = generateBackupCodes();
  await deps.repository.replaceBackupCodes(
    ownerId,
    codes.map((code) => hashBackupCode(code))
  );
  return codes;
}

export async function confirmEnrollment(
  deps: SecondFactorDeps,
  input: { ownerId: number; code: string }
): Promise<{ ok: true; backupCodes: string[] } | { ok: false }> {
  const record = await deps.repository.find(input.ownerId);
  if (!record) {
    return { ok: false };
  }
  const now = new Date(nowOf(deps));
  if (record.pendingSecretCiphertext !== null) {
    const pending = openSecondFactorSecret(
      record.pendingSecretCiphertext,
      deps.keyHex(),
      input.ownerId
    );
    if (pending === null || !verifyTotpCode(pending, input.code, now.getTime())) {
      return { ok: false };
    }
    await deps.repository.promotePending(input.ownerId, now);
    return { ok: true, backupCodes: await storeBackupCodes(deps, input.ownerId) };
  }
  if (record.confirmedAt !== null) {
    return { ok: false };
  }
  const secret = openSecondFactorSecret(record.secretCiphertext, deps.keyHex(), input.ownerId);
  if (secret === null || !verifyTotpCode(secret, input.code, now.getTime())) {
    return { ok: false };
  }
  await deps.repository.markConfirmed(input.ownerId, now);
  return { ok: true, backupCodes: await storeBackupCodes(deps, input.ownerId) };
}

async function consumeBackupCode(
  deps: SecondFactorDeps,
  ownerId: number,
  code: string
): Promise<boolean> {
  const normalized = normalizeBackupCode(code);
  if (normalized.length !== 8) {
    return false;
  }
  const hash = hashBackupCode(code);
  const rows = await deps.repository.unusedBackupHashes(ownerId);
  const match = rows.find((row) => hashesMatch(row.codeHash, hash));
  if (match === undefined) {
    return false;
  }
  return deps.repository.markBackupUsed(match.id, new Date(nowOf(deps)));
}

async function noteChallengeFailure(
  deps: SecondFactorDeps,
  tokenHash: string,
  challenge: SecondFactorChallenge
): Promise<'again' | 'burned'> {
  const attempts = challenge.attempts + 1;
  if (attempts >= SECOND_FACTOR_MAX_ATTEMPTS) {
    await deps.challenges.remove(tokenHash);
    return 'burned';
  }
  await deps.challenges.save(
    tokenHash,
    { ...challenge, attempts },
    SECOND_FACTOR_CHALLENGE_TTL_SECONDS
  );
  return 'again';
}

export async function submitLoginCode(
  deps: SecondFactorDeps,
  input: { challengeToken: string; code: string }
): Promise<
  | { ok: true; ownerId: number; client: SecondFactorClient; deviceLabel: string | null }
  | { ok: false; burned: boolean }
> {
  const tokenHash = hashSecondFactorToken(input.challengeToken);
  const challenge = await deps.challenges.read(tokenHash);
  if (!challenge || challenge.purpose !== 'login') {
    return { ok: false, burned: true };
  }
  const record = await deps.repository.find(challenge.ownerId);
  if (!record || record.confirmedAt === null) {
    await deps.challenges.remove(tokenHash);
    return { ok: false, burned: true };
  }
  const secret = openSecondFactorSecret(record.secretCiphertext, deps.keyHex(), challenge.ownerId);
  const nowMs = nowOf(deps);
  const appCodeOk = secret !== null && verifyTotpCode(secret, input.code, nowMs);
  const emailCodeOk =
    !appCodeOk &&
    challenge.emailCodeHash !== null &&
    challenge.emailCodeExpiresAtMs !== null &&
    challenge.emailCodeExpiresAtMs > nowMs &&
    /^\d{6}$/u.test(input.code) &&
    hashesMatch(hashEmailCode(input.code), challenge.emailCodeHash);
  const backupOk =
    !appCodeOk && !emailCodeOk && (await consumeBackupCode(deps, challenge.ownerId, input.code));
  if (!appCodeOk && !emailCodeOk && !backupOk) {
    const failure = await noteChallengeFailure(deps, tokenHash, challenge);
    return { ok: false, burned: failure === 'burned' };
  }
  await deps.challenges.remove(tokenHash);
  return {
    ok: true,
    ownerId: challenge.ownerId,
    client: challenge.client,
    deviceLabel: challenge.deviceLabel,
  };
}

export async function issueEmailCode(
  deps: SecondFactorDeps,
  input: { challengeToken: string; ip: string }
): Promise<
  | { status: 'code'; code: string; ownerId: number }
  | { status: 'rate_limited'; retryAfterMs: number }
  | { status: 'invalid' }
> {
  const tokenHash = hashSecondFactorToken(input.challengeToken);
  const challenge = await deps.challenges.read(tokenHash);
  if (!challenge || challenge.purpose !== 'login') {
    return { status: 'invalid' };
  }
  const record = await deps.repository.find(challenge.ownerId);
  if (!enrolled(record)) {
    return { status: 'invalid' };
  }
  const allowance = await deps.emailRateLimit.consume(challenge.ownerId, input.ip);
  if (!allowance.allowed) {
    return { status: 'rate_limited', retryAfterMs: allowance.retryAfterMs };
  }
  const code = generateEmailCode();
  await deps.challenges.save(
    tokenHash,
    {
      ...challenge,
      emailCodeHash: hashEmailCode(code),
      emailCodeExpiresAtMs: nowOf(deps) + SECOND_FACTOR_EMAIL_CODE_TTL_MS,
    },
    SECOND_FACTOR_CHALLENGE_TTL_SECONDS
  );
  return { status: 'code', code, ownerId: challenge.ownerId };
}

/** The current authenticator code. Backup codes do not count. */
export async function appCodeMatchesFactor(
  deps: SecondFactorDeps,
  ownerId: number,
  code: string
): Promise<boolean> {
  const record = await deps.repository.find(ownerId);
  if (!enrolled(record) || record === null) {
    return false;
  }
  const secret = openSecondFactorSecret(record.secretCiphertext, deps.keyHex(), ownerId);
  if (secret === null) {
    return false;
  }
  return verifyTotpCode(secret, code, nowOf(deps));
}

export async function codeMatchesFactor(
  deps: SecondFactorDeps,
  ownerId: number,
  code: string
): Promise<boolean> {
  const record = await deps.repository.find(ownerId);
  if (!record || record.confirmedAt === null) {
    return false;
  }
  const secret = openSecondFactorSecret(record.secretCiphertext, deps.keyHex(), ownerId);
  if (secret !== null && verifyTotpCode(secret, code, nowOf(deps))) {
    return true;
  }
  return consumeBackupCode(deps, ownerId, code);
}

export async function regenerateBackupCodes(
  deps: SecondFactorDeps,
  input: { ownerId: number; code: string }
): Promise<string[] | null> {
  const record = await deps.repository.find(input.ownerId);
  if (!record || record.confirmedAt === null) {
    return null;
  }
  const secret = openSecondFactorSecret(record.secretCiphertext, deps.keyHex(), input.ownerId);
  if (secret === null || !verifyTotpCode(secret, input.code, nowOf(deps))) {
    return null;
  }
  return storeBackupCodes(deps, input.ownerId);
}

export async function clearSecondFactor(deps: SecondFactorDeps, ownerId: number): Promise<void> {
  await deps.repository.clear(ownerId);
}

export async function readSecondFactorStatus(
  deps: SecondFactorDeps,
  ownerId: number
): Promise<{ enrolled: boolean; backupCodesRemaining: number; mode: SecondFactorMode }> {
  const record = await deps.repository.find(ownerId);
  const isEnrolled = enrolled(record);
  const backupCodesRemaining = isEnrolled
    ? (await deps.repository.unusedBackupHashes(ownerId)).length
    : 0;
  return { enrolled: isEnrolled, backupCodesRemaining, mode: deps.mode() };
}

export async function readSetupChallenge(
  deps: SecondFactorDeps,
  setupToken: string
): Promise<SecondFactorChallenge | null> {
  const challenge = await deps.challenges.read(hashSecondFactorToken(setupToken));
  if (!challenge || challenge.purpose !== 'setup') {
    return null;
  }
  return challenge;
}

export async function failSetupChallenge(
  deps: SecondFactorDeps,
  setupToken: string
): Promise<'again' | 'burned' | 'missing'> {
  const tokenHash = hashSecondFactorToken(setupToken);
  const challenge = await deps.challenges.read(tokenHash);
  if (!challenge || challenge.purpose !== 'setup') {
    return 'missing';
  }
  return noteChallengeFailure(deps, tokenHash, challenge);
}

export async function finishSetupChallenge(
  deps: SecondFactorDeps,
  setupToken: string
): Promise<void> {
  await deps.challenges.remove(hashSecondFactorToken(setupToken));
}
