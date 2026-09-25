import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

/**
 * Short-lived AES-256-GCM envelope that carries add-by-RSS Basic Auth credentials from the API
 * to a worker over the message queue. Credentials are never persisted server-side; this envelope
 * is the only form they take outside the request that supplied them.
 *
 * Format: `t1:` + base64(iv || ciphertext || authTag). The `t1:` prefix keeps transit envelopes
 * distinct from any other ciphertext encrypted with the same key.
 *
 * Associated data binds an envelope to one account, one parse request, and one feed URL, so a
 * copied envelope cannot be replayed against a different request or feed.
 */

const TRANSIT_PREFIX = 't1:';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const ALGORITHM = 'aes-256-gcm';
const KEY_HEX_PATTERN = /^[0-9a-fA-F]{64}$/;

export const ADD_BY_RSS_CREDENTIALS_TRANSIT_TTL_MS = 15 * 60 * 1000;

export type AddByRssCredentialSecrets = {
  username: string;
  password: string;
};

export type AddByRssCredentialsTransitAad = {
  accountId: number;
  requestId: string;
  feedUrl: string;
};

export type SealAddByRssCredentialsInput = AddByRssCredentialSecrets &
  AddByRssCredentialsTransitAad & {
    /** Unix ms; default now + 15 minutes */
    expMs?: number;
  };

export type OpenAddByRssCredentialsOptions = {
  /** Previous key during rotation; tried after `keyHex` fails. */
  keyHexOld?: string;
  /** Unix ms used for the expiry check; default `Date.now()`. */
  nowMs?: number;
};

/** True when `keyHex` is 64 hex characters (a 32-byte AES-256 key). */
export function isAddByRssCredentialsKeyHexValid(
  keyHex: string | null | undefined
): keyHex is string {
  return typeof keyHex === 'string' && KEY_HEX_PATTERN.test(keyHex);
}

function keyHexToBuffer(keyHex: string | null | undefined): Buffer | null {
  if (!isAddByRssCredentialsKeyHexValid(keyHex)) {
    return null;
  }
  return Buffer.from(keyHex, 'hex');
}

function buildAad({ accountId, requestId, feedUrl }: AddByRssCredentialsTransitAad): Buffer {
  return Buffer.from(`${accountId}|${requestId}|${feedUrl}`, 'utf8');
}

/**
 * Seals credentials into a transit envelope. Throws when the key is not a valid 32-byte hex key
 * or when username or password is empty, so misconfiguration fails at the API rather than as an
 * unopenable envelope in the worker.
 */
export function sealAddByRssCredentials(
  input: SealAddByRssCredentialsInput,
  keyHex: string
): string {
  const key = keyHexToBuffer(keyHex);
  if (!key) {
    throw new Error(
      'ADD_BY_RSS_CREDENTIALS_ENCRYPTION_KEY must be 64 hex characters (32 bytes) to seal credentials'
    );
  }
  if (input.username === '' || input.password === '') {
    throw new Error('Add-by-RSS credentials require a non-empty username and password');
  }

  const exp = input.expMs ?? Date.now() + ADD_BY_RSS_CREDENTIALS_TRANSIT_TTL_MS;
  const plaintext = JSON.stringify({ username: input.username, password: input.password, exp });

  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  cipher.setAAD(buildAad(input));
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return TRANSIT_PREFIX + Buffer.concat([iv, encrypted, tag]).toString('base64');
}

function decryptWithKey(combined: Buffer, key: Buffer, aad: Buffer): string | null {
  try {
    const iv = combined.subarray(0, IV_LENGTH);
    const tag = combined.subarray(combined.length - AUTH_TAG_LENGTH);
    const encrypted = combined.subarray(IV_LENGTH, combined.length - AUTH_TAG_LENGTH);
    const decipher = createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
    decipher.setAAD(aad);
    decipher.setAuthTag(tag);
    return decipher.update(encrypted, undefined, 'utf8') + decipher.final('utf8');
  } catch {
    return null;
  }
}

function parsePayload(plaintext: string, nowMs: number): AddByRssCredentialSecrets | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(plaintext);
  } catch {
    return null;
  }
  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    !('username' in parsed) ||
    !('password' in parsed) ||
    !('exp' in parsed)
  ) {
    return null;
  }
  const { username, password, exp } = parsed;
  if (typeof username !== 'string' || username === '') {
    return null;
  }
  if (typeof password !== 'string' || password === '') {
    return null;
  }
  if (typeof exp !== 'number' || !Number.isFinite(exp) || exp <= nowMs) {
    return null;
  }
  return { username, password };
}

/**
 * Opens a transit envelope. Returns null — never throws — when the prefix is wrong, no key
 * decrypts it, the associated data does not match, the payload is malformed or expired, or the
 * username or password is empty. Tries `keyHex` first, then `options.keyHexOld` for rotation.
 */
export function openAddByRssCredentials(
  envelope: string,
  keyHex: string,
  aad: AddByRssCredentialsTransitAad,
  options?: OpenAddByRssCredentialsOptions
): AddByRssCredentialSecrets | null {
  if (!envelope.startsWith(TRANSIT_PREFIX)) {
    return null;
  }
  const combined = Buffer.from(envelope.slice(TRANSIT_PREFIX.length), 'base64');
  if (combined.length <= IV_LENGTH + AUTH_TAG_LENGTH) {
    return null;
  }

  const aadBuffer = buildAad(aad);
  const nowMs = options?.nowMs ?? Date.now();
  const keys = [keyHexToBuffer(keyHex), keyHexToBuffer(options?.keyHexOld)];

  for (const key of keys) {
    if (!key) {
      continue;
    }
    const plaintext = decryptWithKey(combined, key, aadBuffer);
    if (plaintext !== null) {
      return parsePayload(plaintext, nowMs);
    }
  }
  return null;
}
